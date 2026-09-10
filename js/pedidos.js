// Variables del mapa de crear pedido
let mapaCrear = null;
let puntoRetiro = null;
let puntoEntrega = null;
let marcadorRetiro = null;
let marcadorEntrega = null;
let modoEdicionPunto = null;

function actualizarFormularioServicio() {
  const tipoServicio = document.getElementById('tipoServicio').value;
  const grupoMontoPedido = document.getElementById('grupoMontoPedido');
  if (tipoServicio === 'encargo') {
    grupoMontoPedido.classList.remove('hidden');
  } else {
    grupoMontoPedido.classList.add('hidden');
    document.getElementById('montoPedido').value = '';
  }
  calcularTarifa();
}

async function crearPedidoConTarifa() {
  if (!puntoRetiro || !puntoEntrega) {
    alert('Marca ambos puntos en el mapa');
    return;
  }
  const referenciaRetiro = document.getElementById('referenciaRetiro').value.trim();
  const referenciaEntrega = document.getElementById('referenciaEntrega').value.trim();
  if (!referenciaRetiro || !referenciaEntrega) {
    alert('Escribí una referencia para el retiro y otra para la entrega');
    return;
  }
  const tipoServicio = document.getElementById('tipoServicio').value;
  const montoCompra = parseInt(document.getElementById('montoPedido').value) || 0;
  if (tipoServicio === 'encargo' && montoCompra <= 0) {
    alert('Ingresa el monto de la compra');
    return;
  }
  const distanciaKm = await calcularDistanciaOSRM(
    puntoRetiro.lat, puntoRetiro.lng,
    puntoEntrega.lat, puntoEntrega.lng
  );
  if (distanciaKm === null) {
    alert('Error calculando distancia');
    return;
  }
  const tarifaMotoflow = obtenerTarifa(distanciaKm);
  const comisionEncargo = tipoServicio === 'encargo' ? Math.round(montoCompra * 0.02) : 0;
  const totalCobro = tarifaMotoflow + (tipoServicio === 'encargo' ? montoCompra + comisionEncargo : 0);
  
  try {
    // CORREGIDO: Agregado /api/
    const res = await fetch(`${API_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: usuarioId,
        tipo: tipoServicio,
        origen_direccion: referenciaRetiro,
        destino_direccion: referenciaEntrega,
        origen_lat: puntoRetiro.lat,
        origen_lng: puntoRetiro.lng,
        destino_lat: puntoEntrega.lat,
        destino_lng: puntoEntrega.lng,
        monto: totalCobro,
        distancia_km: distanciaKm,
        monto_compra: tipoServicio === 'encargo' ? montoCompra : 0,
        tipo_pago: 'pendiente'
      })
    });
    const data = await res.json();
    if (!res.ok || !data.id) {
      throw new Error(data.error || 'No se pudo guardar el pedido');
    }
    if (data.id) {
      const mensajeAsignacion = data.repartidor_id
        ? `Repartidor #${data.repartidor_id} asignado automáticamente.`
        : 'Quedó pendiente porque no hay repartidores con GPS activo.';
      alert(`Pedido creado. Total a pagar: ${totalCobro.toLocaleString('es-PY')} Gs. ${mensajeAsignacion}`);
      puntoRetiro = null;
      puntoEntrega = null;
      document.getElementById('montoPedido').value = '';
      document.getElementById('referenciaRetiro').value = '';
      document.getElementById('referenciaEntrega').value = '';
      document.getElementById('desgloseTarifa').classList.add('hidden');
      document.getElementById('puntoRetiro').classList.add('hidden');
      document.getElementById('puntoEntrega').classList.add('hidden');
      if (marcadorRetiro) mapaCrear.removeLayer(marcadorRetiro);
      if (marcadorEntrega) mapaCrear.removeLayer(marcadorEntrega);
      mostrarSeccion('pedidos');
      await cargarPedidos();
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function cargarPedidos() {
  try {
    // CORREGIDO: Agregado /api/
    const res = await fetch(`${API_URL}/api/pedidos`);
    const data = await res.json();
    const misPedidos = data.filter(p => p.cliente_id === usuarioId);
    let html = '';
    if (misPedidos.length === 0) {
      html = '<div class="no-data">No tienes pedidos aún</div>';
    } else {
      misPedidos.forEach(p => {
        html += `
          <div class="pedido-card">
            <div class="pedido-header">
              <div class="pedido-id">Pedido #${p.id}</div>
              <div class="estado ${p.estado}">${p.estado}</div>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <div style="color: #4caf50; font-weight: bold;">Total: ${p.monto.toLocaleString()} Gs.</div>
              <div style="color: #2563eb; font-size: 12px;">${p.tipo}</div>
            </div>
            ${p.repartidor_id ? `<button onclick="abrirChat(${p.id})" style="width: 100%; padding: 8px; background: #9c27b0; border: none; border-radius: 6px; color: #fff; cursor: pointer;">💬 Chat</button>` : ''}
          </div>`;
      });
    }
    document.getElementById('listaPedidos').innerHTML = html;
  } catch (error) {
    console.error(error);
  }
}

function actualizarInstruccionMapa() {
  const instruccion = document.getElementById('instruccionMapa');
  if (modoEdicionPunto === 'retiro') {
    instruccion.textContent = 'Haz clic en el mapa para elegir el nuevo punto de RETIRO.';
  } else if (modoEdicionPunto === 'entrega') {
    instruccion.textContent = 'Haz clic en el mapa para elegir el nuevo punto de ENTREGA.';
  } else if (!puntoRetiro) {
    instruccion.textContent = ' Paso 1: Haz clic en el mapa para marcar el PUNTO DE RETIRO';
  } else if (!puntoEntrega) {
    instruccion.textContent = '📍 Paso 2: Haz clic en el mapa para marcar el PUNTO DE ENTREGA';
  } else {
    instruccion.textContent = '✅ Puntos listos. Podés editarlos o limpiar el mapa.';
  }
}

function colocarPunto(tipo, latlng) {
  const esRetiro = tipo === 'retiro';
  const ubicacion = { lat: latlng.lat, lng: latlng.lng };
  const icono = L.icon({
    iconUrl: esRetiro
      ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png'
      : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    shadowSize: [41, 41]
  });
  if (esRetiro) {
    puntoRetiro = ubicacion;
    if (marcadorRetiro) mapaCrear.removeLayer(marcadorRetiro);
    marcadorRetiro = L.marker([ubicacion.lat, ubicacion.lng], { icon: icono })
      .addTo(mapaCrear)
      .bindPopup('RETIRO');
    document.getElementById('puntoRetiro').classList.remove('hidden');
  } else {
    puntoEntrega = ubicacion;
    if (marcadorEntrega) mapaCrear.removeLayer(marcadorEntrega);
    marcadorEntrega = L.marker([ubicacion.lat, ubicacion.lng], { icon: icono })
      .addTo(mapaCrear)
      .bindPopup('ENTREGA');
    document.getElementById('puntoEntrega').classList.remove('hidden');
  }
  modoEdicionPunto = null;
  actualizarInstruccionMapa();
  if (puntoRetiro && puntoEntrega) {
    setTimeout(calcularTarifa, 300);
  }
}

function editarPunto(tipo) {
  modoEdicionPunto = tipo;
  actualizarInstruccionMapa();
  mapaCrear.getContainer().scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function limpiarPuntos() {
  puntoRetiro = null;
  puntoEntrega = null;
  modoEdicionPunto = null;
  if (marcadorRetiro) mapaCrear.removeLayer(marcadorRetiro);
  if (marcadorEntrega) mapaCrear.removeLayer(marcadorEntrega);
  marcadorRetiro = null;
  marcadorEntrega = null;
  document.getElementById('puntoRetiro').classList.add('hidden');
  document.getElementById('puntoEntrega').classList.add('hidden');
  document.getElementById('desgloseTarifa').classList.add('hidden');
  actualizarInstruccionMapa();
}

function inicializarMapaCrear() {
  if (mapaCrear) {
    setTimeout(() => mapaCrear.invalidateSize(), 100);
    return;
  }
  mapaCrear = L.map('mapaCrear').setView([CIUDAD_DEL_ESTE.lat, CIUDAD_DEL_ESTE.lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(mapaCrear);
  mapaCrear.on('click', function(e) {
    const tipo = modoEdicionPunto || (!puntoRetiro ? 'retiro' : (!puntoEntrega ? 'entrega' : null));
    if (!tipo) {
      alert('Usa Editar retiro, Editar entrega o Limpiar para modificar los puntos.');
      return;
    }
    colocarPunto(tipo, e.latlng);
  });
  actualizarInstruccionMapa();
}

function iniciarNotificaciones() {
  setInterval(async () => {
    if (usuarioId) {
      try {
        // CORREGIDO: Agregado /api/
        const res = await fetch(`${API_URL}/api/pedidos`);
        const pedidos = await res.json();
        const misPedidos = pedidos.filter(p => p.cliente_id === usuarioId);
        misPedidos.forEach(p => {
          if (p.estado === 'asignado' && !notificacionesVistas.includes(p.id)) {
            notificacionesVistas.push(p.id);
            mostrarNotificacion(`🔔 ¡Tu pedido #${p.id} fue asignado!`);
          }
        });
      } catch (error) {
        console.error(error);
      }
    }
  }, 5000);
}