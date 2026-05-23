// Service Worker dedicado a Web Push.
// Angular Service Worker no maneja push de forma cómoda; este SW vive
// junto al de Angular (registrados con scopes distintos no es posible,
// así que en producción usamos UNO de los dos: si Web Push está activo,
// sustituye al de Angular registrando este).
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Casa García', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Casa García';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: data.tag || 'casa-garcia',
    data: data.data || {},
    vibrate: [120, 60, 120]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(url);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return null;
    })
  );
});
