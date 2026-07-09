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
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ============================================================
//  LOGIN / SESIÓN   (variables: DASHBOARD_PASSWORD, SESSION_SECRET)
// ============================================================
app.set('trust proxy', 1);

const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || 'cambia-esto-por-un-secreto-largo',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true, httpOnly: true, maxAge: 1000 * 60 * 60 * 8 }
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(sessionMiddleware);

function requireLogin(req, res, next) {
    if (req.session && req.session.autenticado) return next();
    return res.redirect('/login');
}

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.post('/login', (req, res) => {
    if (req.body.password === process.env.DASHBOARD_PASSWORD) {
        req.session.autenticado = true;
        return res.redirect('/');
    }
    res.redirect('/login?error=1');
});
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/login')));

app.use(requireLogin);
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

io.engine.use(sessionMiddleware);
io.use((socket, next) => {
    if (socket.request.session && socket.request.session.autenticado) return next();
    next(new Error('no autorizado'));
});

// ============================================================
//  CONEXIÓN DB + ESQUEMA
//  IDENTIDAD DEL SENSOR = MAC. El par (id, id_receptor) es solo
//  una etiqueta que puede reusarse. Los eventos guardan mac_sensor
//  para trazar qué sensor FÍSICO generó cada evento.
// ============================================================
const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function prepararEsquema() {
    // sensores identificados por MAC (si la tabla no existe aún, se crea así)
    await db.query(`CREATE TABLE IF NOT EXISTS sensores (
        mac         TEXT PRIMARY KEY,
        id          INTEGER,
        id_receptor INTEGER,
        estado      INTEGER,
        bateria     INTEGER,
        timestamp   TIMESTAMPTZ,
        activo      INTEGER DEFAULT 1
    )`);
    // historial: agrega la mac del sensor (no borra datos existentes)
    await db.query(`ALTER TABLE eventos ADD COLUMN IF NOT EXISTS mac_sensor TEXT`);
    // registro de reasignaciones (cuándo se elimina/recambia un sensor)
    await db.query(`CREATE TABLE IF NOT EXISTS reasignaciones (
        id          SERIAL PRIMARY KEY,
        mac_sensor  TEXT,
        id_sensor   INTEGER,
        id_receptor INTEGER,
        timestamp   TIMESTAMPTZ
    )`);
    console.log('Esquema preparado (sensores por MAC + mac_sensor en eventos)');
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
async function emitirSensor(mac) {
    const r = await db.query('SELECT * FROM sensores WHERE mac = $1', [mac]);
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
    try { data = JSON.parse(message.toString()); }
    catch (e) { console.error('Mensaje no-JSON en', topic, '->', message.toString()); return; }

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
        // payload: { id, t_respuesta, id_receptor, bateria, mac }  (mac = del SENSOR)
        if (topic.includes('receptor') && topic.includes('respuesta')) {
            if (data.mac == null) { console.warn('respuesta sin mac -> actualiza el firmware del receptor'); return; }
            const upd = await db.query(
                `UPDATE eventos SET activa = 0, t_respuesta = $1
                  WHERE id = (
                        SELECT id FROM eventos
                         WHERE activa = 1 AND mac_sensor = $2
                         ORDER BY timestamp DESC LIMIT 1
                  ) RETURNING *`,
                [data.t_respuesta, data.mac]
            );
            if (upd.rows.length) io.emit('evento', upd.rows[0]);
            await db.query(
                `UPDATE sensores SET bateria = $1, timestamp = $2 WHERE mac = $3`,
                [data.bateria, ahora, data.mac]
            );
            await emitirSensor(data.mac);
            return;
        }

        // --------------------------------------------------------
        //  ELIMINAR SENSOR -> caidas/sensor/eliminar
        //  payload: { id, id_receptor, mac }
        //  - Registra la reasignación (para trazabilidad).
        //  - Borra la fila del sensor (identificado por MAC). Los EVENTOS
        //    se conservan (no dependen de la tabla sensores).
        // --------------------------------------------------------
        if (topic.includes('sensor') && topic.includes('eliminar')) {
            if (data.mac == null) { console.warn('eliminar sin mac -> actualiza el firmware del receptor'); return; }
            await db.query(
                `INSERT INTO reasignaciones (mac_sensor, id_sensor, id_receptor, timestamp)
                 VALUES ($1, $2, $3, $4)`,
                [data.mac, data.id, data.id_receptor, ahora]
            );
            await db.query(`DELETE FROM sensores WHERE mac = $1`, [data.mac]);
            io.emit('sensor_eliminado', { mac: data.mac });
            console.log(`Sensor MAC ${data.mac} (era id ${data.id}) eliminado; historial conservado`);
            return;
        }

        // STATUS SENSOR -> caidas/sensor/status
        // payload: { id, id_receptor, estado, bateria, mac }
        if (topic.includes('sensor') && topic.includes('status')) {
            if (data.mac == null) { console.warn('sensor status sin mac -> actualiza el firmware del receptor'); return; }

            // UPSERT por MAC: una MAC nueva = fila nueva (sensor físico distinto)
            await db.query(
                `INSERT INTO sensores (mac, id, id_receptor, estado, bateria, timestamp, activo)
                 VALUES ($1, $2, $3, $4, $5, $6, 1)
                 ON CONFLICT (mac) DO UPDATE
                   SET id = EXCLUDED.id, id_receptor = EXCLUDED.id_receptor,
                       estado = EXCLUDED.estado, bateria = EXCLUDED.bateria,
                       timestamp = EXCLUDED.timestamp, activo = 1`,
                [data.mac, data.id, data.id_receptor, data.estado, data.bateria, ahora]
            );
            await emitirSensor(data.mac);

            // Alerta al ENTRAR en estado 2 (sin duplicar), identificada por MAC
            if (data.estado === 2) {
                const ev = await db.query(
                    `INSERT INTO eventos (timestamp, activa, t_respuesta, id_receptor, id_sensor, mac_sensor)
                     SELECT $1, 1, NULL, $2, $3, $4
                     WHERE NOT EXISTS (
                        SELECT 1 FROM eventos WHERE activa = 1 AND mac_sensor = $4
                     ) RETURNING *`,
                    [ahora, data.id_receptor, data.id, data.mac]
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
    } catch (err) { console.error(err); res.status(500).send("Error en la base de datos"); }
});

app.get('/api/sensores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM sensores ORDER BY id_receptor, id');
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).send("Error en la base de datos"); }
});

app.get('/api/receptores', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM receptores ORDER BY id');
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).send("Error en la base de datos"); }
});

app.get('/api/reasignaciones', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM reasignaciones ORDER BY timestamp DESC');
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).send("Error en la base de datos"); }
});

// BORRAR HISTORIAL YA EXPORTADO (solo eventos resueltos, hasta el id exportado)
app.post('/api/borrar-historial', async (req, res) => {
    try {
        const hastaId = parseInt(req.body.hasta_id, 10);
        if (!Number.isInteger(hastaId)) return res.status(400).json({ error: 'hasta_id inválido' });
        const r = await db.query(
            'DELETE FROM eventos WHERE id <= $1 RETURNING id',  // borra TODOS (respondidos y no)
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
server.listen(PORT, '0.0.0.0', () => console.log(`Servidor corriendo en puerto ${PORT}`));