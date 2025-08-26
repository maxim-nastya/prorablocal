const CACHE_NAME = 'prorab-cache-v10'; // Version bumped to force update
const IMAGE_CACHE_NAME = 'prorab-image-cache-v1';
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
  const cacheWhitelist = [CACHE_NAME, IMAGE_CACHE_NAME];
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

// Refactored fetch handler for clarity and robustness
self.addEventListener('fetch', event => {
  event.respondWith((async () => {
    const { request } = event;
    const url = new URL(request.url);

    // Strategy 1: User-uploaded images (Cache only)
    if (url.pathname.startsWith('/cached-images/')) {
      const imageCache = await caches.open(IMAGE_CACHE_NAME);
      const cachedResponse = await imageCache.match(request);
      // Images must be in the cache. If not, returning undefined will result in a network error.
      return cachedResponse;
    }

    // Strategy 2: Navigation requests (Network first, cache fallback)
    if (request.mode === 'navigate') {
      try {
        return await fetch(request);
      } catch (error) {
        // Network failed, fall back to the app shell from the cache.
        const appCache = await caches.open(CACHE_NAME);
        return await appCache.match(APP_SHELL_URL);
      }
    }

    // Strategy 3: Other assets (Cache first, network fallback)
    try {
        const appCache = await caches.open(CACHE_NAME);
        const cachedResponse = await appCache.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache, fetch from network
        const networkResponse = await fetch(request);
        // Check for a valid, basic (same-origin) response to cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            await appCache.put(request, responseToCache);
        }
        return networkResponse;
    } catch (error) {
        console.error('Service Worker fetch failed:', error);
        // This will result in a network error page.
    }
  })());
});