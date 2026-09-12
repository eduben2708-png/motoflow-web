let seguimientoGpsId = null;
let intervaloMiRuta = null;
let pedidosRepartidorConocidos = new Set();
let primeraCargaMiRuta = true;
let pedidosMiRutaActuales = [];

function iniciarActualizacionMiRuta() {
  if (intervaloMiRuta !== null) return;
  intervaloMiRuta = setInterval(() => {
    if (esRepartidor && !document.getElementById('seccionMiRuta').classList.contains('hidden')) {
      cargarPanelMiRuta(true);
    }
  }, 8000);
}

function detenerActualizacionMiRuta() {
  if (intervaloMiRuta !== null) clearInterval(intervaloMiRuta);
  intervaloMiRuta = null;
  pedidosRepartidorConocidos = new Set();
  primeraCargaMiRuta = true;
}

function avisarPedidoNuevo(pedido) {
  const mensaje = `¡Nuevo pedido asignado! Pedido #${pedido.id}.`;
  mostrarNotificacion(mensaje);
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('MotoCourier CDE', { body: mensaje });
  }
}

async function cargarPanelMiRuta(verificarNuevos = false) {
  const lista = document.getElementById('listaMiRuta');
  const estadoGps = document.getElementById('estadoGpsRepartidor');
  try {
    const repartidor = await obtenerMiRepartidor();
    if (!repartidor) {
      estadoGps.textContent = 'Esta cuenta no está registrada como repartidor.';
      lista.innerHTML = '<div class="no-data">Ingresá con el número de teléfono que fue registrado como repartidor.</div>';
      return;
    }
    if (repartidor.estado_aprobacion !== 'aprobado') {
      estadoGps.textContent = 'Tu cuenta está pendiente de aprobación administrativa.';
      lista.innerHTML = '<div class="no-data">Todavía no podés recibir pedidos hasta ser aprobado.</div>';
      return;
    }
    estadoGps.textContent = repartidor.gps_activo
      ? 'Ubicación GPS: activa. Estás disponible para asignaciones automáticas.'
      : 'Ubicación GPS: desactivada. Tocá el botón para activarla.';
    
    const respuestaPedidos = await fetch(`${API_URL}/api/pedidos`);
    if (!respuestaPedidos.ok) throw new Error('No se pudieron cargar los pedidos');
    const pedidos = await respuestaPedidos.json();
    const misPedidos = pedidos
      .filter(pedido => Number(pedido.repartidor_id) === Number(repartidor.id))
      .filter(pedido => ['asignado', 'en_retiro', 'en_camino'].includes(pedido.estado))
      .sort((a, b) => b.id - a.id);
    const idsActuales = new Set(misPedidos.map(pedido => pedido.id));
    if (verificarNuevos && !primeraCargaMiRuta) {
      misPedidos
        .filter(pedido => !pedidosRepartidorConocidos.has(pedido.id))
        .forEach(avisarPedidoNuevo);
    }
    pedidosRepartidorConocidos = idsActuales;
    primeraCargaMiRuta = false;
    pedidosMiRutaActuales = misPedidos;
    if (misPedidos.length === 0) {
      lista.innerHTML = '<div class="no-data">No tenés pedidos activos asignados.</div>';
      return;
    }
    lista.innerHTML = misPedidos.map(pedido => {
      const distanciaHastaRetiro = calcularDistanciaHastaRetiroKm(
        repartidor.ubicacion_lat,
        repartidor.ubicacion_lng,
        coordenadasPedido(pedido, 'origen')
      );
      const tarifaServicio = Number(pedido.tarifa_servicio || 0);
      const botonAccion = pedido.estado === 'asignado'
        ? `<button onclick="actualizarEstadoMiPedido(${pedido.id}, 'en_retiro', null, '${coordenadasPedido(pedido, 'origen')}')">Iniciar viaje al retiro</button>`
        : pedido.estado === 'en_retiro'
        ? `<button onclick="actualizarEstadoMiPedido(${pedido.id}, 'en_camino', null, '${coordenadasPedido(pedido, 'destino')}')">Paquete retirado</button>`
        : `
          <select id="pagoFinal-${pedido.id}" style="margin:0; padding:10px; font-size:13px;">
            <option value="">¿Cómo abonó el cliente?</option>
            <option value="efectivo">Efectivo al repartidor</option>
            <option value="transferencia">Transferencia</option>
            <option value="qr">Pago por QR</option>
          </select>
          <button class="btn-entregar" onclick="entregarPedido(${pedido.id})">Marcar como entregado</button>
        `;
      const destinoNavegacion = ['asignado', 'en_retiro'].includes(pedido.estado)
        ? coordenadasPedido(pedido, 'origen')
        : coordenadasPedido(pedido, 'destino');
      const textoNavegacion = ['asignado', 'en_retiro'].includes(pedido.estado)
        ? 'Navegar al retiro'
        : 'Navegar a la entrega';
      return `
        <div class="pedido-card">
          <div class="pedido-header">
            <div class="pedido-id">Pedido #${pedido.id}</div>
            <div class="estado ${pedido.estado}">${formatearEstado(pedido.estado)}</div>
          </div>
          <div style="font-size: 13px; color: #cbd5e1; line-height: 1.7;">
            <div>📍 <strong>Retiro:</strong> ${pedido.origen_direccion || 'Sin dirección'}</div>
            <div>📍 <strong>Entrega:</strong> ${pedido.destino_direccion || 'Sin dirección'}</div>
            <div><strong>Servicio:</strong> ${pedido.tipo}</div>
            <div>📏 <strong>Distancia del servicio:</strong> ${Number(pedido.distancia_km || 0).toLocaleString('es-PY')} km</div>
            <div>🧭 <strong>Distancia aprox. hasta el retiro:</strong> ${distanciaHastaRetiro === null ? 'Activá el GPS para calcularla' : `${distanciaHastaRetiro} km`}</div>
            <div>🛵 <strong>Tarifa del servicio:</strong> ${tarifaServicio ? `Gs. ${tarifaServicio.toLocaleString('es-PY')}` : 'No disponible'}</div>
            <div>💳 <strong>Forma de pago:</strong> ${formatearTipoPago(pedido.tipo_pago)}</div>
            <div>💰 <strong>Total a cobrar al cliente:</strong> Gs. ${Number(pedido.monto || 0).toLocaleString('es-PY')}</div>
          </div>
          <div class="repartidor-acciones">
            <button class="btn-gps" onclick="abrirNavegacion('${destinoNavegacion || ''}')">🧭 ${textoNavegacion}</button>
            ${botonAccion}
          </div>
        </div>`;
    }).join('');
  } catch (error) {
    console.error(error);
    lista.innerHTML = '<div class="no-data">No se pudo cargar tu ruta. Verificá que el servidor esté encendido.</div>';
  }
}

