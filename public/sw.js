// NOTE: Increment this version on every production build to ensure
// users always get the latest version of the app.
const CACHE_NAME = 'meeplemind-v2';

// Install: pre-cache only the app shell HTML
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/index.html']).catch(() => {
        console.log('App shell not available to cache');
      });
    })
  );
  // Force new SW to become active immediately
  self.skipWaiting();
});

// Fetch: strategy depends on request type
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Cache-first for Vite hashed static assets (/assets/)
  // These files have content-hash names so they are safe to cache indefinitely
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Network-first for navigation (HTML)
  // Always fetches fresh HTML so new builds are immediately visible
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback: serve cached HTML
          return caches.match('/index.html').then(
            (cached) => cached || new Response('Offline', { status: 503 })
          );
        })
    );
    return;
  }

  // Default: network with cache fallback for other requests
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Activate: clean up stale caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) return caches.delete(name);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});
