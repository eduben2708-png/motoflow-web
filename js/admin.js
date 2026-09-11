async function cargarPanelAdmin() {
  try {
    const [resPedidos, resRepartidores] = await Promise.all([
      fetch(`${API_URL}/api/pedidos`),
      fetch(`${API_URL}/api/repartidores`)
    ]);
    const pedidos = await resPedidos.json();
    const repartidores = (await resRepartidores.json())
      .filter(repartidor => repartidor.estado_aprobacion === 'aprobado');
    const contar = estado => pedidos.filter(pedido => pedido.estado === estado).length;
    document.getElementById('adminEstadisticas').innerHTML = `
      <div class="admin-estadistica"><span class="stat-label">Pendientes</span><span class="numero">${contar('pendiente')}</span></div>
      <div class="admin-estadistica"><span class="stat-label">Asignados</span><span class="numero">${contar('asignado')}</span></div>
      <div class="admin-estadistica"><span class="stat-label">En camino</span><span class="numero">${contar('en_camino')}</span></div>
      <div class="admin-estadistica"><span class="stat-label">Entregados</span><span class="numero">${contar('entregado')}</span></div>
    `;
    const pedidosOperativos = pedidos.filter(pedido =>
      ['pendiente', 'asignado', 'en_retiro', 'en_camino'].includes(pedido.estado)
    );
    if (pedidosOperativos.length === 0) {
      document.getElementById('listaAdminPedidos').innerHTML = '<div class="no-data">No hay pedidos pendientes de gestionar.</div>';
      return;
    }
    const repartidoresConCarga = repartidores.map(repartidor => {
      const activos = contarPedidosActivos(pedidos, repartidor.id);
      return { ...repartidor, activos };
    }).sort((a, b) => a.activos - b.activos);
    const opcionesRepartidor = repartidoresConCarga.map(repartidor => {
      let badge = '';
      let disabled = '';
      if (repartidor.activos >= MAX_PEDIDOS_POR_REPARTIDOR) {
        badge = `<span style="color:#f44336;">⛔ LLENO (${repartidor.activos})</span>`;
        disabled = 'disabled';
      } else if (repartidor.activos === 2) {
        badge = `<span style="color:#ff9800;">⚠️ (${repartidor.activos}/3)</span>`;
      } else if (repartidor.activos === 1) {
        badge = `<span style="color:#4caf50;">● (${repartidor.activos}/3)</span>`;
      } else {
        badge = `<span style="color:#8899bb;">(0/3)</span>`;
      }
      return `<option value="${repartidor.id}" ${disabled}>${repartidor.nombre || 'Repartidor'} #${repartidor.id}${badge}</option>`;
    }).join('');
    document.getElementById('listaAdminPedidos').innerHTML = pedidosOperativos
      .sort((a, b) => b.id - a.id)
      .map(pedido => {
        const repartidorActual = pedido.repartidor_id || '';
        return `
          <div class="admin-pedido">
            <div class="pedido-header">
              <strong>Pedido #${pedido.id}</strong>
              <span class="estado ${pedido.estado}">${formatearEstado(pedido.estado)}</span>
            </div>
            <div class="admin-fila"><span>Servicio</span><strong>${pedido.tipo}</strong></div>
            <div class="admin-fila"><span>Distancia</span><strong>${pedido.distancia_km || 0} km</strong></div>
            <div class="admin-fila"><span>Total</span><strong>Gs. ${Number(pedido.monto || 0).toLocaleString('es-PY')}</strong></div>
            <div class="admin-fila" style="font-size: 11px; color: #8899bb;">
              <span>ℹ️ Los repartidores con "⛔ LLENO" ya tienen ${MAX_PEDIDOS_POR_REPARTIDOR} pedidos activos</span>
            </div>
            <div class="admin-control">
              <label>Repartidor</label>
              <select id="adminRepartidor-${pedido.id}">
                <option value="">Seleccionar repartidor</option>
                ${opcionesRepartidor.replace(`value="${repartidorActual}"`, `value="${repartidorActual}" selected`)}
              </select>
            </div>
            <div class="admin-control">
              <label>Estado del pedido</label>
              <select id="adminEstado-${pedido.id}">${opcionesEstado(pedido.estado)}</select>
            </div>
            <div class="admin-acciones">
              <button onclick="asignarPedidoAdmin(${pedido.id})">Asignar</button>
              <button onclick="actualizarEstadoAdmin(${pedido.id})" style="background:#4caf50;">Guardar estado</button>
            </div>
          </div>
        `;
      }).join('');
  } catch (error) {
    document.getElementById('listaAdminPedidos').innerHTML = '<div class="no-data">No se pudo cargar el panel administrador.</div>';
    console.error(error);
  }
}

