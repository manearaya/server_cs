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



// app.get('/api/historial', async (req, res) => {
//     try {
//         const result = await db.query('SELECT * FROM registros_sensores ORDER BY fecha_hora DESC LIMIT 50');
//         res.json(result.rows);
//     } catch (err) {
//         res.status(500).json({ error: err.message });
//     }
// });


const listaEventos = [
    { id: 1, timestamp: "2026-04-08T03:50:10", activa: 1, t_respuesta: null, id_receptor: null },
    { id: 2, timestamp: "2026-04-07T14:20:05", activa: 0, t_respuesta: 3.6, id_receptor: 1 },
    { id: 3, timestamp: "2026-04-06T08:10:00", activa: 0, t_respuesta: 8.7, id_receptor: 7 },
    { id: 4, timestamp: "2026-04-05T20:15:30", activa: 0, t_respuesta: 5.0, id_receptor: 2 }
];

app.get('/api/historial', (req, res) => {
    res.json(listaEventos); // Esto envía la lista como texto que el navegador entiende
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});