const CACHE = 'netma-v1';

const PRECACHE = [
  '/',
  '/dashboard',
  '/manifest',
  '/icon.svg',
  '/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => {
            if (event.request.url.startsWith(self.location.origin)) {
              cache.put(event.request, clone);
            }
          });
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
