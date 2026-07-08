const mqtt = require('mqtt');
const { Client } = require('pg');
const express = require('express');
const path = require('path');
const http = require('http');
const session = require('express-session');

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

// ============================================================
//  LOGIN / SESIÓN
//  Variables de entorno: DASHBOARD_PASSWORD, SESSION_SECRET
// ============================================================
app.set('trust proxy', 1);   // Railway va detrás de un proxy (cookie 'secure')

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'cambia-esto-por-un-secreto-largo',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 8   // 8 horas
    }
});

app.use(express.urlencoded({ extended: true }));  // formulario de login
app.use(express.json());                          // cuerpos JSON (ej. borrar historial)
app.use(sessionMiddleware);

// Middleware: exige estar logueado
function requireLogin(req, res, next) {
    if (req.session && req.session.autenticado) return next();
    return res.redirect('/login');
}

// --- Rutas de login (SIN sesión) ---
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    if (req.body.password === process.env.DASHBOARD_PASSWORD) {
        req.session.autenticado = true;
        return res.redirect('/');
    }
    res.redirect('/login?error=1');
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

// --- De aquí en adelante TODO requiere login ---
app.use(requireLogin);
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Socket.IO protegido con la misma sesión ---
io.engine.use(sessionMiddleware);
io.use((socket, next) => {
    if (socket.request.session && socket.request.session.autenticado) {
        return next();
    }
    next(new Error('no autorizado'));
});

// ============================================================
//  CONEXIÓN DB
// ============================================================
const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function prepararEsquema() {
    // columna para "borrado logico" del sensor (se conserva el historial)
    await db.query(`ALTER TABLE sensores ADD COLUMN IF NOT EXISTS eliminado BOOLEAN DEFAULT false`);
    // registro de cada vez que se elimina/recambia un sensor (para el historial)
    await db.query(`CREATE TABLE IF NOT EXISTS reasignaciones (
        id SERIAL PRIMARY KEY,
        id_sensor   INTEGER,
        id_receptor INTEGER,
        timestamp   TIMESTAMPTZ
    )`);
    console.log('Esquema preparado (eliminado + reasignaciones)');
}

db.connect()
    .then(() => { console.log('DB Conectada'); return prepararEsquema(); })
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
    mqttClient.subscribe('caidas/#');
    console.log("conectado a hiveMQ y escuchando");
});

