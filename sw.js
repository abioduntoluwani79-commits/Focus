const CACHE_NAME = 'focus-forge-v5';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css?v=4',
  './app.js?v=4',
  './manifest.json',
  './icon-192.svg',
  './icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('focus-forge-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || cache.match('./index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => cache.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then(async (response) => {
        if (response.ok) {
          await cache.put(request, response.clone());
        }
        return response;
      });
    }))
  );
});
