let filtroRepartidor = 'todos';

async function cargarRepartidores() {
  try {
    const res = await fetch(`${API_URL}/api/repartidores`);
    const data = await res.json();
    let filtrados = data;
    if (filtroRepartidor === 'activos') {
      filtrados = data.filter(r => Boolean(r.gps_activo));
    } else if (filtroRepartidor === 'aprobados') {
      filtrados = data.filter(r => r.estado_aprobacion === 'aprobado');
    }
    let html = '';
    if (filtrados.length === 0) {
      html = '<div class="no-data">No hay repartidores</div>';
    } else {
      filtrados.forEach(r => {
        html += `
          <div class="repartidor-card">
            <div class="repartidor-header">
              <div>Repartidor #${r.id}</div>
              ${r.gps_activo ? '<div class="online">● Online</div>' : ''}
            </div>
            <div class="info-row">
              <div><div class="stat-label">Entregas</div><div class="stat-value">${r.total_entregas || 0}</div></div>
              <div><div class="stat-label">Rating</div><div class="stat-value">⭐ ${r.calificacion || 0}</div></div>
            </div>
            <div class="admin-fila"><span>Estado</span><strong>${r.estado_aprobacion}</strong></div>
            ${r.estado_aprobacion === 'pendiente'
              ? `<button class="btn-asignar" onclick="aprobarRepartidor(${r.id})" style="background:#4caf50;">Aprobar repartidor</button>`
              : `<button class="btn-asignar" onclick="actualizarGpsRepartidor(${r.id})" style="background:#7c3aed;">Actualizar GPS</button>`}
          </div>`;
      });
    }
    document.getElementById('listaRepartidores').innerHTML = html;
  } catch (error) {
    console.error(error);
  }
}

function filtrarRepartidores(filtro) {
  filtroRepartidor = filtro;
  document.querySelectorAll('.filtro-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  cargarRepartidores();
}

function actualizarGpsRepartidor(repartidorId) {
  if (!navigator.geolocation) {
    alert('Este dispositivo no permite obtener ubicación GPS.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    async posicion => {
      try {
        const res = await fetch(`${API_URL}/api/repartidores/${repartidorId}/gps`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: posicion.coords.latitude,
            lng: posicion.coords.longitude,
            activo: true
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo actualizar el GPS');
        alert('GPS actualizado. Este repartidor ya puede recibir asignaciones automáticas.');
        cargarRepartidores();
      } catch (error) {
        alert('Error: ' + error.message);
      }
    },
    () => alert('Debés permitir el acceso a la ubicación para activar el GPS.'),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  );
}

async function registrarRepartidor() {
  const datos = {
    nombre: document.getElementById('repNombre').value.trim(),
    telefono: document.getElementById('repTelefono').value.trim(),
    ci: document.getElementById('repCi').value.trim(),
    placa: document.getElementById('repPlaca').value.trim(),
    marca_moto: document.getElementById('repMarcaMoto').value.trim(),
    modelo_moto: document.getElementById('repModeloMoto').value.trim()
  };
  if (!datos.nombre || !datos.telefono || !datos.ci || !datos.placa) {
    alert('Completá nombre, teléfono, CI y placa');
    return;
  }
  try {
    const res = await fetch(`${API_URL}/api/repartidores/registro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo registrar el repartidor');
    alert('Repartidor registrado. Ahora debés aprobarlo.');
    ['repNombre', 'repTelefono', 'repCi', 'repPlaca', 'repMarcaMoto', 'repModeloMoto']
      .forEach(id => document.getElementById(id).value = '');
    cargarRepartidores();
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function aprobarRepartidor(id) {
  try {
    const res = await fetch(`${API_URL}/api/repartidores/${id}/aprobar`, { method: 'PUT' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo aprobar el repartidor');
    alert('Repartidor aprobado y disponible para asignaciones.');
    cargarRepartidores();
    if (!document.getElementById('seccionAdmin').classList.contains('hidden')) {
      cargarPanelAdmin();
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}