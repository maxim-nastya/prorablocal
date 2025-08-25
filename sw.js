const CACHE_NAME = 'prorab-cache-v8.0'; // Version bumped to force update
const APP_SHELL_URL = './index.html';
const urlsToCache = [
  './',
  './index.html',
  './logo.svg',
  './manifest.json',
  './icons/icon.svg',
  './icons/prorab-192.png',
  './icons/prorab-512.png',
  './icons/prorab-maskable-512.png',
  './icons/apple-touch-icon-180.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (cacheWhitelist.indexOf(cacheName) === -1) {
          return caches.delete(cacheName);
        }
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // For navigation requests, use a network-first strategy to get the latest shell,
  // but fall back to the cached shell if offline.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Network failed, serve the cached app shell.
        return caches.match(APP_SHELL_URL);
      })
    );
    return;
  }

  // For all other requests (assets like JS, CSS, images), use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the resource is in the cache, serve it.
        if (response) {
          return response;
        }
        // If not in cache, fetch from the network, cache it, and then serve it.
        return fetch(event.request).then(networkResponse => {
          // Check for a valid response to cache
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
  );
});