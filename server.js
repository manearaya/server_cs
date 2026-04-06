const mqtt = require('mqtt');
const { Client } = require('pg');
const express = require('express');
const path = require('path');
const app = express();


app.use(express.static(path.join(__dirname, 'public')));


// 1. Conexión DB (Railway inyecta DATABASE_URL automáticamente)
const db = new Client({ connectionString: process.env.DATABASE_URL });
db.connect();

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
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});