async function entregarPedido(id) {
  const tipoPago = document.getElementById(`pagoFinal-${id}`).value;
  if (!tipoPago) {
    alert('Consultá al cliente cómo abonará y seleccioná la forma de pago.');
    return;
  }
  await actualizarEstadoMiPedido(id, 'entregado', tipoPago);
}

async function actualizarEstadoMiPedido(id, estado, tipoPago = null, destinoNavegacion = null) {
  const texto = {
    en_retiro: '¿Confirmás que iniciás el viaje hacia el retiro?',
    en_camino: '¿Confirmás que ya retiraste el paquete?',
    entregado: '¿Confirmás que el pedido fue entregado?'
  }[estado] || '¿Confirmás el cambio de estado?';
  if (!confirm(texto)) return;
  try {
    const respuesta = await fetch(`${API_URL}/api/pedidos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, ...(tipoPago ? { tipo_pago: tipoPago } : {}) })
    });
    const data = await respuesta.json();
    if (!respuesta.ok) throw new Error(data.error || 'No se pudo actualizar el pedido');
    if (estado === 'en_retiro') {
      alert('Viaje iniciado. Se abrirá la navegación al punto de retiro.');
      abrirNavegacion(destinoNavegacion);
    } else if (estado === 'en_camino') {
      alert('Paquete retirado. Se abrirá la navegación hacia la entrega.');
      abrirNavegacion(destinoNavegacion);
    } else {
      const pedido = pedidosMiRutaActuales.find(item => Number(item.id) === Number(id));
      const tarifa = Number(pedido?.tarifa_servicio || 0).toLocaleString('es-PY');
      const total = Number(pedido?.monto || 0).toLocaleString('es-PY');
      alert(`Pedido entregado.\nTarifa del servicio: Gs. ${tarifa}\nTotal cobrado al cliente: Gs. ${total}\nForma de pago: ${formatearTipoPago(tipoPago || pedido?.tipo_pago)}`);
    }
    cargarPanelMiRuta();
  } catch (error) {
    alert(error.message);
  }
}

async function actualizarGpsMiRepartidor() {
  await iniciarSeguimientoGpsRepartidor();
}

async function iniciarSeguimientoGpsRepartidor() {
  try {
    if (seguimientoGpsId !== null) return;
    const repartidor = await obtenerMiRepartidor();
    if (!repartidor) {
      alert('Ingresá con una cuenta registrada como repartidor.');
      return;
    }
    if (repartidor.estado_aprobacion !== 'aprobado') {
      alert('Tu cuenta todavía debe ser aprobada por el administrador.');
      return;
    }
    if (!navigator.geolocation) {
      alert('Este dispositivo no permite obtener ubicación GPS.');
      return;
    }
    document.getElementById('estadoGpsRepartidor').textContent = 'GPS automático: buscando tu ubicación…';
    seguimientoGpsId = navigator.geolocation.watchPosition(async posicion => {
      try {
        const respuesta = await fetch(`${API_URL}/api/repartidores/${repartidor.id}/gps`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: posicion.coords.latitude,
            lng: posicion.coords.longitude,
            activo: true
          })
        });
        const data = await respuesta.json();
        if (!respuesta.ok) throw new Error(data.error || 'No se pudo guardar el GPS');
        document.getElementById('estadoGpsRepartidor').textContent =
          `GPS automático activo. Última actualización: ${new Date().toLocaleTimeString('es-PY')}.`;
      } catch (error) {
        console.error(error);
        document.getElementById('estadoGpsRepartidor').textContent = 'GPS automático: no se pudo guardar la ubicación.';
      }
    }, error => {
      document.getElementById('estadoGpsRepartidor').textContent = 'Ubicación GPS: no disponible.';
      alert('No se pudo obtener tu ubicación. Permití el acceso a la ubicación en el navegador.');
      console.error(error);
      detenerSeguimientoGpsRepartidor();
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 });
  } catch (error) {
    alert(error.message);
  }
}

function detenerSeguimientoGpsRepartidor() {
  if (seguimientoGpsId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(seguimientoGpsId);
  }
  seguimientoGpsId = null;
}