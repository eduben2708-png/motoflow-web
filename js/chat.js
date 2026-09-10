let pedidoActivoChat = null;

function abrirChat(pedidoId) {
  pedidoActivoChat = pedidoId;
  mostrarSeccion('chat');
  cargarMensajes();
}

async function cargarMensajes() {
  if (!pedidoActivoChat) return;
  try {
    // ✅ CORREGIDO: Se agregó /api/
    const res = await fetch(`${API_URL}/api/pedidos/${pedidoActivoChat}/mensajes`);
    const msgs = await res.json();
    let html = '';
    msgs.forEach(msg => {
      const esCliente = msg.usuario_id === usuarioId;
      const claseMsg = esCliente ? 'mensaje-cliente' : 'mensaje-repartidor';
      html += `
        <div class="mensaje ${claseMsg}">
          <div>${msg.mensaje}</div>
          <div class="mensaje-hora">${msg.timestamp}</div>
        </div>`;
    });
    document.getElementById('chatMensajes').innerHTML = html;
    document.getElementById('chatMensajes').scrollTop = document.getElementById('chatMensajes').scrollHeight;
  } catch (error) {
    console.error(error);
  }
}

async function enviarMensaje() {
  if (!pedidoActivoChat) return;
  const input = document.getElementById('inputMensaje');
  const mensaje = input.value.trim();
  if (!mensaje) return;
  try {
    // ✅ CORREGIDO: Se agregó /api/
    await fetch(`${API_URL}/api/pedidos/${pedidoActivoChat}/mensajes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario_id: usuarioId, mensaje })
    });
    input.value = '';
    cargarMensajes();
  } catch (error) {
    alert('Error al enviar mensaje');
  }
}