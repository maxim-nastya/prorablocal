const CACHE_NAME = 'prorab-cache-v6.0'; // Version bumped for build system update
const urlsToCache = [
  './',
  './index.html',
  './assets/index.css',
  './assets/index.js',
  './logo.svg',
  './manifest.json',
  './icons/icon.svg',
  './icons/prorab-192.png',
  './icons/prorab-512.png',
  './icons/prorab-maskable-512.png',
  './icons/apple-touch-icon-180.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
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
    const url = new URL(event.request.url);

    // For API calls, always go to the network.
    if (url.pathname.startsWith('/api/')) {
        return; 
    }

    // For non-API calls (app shell, assets), use a cache-first strategy.
    event.respondWith(
        caches.match(event.request).then(response => {
            // Return from cache if found.
            if (response) {
                return response;
            }

            // Otherwise, fetch from the network.
            return fetch(event.request).then(fetchResponse => {
                // If we get a valid response, cache it for future offline use.
                if (fetchResponse && fetchResponse.status === 200 && fetchResponse.type === 'basic') {
                    const responseToCache = fetchResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return fetchResponse;
            }).catch(() => {
                // If the network fails, and it's a navigation request,
                // you might want to return a fallback offline page.
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
