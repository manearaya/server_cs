const mqtt = require('mqtt');
const { Client } = require('pg');
const express = require('express');
const path = require('path');
const app = express();


app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 1. Conexión DB (Railway inyecta DATABASE_URL automáticamente)
const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // OBLIGATORIO para Railway
});


db.connect()
    .then(() => console.log(' DB Conectada'))
    .catch(err => {
        console.error(' Error crítico de DB:', err.message);
        // NO matamos el proceso para que la web siga cargando
    });

// 2. Conexión HiveMQ
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
    
    await db.query(query, values);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});

app.get('/api/historial', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM registros_sensores ORDER BY fecha_hora DESC LIMIT 50');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/hola', (req, res) => {
    res.send("<h1>Si ves esto, el servidor funciona. El problema es la carpeta public.</h1>");
});