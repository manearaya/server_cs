const mqtt = require('mqtt');
const { Client } = require('pg');
const express = require('express'); 
const path = require('path');
const app = express();

const http = require('http');


// test latencia

const fs   = require('fs');

const LATENCY_LOG = path.join(__dirname, 'latency_log.csv');

if (!fs.existsSync(LATENCY_LOG)) {
    fs.writeFileSync(
        LATENCY_LOG,
        'seq,tipo,rate_label,intervalo_ms,ts_envio,ts_recibido,ts_guardado,lat_recepcion_ms,lat_db_ms,lat_total_ms\n'
    );
    console.log('latency_log.csv creado');
}

function logLatencia({ seq, tipo, rate_label, intervalo_ms, ts_envio, ts_recibido, ts_guardado }) {
    if (!ts_envio) return;
    const lat_recepcion = ts_recibido - ts_envio;
    const lat_db        = ts_guardado  - ts_recibido;
    const lat_total     = ts_guardado  - ts_envio;
    const fila = [seq ?? '', tipo, rate_label ?? 'unknown', intervalo_ms ?? '',
                  ts_envio, ts_recibido, ts_guardado, lat_recepcion, lat_db, lat_total].join(',') + '\n';
    fs.appendFileSync(LATENCY_LOG, fila);
    console.log(`  📊 [#${seq}] rate=${rate_label} | recepción=${lat_recepcion}ms | db=${lat_db}ms | total=${lat_total}ms`);
}

// fin cosas latencia


// SOCKET IO
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});



app.use(express.static(path.join(__dirname, 'public')));

// Para que pesque el index dentro de la carpeta
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// CONEXIÓN DB
const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } 
});

// accion de contectar
db.connect()
    .then(() => console.log(' DB Conectada'))
    .catch(err => {
        console.error(' Error DB:', err.message);
    });

// MQTT////////////////////////////////////////////////////////////
const mqttClient = mqtt.connect(`mqtts://${process.env.MQTT_HOST}`, {
    port: 8883,
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASSWORD
});

mqttClient.on('connect', () => {
    mqttClient.subscribe('caidas/#');
    console.log("conectado a hiveMQ y escuchando");
});


mqttClient.on('message', async (topic, message) => {
    const ts_recibido = Date.now(); //  latencia
    const data = JSON.parse(message.toString());
    const ahora = new Date().toISOString();

    const { seq, rate_label, intervalo_ms, ts_envio } = data;  // latencia

    // status receptor
    if (topic.includes('receptor') && topic.includes('status')) {
        await db.query(
            'UPDATE receptores SET bateria = $1, timestamp = $2 WHERE id = $3',
            [data.bateria, ahora, data.id]
        );
        const ts_guardado = Date.now(); // latencia
        io.emit('receptor', { id: data.id, bateria: data.bateria, timestamp: ahora });
        logLatencia({ seq, tipo: 'receptor_status', rate_label, intervalo_ms, ts_envio, ts_recibido, ts_guardado });// latencia
    }

    // respuesta alerta del receptor
    if (topic.includes('receptor') && topic.includes('respuesta')) {

        io.emit('receptor', { id: data.id, bateria: data.bateria, timestamp: ahora });
        io.emit('evento', { id: data.id, t_respuesta: data.t_respuesta, timestamp: ahora , id_receptor: data.id_receptor, activa: 0});
        
        // asumiendo que no existe, solamente agregar la tabla
                await db.query(
                'INSERT INTO eventos (timestamp, activa, t_respuesta, id_receptor) VALUES ($1, 0, $2, $3)',
                [ahora, data.t_respuesta, data.id_receptor]
            );
            const ts_guardado = Date.now();// latencia
            logLatencia({ seq, tipo: 'receptor_respuesta', rate_label, intervalo_ms, ts_envio, ts_recibido, ts_guardado }); //

    }

    // status sensor
    if (topic.includes('sensor') && topic.includes('status')) {
        // actualizar sensores
        await db.query(
            'UPDATE sensores SET estado = $1, bateria = $2, timestamp = $3 WHERE id = $4',
            [data.estado, data.bateria, ahora, data.id]
        );
        io.emit('sensor', { id: data.id, estado: data.estado, timestamp: ahora, bateria: data.bateria });

        //  si el estado es intento crear fila en eventos
        let ts_guardado;// latencia
        if (data.estado === 2) {
            await db.query(
                'INSERT INTO eventos (timestamp, activa, t_respuesta, id_receptor) VALUES ($1, 1, NULL, NULL)',
                [ahora]
            );
            ts_guardado = Date.now(); // 
            io.emit('evento', { id: data.id, t_respuesta: null, timestamp: ahora , id_receptor: null, activa: 1});
        }else {
            ts_guardado = Date.now(); // 
        }
        logLatencia({ seq, tipo: 'sensor_status', rate_label, intervalo_ms, ts_envio, ts_recibido, ts_guardado }); // 
    }
});


//// DATABASE

app.get('/api/historial', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM eventos ORDER BY timestamp DESC');
        res.json(result.rows); 
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en la base de datos");
    }
});

app.get('/api/sensores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM sensores ORDER BY timestamp DESC');
        res.json(result.rows); 
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en la base de datos");
    }
});


app.get('/api/receptores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM receptores ORDER BY timestamp DESC');
        res.json(result.rows); 
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en la base de datos");
    }
});


app.get('/api/latencia', (req, res) => {
    if (fs.existsSync(LATENCY_LOG)) {
        res.download(LATENCY_LOG, 'latency_log.csv');
    } else {
        res.status(404).send('Sin datos todavía.');
    }
});

app.delete('/api/latencia', (req, res) => {
    fs.writeFileSync(
        LATENCY_LOG,
        'seq,tipo,rate_label,intervalo_ms,ts_envio,ts_recibido,ts_guardado,lat_recepcion_ms,lat_db_ms,lat_total_ms\n'
    );
    res.json({ ok: true, mensaje: 'CSV reseteado' });
});




const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});