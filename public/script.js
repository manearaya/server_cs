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
        crearGraficoHistorico(historial) 
        renderizarEstadisticas("indicadores-rapidos", historial)

    } catch (error) {
        console.error("Error conectando con el servidor:", error);

    }
}


// function poblarHistorial(historial) {
//     const contenedor = document.getElementById('lista-historial');
//     contenedor.innerHTML = ""; // Limpiar

//     // para dejar los mas nuevos arriba
//     historial.sort((a, b) => {
//         if (a.activo !== b.activo) {
//         return b.activo - a.activo; // 1 viene antes que 0
//     }
//     return new Date(b.timestamp) - new Date(a.timestamp);
//     });

//     historial.forEach(ev => {
//         const fecha = new Date(ev.timestamp).toLocaleString();
//         contenedor.innerHTML += `
//             <div class="p-3 border-b border-gray-100">
//                 <p class="text-xs text-gray-400">${fecha}</p>
//                 <p class="text-sm font-bold">Evento ID: ${ev.id}</p>
//                 <p class="text-xs">${ev.activa ? '⚠️ Activa' : '✅ Resuelta'}</p>
//             </div>
//         `;
//     });
// }

function poblarHistorial(historial) {
    const contenedor = document.getElementById('lista-historial');
    if (!contenedor) return;
    
    contenedor.innerHTML = ""; 

    // Ordenar: Nuevos arriba
    historial.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    historial.forEach(ev => {
        const fecha = new Date(ev.timestamp).toLocaleString('es-CL');
        const esAlerta = ev.activa === 1;

        contenedor.innerHTML += `
            <div class="flex items-center justify-between p-3 rounded-lg ${esAlerta ? 'bg-red-50' : 'bg-gray-50'} border border-transparent hover:border-gray-200 transition-all">
                <div class="flex flex-col">
                    <span class="text-xs font-mono text-gray-500">${fecha}</span>
                    <span class="text-sm font-semibold text-gray-800">Evento #${ev.id}</span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-xs font-medium text-gray-600">
                        ${ev.t_respuesta ? `⏱️ ${ev.t_respuesta}m` : ''}
                    </span>
                    <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${esAlerta ? 'bg-red-200 text-red-700 animate-pulse' : 'bg-green-200 text-green-700'}">
                        ${esAlerta ? 'Pendiente' : 'Resuelto'}
                    </span>
                </div>
            </div>
        `;
    });
}




function procesarEventosPorDia(eventos) {
    const conteoPorDia = {};

    // 1. Agrupar. Usamos un bloque try/catch por si algún timestamp viene mal
    eventos.forEach(ev => {
        try {
            if (ev.timestamp) {
                const fecha = ev.timestamp.split('T')[0];
                conteoPorDia[fecha] = (conteoPorDia[fecha] || 0) + 1;
            }
        } catch (e) {
            console.error("Error procesando timestamp:", ev);
        }
    });

    const etiquetas = [];
    const valores = [];
    
    // 2. Generar últimos 7 días terminando en HOY (8 de abril)
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const isoFecha = d.toISOString().split('T')[0];
        
        // Formato más humano para el eje X (ej: "08/04")
        const diaMes = `${d.getDate()}/${d.getMonth() + 1}`;
        
        etiquetas.push(diaMes);
        valores.push(conteoPorDia[isoFecha] || 0); // Maneja días sin eventos
    }

    return { etiquetas, valores };
}


let miGrafico = null; // Variable global para controlar el objeto del gráfico

function crearGraficoHistorico(eventos) {
    const canvas = document.getElementById('graficoEventos');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const datos = procesarEventosPorDia(eventos);

    // Si ya existe un gráfico, lo borramos para refrescar datos
    if (miGrafico) {
        miGrafico.destroy();
    }

    miGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datos.etiquetas,
            datasets: [{
                label: 'Eventos de Caída',
                data: datos.valores,
                backgroundColor: '#3b82f6', // Azul Tailwind
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1, // Solo números enteros
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderizarEstadisticas(idDiv, eventos) {
    const contenedor = document.getElementById(idDiv);
    if (!contenedor) return;

    // --- CÁLCULO 1: Eventos de hoy ---
    const hoyStr = new Date().toISOString().split('T')[0];
    const eventosHoy = eventos.filter(ev => ev.timestamp.startsWith(hoyStr)).length;

    // --- CÁLCULO 2: Tiempo de atención promedio ---
    // Filtramos solo los que tienen t_respuesta (no null)
    const eventosConRespuesta = eventos.filter(ev => ev.t_respuesta !== null && ev.t_respuesta !== undefined);
    const promedio = eventosConRespuesta.length > 0 
        ? (eventosConRespuesta.reduce((acc, ev) => acc + ev.t_respuesta, 0) / eventosConRespuesta.length).toFixed(1)
        : "N/A";

    // --- CÁLCULO 3: Hora pico (Moda de las horas) ---
    const horasConteo = {};
    eventos.forEach(ev => {
        const hora = new Date(ev.timestamp).getHours();
        horasConteo[hora] = (horasConteo[hora] || 0) + 1;
    });
    
    // Encontrar la hora con el valor más alto
    let horaPico = "N/A";
    let maxEventos = 0;
    for (const [hora, cantidad] of Object.entries(horasConteo)) {
        if (cantidad > maxEventos) {
            maxEventos = cantidad;
            horaPico = `${hora}:00 - ${parseInt(hora) + 1}:00`;
        }
    }

    // --- RENDERIZADO DEL HTML ---
    contenedor.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                <p class="text-xs font-bold text-blue-600 uppercase tracking-wider">Eventos Hoy</p>
                <p class="text-3xl font-black text-blue-900">${eventosHoy}</p>
            </div>
            
            <div class="bg-green-50 p-4 rounded-xl border border-green-100 text-center">
                <p class="text-xs font-bold text-green-600 uppercase tracking-wider">Promedio Respuesta</p>
                <p class="text-3xl font-black text-green-900">${promedio} <span class="text-sm font-normal">min</span></p>
            </div>

            <div class="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
                <p class="text-xs font-bold text-purple-600 uppercase tracking-wider">Hora de Mayor Riesgo</p>
                <p class="text-xl font-black text-purple-900">${horaPico}</p>
            </div>
        </div>
    `;
}


cargarHistorial();