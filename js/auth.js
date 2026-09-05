async function enviarCodigo() {
  const telefono = document.getElementById('telefono').value;
  if (!telefono || telefono.length < 9) {
    alert('Ingresa un número válido');
    return;
  }
  try {
    const res = await fetch(`${API_URL}/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono })
    });
    const data = await res.json();
    if (data.success) {
      alert('El código de prueba es: 123456');
      document.getElementById('paso1').classList.add('hidden');
      document.getElementById('paso2').classList.remove('hidden');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

async function verificarCodigo() {
  const telefono = document.getElementById('telefono').value;
  const codigo = document.getElementById('codigo').value;
  try {
    const res = await fetch(`${API_URL}/auth/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono, codigo })
    });
    const data = await res.json();
    if (data.success) {
      usuarioId = data.usuario.id;
      usuarioTelefono = data.usuario.telefono;
      usuarioRol = data.usuario.rol || 'cliente';
      await mostrarDashboard();
    } else {
      alert('Código inválido');
    }
  } catch (error) {
    alert('Error: ' + error.message);
  }
}

function paso1() {
  document.getElementById('paso1').classList.remove('hidden');
  document.getElementById('paso2').classList.add('hidden');
}

async function mostrarDashboard() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('dashboardScreen').classList.remove('hidden');
  document.getElementById('usuarioTel').textContent = '+595 ' + usuarioTelefono;
  try {
    const repartidor = await obtenerMiRepartidor();
    esRepartidor = usuarioRol === 'repartidor' || Boolean(repartidor);
  } catch (error) {
    console.error('No se pudo identificar el tipo de cuenta.', error);
  }
  configurarMenuSegunCuenta();
  if (esRepartidor) {
    mostrarSeccionPorCodigo('miRuta');
    iniciarActualizacionMiRuta();
    return;
  }
  cargarPedidos();
  iniciarNotificaciones();
}

function configurarMenuSegunCuenta() {
  const botonesCliente = ['navPedidos', 'navChat', 'navMapa', 'navCrear'];
  botonesCliente.forEach(id => document.getElementById(id).classList.toggle('hidden', esRepartidor));
  document.getElementById('navRepartidores').classList.toggle('hidden', esRepartidor || usuarioRol !== 'admin');
  document.getElementById('navAdmin').classList.toggle('hidden', esRepartidor || usuarioRol !== 'admin');
  document.getElementById('navMiRuta').classList.toggle('hidden', !esRepartidor);
  document.getElementById('navHistorial').classList.remove('hidden');
  document.getElementById('grupoHistorialCliente').classList.toggle('hidden', usuarioRol !== 'admin');
  document.getElementById('grupoHistorialRepartidor').classList.toggle('hidden', usuarioRol !== 'admin');
}

async function obtenerMiRepartidor() {
  const respuesta = await fetch(`${API_URL}/repartidores`);
  if (!respuesta.ok) throw new Error('No se pudieron cargar los repartidores');
  const repartidores = await respuesta.json();
  return repartidores.find(repartidor => Number(repartidor.usuario_id) === Number(usuarioId)) || null;
}

function logout() {
  detenerSeguimientoGpsRepartidor();
  detenerActualizacionMiRuta();
  usuarioId = null;
  usuarioTelefono = null;
  usuarioRol = 'cliente';
  esRepartidor = false;
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('dashboardScreen').classList.add('hidden');
  document.getElementById('telefono').value = '';
  document.getElementById('codigo').value = '';
  paso1();
}