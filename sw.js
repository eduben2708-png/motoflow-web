// Service Worker de JMMotocourier.
//
// Su único trabajo hoy es recibir las notificaciones push que manda el
// servidor y mostrarlas como notificación del sistema, aunque la app esté
// cerrada o el celular tenga la pantalla bloqueada. El navegador lo
// mantiene "vivo" en segundo plano solo para esto: no reemplaza a la app,
// que sigue siendo la página normal (index.html).

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

  const opciones = {
    body: datos.cuerpo,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    vibrate: [250, 100, 250, 100, 250],
    // Con "tag" cada pedido tiene su propia notificación; "renotify" hace
    // que vuelva a sonar/vibrar si llega otro aviso con el mismo tag, y
    // "requireInteraction" la deja en pantalla hasta que se toque.
    tag: datos.pedidoId ? 'pedido-' + datos.pedidoId : 'jmmotocourier',
    renotify: true,
    requireInteraction: true,
    silent: false,
    timestamp: Date.now(),
    data: { pedidoId: datos.pedidoId || null }
  };

  evento.waitUntil(self.registration.showNotification(datos.titulo, opciones));
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
// abierta en algún lado, o se abre una nueva si no.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();

  evento.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((listaClientes) => {
      for (const cliente of listaClientes) {
        if ('focus' in cliente) return cliente.focus();
      }
      if (clients.openWindow) return clients.openWindow('.');
    })
  );
});
