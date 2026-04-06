// --- CONFIGURACIÓN DE HIVEMQ ---
// Estos valores deben coincidir con tu Cluster de HiveMQ
const MQTT_HOST = "54ef479282364fc19a690d68c4682d64.s1.eu.hivemq.cloud"; // TU CLUSTER URL
const MQTT_PORT = 8884; 
const MQTT_USER = "manemane";
const MQTT_PASS = "Manemane1";

const client = new Paho.MQTT.Client(MQTT_HOST, MQTT_PORT, "web_client_" + Math.random());
let sensorActual = null;
const sensoresDetectados = new Set();

// Configurar callbacks
client.onMessageArrived = onMessage;
client.onConnectionLost = (resp) => console.log("Conexión perdida:", resp.errorMessage);

// Función para conectar
function conectar() {
    client.connect({
        onSuccess: () => {
            console.log("¡Conectado a HiveMQ!");
            client.subscribe("sensores/#");
            cargarHistorial(); // Cargar datos de la DB al iniciar
        },
        onFailure: (err) => console.log("Fallo de conexión:", err),
        useSSL: true,
        userName: MQTT_USER,
        password: MQTT_PASS
    });
}

function onMessage(message) {
    const topicParts = message.destinationName.split('/');
    const sensorId = topicParts[1];

    if (!sensoresDetectados.has(sensorId)) {
        sensoresDetectados.add(sensorId);
        agregarBotonSensor(sensorId);
    }

    if (sensorId === sensorActual) {
        mostrarMensaje(message.payloadString);
    }
}

function mostrarMensaje(texto) {
    const log = document.getElementById("mensajes-log");
    const p = document.createElement("p");
    p.innerHTML = `<b>${new Date().toLocaleTimeString()}:</b> ${texto}`;
    log.prepend(p); // Pone el mensaje más nuevo arriba
}

function agregarBotonSensor(id) {
    const lista = document.getElementById("lista-sensores");
    const li = document.createElement("li");
    li.innerHTML = `<button onclick="seleccionarSensor('${id}')">Sensor: ${id}</button>`;
    lista.appendChild(li);
}

function seleccionarSensor(id) {
    sensorActual = id;
    document.getElementById("sensor-seleccionado").innerText = id;
    document.getElementById("mensajes-log").innerHTML = "<h3>Cargando historial de base de datos...</h3>";
    cargarHistorialFiltrado(id);
}

// NUEVA FUNCIÓN: Traer datos desde el Servidor (Railway SQL)
async function cargarHistorial() {
    const res = await fetch('/api/historial');
    const datos = await res.json();
    console.log("Datos de la DB cargados:", datos);
}

conectar();