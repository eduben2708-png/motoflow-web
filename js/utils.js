let usuarioId = null;
let usuarioTelefono = null;
let usuarioRol = 'cliente';
let esRepartidor = false;
let notificacionesVistas = [];

function formatearEstado(estado) {
  return { pendiente: 'Pendiente', asignado: 'Asignado', en_retiro: 'En camino al retiro', en_camino: 'En camino', entregado: 'Entregado', cancelado: 'Cancelado' }[estado] || estado;
}

function formatearTipoPago(tipoPago) {
  return { efectivo: 'Efectivo al repartidor', transferencia: 'Transferencia', app: 'Pago por app / billetera', qr: 'Pago por QR', pendiente: 'Se confirma al entregar' }[tipoPago] || 'No especificada';
}

function mostrarNotificacion(mensaje) {
  const notif = document.createElement('div');
  notif.className = 'notificacion';
  notif.textContent = mensaje;
  document.getElementById('notificaciones').appendChild(notif);
  alert(mensaje);
  setTimeout(() => notif.remove(), 5000);
}

function coordenadasPedido(pedido, tipo) {
  const latitud = Number(pedido[`${tipo}_lat`]);
  const longitud = Number(pedido[`${tipo}_lng`]);
  if (Number.isFinite(latitud) && Number.isFinite(longitud)) return `${latitud}, ${longitud}`;
  return pedido[`${tipo}_direccion`] || '';
}

function distanciaEntreCoordenadas(lat1, lng1, lat2, lng2) {
  const aRad = g => g * Math.PI / 180;
  const dLat = aRad(lat2 - lat1);
  const dLng = aRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(aRad(lat1)) * Math.cos(aRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function calcularDistanciaHastaRetiroKm(latRepartidor, lngRepartidor, origen) {
  const [latRetiro, lngRetiro] = String(origen || '').split(',').map(valor => Number(valor.trim()));
  if (![Number(latRepartidor), Number(lngRepartidor), latRetiro, lngRetiro].every(Number.isFinite)) return null;
  const aRad = g => g * Math.PI / 180;
  const dLat = aRad(latRetiro - latRepartidor);
  const dLng = aRad(lngRetiro - lngRepartidor);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(aRad(latRepartidor)) * Math.cos(aRad(latRetiro)) * Math.sin(dLng / 2) ** 2;
  return (6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);
}

function abrirNavegacion(coordenadas) {
  const [latitud, longitud] = String(coordenadas || '').split(',').map(valor => Number(valor.trim()));
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    alert('Este pedido no tiene una ubicación válida para navegar.');
    return;
  }
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}&travelmode=driving`, '_blank', 'noopener');
}

// ==========================================
// FUNCIÓN CRÍTICA: Mostrar Secciones
// ==========================================
function mostrarSeccion(nombreSeccion) {
  document.querySelectorAll('.content > div[id^="seccion"]').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  const nombreCapitalizado = nombreSeccion.charAt(0).toUpperCase() + nombreSeccion.slice(1);
  const seccion = document.getElementById(`seccion${nombreCapitalizado}`);
  if (seccion) seccion.classList.remove('hidden');
  
  const boton = document.getElementById(`nav${nombreCapitalizado}`);
  if (boton) boton.classList.add('active');

  if (nombreSeccion === 'pedidos') cargarPedidos();
  else if (nombreSeccion === 'admin') cargarPanelAdmin();
  else if (nombreSeccion === 'repartidores') cargarRepartidores();
  else if (nombreSeccion === 'miRuta') cargarPanelMiRuta();
  else if (nombreSeccion === 'historial') cargarHistorial();
  else if (nombreSeccion === 'mapa') inicializarMapa();
  else if (nombreSeccion === 'crear') inicializarMapaCrear();
}

function mostrarSeccionPorCodigo(codigo) {
  mostrarSeccion(codigo);
}