// ============================================================
//  HELPERS DE EMISIÓN
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
        // CONEXIÓN / LWT DEL RECEPTOR -> caidas/receptor/conexion
        if (topic.includes('receptor') && topic.includes('conexion')) {
            const activo = data.online ? 1 : 0;
            await db.query(
                `INSERT INTO receptores (id, timestamp, activo)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (id) DO UPDATE
                   SET timestamp = EXCLUDED.timestamp, activo = EXCLUDED.activo`,
                [data.id, ahora, activo]
            );
            await emitirReceptor(data.id);
            if (!data.online) {
                await db.query('UPDATE sensores SET activo = 0 WHERE id_receptor = $1', [data.id]);
                const sens = await db.query('SELECT * FROM sensores WHERE id_receptor = $1', [data.id]);
                sens.rows.forEach(s => io.emit('sensor', s));
            }
            return;
        }

        // STATUS RECEPTOR -> caidas/receptor/status
        if (topic.includes('receptor') && topic.includes('status')) {
            await db.query(
                `INSERT INTO receptores (id, bateria, timestamp, activo)
                 VALUES ($1, $2, $3, 1)
                 ON CONFLICT (id) DO UPDATE
                   SET bateria = EXCLUDED.bateria, timestamp = EXCLUDED.timestamp, activo = 1`,
                [data.id, data.bateria, ahora]
            );
            await emitirReceptor(data.id);
            return;
        }

        // RESPUESTA A ALERTA -> caidas/receptor/respuesta
        if (topic.includes('receptor') && topic.includes('respuesta')) {
            if (data.id_receptor == null) { console.warn('respuesta sin id_receptor, ignorada'); return; }
            const upd = await db.query(
                `UPDATE eventos SET activa = 0, t_respuesta = $1
                  WHERE id = (
                        SELECT id FROM eventos
                         WHERE activa = 1 AND id_sensor = $2 AND id_receptor = $3
                         ORDER BY timestamp DESC LIMIT 1
                  ) RETURNING *`,
                [data.t_respuesta, data.id, data.id_receptor]
            );
            if (upd.rows.length) io.emit('evento', upd.rows[0]);
            await db.query(
                `UPDATE sensores SET bateria = $1, timestamp = $2 WHERE id = $3 AND id_receptor = $4`,
                [data.bateria, ahora, data.id, data.id_receptor]
            );
            await emitirSensor(data.id, data.id_receptor);
            return;
        }

        // --------------------------------------------------------
        //  ELIMINAR SENSOR -> caidas/sensor/eliminar
        //  payload: { id, id_receptor }
        //  - Registra la reasignacion (para el historial)
        //  - Borrado logico del sensor (se CONSERVAN los eventos)
        //  - Avisa al dashboard para quitar la tarjeta
        // --------------------------------------------------------
        if (topic.includes('sensor') && topic.includes('eliminar')) {
            if (data.id_receptor == null) { console.warn('eliminar sin id_receptor'); return; }

            await db.query(
                `INSERT INTO reasignaciones (id_sensor, id_receptor, timestamp) VALUES ($1, $2, $3)`,
                [data.id, data.id_receptor, ahora]
            );
            await db.query(
                `UPDATE sensores SET eliminado = true, activo = 0
                  WHERE id = $1 AND id_receptor = $2`,
                [data.id, data.id_receptor]
            );
            io.emit('sensor_eliminado', { id: data.id, id_receptor: data.id_receptor });
            console.log(`Sensor ${data.id} (R${data.id_receptor}) eliminado (historial conservado)`);
            return;
        }

        // STATUS SENSOR -> caidas/sensor/status
        if (topic.includes('sensor') && topic.includes('status')) {
            if (data.id_receptor == null) {
                console.warn('sensor status sin id_receptor -> actualiza el firmware del receptor');
                return;
            }
            await db.query(
                `INSERT INTO sensores (id, id_receptor, estado, bateria, timestamp, activo, eliminado)
                 VALUES ($1, $2, $3, $4, $5, 1, false)
                 ON CONFLICT (id, id_receptor) DO UPDATE
                   SET estado = EXCLUDED.estado, bateria = EXCLUDED.bateria,
                       timestamp = EXCLUDED.timestamp, activo = 1, eliminado = false`,
                [data.id, data.id_receptor, data.estado, data.bateria, ahora]
            );
            await emitirSensor(data.id, data.id_receptor);

            if (data.estado === 2) {
                const ev = await db.query(
                    `INSERT INTO eventos (timestamp, activa, t_respuesta, id_receptor, id_sensor)
                     SELECT $1, 1, NULL, $2, $3
                     WHERE NOT EXISTS (
                        SELECT 1 FROM eventos
                         WHERE activa = 1 AND id_sensor = $3 AND id_receptor = $2
                     ) RETURNING *`,
                    [ahora, data.id_receptor, data.id]
                );
                if (ev.rows.length) io.emit('evento', ev.rows[0]);
            }
            return;
        }

    } catch (err) {
        console.error('Error procesando', topic, '->', err.message);
    }
});

// ============================================================
//  API REST  (protegida)
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
        const result = await db.query('SELECT * FROM sensores WHERE eliminado = false ORDER BY id_receptor, id');
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

app.get('/api/reasignaciones', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM reasignaciones ORDER BY timestamp DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error en la base de datos");
    }
});

// ------------------------------------------------------------
//  BORRAR HISTORIAL YA EXPORTADO
//  Recibe { hasta_id } (el id más alto que se descargó en el CSV).
//  Borra SOLO eventos RESUELTOS (activa = 0) con id <= hasta_id.
//  -> Nunca borra una alerta pendiente ni eventos nuevos que
//     hayan llegado después de exportar.
// ------------------------------------------------------------
app.post('/api/borrar-historial', async (req, res) => {
    try {
        const hastaId = parseInt(req.body.hasta_id, 10);
        if (!Number.isInteger(hastaId)) {
            return res.status(400).json({ error: 'hasta_id inválido' });
        }
        const r = await db.query(
            'DELETE FROM eventos WHERE id <= $1 AND activa = 0 RETURNING id',
            [hastaId]
        );
        console.log(`Historial: borrados ${r.rowCount} eventos (id <= ${hastaId})`);
        res.json({ borrados: r.rowCount });
    } catch (err) {
        console.error('Error borrando historial:', err.message);
        res.status(500).json({ error: 'Error en la base de datos' });
    }
});

// ============================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});