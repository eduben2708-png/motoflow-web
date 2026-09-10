// ==========================================
// FUNCIÓN PARA MOSTRAR SECCIONES
// ==========================================
function mostrarSeccion(nombreSeccion) {
  // Ocultar todas las secciones
  document.querySelectorAll('.content > div[id^="seccion"]').forEach(seccion => {
    seccion.classList.add('hidden');
  });
  
  // Quitar clase active de todos los botones
  document.querySelectorAll('.nav-btn').forEach(boton => {
    boton.classList.remove('active');
  });
  
  // Mostrar la sección seleccionada
  const seccionAMostrar = document.getElementById(`seccion${nombreSeccion.charAt(0).toUpperCase() + nombreSeccion.slice(1)}`);
  if (seccionAMostrar) {
    seccionAMostrar.classList.remove('hidden');
  }
  
  // Activar el botón correspondiente
  const botonActivo = document.getElementById(`nav${nombreSeccion.charAt(0).toUpperCase() + nombreSeccion.slice(1)}`);
  if (botonActivo) {
    botonActivo.classList.add('active');
  }
  
  // Cargar datos según la sección
  if (nombreSeccion === 'pedidos') {
    cargarPedidos();
  } else if (nombreSeccion === 'admin') {
    cargarPanelAdmin();
  } else if (nombreSeccion === 'repartidores') {
    cargarRepartidores();
  } else if (nombreSeccion === 'miRuta') {
    cargarPanelMiRuta();
  } else if (nombreSeccion === 'historial') {
    cargarHistorial();
  } else if (nombreSeccion === 'mapa') {
    inicializarMapa();
  } else if (nombreSeccion === 'crear') {
    inicializarMapaCrear();
  }
}

function mostrarSeccionPorCodigo(codigo) {
  mostrarSeccion(codigo);
}