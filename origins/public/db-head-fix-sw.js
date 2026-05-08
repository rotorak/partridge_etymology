const DB_PATH = '/partridge_etymology/final_def_linkage.bin';
const DB_SIZE = 32624640;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  if (req.method === 'HEAD') {
    const url = new URL(req.url);
    if (url.pathname === DB_PATH) {
      event.respondWith(
        new Response(null, {
          status: 200,
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': String(DB_SIZE),
            'Content-Type': 'application/octet-stream',
            'Cache-Control': 'public, max-age=600',
          },
        })
      );
      return;
    }
  }
});