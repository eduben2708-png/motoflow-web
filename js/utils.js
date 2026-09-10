let usuarioId = null;
let usuarioTelefono = null;
let usuarioRol = 'cliente';
let esRepartidor = false;
let notificacionesVistas = [];

function formatearEstado(estado) {
  return {
    pendiente: 'Pendiente',
    asignado: 'Asignado',
    en_retiro: 'En camino al retiro',
    en_camino: 'En camino',
    entregado: 'Entregado',
    cancelado: 'Cancelado'
  }[estado] || estado;
}

function formatearTipoPago(tipoPago) {
  return {
    efectivo: 'Efectivo al repartidor',
    transferencia: 'Transferencia',
    app: 'Pago por app / billetera',
    qr: 'Pago por QR',
    pendiente: 'Se confirma al entregar'
  }[tipoPago] || 'No especificada';
}

function mostrarNotificacion(mensaje) {
  const notif = document.createElement('div');
  notif.className = 'notificacion';
  notif.textContent = mensaje;
  document.getElementById('notificaciones').appendChild(notif);
  setTimeout(() => notif.remove(), 5000);
}

function coordenadasPedido(pedido, tipo) {
  const latitud = Number(pedido[`${tipo}_lat`]);
  const longitud = Number(pedido[`${tipo}_lng`]);
  if (Number.isFinite(latitud) && Number.isFinite(longitud)) {
    return `${latitud}, ${longitud}`;
  }
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
  const latitudRepartidor = Number(latRepartidor);
  const longitudRepartidor = Number(lngRepartidor);
  if (![latitudRepartidor, longitudRepartidor, latRetiro, lngRetiro].every(Number.isFinite)) return null;
  
  const aRad = grados => grados * Math.PI / 180;
  const diferenciaLat = aRad(latRetiro - latitudRepartidor);
  const diferenciaLng = aRad(lngRetiro - longitudRepartidor);
  const a = Math.sin(diferenciaLat / 2) ** 2 + Math.cos(aRad(latitudRepartidor)) * Math.cos(aRad(latRetiro)) * Math.sin(diferenciaLng / 2) ** 2;
  return (6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))).toFixed(1);
}

function abrirNavegacion(coordenadas) {
  const valores = String(coordenadas || '').split(',').map(valor => Number(valor.trim()));
  const [latitud, longitud] = valores;
  if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
    alert('Este pedido no tiene una ubicación válida para navegar.');
    return;
  }
  const url = `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}&travelmode=driving`;
  const nuevaVentana = window.open(url, '_blank', 'noopener');
  if (!nuevaVentana) window.location.href = url;
}

// ==========================================
// FUNCIÓN CRÍTICA AGREGADA: Mostrar Secciones
// ==========================================
function mostrarSeccion(nombreSeccion) {
  // 1. Ocultar todas las secciones
  document.querySelectorAll('.content > div[id^="seccion"]').forEach(seccion => {
    seccion.classList.add('hidden');
  });
  
  // 2. Quitar clase active de todos los botones
  document.querySelectorAll('.nav-btn').forEach(boton => {
    boton.classList.remove('active');
  });
  
  // 3. Mostrar la sección seleccionada
  const nombreCapitalizado = nombreSeccion.charAt(0).toUpperCase() + nombreSeccion.slice(1);
  const seccionAMostrar = document.getElementById(`seccion${nombreCapitalizado}`);
  if (seccionAMostrar) seccionAMostrar.classList.remove('hidden');
  
  // 4. Activar el botón correspondiente
  const botonActivo = document.getElementById(`nav${nombreCapitalizado}`);
  if (botonActivo) botonActivo.classList.add('active');

  // 5. Cargar datos específicos de la sección
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