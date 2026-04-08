const mqtt = require('mqtt');
const { Client } = require('pg');
const express = require('express'); 
const path = require('path');
const app = express();

const http = require('http');


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
        console.error(' Error crítico de DB:', err.message);
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
    const data = JSON.parse(message.toString());
    const ahora = new Date().toISOString();

    // --- CASO 1: Status del Receptor ---
    if (topic.includes('receptor') && topic.includes('status')) {
        await db.query(
            'UPDATE receptores SET bateria = $1, timestamp = $2 WHERE id = $3',
            [data.bateria, ahora, data.id]
        );
        io.emit('receptor', { id: data.id, bateria: data.bateria, timestamp: ahora });
    }

    // --- CASO 2: Respuesta a Alerta (Receptor contesta) ---
    if (topic.includes('receptor') && topic.includes('respuesta')) {
        // ASUMIENDO QUE EL EVENTO EXISTE Y EL RECEPTOR SABE EL ID DEL EVENTO
        const res = await db.query(
            'UPDATE eventos SET t_respuesta = $1, id_receptor = $2 WHERE id = $3',
            [data.t_respuesta, data.id_receptor, data.id_evento]
        );
        io.emit('receptor', { id: data.id, bateria: data.bateria, timestamp: ahora });
        io.emit('evento', { id: data.id, t_respuesta: data.t_respuesta, timestamp: ahora , id_receptor: data.id_receptor, activa: 0});
        
        // Si no existía (res.rowCount === 0), podríamos insertarlo completo aquí

        if (res.rowCount === 0) {
                await db.query(
                'INSERT INTO eventos (timestamp, activa, t_respuesta, id_receptor) VALUES ($1, 0, $2, $3)',
                [ahora, data.t_respuesta, data.id_receptor]
            );
        }
    }

    // --- CASO 3: Status del Sensor (Cambio de Estado) ---
    if (topic.includes('sensor') && topic.includes('status')) {
        // 1. Actualizar tabla sensores
        await db.query(
            'UPDATE sensores SET estado = $1, bateria = $2, timestamp = $3 WHERE id = $4',
            [data.estado, data.bateria, ahora, data.id]
        );
        io.emit('sensor', { id: data.id, estado: data.estado, timestamp: ahora, bateria: data.bateria });

        // 2. Si el estado es 2 (Intento), crear fila en Eventos
        if (data.estado === 2) {
            await db.query(
                'INSERT INTO eventos (timestamp, activa, t_respuesta, id_receptor) VALUES ($1, 1, NULL, NULL)',
                [ahora]
            );
            io.emit('evento', { id: data.id, t_respuesta: null, timestamp: ahora , id_receptor: null, activa: 1});
        }
    }
});


//// DATABASE

app.get('/api/historial', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM eventos ORDER BY timestamp DESC');
        res.json(result.rows); // result.rows es exactamente tu lista de dicts
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en la base de datos");
    }
});

app.get('/api/sensores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM sensores ORDER BY timestamp DESC');
        res.json(result.rows); // result.rows es exactamente tu lista de dicts
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en la base de datos");
    }
});


app.get('/api/receptores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM receptores ORDER BY timestamp DESC');
        res.json(result.rows); // result.rows es exactamente tu lista de dicts
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en la base de datos");
    }
});






const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor OstheoGlove corriendo en puerto ${PORT}`);
});