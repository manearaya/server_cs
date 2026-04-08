

const socket = io();


socket.on('sensor', (datos) => {
    console.log("Dato recibido por Socket:", datos);
    // id de la tarjeta en html: card-sensor-id
    // io.emit('sensor', { id: data.id, estado: data.estado, timestamp: ahora, bateria: data.bateria });
    // actualizar datos 

});


socket.on('receptor', (datos) => {
    console.log("Dato recibido por Socket:", datos);
    // id de la tarjeta en html: card-receptor-id
    // io.emit('receptor', { id: data.id, bateria: data.bateria, timestamp: ahora });
    // actualizar datos 
});


socket.on('evento', (datos) => {
    console.log("Dato recibido por Socket:", datos);
    // card-evento-id
    // io.emit('evento', { id: data.id, t_respuesta: data.t_respuesta, timestamp: ahora , id_receptor: data.id_receptor, activa: 0});
  // por mientras cargar todo el historial
    cargarHistorial()
});

////////////// SENSORES ////////////////////
async function cargarSensores() {
    try {
        const respuesta = await fetch('/api/sensores');
        const listaSensores = await respuesta.json();
        poblarSensores(listaSensores)
    } catch (error) {
        console.error("Error conectando con servidor:", error);
    }
}

function poblarSensores(listaSensores){
    const estadosDict = {
        1: "Cama desocupada",
        2: "Riesgo de caída",
        3: "Cama ocupada"
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
        const nombreEstado = estadosDict[dato.estado];
        const nombreActivo = activoDict[dato.activo]

        // 2. Inyectamos una tarjeta limpia
        lista_sensores.innerHTML += `
            <div id="card-sensor-${dato.id}" class="${dato.estado === 2 ? 'bg-yellow-200 ' : dato.activo === 0 ? 'bg-gray-100 ' : 'bg-white'} p-6 rounded-lg shadow-sm border border-gray-200 ">
                <h3 class="text-lg font-bold text-gray-900 mb-3">
                    Sensor ${dato.id}
                </h3>
                <span class="text-lg font-medium  ${dato.estado === 0 ? 'text-red-900 font-bold ' : 'text-gray-900 font-bold '}">${nombreActivo}</span>
        
                <hr class="border-t border-gray-400 my-1">

                <ul class="space-y-2 text-base text-gray-600">
                    <li class="flex justify-between">
                        <span class="font-medium">Habitación:</span>
                        <span>${dato.habitacion}</span>
                    </li>

                    <hr class="border-t border-gray-400 my-1">

                    <li class="flex justify-between">
                        <span class="font-medium">Estado:</span>
                        <span class="${dato.estado === 2 ? 'text-red-900 font-bold ' : dato.estado === 1 ? 'text-gray-900 font-semibold ' : 'text-blue-600 font-semibold '} ">${nombreEstado}</span>
                    </li>

                    <hr class="border-t border-gray-400 my-1">


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
        const respuesta = await fetch('/api/receptores');
        const listaReceptores = await respuesta.json();
        poblarReceptores(listaReceptores)
    } catch (error) {
        console.error("Error conectando con servidor:", error);
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
        const nombreActivo = activoDict[dato.activo] || "Desconocido";

        //tarjeta
        lista_receptores.innerHTML += `
            <div id="card-receptor-${dato.id}" class=" ${dato.activo === 0 ? 'bg-gray-100 ' : 'bg-white'} p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 class="text-lg font-bold text-gray-900 mb-3">
                    Receptor ${dato.id}
                </h3>

                <ul class="space-y-2 text-base text-gray-600">
                <hr class="border-t border-gray-400 my-1">

                    <li class="flex justify-between">
                        <span class="${dato.activo === 0 ? 'text-red-500 font-bold' : 'font-semibold text-blue-600'}
                        font-semibold text-blue-600">${nombreActivo}</span>
                    </li>
                    <hr class="border-t border-gray-400 my-1">
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







async function cargarHistorial() {
    try {
        const respuesta = await fetch('/api/historial');
        const historial = await respuesta.json();
        poblarHistorial(historial);
        crearGraficoHistorico(historial) 
        renderizarEstadisticas("indicadores-rapidos", historial)

    } catch (error) {
        console.error("Error conectando con servidor:", error);

    }
}




function poblarHistorial(historial) {
    const contenedor = document.getElementById('lista-historial');
    if (!contenedor) return;
    
    contenedor.innerHTML = ""; 

    // nuevos arriba
    historial.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    historial.forEach(dato => {
        const fecha = new Date(dato.timestamp).toLocaleString('es-CL');
        const esAlerta = dato.activa === 1;

        contenedor.innerHTML += `
            <div id="card-historial-${dato.id}" class="flex items-center justify-between p-3 rounded-lg ${esAlerta ? 'bg-red-50' : 'bg-gray-50'} border border-transparent hover:border-gray-200 transition-all">
                <div class="flex flex-col">
                    <span class="text-xs font-mono text-gray-500">${fecha}</span>
                    <span class="text-base font-semibold text-gray-800">Evento #${dato.id}</span>
                </div>
                <div class="flex items-center gap-4">
                    <span class="text-xs font-medium text-gray-600">
                        ${dato.t_respuesta ? `Respuesta en:  ${dato.t_respuesta}s` : ''}
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
    hoy.setHours(0, 0, 0, 0); 

    eventos.forEach(ev => {
        if (ev.timestamp) {
            const fechaISO = ev.timestamp.split('T')[0];
            conteoPorDia[fechaISO] = (conteoPorDia[fechaISO] || 0) + 1;
        }
    });

    const etiquetas = [];
    const valores = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const isoFecha = d.toISOString().split('T')[0];
        
        let nombreDia;
        
        if (d.getTime() === hoy.getTime()) {
            nombreDia = "Hoy";
        } else {

            nombreDia = d.toLocaleDateString('es-CL', { weekday: 'long' });
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

    // si ya existe se borra para refrescar datos
    if (miGrafico) {
        miGrafico.destroy();
    }

    miGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datos.etiquetas,
            datasets: [{
                label: 'Intentos de levantarse',
                data: datos.valores
                //backgroundColor: '#3b82f6',
                //borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
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

    // eventos HOY
    const hoyStr = new Date().toISOString().split('T')[0];
    const eventosHoy = eventos.filter(ev => ev.timestamp.startsWith(hoyStr)).length;

    // tiempo de atencion avg
    // sacar los null 
    const eventosConRespuesta = eventos.filter(ev => ev.t_respuesta !== null && ev.t_respuesta !== undefined);
    const promedio = eventosConRespuesta.length > 0 
        ? (eventosConRespuesta.reduce((acc, ev) => acc + ev.t_respuesta, 0) / eventosConRespuesta.length).toFixed(1)
        : "N/A";

    // hora con más eventos
    const horasConteo = {};
    eventos.forEach(ev => {
        const hora = new Date(ev.timestamp).getHours();
        horasConteo[hora] = (horasConteo[hora] || 0) + 1;
    });
    
    // hacer el max a la antigua
    let horaPeak = "N/A";
    let maxEventos = 0;
    for (const [hora, cantidad] of Object.entries(horasConteo)) {
        if (cantidad > maxEventos) {
            maxEventos = cantidad;
            horaPeak = `${hora}:00 - ${parseInt(hora) + 1}:00`;
        }
    }



    contenedor.innerHTML = `

<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        <div class="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
            <p class="text-xs font-bold text-blue-600 uppercase tracking-wider">Eventos registrados hoy:</p>
            <p class="text-3xl font-black text-blue-900">${eventosHoy}</p>
        </div>

        <div class="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
                <p class="text-xs font-bold text-blue-600 uppercase tracking-wider">Tiempo de atención promedio:</p>
            <p class="text-3xl font-black text-blue-900">${promedio} s</p>
        </div>

        <div class="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
        <p class="text-xs font-bold text-blue-600 uppercase tracking-wider">Horario con más eventos históricamente:</p>
            <p class="text-3xl font-black text-blue-900">${horaPeak}</p>
        </div>

    </div>
    `;
}


cargarHistorial();


cargarSensores();

cargarReceptores();