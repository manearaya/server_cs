

const socket = io();


socket.on('sensor', (datos) => {
    console.log("Dato recibido por Socket:", datos);


});


socket.on('receptor', (datos) => {
    console.log("Dato recibido por Socket:", datos);
    // card-receptor-id
    
    // OPCIÓN A: La forma floja (pero segura)
    // Simplemente vuelve a llamar a tu función que trae todo de la DB
    //cargarDashboardCompleto(); 

    // OPCIÓN B: La forma pro (actualizar solo esa tarjeta)
    // buscarTarjetaPorId(datos.id).actualizar(datos.estado);
});


socket.on('evento', (datos) => {
    console.log("Dato recibido por Socket:", datos);
    // card-evento-id
    
    // OPCIÓN A: La forma floja (pero segura)
    // Simplemente vuelve a llamar a tu función que trae todo de la DB
    //cargarDashboardCompleto(); 

    // OPCIÓN B: La forma pro (actualizar solo esa tarjeta)
    // buscarTarjetaPorId(datos.id).actualizar(datos.estado);
    cargarHistorial()
});

////////////// SENSORES ////////////////////
async function cargarSensores() {
    try {
        // 1. Llamamos al servidor
        const respuesta = await fetch('/api/sensores');
        // 2. Convertimos la respuesta a un objeto JS
        const listaSensores = await respuesta.json();
        // 3. Pasamos los datos a tu función de renderizado
        poblarSensores(listaSensores)
    } catch (error) {
        console.error("Error conectando con el servidor:", error);
    }
}

