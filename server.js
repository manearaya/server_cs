const mqtt = require('mqtt');
const { Client } = require('pg');
const express = require('express');
const path = require('path');
const http = require('http');

// SOCKET IO
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
//  CONEXIÓN DB
// ============================================================
const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

db.connect()
    .then(() => console.log('DB Conectada'))
    .catch(err => console.error('Error DB:', err.message));

// ============================================================
//  MQTT
// ============================================================
const mqttClient = mqtt.connect(`mqtts://${process.env.MQTT_HOST}`, {
    port: 8883,
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASSWORD
});

mqttClient.on('connect', () => {
    // caidas/# cubre status, respuesta y el nuevo topic de conexión (LWT)
    mqttClient.subscribe('caidas/#');
    console.log("conectado a hiveMQ y escuchando");
});

// ============================================================
//  HELPERS DE EMISIÓN
//  Emiten SIEMPRE la fila completa desde la BDD para que el
//  frontend reciba todos los campos (estado, bateria, activo...).
// ============================================================
async function emitirSensor(id, id_receptor) {
    const r = await db.query(
        'SELECT * FROM sensores WHERE id = $1 AND id_receptor = $2',
        [id, id_receptor]
    );
    if (r.rows.length) io.emit('sensor', r.rows[0]);
}

async function emitirReceptor(id) {
    const r = await db.query('SELECT * FROM receptores WHERE id = $1', [id]);
    if (r.rows.length) io.emit('receptor', r.rows[0]);
}

// ============================================================
//  MENSAJES MQTT
// ============================================================
mqttClient.on('message', async (topic, message) => {

    let data;
    try {
        data = JSON.parse(message.toString());
    } catch (e) {
        console.error('Mensaje no-JSON en', topic, '->', message.toString());
        return;
    }

    const ahora = new Date().toISOString();

    try {
        // --------------------------------------------------------
        //  NUEVO: CONEXIÓN / LWT DEL RECEPTOR  ->  caidas/receptor/conexion
        //  payload: { id, online: true|false }
        //    - online:true  -> mensaje "birth" que publica el receptor al conectar
        //    - online:false -> Last Will que publica el BROKER si el receptor
        //                      se cae de forma abrupta (sin DISCONNECT limpio)
        //
        //  Cuando el receptor cae, sus sensores quedan inalcanzables
        //  (toda su data pasa por él), así que también se marcan activo=0.
        // --------------------------------------------------------
        if (topic.includes('receptor') && topic.includes('conexion')) {
            const activo = data.online ? 1 : 0;

            await db.query(
                `INSERT INTO receptores (id, timestamp, activo)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (id) DO UPDATE
                   SET timestamp = EXCLUDED.timestamp,
                       activo    = EXCLUDED.activo`,
                [data.id, ahora, activo]
            );
            await emitirReceptor(data.id);

            if (!data.online) {
                await db.query(
                    'UPDATE sensores SET activo = 0 WHERE id_receptor = $1',
                    [data.id]
                );
                const sens = await db.query(
                    'SELECT * FROM sensores WHERE id_receptor = $1',
                    [data.id]
                );
                sens.rows.forEach(s => io.emit('sensor', s));
            }
            return;
        }

        // --------------------------------------------------------
        //  STATUS RECEPTOR  ->  caidas/receptor/status
        //  payload: { id, bateria }
        // --------------------------------------------------------
        if (topic.includes('receptor') && topic.includes('status')) {
            await db.query(
                `INSERT INTO receptores (id, bateria, timestamp, activo)
                 VALUES ($1, $2, $3, 1)
                 ON CONFLICT (id) DO UPDATE
                   SET bateria   = EXCLUDED.bateria,
                       timestamp = EXCLUDED.timestamp,
                       activo    = 1`,
                [data.id, data.bateria, ahora]
            );
            await emitirReceptor(data.id);
            return;
        }

        // --------------------------------------------------------
        //  RESPUESTA A ALERTA  ->  caidas/receptor/respuesta
        //  payload: { id, t_respuesta, id_receptor, bateria }
        //  ('id' y 'bateria' son del SENSOR)
        // --------------------------------------------------------
        if (topic.includes('receptor') && topic.includes('respuesta')) {

            if (data.id_receptor == null) {
                console.warn('respuesta sin id_receptor, ignorada');
                return;
            }

            const upd = await db.query(
                `UPDATE eventos
                    SET activa = 0, t_respuesta = $1
                  WHERE id = (
                        SELECT id FROM eventos
                         WHERE activa = 1
                           AND id_sensor = $2
                           AND id_receptor = $3
                         ORDER BY timestamp DESC
                         LIMIT 1
                  )
                  RETURNING *`,
                [data.t_respuesta, data.id, data.id_receptor]
            );

            if (upd.rows.length) {
                io.emit('evento', upd.rows[0]);
            }

            await db.query(
                `UPDATE sensores SET bateria = $1, timestamp = $2
                  WHERE id = $3 AND id_receptor = $4`,
                [data.bateria, ahora, data.id, data.id_receptor]
            );
            await emitirSensor(data.id, data.id_receptor);
            return;
        }

        // --------------------------------------------------------
        //  STATUS SENSOR  ->  caidas/sensor/status
        //  payload: { id, id_receptor, estado, bateria }
        //  (ya no hay 'habitacion')
        // --------------------------------------------------------
        if (topic.includes('sensor') && topic.includes('status')) {

            if (data.id_receptor == null) {
                console.warn('sensor status sin id_receptor -> actualiza el firmware del receptor');
                return;
            }

            await db.query(
                `INSERT INTO sensores (id, id_receptor, estado, bateria, timestamp, activo)
                 VALUES ($1, $2, $3, $4, $5, 1)
                 ON CONFLICT (id, id_receptor) DO UPDATE
                   SET estado    = EXCLUDED.estado,
                       bateria   = EXCLUDED.bateria,
                       timestamp = EXCLUDED.timestamp,
                       activo    = 1`,
                [data.id, data.id_receptor, data.estado, data.bateria, ahora]
            );
            await emitirSensor(data.id, data.id_receptor);

            // Crear alerta solo al ENTRAR en estado 2 (sin duplicar si ya hay una abierta)
            if (data.estado === 2) {
                const ev = await db.query(
                    `INSERT INTO eventos (timestamp, activa, t_respuesta, id_receptor, id_sensor)
                     SELECT $1, 1, NULL, $2, $3
                     WHERE NOT EXISTS (
                        SELECT 1 FROM eventos
                         WHERE activa = 1
                           AND id_sensor = $3
                           AND id_receptor = $2
                     )
                     RETURNING *`,
                    [ahora, data.id_receptor, data.id]
                );
                if (ev.rows.length) {
                    io.emit('evento', ev.rows[0]);
                }
            }
            return;
        }

    } catch (err) {
        console.error('Error procesando', topic, '->', err.message);
    }
});

// ============================================================
//  API REST
// ============================================================
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
        const result = await db.query('SELECT * FROM sensores ORDER BY id_receptor, id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en la base de datos");
    }
});

app.get('/api/receptores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM receptores ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en la base de datos");
    }
});

// ============================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});