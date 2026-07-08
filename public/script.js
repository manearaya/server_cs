const socket = io();

// ─────────────────────────────────────────────────────────────
//  Helpers de identidad
// ─────────────────────────────────────────────────────────────
function idTarjetaSensor(dato)   { return `card-sensor-${dato.id_receptor}-${dato.id}`; }
function idTarjetaReceptor(dato) { return `card-receptor-${dato.id}`; }

// ─────────────────────────────────────────────────────────────
//  Socket events
// ─────────────────────────────────────────────────────────────
socket.on('sensor', (datos) => {
    console.log("Socket sensor:", datos);
    if (document.getElementById(idTarjetaSensor(datos))) {
        actualizarTarjetaSensor(datos);
    } else {
        cargarSensores();
    }
});



socket.on('sensor_eliminado', (datos) => {
    console.log("Socket sensor_eliminado:", datos);
    const card = document.getElementById(idTarjetaSensor(datos));
    if (card) card.remove();
});

socket.on('receptor', (datos) => {
    console.log("Socket receptor:", datos);
    if (document.getElementById(idTarjetaReceptor(datos))) {
        actualizarTarjetaReceptor(datos);
    } else {
        cargarReceptores();
    }
});

socket.on('evento', (datos) => {
    console.log("Socket evento:", datos);
    cargarHistorial();
});

// ─────────────────────────────────────────────────────────────
//  Diccionarios
// ─────────────────────────────────────────────────────────────
const estadosDict = {
    1: "Cama ocupada",
    2: "Riesgo de caída",
    3: "Cama desocupada"
};

const activoDict = {
    0: "Desconectado",
    1: "Activo"
};

// ─────────────────────────────────────────────────────────────
//  HTML interno de las tarjetas
// ─────────────────────────────────────────────────────────────
function htmlInteriorSensor(dato) {
    const nombreEstado = estadosDict[dato.estado] ?? dato.estado;
    const nombreActivo = activoDict[dato.activo]  ?? "Desconocido";

    return `
        <h3 class="text-lg font-bold text-gray-900 mb-1">Sensor ${dato.id}</h3>
        <p class="text-xs text-gray-400 mb-2">Receptor ${dato.id_receptor}</p>
        <span class="text-lg font-medium ${dato.activo === 0 ? 'text-red-900 font-bold' : 'text-gray-900 font-bold'}">
            ${nombreActivo}
        </span>
        <hr class="border-t border-gray-400 my-1">
        <ul class="space-y-2 text-base text-gray-600">
            <li class="flex justify-between">
                <span class="font-medium">Estado:</span>
                <span class="${dato.estado === 2 ? 'text-red-900 font-bold' : dato.estado === 1 ? 'text-gray-900 font-semibold' : 'text-blue-600 font-semibold'}">
                    ${nombreEstado}
                </span>
            </li>
            <hr class="border-t border-gray-400 my-1">
            <li class="flex justify-between">
                <span class="font-medium">Batería:</span>
                <span class="${dato.bateria < 20 ? 'text-red-500 font-bold' : ''}">
                    ${dato.bateria}%
                </span>
            </li>
        </ul>
    `;
}

function htmlInteriorReceptor(dato) {
    const nombreActivo = activoDict[dato.activo] ?? "Desconocido";

    return `
        <h3 class="text-lg font-bold text-gray-900 mb-3">Receptor ${dato.id}</h3>
        <ul class="space-y-2 text-base text-gray-600">
            <hr class="border-t border-gray-400 my-1">
            <li class="flex justify-between">
                <span class="${dato.activo === 0 ? 'text-red-500 font-bold' : 'font-semibold text-blue-600'}">
                    ${nombreActivo}
                </span>
            </li>
            <hr class="border-t border-gray-400 my-1">
            <li class="flex justify-between">
                <span class="font-medium">Batería:</span>
                <span class="${dato.bateria < 20 ? 'text-red-500 font-bold' : ''}">
                    ${dato.bateria}%
                </span>
            </li>
        </ul>
    `;
}

// Clases del contenedor según estado
function clasesTarjetaSensor(dato) {
    if (dato.estado === 2)  return 'bg-yellow-200';
    if (dato.activo === 0)  return 'bg-gray-100';
    return 'bg-white';
}

function clasesTarjetaReceptor(dato) {
    return dato.activo === 0 ? 'bg-gray-100' : 'bg-white';
}

// ─────────────────────────────────────────────────────────────
//  Actualizar una tarjeta existente
// ─────────────────────────────────────────────────────────────
function actualizarTarjetaSensor(dato) {
    const card = document.getElementById(idTarjetaSensor(dato));
    if (!card) return;
    card.className = `${clasesTarjetaSensor(dato)} p-6 rounded-lg shadow-sm border border-gray-200`;
    card.innerHTML = htmlInteriorSensor(dato);
}

