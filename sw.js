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
    data: { pedidoId: datos.pedidoId || null }
  };

  evento.waitUntil(self.registration.showNotification(datos.titulo, opciones));
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
