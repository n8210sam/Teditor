/* Neutralize legacy Flutter SW: auto-unregister and refresh clients */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const ok = await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        try { client.navigate(client.url); } catch {}
      }
      return ok;
    } catch (err) {}
  })());
});