async function guardarPedidoAdmin(id, estado, repartidorId) {
  try {
    const cuerpo = { estado };
    if (repartidorId) cuerpo.repartidor_id = Number(repartidorId);
    const res = await fetch(`${API_URL}/api/pedidos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el pedido');
    await cargarPanelAdmin();
    cargarPedidos();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function opcionesEstado(estadoActual) {
  const estados = ['pendiente', 'asignado', 'en_retiro', 'en_camino', 'entregado', 'cancelado'];
  return estados.map(estado =>
    `<option value="${estado}" ${estado === estadoActual ? 'selected' : ''}>${formatearEstado(estado)}</option>`
  ).join('');
}

function contarPedidosActivos(pedidos, repartidorId) {
  return pedidos.filter(p =>
    Number(p.repartidor_id) === Number(repartidorId) &&
    ['asignado', 'en_retiro', 'en_camino'].includes(p.estado)
  ).length;
}

function obtenerUbicacionReferencia(repartidor, pedidosActivos) {
  if (repartidor.gps_activo && repartidor.ubicacion_lat && repartidor.ubicacion_lng) {
    return {
      lat: Number(repartidor.ubicacion_lat),
      lng: Number(repartidor.ubicacion_lng),
      fuente: 'GPS actual'
    };
  }
  if (pedidosActivos.length > 0) {
    const ultimo = pedidosActivos[0];
    const lat = Number(ultimo.destino_lat);
    const lng = Number(ultimo.destino_lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng, fuente: 'última entrega' };
    }
  }
  return null;
}

function verificarCercania(repartidor, pedidosActivos, nuevoPedidoLat, nuevoPedidoLng) {
  const referencia = obtenerUbicacionReferencia(repartidor, pedidosActivos);
  if (!referencia) {
    return { cerca: true, distancia: null, mensaje: 'Sin ubicación de referencia (GPS inactivo). Asignación permitida con precaución.' };
  }
  const distancia = distanciaEntreCoordenadas(
    referencia.lat, referencia.lng,
    nuevoPedidoLat, nuevoPedidoLng
  );
  return {
    cerca: distancia <= RADIO_CERCANIA_KM,
    distancia: distancia.toFixed(1),
    mensaje: `Distancia desde ${referencia.fuente}: ${distancia.toFixed(1)} km`
  };
}

async function asignarPedidoAdmin(id) {
  const repartidorId = document.getElementById(`adminRepartidor-${id}`).value;
  if (!repartidorId) {
    alert('Seleccioná un repartidor primero');
    return;
  }
  try {
    const [resPedidos, resRepartidores] = await Promise.all([
      fetch(`${API_URL}/api/pedidos`),
      fetch(`${API_URL}/api/repartidores`)
    ]);
    const pedidos = await resPedidos.json();
    const repartidores = await resRepartidores.json();
    const repartidor = repartidores.find(r => Number(r.id) === Number(repartidorId));
    if (!repartidor) {
      alert('Repartidor no encontrado');
      return;
    }
    const pedidosActivos = pedidos.filter(p =>
      Number(p.repartidor_id) === Number(repartidorId) &&
      ['asignado', 'en_retiro', 'en_camino'].includes(p.estado)
    );
    const cantidadActivos = pedidosActivos.length;
    if (cantidadActivos >= MAX_PEDIDOS_POR_REPARTIDOR) {
      alert(` Este repartidor ya tiene ${MAX_PEDIDOS_POR_REPARTIDOR} pedidos activos.\n\nDebe completar al menos uno antes de recibir otro.`);
      return;
    }
    const nuevoPedido = pedidos.find(p => Number(p.id) === Number(id));
    if (!nuevoPedido) {
      alert('Pedido no encontrado');
      return;
    }
    const nuevoLat = Number(nuevoPedido.origen_lat);
    const nuevoLng = Number(nuevoPedido.origen_lng);
    const cercania = verificarCercania(repartidor, pedidosActivos, nuevoLat, nuevoLng);
    let mensajeConfirmacion = '';
    if (cantidadActivos === 0) {
      mensajeConfirmacion = `✅ Primer pedido para este repartidor.\n${cercania.mensaje}`;
    } else if (cantidadActivos === 1) {
      mensajeConfirmacion = `️ Este repartidor ya tiene 1 pedido activo.\n${cercania.mensaje}\n\n¿Asignar el 2° pedido?`;
    } else if (cantidadActivos === 2) {
      if (!cercania.cerca && cercania.distancia !== null) {
        alert(` No se puede asignar el 3° pedido.\n\n${cercania.mensaje}\nEl 3° pedido debe estar a ≤ ${RADIO_CERCANIA_KM} km de la ubicación del repartidor.\n\nAsigná este pedido a otro repartidor más cercano.`);
        return;
      }
      mensajeConfirmacion = `⚠️ Este será el 3° y último pedido permitido.\n${cercania.mensaje}\n\n¿Confirmar asignación?`;
    }
    if (!confirm(mensajeConfirmacion)) return;
    guardarPedidoAdmin(id, 'asignado', repartidorId);
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function actualizarEstadoAdmin(id) {
  const estado = document.getElementById(`adminEstado-${id}`).value;
  const repartidorId = document.getElementById(`adminRepartidor-${id}`).value;
  if ((estado === 'asignado' || estado === 'en_camino') && !repartidorId) {
    alert('Seleccioná un repartidor antes de asignar o iniciar el pedido');
    return;
  }
  guardarPedidoAdmin(id, estado, repartidorId);
}