function actualizarTarjetaReceptor(dato) {
    const card = document.getElementById(idTarjetaReceptor(dato));
    if (!card) return;
    card.className = `${clasesTarjetaReceptor(dato)} p-6 rounded-lg shadow-sm border border-gray-200`;
    card.innerHTML = htmlInteriorReceptor(dato);
}

// ─────────────────────────────────────────────────────────────
//  Carga completa
// ─────────────────────────────────────────────────────────────
async function cargarSensores() {
    try {
        const respuesta = await fetch('/api/sensores');
        const listaSensores = await respuesta.json();
        poblarSensores(listaSensores);
    } catch (error) {
        console.error("Error cargando sensores:", error);
    }
}

function poblarSensores(listaSensores) {
    const prioridadEstado = { 2: 1, 1: 2, 3: 3 };

    listaSensores.sort((a, b) => {
        if (prioridadEstado[a.estado] !== prioridadEstado[b.estado])
            return prioridadEstado[a.estado] - prioridadEstado[b.estado];
        if (a.activo !== b.activo)
            return a.activo - b.activo;
        return a.bateria - b.bateria;
    });

    const lista = document.getElementById('lista-sensores');
    lista.innerHTML = '';

    listaSensores.forEach(dato => {
        const card = document.createElement('div');
        card.id        = idTarjetaSensor(dato);
        card.className = `${clasesTarjetaSensor(dato)} p-6 rounded-lg shadow-sm border border-gray-200`;
        card.innerHTML = htmlInteriorSensor(dato);
        lista.appendChild(card);
    });
}

async function cargarReceptores() {
    try {
        const respuesta = await fetch('/api/receptores');
        const listaReceptores = await respuesta.json();
        poblarReceptores(listaReceptores);
    } catch (error) {
        console.error("Error cargando receptores:", error);
    }
}

function poblarReceptores(listaReceptores) {
    listaReceptores.sort((a, b) => {
        if (a.activo !== b.activo) return a.activo - b.activo;
        return a.bateria - b.bateria;
    });

    const lista = document.getElementById('lista-receptores');
    lista.innerHTML = '';

    listaReceptores.forEach(dato => {
        const card = document.createElement('div');
        card.id        = idTarjetaReceptor(dato);
        card.className = `${clasesTarjetaReceptor(dato)} p-6 rounded-lg shadow-sm border border-gray-200`;
        card.innerHTML = htmlInteriorReceptor(dato);
        lista.appendChild(card);
    });
}

// ─────────────────────────────────────────────────────────────
//  Historial
// ─────────────────────────────────────────────────────────────
async function cargarHistorial() {
    try {
        const respuesta = await fetch('/api/historial');
        const historial = await respuesta.json();
        poblarHistorial(historial);
        crearGraficoHistorico(historial);
        renderizarEstadisticas("indicadores-rapidos", historial);
    } catch (error) {
        console.error("Error cargando historial:", error);
    }
}

function poblarHistorial(historial) {
    const contenedor = document.getElementById('lista-historial');
    if (!contenedor) return;

    contenedor.innerHTML = '';
    historial.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    historial.forEach(dato => {
        const fecha    = new Date(dato.timestamp).toLocaleString('es-CL');
        const esAlerta = dato.activa === 1;

        const item = document.createElement('div');
        item.id        = `card-historial-${dato.id}`;
        item.className = `flex items-center justify-between p-3 rounded-lg ${esAlerta ? 'bg-red-50' : 'bg-gray-50'} border border-transparent hover:border-gray-200 transition-all`;
        item.innerHTML = `
            <div class="flex flex-col">
                <span class="text-xs font-mono text-gray-500">${fecha}</span>
                <span class="text-base font-semibold text-gray-800">
                    Evento #${dato.id}${dato.id_sensor != null ? ` · Sensor ${dato.id_sensor} (R${dato.id_receptor})` : ''}
                </span>
            </div>
            <div class="flex items-center gap-4">
                <span class="text-xs font-medium text-gray-600">
                    ${dato.t_respuesta != null ? `Respuesta en: ${dato.t_respuesta}s` : ''}
                </span>
                <span class="px-2 py-1 rounded text-[10px] font-bold uppercase ${esAlerta ? 'bg-red-200 text-red-700 animate-pulse' : 'bg-green-200 text-green-700'}">
                    ${esAlerta ? 'Pendiente' : 'Resuelto'}
                </span>
            </div>
        `;
        contenedor.appendChild(item);
    });
}

// ─────────────────────────────────────────────────────────────
//  Gráfico y estadísticas
// ─────────────────────────────────────────────────────────────
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
    const valores   = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);

        const isoFecha  = d.toISOString().split('T')[0];
        let   nombreDia = d.getTime() === hoy.getTime()
            ? "Hoy"
            : d.toLocaleDateString('es-CL', { weekday: 'long' });
        nombreDia = nombreDia.charAt(0).toUpperCase() + nombreDia.slice(1);

        etiquetas.push(nombreDia);
        valores.push(conteoPorDia[isoFecha] || 0);
    }

    return { etiquetas, valores };
}

