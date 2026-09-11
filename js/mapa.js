let mapa = null;
let marcadorRepartidor = null;

function inicializarMapa() {
  if (mapa) {
    setTimeout(() => mapa.invalidateSize(), 100);
    return;
  }
  mapa = L.map('mapa').setView([CIUDAD_DEL_ESTE.lat, CIUDAD_DEL_ESTE.lng], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(mapa);
  L.marker([CIUDAD_DEL_ESTE.lat, CIUDAD_DEL_ESTE.lng], {
    title: 'Centro CDE'
  }).addTo(mapa).bindPopup(' Centro de Ciudad del Este');
  actualizarUbicacionRepartidor();
  setInterval(actualizarUbicacionRepartidor, 10000);
}

async function actualizarUbicacionRepartidor() {
  if (!mapa) return;
  try {
    const res = await fetch(`${API_URL}/api/pedidos`);
    const pedidos = await res.json();
    const misPedidos = pedidos.filter(p => p.cliente_id === usuarioId);
    if (misPedidos.length === 0) {
      document.getElementById('mapaDetalles').innerHTML = 'No hay pedidos asignados';
      return;
    }
    const pedidoAsignado = misPedidos
      .filter(p => p.repartidor_id && ['asignado', 'en_retiro', 'en_camino'].includes(p.estado))
      .sort((a, b) => b.id - a.id)[0];
    if (!pedidoAsignado) {
      document.getElementById('mapaDetalles').innerHTML = 'Esperando asignación...';
      return;
    }
    const resRepartidores = await fetch(`${API_URL}/api/repartidores`);
    const repartidores = await resRepartidores.json();
    const repartidor = repartidores.find(r => Number(r.id) === Number(pedidoAsignado.repartidor_id));
    if (!repartidor || !repartidor.gps_activo || repartidor.ubicacion_lat === null || repartidor.ubicacion_lng === null) {
      document.getElementById('mapaDetalles').innerHTML = 'El repartidor todavía no activó su GPS.';
      return;
    }
    const baseLatitude = Number(repartidor.ubicacion_lat);
    const baseLongitude = Number(repartidor.ubicacion_lng);
    if (marcadorRepartidor) {
      mapa.removeLayer(marcadorRepartidor);
    }
    marcadorRepartidor = L.marker([baseLatitude, baseLongitude], {
      title: `Repartidor #${pedidoAsignado.repartidor_id}`
    }).addTo(mapa);
    marcadorRepartidor.bindPopup(`🛵 Repartidor #${pedidoAsignado.repartidor_id}<br>Pedido #${pedidoAsignado.id}`);
    marcadorRepartidor.openPopup();
    mapa.setView([baseLatitude, baseLongitude], 15);
    document.getElementById('mapaDetalles').innerHTML = `🛵 Repartidor #${pedidoAsignado.repartidor_id} en camino<br>Pedido #${pedidoAsignado.id} - ${pedidoAsignado.estado}`;
  } catch (error) {
    console.error(error);
  }
}