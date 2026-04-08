const mqtt = require('mqtt');
const { Client } = require('pg');
const express = require('express'); 
const path = require('path');
const app = express();


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
    mqttClient.subscribe('sensores/#');
    console.log("Conectado a HiveMQ y escuchando sensores...");
});

mqttClient.on('message', async (topic, message) => {
    const parts = topic.split('/');
    const sensorId = parts[1];
    const tipo = parts[2]; // 'status' o 'data'
    const contenido = message.toString();

    const query = 'INSERT INTO registros_sensores (sensor_id, estado, valor) VALUES ($1, $2, $3)';
    // Si es status, guardamos en 'estado'; si es data, en 'valor'
    const values = [sensorId, (tipo === 'status' ? contenido : null), (tipo === 'data' ? contenido : null)];
    
    // await db.query(query, values);
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
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});