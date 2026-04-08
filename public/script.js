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

const listaSensores = [
    { id: 1, estado: 1, activo: 0, timestamp: "2026-04-07T14:22:10", bateria: 10, habitacion: "9" },
    { id: 2, estado: 3, activo: 0, timestamp: "2026-04-08T03:45:12", bateria: 50, habitacion: "8" },
    { id: 3, estado: 2, activo: 1, timestamp: "2026-04-08T04:10:05", bateria: 70, habitacion: "7" },
    { id: 11, estado: 1, activo: 1, timestamp: "2026-04-06T09:15:30", bateria: 40, habitacion: "25" },
    { id: 31, estado: 2, activo: 1, timestamp: "2026-04-08T02:30:45", bateria: 67, habitacion: "1" },
    { id: 5, estado: 1, activo: 1, timestamp: "2026-04-05T18:20:00", bateria: 90, habitacion: "11" },
    { id: 83, estado: 3, activo: 1, timestamp: "2026-04-07T22:12:15", bateria: 45, habitacion: "12" },
    { id: 15, estado: 1, activo: 1, timestamp: "2026-04-04T11:05:40", bateria: 40, habitacion: "2" },
    { id: 34, estado: 2, activo: 1, timestamp: "2026-04-08T01:55:20", bateria: 67, habitacion: "1" },
    { id: 7, estado: 1, activo: 1, timestamp: "2026-04-07T08:30:00", bateria: 90, habitacion: "11" },
    { id: 8, estado: 3, activo: 1, timestamp: "2026-04-06T15:45:10", bateria: 45, habitacion: "12" }
];

const listaReceptores = [
    { id: 1, activo: 0, timestamp: "2026-04-08T00:10:00", bateria: 10 },
    { id: 2, activo: 0, timestamp: "2026-04-07T19:30:22", bateria: 50 },
    { id: 31, activo: 1, timestamp: "2026-04-08T04:05:00", bateria: 67 },
    { id: 7, activo: 1, timestamp: "2026-04-06T12:00:00", bateria: 90 }
];



// 1. Conectamos: Buscamos el elemento por su ID
const lista_sensores = document.getElementById('lista-sensores');

const estadosDict = {
    1: "Desocupado",
    2: "Intento",
    3: "Ocupado"
};

const activoDict = {
    0: "Desconectado",
    1: "Activo"
};

const prioridadEstado = {
    2: 1, // El estado 2 es la prioridad #1
    1: 2, // El estado 1 es la prioridad #2
    3: 3  // El estado 3 es la prioridad #3
};

listaSensores.sort((a, b) => {
    // --- PRIORIDAD 1: Estado (2 > 1 > 3) ---
    if (prioridadEstado[a.estado] !== prioridadEstado[b.estado]) {
        return prioridadEstado[a.estado] - prioridadEstado[b.estado];
    }

    // --- PRIORIDAD 2: Activo (0 va primero) ---
    // Si los estados son iguales, comparamos el campo 'activo'
    if (a.activo !== b.activo) {
        return a.activo - b.activo; // 0 viene antes que 1
    }

    // --- PRIORIDAD 3: Batería (Menor a mayor) ---
    // Si el estado y el activo son iguales, ordenamos por batería
    return a.bateria - b.bateria;
});

// 2. Construimos: Recorremos los datos y creamos el HTML
listaSensores.forEach(dato => {
    // agregarle if tipo = sensor
    // que cambie de color cuando esta inactivo y cuando 
    // 1. Obtenemos el texto del diccionario
    const nombreEstado = estadosDict[dato.estado] || "Desconocido";

    // 2. Inyectamos una tarjeta limpia
    lista_sensores.innerHTML += `
        <div class="${dato.activo === 0 ? 'bg-yellow-100 ' : 'bg-white'} p-6 rounded-lg shadow-sm border border-gray-200">
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



listaReceptores.sort((a, b) => {
    // --- PRIORIDAD 2: Activo (0 va primero) ---
    // Si los estados son iguales, comparamos el campo 'activo'
    if (a.activo !== b.activo) {
        return a.activo - b.activo; // 0 viene antes que 1
    }

    // --- PRIORIDAD 3: Batería (Menor a mayor) ---
    // Si el estado y el activo son iguales, ordenamos por batería
    return a.bateria - b.bateria;
});


const lista_receptores = document.getElementById('lista-receptores');
listaReceptores.forEach(dato => {
    // agregarle if tipo = sensor
    // que cambie de color cuando esta inactivo y cuando 
    // 1. Obtenemos el texto del diccionario
    const nombreActivo = activoDict[dato.activo] || "Desconocido";

    // 2. Inyectamos una tarjeta limpia
    lista_receptores.innerHTML += `
        <div class=" ${dato.activo === 0 ? 'bg-yellow-100 ' : 'bg-white'} p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-lg font-bold text-gray-900 mb-3">
                Receptor ${dato.id}
            </h3>

            <ul class="space-y-2 text-sm text-gray-600">

                <li class="flex justify-between">
                    <span class="${dato.activo === 0 ? 'text-red-500 font-bold' : 'font-semibold text-blue-600'}
                    font-semibold text-blue-600">${nombreActivo}</span>
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


async function cargarHistorial() {
    try {
        // 1. Llamamos al servidor
        const respuesta = await fetch('/api/historial');
        
        // 2. Convertimos la respuesta a un objeto JS
        const historial = await respuesta.json();

        // 3. Pasamos los datos a tu función de renderizado
        poblarHistorial(historial);

    } catch (error) {
        console.error("Error conectando con el servidor:", error);
    }
}


function poblarHistorial(historial) {
    const contenedor = document.getElementById('lista-historial');
    contenedor.innerHTML = ""; // Limpiar

    // para dejar los mas nuevos arriba
    historial.sort((a, b) => {
        if (a.activo !== b.activo) {
        return b.activo - a.activo; // 1 viene antes que 0
    }
    return new Date(b.timestamp) - new Date(a.timestamp);
    });

    historial.forEach(ev => {
        const fecha = new Date(ev.timestamp).toLocaleString();
        contenedor.innerHTML += `
            <div class="p-3 border-b border-gray-100">
                <p class="text-xs text-gray-400">${fecha}</p>
                <p class="text-sm font-bold">Evento ID: ${ev.id}</p>
                <p class="text-xs">${ev.activa ? '⚠️ Activa' : '✅ Resuelta'}</p>
            </div>
        `;
    });
}

cargarHistorial();