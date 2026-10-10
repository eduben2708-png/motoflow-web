// Service Worker de JMMotocourier.
//
// Su único trabajo hoy es recibir las notificaciones push que manda el
// servidor y mostrarlas como notificación del sistema, aunque la app esté
// cerrada o el celular tenga la pantalla bloqueada. El navegador lo
// mantiene "vivo" en segundo plano solo para esto: no reemplaza a la app,
// que sigue siendo la página normal (index.html).

// Cada versión nueva del service worker se activa enseguida, sin esperar a que
// se cierren todas las pestañas de la app. Sin esto, tras actualizar la app
// seguía corriendo la versión vieja del service worker (que no avisaba a la
// pantalla de los mensajes nuevos) hasta que el repartidor o el cliente
// cerraran la app por completo.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(clients.claim());
});

self.addEventListener('push', (evento) => {
  let datos = {
    titulo: 'JMMotocourier',
    cuerpo: 'Tenés una novedad en la app.'
  };

  try {
    if (evento.data) {
      datos = { ...datos, ...evento.data.json() };
    }
  } catch (error) {
    // Si el payload no vino en JSON válido, se muestra el mensaje genérico
    // de arriba en vez de romper la notificación.
  }

  const esMensaje = datos.tipo === 'mensaje';

  const opciones = {
    body: datos.cuerpo,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    vibrate: esMensaje ? [150, 80, 150] : [250, 100, 250, 100, 250],
    // Con "tag" cada pedido (o cada chat) tiene su propia notificación;
    // "renotify" hace que vuelva a sonar/vibrar si llega otro aviso con el
    // mismo tag. Los pedidos nuevos quedan en pantalla hasta que se toquen;
    // los mensajes no hace falta.
    tag: datos.pedidoId ? (esMensaje ? 'chat-' : 'pedido-') + datos.pedidoId : 'jmmotocourier',
    renotify: true,
    requireInteraction: !esMensaje,
    silent: false,
    timestamp: Date.now(),
    data: { pedidoId: datos.pedidoId || null, tipo: datos.tipo || 'pedido' }
  };

  // Se le avisa a la app (si está abierta) para que actualice o suene en el
  // momento. Si la app está a la vista (pantalla encendida y en primer
  // plano), un mensaje de chat no necesita además la notificación del
  // sistema: la propia app ya muestra su aviso con sonido.
  const trabajo = clients.matchAll({ type: 'window', includeUncontrolled: true }).then((listaClientes) => {
    for (const cliente of listaClientes) {
      cliente.postMessage({ tipo: 'push-recibido', categoria: datos.tipo || 'pedido', pedidoId: datos.pedidoId || null });
    }
    const appALaVista = listaClientes.some(cliente => cliente.visibilityState === 'visible' && cliente.focused);
    if (esMensaje && appALaVista) return;
    return self.registration.showNotification(datos.titulo, opciones);
  });

  evento.waitUntil(trabajo);
});

// Si el navegador renueva por su cuenta la suscripción push (pasa de vez en
// cuando), la anterior deja de servir y el servidor ya no podría avisarle al
// repartidor. Se avisa a las pestañas abiertas para que se vuelvan a suscribir;
// si no hay ninguna abierta, la app se vuelve a suscribir sola la próxima vez
// que se abra.
self.addEventListener('pushsubscriptionchange', (evento) => {
  evento.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((listaClientes) => {
      for (const cliente of listaClientes) {
        cliente.postMessage({ tipo: 'resuscribir-push' });
      }
    })
  );
});

// Al tocar la notificación, se enfoca la pestaña de la app si ya está
// abierta en algún lado, o se abre una nueva si no. Si era un mensaje de
// chat, la app además abre directo esa conversación.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const { pedidoId, tipo } = evento.notification.data || {};
  const esMensaje = tipo === 'mensaje' && pedidoId;

  evento.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((listaClientes) => {
      for (const cliente of listaClientes) {
        if ('focus' in cliente) {
          if (esMensaje) cliente.postMessage({ tipo: 'abrir-chat', pedidoId });
          return cliente.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(esMensaje ? `./?chat=${pedidoId}` : '.');
    })
  );
});
