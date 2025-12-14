export const dynamic = 'force-static'

export async function GET() {
  const content = `/* Neutralize legacy Flutter SW: auto-unregister and refresh clients */
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
`;
  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