function poblarSensores(listaSensores){
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
        2: 1, 
        1: 2, 
        3: 3  
    };

    listaSensores.sort((a, b) => {
    // prioridad estados
        if (prioridadEstado[a.estado] !== prioridadEstado[b.estado]) {
                return prioridadEstado[a.estado] - prioridadEstado[b.estado];
            }
        // prioridad activo
            if (a.activo !== b.activo) {
                return a.activo - b.activo; 
            }
        // prioridad bateeria
            return a.bateria - b.bateria;
        });



    const lista_sensores = document.getElementById('lista-sensores');


    listaSensores.forEach(dato => {
        // agregarle if tipo = sensor
        // que cambie de color cuando esta inactivo y cuando 
        // 1. Obtenemos el texto del diccionario
        const nombreEstado = estadosDict[dato.estado] || "Desconocido";

        // 2. Inyectamos una tarjeta limpia
        lista_sensores.innerHTML += `
            <div id="card-sensor-${dato.id}" class="${dato.activo === 0 ? 'bg-yellow-100 ' : 'bg-white'} p-6 rounded-lg shadow-sm border border-gray-200">
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
}


async function cargarReceptores() {
    try {
        // 1. Llamamos al servidor
        const respuesta = await fetch('/api/receptores');
        // 2. Convertimos la respuesta a un objeto JS
        const listaReceptores = await respuesta.json();
        // 3. Pasamos los datos a tu función de renderizado
        poblarReceptores(listaReceptores)
    } catch (error) {
        console.error("Error conectando con el servidor:", error);
    }
}

function poblarReceptores(listaReceptores) {
    const activoDict = {
        0: "Desconectado",
        1: "Activo"
    };

    listaReceptores.sort((a, b) => {
        // activos
        if (a.activo !== b.activo) {
            return a.activo - b.activo; 
        }
        // bateria
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
            <div id="card-receptor-${dato.id}" class=" ${dato.activo === 0 ? 'bg-yellow-100 ' : 'bg-white'} p-6 rounded-lg shadow-sm border border-gray-200">
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

}




// const listaReceptores = [
//     { id: 1, activo: 0, timestamp: "2026-04-08T00:10:00", bateria: 10 },
//     { id: 2, activo: 0, timestamp: "2026-04-07T19:30:22", bateria: 50 },
//     { id: 31, activo: 1, timestamp: "2026-04-08T04:05:00", bateria: 67 },
//     { id: 7, activo: 1, timestamp: "2026-04-06T12:00:00", bateria: 90 }
// ];





// const activoDict = {
//     0: "Desconectado",
//     1: "Activo"
// };




// listaReceptores.sort((a, b) => {
//     // --- PRIORIDAD 2: Activo (0 va primero) ---
//     // Si los estados son iguales, comparamos el campo 'activo'
//     if (a.activo !== b.activo) {
//         return a.activo - b.activo; // 0 viene antes que 1
//     }

//     // --- PRIORIDAD 3: Batería (Menor a mayor) ---
//     // Si el estado y el activo son iguales, ordenamos por batería
//     return a.bateria - b.bateria;
// });


// const lista_receptores = document.getElementById('lista-receptores');
// listaReceptores.forEach(dato => {
//     // agregarle if tipo = sensor
//     // que cambie de color cuando esta inactivo y cuando 
//     // 1. Obtenemos el texto del diccionario
//     const nombreActivo = activoDict[dato.activo] || "Desconocido";

//     // 2. Inyectamos una tarjeta limpia
//     lista_receptores.innerHTML += `
//         <div class=" ${dato.activo === 0 ? 'bg-yellow-100 ' : 'bg-white'} p-6 rounded-lg shadow-sm border border-gray-200">
//             <h3 class="text-lg font-bold text-gray-900 mb-3">
//                 Receptor ${dato.id}
//             </h3>

//             <ul class="space-y-2 text-sm text-gray-600">

//                 <li class="flex justify-between">
//                     <span class="${dato.activo === 0 ? 'text-red-500 font-bold' : 'font-semibold text-blue-600'}
//                     font-semibold text-blue-600">${nombreActivo}</span>
//                 </li>
//                 <li class="flex justify-between">
//                     <span class="font-medium">Batería:</span>
//                     <span class="${dato.bateria < 20 ? 'text-red-500 font-bold' : ''}">
//                         ${dato.bateria}%
//                     </span>
//                 </li>
//             </ul>
//         </div>
//     `;
// });


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

    historial.forEach(dato => {
        const fecha = new Date(dato.timestamp).toLocaleString('es-CL');
        const esAlerta = dato.activa === 1;

        contenedor.innerHTML += `
            <div id="card-historial-${dato.id}" class="flex items-center justify-between p-3 rounded-lg ${esAlerta ? 'bg-red-50' : 'bg-gray-50'} border border-transparent hover:border-gray-200 transition-all">
                <div class="flex flex-col">
                    <span class="text-xs font-mono text-gray-500">${fecha}</span>
                    <span class="text-sm font-semibold text-gray-800">Evento #${dato.id}</span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-xs font-medium text-gray-600">
                        ${dato.t_respuesta ? `⏱️ ${dato.t_respuesta}m` : ''}
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
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizamos a medianoche para comparar solo fechas

    // 1. Agrupar eventos por fecha ISO (YYYY-MM-DD)
    eventos.forEach(ev => {
        if (ev.timestamp) {
            const fechaISO = ev.timestamp.split('T')[0];
            conteoPorDia[fechaISO] = (conteoPorDia[fechaISO] || 0) + 1;
        }
    });

    const etiquetas = [];
    const valores = [];
    
    // 2. Generar etiquetas para los últimos 7 días
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const isoFecha = d.toISOString().split('T')[0];
        
        // --- Lógica de Nombres de Días ---
        let nombreDia;
        
        if (d.getTime() === hoy.getTime()) {
            nombreDia = "Hoy";
        } else {
            // Obtenemos el nombre del día (lunes, martes...) en español
            nombreDia = d.toLocaleDateString('es-CL', { weekday: 'long' });
            // Capitalizamos la primera letra (opcional)
            nombreDia = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);
        }
        
        etiquetas.push(nombreDia);
        valores.push(conteoPorDia[isoFecha] || 0);
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


cargarSensores();

cargarReceptores();