let miGrafico = null;

function crearGraficoHistorico(eventos) {
    const canvas = document.getElementById('graficoEventos');
    if (!canvas) return;

    const ctx   = canvas.getContext('2d');
    const datos = procesarEventosPorDia(eventos);

    if (miGrafico) miGrafico.destroy();

    miGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: datos.etiquetas,
            datasets: [{
                label: 'Intentos de levantarse',
                data:  datos.valores
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderizarEstadisticas(idDiv, eventos) {
    const contenedor = document.getElementById(idDiv);
    if (!contenedor) return;

    const hoyStr     = new Date().toISOString().split('T')[0];
    const eventosHoy = eventos.filter(ev => ev.timestamp && ev.timestamp.startsWith(hoyStr)).length;

    const eventosConRespuesta = eventos.filter(ev => ev.t_respuesta != null);
    const promedio = eventosConRespuesta.length > 0
        ? (eventosConRespuesta.reduce((acc, ev) => acc + ev.t_respuesta, 0) / eventosConRespuesta.length).toFixed(1)
        : "N/A";

    const horasConteo = {};
    eventos.forEach(ev => {
        const hora = new Date(ev.timestamp).getHours();
        horasConteo[hora] = (horasConteo[hora] || 0) + 1;
    });

    let horaPeak   = "N/A";
    let maxEventos = 0;
    for (const [hora, cantidad] of Object.entries(horasConteo)) {
        if (cantidad > maxEventos) {
            maxEventos = cantidad;
            horaPeak   = `${hora}:00 - ${parseInt(hora) + 1}:00`;
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

// ═════════════════════════════════════════════════════════════
//  EXPORTAR A CSV  +  BORRAR HISTORIAL YA EXPORTADO
// ═════════════════════════════════════════════════════════════

// Recuerda hasta qué id se exportó, para que el borrado solo
// elimine lo que realmente se descargó.
let ultimoIdExportado = null;

// Convierte las filas del historial a texto CSV
function generarCSV(filas) {
    const columnas = ['id', 'timestamp', 'activa', 't_respuesta', 'id_receptor', 'id_sensor'];
    const escapar = (v) => {
        if (v == null) return '';
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const encabezado = columnas.join(',');
    const lineas = filas.map(f => columnas.map(c => escapar(f[c])).join(','));
    return [encabezado, ...lineas].join('\n');
}

// Dispara la descarga del CSV en el navegador
function descargarCSV(csv) {
    const fecha = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    // \uFEFF = BOM, para que Excel abra bien los acentos
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `historial_caidas_${fecha}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function exportarHistorial() {
    try {
        const respuesta = await fetch('/api/historial');
        const historial = await respuesta.json();

        if (!historial.length) {
            alert('No hay datos en el historial para exportar.');
            return;
        }

        descargarCSV(generarCSV(historial));

        // guarda el id más alto exportado y habilita el botón de borrar
        ultimoIdExportado = Math.max(...historial.map(ev => Number(ev.id)));
        const btnBorrar = document.getElementById('btn-borrar');
        if (btnBorrar) btnBorrar.disabled = false;

        console.log(`Exportadas ${historial.length} filas (hasta id ${ultimoIdExportado}).`);
    } catch (error) {
        console.error('Error al exportar:', error);
        alert('Ocurrió un error al exportar los datos.');
    }
}

async function borrarHistorial() {
    if (ultimoIdExportado === null) {
        alert('Primero exporta los datos con "Exportar datos".');
        return;
    }
    if (!confirm('¿Seguro que quieres borrar del historial los registros ya exportados?\nSolo se borran los eventos resueltos que descargaste. Esta acción no se puede deshacer.')) {
        return;
    }
    try {
        const respuesta = await fetch('/api/borrar-historial', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hasta_id: ultimoIdExportado })
        });
        const res = await respuesta.json();

        if (!respuesta.ok) throw new Error(res.error || 'Error del servidor');

        alert(`Se borraron ${res.borrados} registros del historial.`);
        ultimoIdExportado = null;
        const btnBorrar = document.getElementById('btn-borrar');
        if (btnBorrar) btnBorrar.disabled = true;
        cargarHistorial();   // refresca la vista
    } catch (error) {
        console.error('Error al borrar:', error);
        alert('Ocurrió un error al borrar el historial.');
    }
}

// Conecta los botones (funciona esté el script en <head> o al final del body)
function conectarBotonesDatos() {
    const be = document.getElementById('btn-exportar');
    const bb = document.getElementById('btn-borrar');
    if (be) be.addEventListener('click', exportarHistorial);
    if (bb) { bb.addEventListener('click', borrarHistorial); bb.disabled = true; }
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', conectarBotonesDatos);
} else {
    conectarBotonesDatos();
}

// ─────────────────────────────────────────────────────────────
//  Carga inicial
// ─────────────────────────────────────────────────────────────
cargarHistorial();
cargarSensores();
cargarReceptores();