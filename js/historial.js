async function cargarHistorial() {
  const lista = document.getElementById('listaHistorial'); lista.innerHTML = '<div class="no-data">Cargando...</div>';
  try {
    const params = new URLSearchParams(); const estado = document.getElementById('historialEstado').value; const fechaDesde = document.getElementById('historialFechaDesde').value; const fechaHasta = document.getElementById('historialFechaHasta').value;
    if (estado) params.append('estado', estado); if (fechaDesde) params.append('fecha_desde', fechaDesde); if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    if (usuarioRol === 'admin') { const clienteId = document.getElementById('historialClienteId').value; const repartidorId = document.getElementById('historialRepartidorId').value; if (clienteId) params.append('cliente_id', clienteId); if (repartidorId) params.append('repartidor_id', repartidorId); } 
    else if (esRepartidor) { const repartidor = await obtenerMiRepartidor(); if (!repartidor) { lista.innerHTML = '<div class="no-data">No se pudo identificar tu cuenta de repartidor.</div>'; return; } params.append('repartidor_id', repartidor.id); } 
    else { params.append('cliente_id', usuarioId); }
    const respuesta = await fetch(`${API_URL}/api/pedidos/historial?${params.toString()}`); if (!respuesta.ok) throw new Error('No se pudo cargar el historial');
    const pedidos = await respuesta.json();
    if (pedidos.length === 0) { lista.innerHTML = '<div class="no-data">No hay pedidos en el historial con estos filtros.</div>'; return; }
    lista.innerHTML = pedidos.map(pedido => { const fecha = new Date(pedido.fecha_creacion).toLocaleString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); return `<div class="pedido-card"><div class="pedido-header"><div class="pedido-id">Pedido #${pedido.id}</div><div class="estado ${pedido.estado}">${formatearEstado(pedido.estado)}</div></div><div style="font-size: 13px; color: #cbd5e1; line-height: 1.7;"><div>🗓️ ${fecha}</div><div> Servicio: ${pedido.tipo}</div><div>📏 Distancia: ${pedido.distancia_km ?? 'N/D'} km</div><div>💰 Total: Gs. ${Number(pedido.monto || 0).toLocaleString('es-PY')}</div><div>💳 Pago: ${formatearTipoPago(pedido.tipo_pago)}</div>${usuarioRol === 'admin' ? `<div>👤 Cliente #${pedido.cliente_id} · 🛵 Repartidor #${pedido.repartidor_id ?? 'sin asignar'}</div>` : ''}</div></div>`; }).join('');
  } catch (error) { console.error(error); lista.innerHTML = '<div class="no-data">Error al cargar el historial.</div>'; }
}