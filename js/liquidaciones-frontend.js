(() => {
  const formatoGs = valor => `Gs. ${Number(valor || 0).toLocaleString('es-PY')}`;
  const hoy = new Date().toISOString().slice(0, 10);
  let resumenActual = null;
  let filtroLiquidacionesRepartidorId = null;

  function esAdmin() {
    return typeof usuarioRol !== 'undefined' && usuarioRol === 'admin';
  }

  function esCuentaRepartidor() {
    return typeof esRepartidor !== 'undefined' && esRepartidor === true;
  }

  function ocultarSecciones() {
    document.getElementById('seccionLiquidaciones')?.classList.add('hidden');
    document.getElementById('seccionMisLiquidaciones')?.classList.add('hidden');
    document.getElementById('navLiquidaciones')?.classList.remove('active');
    document.getElementById('navMisLiquidaciones')?.classList.remove('active');
  }

  function crearPantalla() {
    const navegacion = document.querySelector('.nav-buttons');

    if (!document.getElementById('navLiquidaciones')) {
      const botonAdmin = document.createElement('button');
      botonAdmin.id = 'navLiquidaciones';
      botonAdmin.className = 'nav-btn hidden';
      botonAdmin.textContent = 'Liquidaciones';
      botonAdmin.onclick = abrirLiquidaciones;
      navegacion.appendChild(botonAdmin);

      const seccion = document.createElement('div');
      seccion.id = 'seccionLiquidaciones';
      seccion.className = 'hidden';
      seccion.innerHTML = `
        <h3 class="admin-titulo">Liquidaciones</h3>
        <p class="admin-subtitulo">El repartidor recibe 80% de la tarifa del servicio. JMMotocourier conserva 20%.</p>
        <div class="card" style="margin-bottom:16px;">
          <div class="form-group">
            <label class="label">Repartidor</label>
            <select id="liquidacionRepartidor"><option value="">Cargando repartidores...</option></select>
          </div>
          <div class="form-group">
            <label class="label">Liquidar desde</label>
            <input type="date" id="liquidacionDesde">
          </div>
          <div class="form-group">
            <label class="label">Liquidar hasta</label>
            <input type="date" id="liquidacionHasta" value="${hoy}">
          </div>

          <button onclick="consultarResumenLiquidacion()">Calcular liquidación</button>
        </div>
        <div id="resumenLiquidacion"></div>
        <h3 class="admin-titulo" style="margin-top:24px;">Liquidaciones creadas</h3>
        <p class="admin-subtitulo">Cada sábado se cierra la semana. Si un repartidor le debe a la empresa y no paga, queda bloqueado para recibir pedidos nuevos desde el lunes.</p>
        <button onclick="cerrarSemana()" style="margin-bottom:16px;">Cerrar la semana (liquidar a todos)</button>
        <div id="filtroLiquidacionesBanner" class="hidden"></div>
        <div id="listaLiquidaciones"></div>
      `;
      document.querySelector('.content').appendChild(seccion);
    }

    if (!document.getElementById('navMisLiquidaciones')) {
      const botonRepartidor = document.createElement('button');
      botonRepartidor.id = 'navMisLiquidaciones';
      botonRepartidor.className = 'nav-btn hidden';
      botonRepartidor.textContent = 'Mis liquidaciones';
      botonRepartidor.onclick = abrirMisLiquidaciones;
      navegacion.appendChild(botonRepartidor);

      const seccionPropia = document.createElement('div');
      seccionPropia.id = 'seccionMisLiquidaciones';
      seccionPropia.className = 'hidden';
      seccionPropia.innerHTML = `
        <h3 class="admin-titulo">Mis liquidaciones</h3>
        <p class="admin-subtitulo">Recibís el 80% de la tarifa de cada servicio entregado.</p>
        <div id="listaMisLiquidaciones"></div>
      `;
      document.querySelector('.content').appendChild(seccionPropia);
    }

    document.querySelectorAll('.nav-btn').forEach(elemento => {
      if (elemento.id !== 'navLiquidaciones' && elemento.id !== 'navMisLiquidaciones') {
        elemento.addEventListener('click', ocultarSecciones);
      }
    });
  }

  async function cargarRepartidoresLiquidacion() {
    const select = document.getElementById('liquidacionRepartidor');
    const respuesta = await fetch(`${API_URL}/repartidores`);
    const repartidores = await respuesta.json();
    const aprobados = repartidores.filter(repartidor => repartidor.estado_aprobacion === 'aprobado');

    select.innerHTML = '<option value="">Seleccionar repartidor</option>' + aprobados
      .map(repartidor => `<option value="${repartidor.id}">${repartidor.nombre || 'Repartidor'} · #${repartidor.id}</option>`)
      .join('');
  }

  window.abrirLiquidaciones = async function abrirLiquidaciones() {
    if (!esAdmin()) {
      alert('Esta sección es exclusiva para el administrador.');
      return;
    }
    filtroLiquidacionesRepartidorId = null;

    document.querySelectorAll('.content > div[id^="seccion"]').forEach(seccion => seccion.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(elemento => elemento.classList.remove('active'));
    document.getElementById('seccionLiquidaciones').classList.remove('hidden');
    document.getElementById('navLiquidaciones').classList.add('active');

    try {
      await cargarRepartidoresLiquidacion();
      await cargarLiquidaciones();
    } catch (error) {
      console.error(error);
      document.getElementById('resumenLiquidacion').innerHTML = '<div class="no-data">No se pudieron cargar los repartidores.</div>';
    }
  };

  // Acceso directo desde una tarjeta de repartidor (panel Repartidores):
  // abre la pestaña Liquidaciones ya filtrada por ese repartidor, mostrando
  // su historial y sus comprobantes sin tener que buscarlo en el desplegable.
  window.verLiquidacionesDeRepartidor = async function verLiquidacionesDeRepartidor(repartidorId) {
    if (!esAdmin()) {
      alert('Esta sección es exclusiva para el administrador.');
      return;
    }
    filtroLiquidacionesRepartidorId = repartidorId;

    document.querySelectorAll('.content > div[id^="seccion"]').forEach(seccion => seccion.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(elemento => elemento.classList.remove('active'));
    document.getElementById('seccionLiquidaciones').classList.remove('hidden');
    document.getElementById('navLiquidaciones').classList.add('active');

    try {
      await cargarRepartidoresLiquidacion();
      const select = document.getElementById('liquidacionRepartidor');
      if (select) select.value = String(repartidorId);
      document.getElementById('resumenLiquidacion').innerHTML = '';
      await cargarLiquidaciones();
    } catch (error) {
      console.error(error);
      document.getElementById('listaLiquidaciones').innerHTML = '<div class="no-data">No se pudieron cargar las liquidaciones de este repartidor.</div>';
    }
  };

  window.verTodasLasLiquidaciones = async function verTodasLasLiquidaciones() {
    filtroLiquidacionesRepartidorId = null;
    try {
      await cargarLiquidaciones();
    } catch (error) {
      console.error(error);
    }
  };

  window.abrirMisLiquidaciones = async function abrirMisLiquidaciones() {
    if (!esCuentaRepartidor()) {
      alert('Esta sección es exclusiva para cuentas de repartidor.');
      return;
    }

    document.querySelectorAll('.content > div[id^="seccion"]').forEach(seccion => seccion.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(elemento => elemento.classList.remove('active'));
    document.getElementById('seccionMisLiquidaciones').classList.remove('hidden');
    document.getElementById('navMisLiquidaciones').classList.add('active');

    await cargarMisLiquidaciones();
  };

  window.consultarResumenLiquidacion = async function consultarResumenLiquidacion() { if (!esAdmin()) { alert('? Solo el administrador puede crear liquidaciones.'); return; } const repartidorId = document.getElementById('liquidacionRepartidor').value;
    const fechaHasta = document.getElementById('liquidacionHasta').value;
    const fechaDesde = document.getElementById('liquidacionDesde').value;
    const destino = document.getElementById('resumenLiquidacion');

    if (!repartidorId) {
      alert('Seleccioná un repartidor.');
      return;
    }

    destino.innerHTML = '<div class="no-data">Calculando...</div>';
    try {
      const params = new URLSearchParams({
  repartidor_id: repartidorId,
  fecha_desde: fechaDesde ? `${fechaDesde} 00:00:00` : '',
  fecha_hasta: fechaHasta ? `${fechaHasta} 23:59:59` : ''
});
      const respuesta = await fetch(`${API_URL}/liquidaciones/resumen?${params}`);
      const resumen = await respuesta.json();
      if (!respuesta.ok) throw new Error(resumen.error || 'No se pudo calcular');

      resumenActual = resumen;
      const empresaPaga = resumen.direccion_pago === 'empresa_paga';
      destino.innerHTML = `
        <div class="card">
          <h3 style="margin-bottom:12px;">Resumen (pedidos pendientes de liquidar)</h3>
          <div class="admin-fila"><span>Pedidos entregados</span><strong>${resumen.total_servicios}</strong></div>
          <div class="admin-fila"><span>Total de tarifas</span><strong>${formatoGs(resumen.total_tarifas)}</strong></div>
          <div class="admin-fila"><span>Repartidor (80% de tarifas)</span><strong style="color:#4caf50;">${formatoGs(resumen.monto_repartidor)}</strong></div>
          <div class="admin-fila"><span>JMMotocourier (20% de tarifas)</span><strong style="color:#60a5fa;">${formatoGs(resumen.comision_plataforma)}</strong></div>
          <div class="admin-fila"><span>Ya cobrado en efectivo (a rendir)</span><strong style="color:#fbbf24;">${formatoGs(resumen.efectivo_cobrado)}</strong></div>
          <div style="border-top: 1px solid #444; padding-top: 12px; margin-top: 12px;">
            <div class="admin-fila" style="font-size:15px;">
              <span>${empresaPaga ? 'JMMotocourier le debe al repartidor' : 'El repartidor le debe a JMMotocourier'}</span>
              <strong style="color:${empresaPaga ? '#4caf50' : '#f87171'};">${formatoGs(resumen.monto_neto)}</strong>
            </div>
          </div>
          ${resumen.total_servicios ? '<button onclick="crearLiquidacion()">Crear liquidación pendiente</button>' : '<div class="no-data" style="padding:16px;">No hay pedidos pendientes de liquidar para este repartidor.</div>'}
        </div>
      `;
    } catch (error) {
      destino.innerHTML = `<div class="no-data">${error.message}</div>`;
    }
  };

  window.crearLiquidacion = async function crearLiquidacion() { if (!esAdmin()) { alert('? Solo el administrador puede crear liquidaciones.'); return; } if (!resumenActual || !resumenActual.total_servicios) return;
    if (!confirm(`¿Crear liquidación por ${formatoGs(resumenActual.monto_repartidor)} para el repartidor?`)) return;

    try {
      const respuesta = await fetch(`${API_URL}/liquidaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repartidor_id: resumenActual.repartidor_id,
          fecha_hasta: resumenActual.fecha_fin
        })
      });
      const data = await respuesta.json();
if (!respuesta.ok) throw new Error(data.error || 'No se pudo crear la liquidación');

alert(`✅ Liquidación #${data.liquidacion_id} creada.\n\nAhora adjunta el comprobante de pago (transferencia bancaria o firma del repartidor).`);
resumenActual = null;
document.getElementById('resumenLiquidacion').innerHTML = '';
await cargarLiquidaciones();
    } catch (error) {
      alert(error.message);
    }
  };

  window.cerrarSemana = async function cerrarSemana() {
    if (!esAdmin()) { alert('Solo el administrador puede cerrar la semana.'); return; }
    if (!confirm('¿Cerrar la semana? Esto crea la liquidación pendiente de todos los repartidores que tengan pedidos entregados sin liquidar.')) return;

    try {
      const respuesta = await fetch(`${API_URL}/liquidaciones/cerrar-semana`, { method: 'POST' });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || 'No se pudo cerrar la semana');

      if (!data.creadas.length) {
        alert('No había pedidos pendientes de liquidar en ningún repartidor.');
      } else {
        const detalle = data.creadas
          .map(c => `• ${c.nombre || 'Repartidor'}: ${formatoGs(c.monto_neto)} (${c.direccion_pago === 'empresa_paga' ? 'le debemos' : 'nos debe'})`)
          .join('\n');
        alert(`✅ Se crearon ${data.creadas.length} liquidación(es):\n\n${detalle}`);
      }
      await cargarLiquidaciones();
    } catch (error) {
      alert(error.message);
    }
  };

  window.reportarPagoLiquidacion = async function reportarPagoLiquidacion(id) {
    const selector = document.getElementById(`comprobanteLiquidacion-${id}`);
    const archivo = selector?.files?.[0];
    if (!archivo) {
      alert('Seleccioná la foto del comprobante antes de enviarlo.');
      return;
    }
    if (!archivo.type.startsWith('image/')) {
      alert('El comprobante debe ser una imagen.');
      return;
    }
    if (archivo.size > 3 * 1024 * 1024) {
      alert('La imagen supera 3 MB. Elegí una foto más liviana.');
      return;
    }
    if (!confirm('¿Confirmás que ya le pagaste a JMMotocourier y querés enviar este comprobante?')) return;

    try {
      const comprobante = await leerImagenComoTexto(archivo);
      const respuesta = await fetch(`${API_URL}/liquidaciones/${id}/reportar-pago`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comprobante_transferencia: comprobante })
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || 'No se pudo enviar el comprobante');
      alert('Comprobante enviado. Vas a seguir sin poder recibir pedidos hasta que el administrador lo confirme.');
      await cargarMisLiquidaciones();
    } catch (error) {
      alert(error.message);
    }
  };

  window.confirmarPagoLiquidacion = async function confirmarPagoLiquidacion(id) {
    if (!confirm('¿Confirmás que recibiste este pago del repartidor?')) return;
    try {
      const respuesta = await fetch(`${API_URL}/liquidaciones/${id}/confirmar-pago`, { method: 'PUT' });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || 'No se pudo confirmar el pago');
      alert('Pago confirmado. El repartidor ya puede volver a recibir pedidos.');
      await cargarLiquidaciones();
    } catch (error) {
      alert(error.message);
    }
  };

  window.rechazarPagoLiquidacion = async function rechazarPagoLiquidacion(id) {
    if (!confirm('¿Rechazar este comprobante? El repartidor va a tener que subir uno nuevo y sigue sin poder recibir pedidos mientras tanto.')) return;
    try {
      const respuesta = await fetch(`${API_URL}/liquidaciones/${id}/rechazar-pago`, { method: 'PUT' });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || 'No se pudo rechazar el comprobante');
      alert('Comprobante rechazado.');
      await cargarLiquidaciones();
    } catch (error) {
      alert(error.message);
    }
  };

  window.marcarLiquidacionPagada = async function marcarLiquidacionPagada(id) {
    const selector = document.getElementById(`comprobanteLiquidacion-${id}`);
    const archivo = selector?.files?.[0];
    if (!archivo) {
      alert('Seleccioná la foto del comprobante de transferencia antes de marcar como pagada.');
      return;
    }
    if (!archivo.type.startsWith('image/')) {
      alert('El comprobante debe ser una imagen.');
      return;
    }
    if (archivo.size > 3 * 1024 * 1024) {
      alert('La imagen supera 3 MB. Elegí una foto más liviana.');
      return;
    }
    if (!confirm('¿Confirmás que ya pagaste esta liquidación al repartidor?')) return;

    try {
      const comprobante = await leerImagenComoTexto(archivo);
      const respuesta = await fetch(`${API_URL}/liquidaciones/${id}/pagar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comprobante_transferencia: comprobante })
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || 'No se pudo registrar el pago');
      alert('Liquidación marcada como pagada.');
      await cargarLiquidaciones();
    } catch (error) {
      alert(error.message);
    }
  };

  window.adjuntarComprobante = async function adjuntarComprobante(id) {
    const selector = document.getElementById(`comprobanteLiquidacion-${id}`);
    const archivo = selector?.files?.[0];
    if (!archivo) {
      alert('Seleccioná la foto del comprobante.');
      return;
    }
    if (!archivo.type.startsWith('image/') || archivo.size > 3 * 1024 * 1024) {
      alert('Elegí una imagen de hasta 3 MB.');
      return;
    }
    try {
      const comprobante = await leerImagenComoTexto(archivo);
      const respuesta = await fetch(`${API_URL}/liquidaciones/${id}/comprobante`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comprobante_transferencia: comprobante })
      });
      const data = await respuesta.json();
      if (!respuesta.ok) throw new Error(data.error || 'No se pudo guardar el comprobante');
      alert('Comprobante guardado correctamente.');
      await cargarLiquidaciones();
    } catch (error) {
      alert(error.message);
    }
  };

  function leerImagenComoTexto(archivo) {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(lector.result);
      lector.onerror = () => rechazar(new Error('No se pudo leer la imagen del comprobante'));
      lector.readAsDataURL(archivo);
    });
  }

  function actualizarBannerFiltro() {
    const banner = document.getElementById('filtroLiquidacionesBanner');
    if (!banner) return;

    if (!filtroLiquidacionesRepartidorId) {
      banner.classList.add('hidden');
      banner.innerHTML = '';
      return;
    }

    const select = document.getElementById('liquidacionRepartidor');
    const opcion = select
      ? Array.from(select.options).find(o => o.value === String(filtroLiquidacionesRepartidorId))
      : null;
    const nombre = opcion ? opcion.textContent : `Repartidor #${filtroLiquidacionesRepartidorId}`;

    banner.classList.remove('hidden');
    banner.innerHTML = `
      <div class="instruccion" style="display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
        <span>Mostrando liquidaciones de: <strong>${nombre}</strong></span>
        <button type="button" onclick="verTodasLasLiquidaciones()" style="width:auto; margin:0; padding:6px 14px; font-size:12px;">Ver todas</button>
      </div>
    `;
  }

  async function cargarLiquidaciones() {
    const destino = document.getElementById('listaLiquidaciones');
    const url = filtroLiquidacionesRepartidorId
      ? `${API_URL}/liquidaciones?repartidor_id=${filtroLiquidacionesRepartidorId}`
      : `${API_URL}/liquidaciones`;
    const respuesta = await fetch(url);
    const liquidaciones = await respuesta.json();
    if (!respuesta.ok) throw new Error('No se pudieron cargar las liquidaciones');

    actualizarBannerFiltro();

    if (!liquidaciones.length) {
      destino.innerHTML = filtroLiquidacionesRepartidorId
        ? '<div class="no-data">Este repartidor todavía no tiene liquidaciones registradas.</div>'
        : '<div class="no-data">Todavía no hay liquidaciones creadas.</div>';
      return;
    }

    destino.innerHTML = liquidaciones.map(liquidacion => renderTarjetaLiquidacion(liquidacion, true)).join('');
  }

  async function cargarMisLiquidaciones() {
    const destino = document.getElementById('listaMisLiquidaciones');
    destino.innerHTML = '<div class="no-data">Cargando...</div>';

    try {
      const repartidor = await obtenerMiRepartidor();
      if (!repartidor) {
        destino.innerHTML = '<div class="no-data">No se pudo identificar tu cuenta de repartidor.</div>';
        return;
      }

      const respuesta = await fetch(`${API_URL}/liquidaciones?repartidor_id=${repartidor.id}`);
      const liquidaciones = await respuesta.json();
      if (!respuesta.ok) throw new Error('No se pudieron cargar tus liquidaciones');

      if (!liquidaciones.length) {
        destino.innerHTML = '<div class="no-data">Todavía no tenés liquidaciones registradas.</div>';
        return;
      }

      destino.innerHTML = liquidaciones.map(liquidacion => renderTarjetaLiquidacion(liquidacion, false)).join('');
    } catch (error) {
      console.error(error);
      destino.innerHTML = '<div class="no-data">No se pudieron cargar tus liquidaciones.</div>';
    }
  }

  function textoEstado(estado) {
    if (estado === 'pago_reportado') return 'comprobante enviado';
    return estado;
  }

  function renderTarjetaLiquidacion(liquidacion, controlesAdmin) {
    const fechaInicio = new Date(liquidacion.fecha_inicio).toLocaleDateString('es-PY');
    const fechaFin = new Date(liquidacion.fecha_fin).toLocaleDateString('es-PY');
    const comprobanteValido = String(liquidacion.comprobante_transferencia || '').startsWith('data:image/');
    const empresaPaga = liquidacion.direccion_pago !== 'repartidor_paga';
    const textoDireccion = empresaPaga ? 'JMMotocourier le debe al repartidor' : 'El repartidor le debe a JMMotocourier';
    const colorDireccion = empresaPaga ? '#4caf50' : '#f87171';
    const claseEstado = liquidacion.estado === 'pagado'
      ? 'entregado'
      : (liquidacion.estado === 'pago_reportado' ? 'asignado' : 'pendiente');

    let controles;

    if (liquidacion.estado === 'pendiente') {
      if (controlesAdmin) {
        controles = `
          <div class="admin-control">
            <label>Foto del comprobante de transferencia</label>
            <input id="comprobanteLiquidacion-${liquidacion.id}" type="file" accept="image/*">
          </div>
          <button onclick="marcarLiquidacionPagada(${liquidacion.id})">${empresaPaga ? 'Marcar como pagada' : 'Registrar cobro al repartidor'}</button>
        `;
      } else if (empresaPaga) {
        controles = `<div class="gps-estado">Pago pendiente de parte de JMMotocourier.</div>`;
      } else {
        controles = `
          <div class="gps-estado">Tenés un saldo pendiente con JMMotocourier. No vas a poder recibir pedidos nuevos hasta ponerte al día.</div>
          <div class="admin-control">
            <label>Foto del comprobante de tu pago</label>
            <input id="comprobanteLiquidacion-${liquidacion.id}" type="file" accept="image/*">
          </div>
          <button onclick="reportarPagoLiquidacion(${liquidacion.id})">Ya pagué, enviar comprobante</button>
        `;
      }
    } else if (liquidacion.estado === 'pago_reportado') {
      if (controlesAdmin) {
        controles = `
          ${comprobanteValido ? `<a href="${liquidacion.comprobante_transferencia}" target="_blank" style="color:#93c5fd;">Ver comprobante enviado por el repartidor</a>` : ''}
          <button onclick="confirmarPagoLiquidacion(${liquidacion.id})">Confirmar pago</button>
          <button onclick="rechazarPagoLiquidacion(${liquidacion.id})" style="background: var(--color-bg-elevated-2); border: 1px solid var(--color-border-strong); color: var(--text-primary);">Rechazar comprobante</button>
        `;
      } else {
        controles = `<div class="gps-estado">Comprobante enviado. Esperando que el administrador lo confirme — seguís sin poder recibir pedidos hasta entonces.</div>`;
      }
    } else {
      controles = `
        <div class="gps-estado">${empresaPaga ? 'Pago registrado.' : 'Cobro registrado.'}</div>
        ${comprobanteValido
          ? `<a href="${liquidacion.comprobante_transferencia}" target="_blank" style="color:#93c5fd;">Ver comprobante de transferencia</a>`
          : (controlesAdmin ? `
            <div class="admin-control">
              <label>Falta adjuntar foto del comprobante</label>
              <input id="comprobanteLiquidacion-${liquidacion.id}" type="file" accept="image/*">
            </div>
            <button onclick="adjuntarComprobante(${liquidacion.id})">Adjuntar comprobante</button>
          ` : `<div class="no-data" style="padding:8px;">Comprobante aún no disponible.</div>`)}
      `;
    }

    return `
      <div class="admin-pedido">
        <div class="pedido-header">
          <strong>${liquidacion.nombre || 'Repartidor'} · Liquidación #${liquidacion.id}</strong>
          <span class="estado ${claseEstado}">${textoEstado(liquidacion.estado)}</span>
        </div>
        <div class="admin-fila"><span>Período</span><strong>${fechaInicio} al ${fechaFin}</strong></div>
        <div class="admin-fila"><span>Servicios</span><strong>${liquidacion.total_servicios}</strong></div>
        <div class="admin-fila"><span>Tarifas</span><strong>${formatoGs(liquidacion.total_tarifas)}</strong></div>
        <div class="admin-fila"><span>Comisión del repartidor (80%)</span><strong style="color:#4caf50;">${formatoGs(liquidacion.monto_repartidor)}</strong></div>
        ${controlesAdmin ? `
          <div class="admin-fila"><span>Comisión JMMotocourier (20%)</span><strong>${formatoGs(liquidacion.comision_plataforma)}</strong></div>
          <div class="admin-fila"><span>Ya cobrado en efectivo (a rendir)</span><strong style="color:#fbbf24;">${formatoGs(liquidacion.efectivo_cobrado)}</strong></div>
        ` : ''}
        <div class="admin-fila" style="font-size:14px; margin-top:6px;">
          <span>${textoDireccion}</span>
          <strong style="color:${colorDireccion};">${formatoGs(liquidacion.monto_neto)}</strong>
        </div>
        ${controles}
      </div>
    `;
  }

  document.addEventListener('DOMContentLoaded', () => {
    crearPantalla();
    setInterval(() => {
      const botonAdmin = document.getElementById('navLiquidaciones');
      if (botonAdmin) botonAdmin.classList.toggle('hidden', !esAdmin());

      const botonRepartidor = document.getElementById('navMisLiquidaciones');
      if (botonRepartidor) botonRepartidor.classList.toggle('hidden', !esCuentaRepartidor());
    }, 500);
  });
})();