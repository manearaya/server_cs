// --- CONFIGURACIÓN DE HIVEMQ ---
// Estos valores deben coincidir con tu Cluster de HiveMQ
// const MQTT_HOST = "54ef479282364fc19a690d68c4682d64.s1.eu.hivemq.cloud"; // TU CLUSTER URL
// const MQTT_PORT = 8884; 
// const MQTT_USER = "manemane";
// const MQTT_PASS = "Manemane1";

// const client = new Paho.MQTT.Client(MQTT_HOST, MQTT_PORT, "web_client_" + Math.random());
// let sensorActual = null;
// const sensoresDetectados = new Set();

// // Configurar callbacks
// client.onMessageArrived = onMessage;
// client.onConnectionLost = (resp) => console.log("Conexión perdida:", resp.errorMessage);

// // Función para conectar
// function conectar() {
//     client.connect({
//         onSuccess: () => {
//             console.log("¡Conectado a HiveMQ!");
//             client.subscribe("sensores/#");
//             cargarHistorial(); // Cargar datos de la DB al iniciar
//         },
//         onFailure: (err) => console.log("Fallo de conexión:", err),
//         useSSL: true,
//         userName: MQTT_USER,
//         password: MQTT_PASS
//     });
// }

const misDatos = [
    { id: "01", tipo: "sensor", estado: 1, activo: 0,  timestamp: "13:10", bateria: "10", habitacion: "9"},
    { id: "02", tipo: "sensor", estado: 3, activo: 0,  timestamp: "13:12", bateria: "50", habitacion: "8"},
    { id: "03", tipo: "sensor", estado: 2, activo: 1,  timestamp: "13:11", bateria: "70", habitacion: "7"},
    { id: "11", tipo: "sensor", estado: 1, activo: 1,  timestamp: "13:10", bateria: "40", habitacion: "2"},
    { id: "31", tipo: "sensor", estado: 2, activo: 1,  timestamp: "13:09", bateria: "67", habitacion: "1"},
    { id: "07", tipo: "sensor", estado: 1, activo: 1,  timestamp: "13:10", bateria: "90", habitacion: "11"},
    { id: "08", tipo: "sensor", estado: 3, activo: 1,  timestamp: "13:08", bateria: "45", habitacion: "12"},
    { id: "11", tipo: "sensor", estado: 1, activo: 1,  timestamp: "13:10", bateria: "40", habitacion: "2"},
    { id: "31", tipo: "sensor", estado: 2, activo: 1,  timestamp: "13:09", bateria: "67", habitacion: "1"},
    { id: "07", tipo: "sensor", estado: 1, activo: 1,  timestamp: "13:10", bateria: "90", habitacion: "11"},
    { id: "08", tipo: "sensor", estado: 3, activo: 1,  timestamp: "13:08", bateria: "45", habitacion: "12"}
];

// 1. Conectamos: Buscamos el elemento por su ID
const lista = document.getElementById('lista-sensores');

const estadosDict = {
    1: "Desocupado",
    2: "Intento",
    3: "Ocupado"
};

// 2. Construimos: Recorremos los datos y creamos el HTML
misDatos.forEach(dato => {
    // agregarle if tipo = sensor
    // que cambie de color cuando esta inactivo y cuando 
    // 1. Obtenemos el texto del diccionario
    const nombreEstado = estadosDict[dato.estado] || "Desconocido";

    // 2. Inyectamos una tarjeta limpia
    lista.innerHTML += `
        <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-lg font-bold text-gray-900 mb-3">
                Sensor ${dato.id}
            </h3>

            <ul class="space-y-2 text-sm text-gray-600">
                <li class="flex justify-between">
                    <span class="font-medium">Habitación:</span>
                    <span>${dato.habitacion}</span>
                </li>
                <li class="flex justify-between">
                    <span class="font-medium">Estado:</span>
                    <span class="font-semibold text-blue-600">${nombreEstado}</span>
                </li>
                <li class="flex justify-between">
                    <span class="font-medium">Batería:</span>
                    <span class="${dato.bateria < 20 ? 'text-red-500 font-bold' : ''}">
                        ${dato.bateria}%
                    </span>
                </li>
            </ul>
        </div>
    `;
});



// function onMessage(message) {
//     const topicParts = message.destinationName.split('/');
//     const sensorId = topicParts[1];

//     if (!sensoresDetectados.has(sensorId)) {
//         sensoresDetectados.add(sensorId);
//         agregarBotonSensor(sensorId);
//     }

//     if (sensorId === sensorActual) {
//         mostrarMensaje(message.payloadString);
//     }
// }

// function mostrarMensaje(texto) {
//     const log = document.getElementById("mensajes-log");
//     const p = document.createElement("p");
//     p.innerHTML = `<b>${new Date().toLocaleTimeString()}:</b> ${texto}`;
//     log.prepend(p); // Pone el mensaje más nuevo arriba
// }

// function agregarBotonSensor(id) {
//     const lista = document.getElementById("lista-sensores");
//     const li = document.createElement("li");
//     li.innerHTML = `<button onclick="seleccionarSensor('${id}')">Sensor: ${id}</button>`;
//     lista.appendChild(li);
// }

// function seleccionarSensor(id) {
//     sensorActual = id;
//     document.getElementById("sensor-seleccionado").innerText = id;
//     document.getElementById("mensajes-log").innerHTML = "<h3>Cargando historial de base de datos...</h3>";
//     cargarHistorialFiltrado(id);
// }

// // NUEVA FUNCIÓN: Traer datos desde el Servidor (Railway SQL)
// async function cargarHistorial() {
//     const res = await fetch('/api/historial');
//     const datos = await res.json();
//     console.log("Datos de la DB cargados:", datos);
// }

// conectar();