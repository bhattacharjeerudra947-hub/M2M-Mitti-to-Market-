/**
 * Mitti2Market — minimal PWA service worker.
 *
 * Caches ONLY the app shell (static assets). API responses are NEVER cached:
 *  - no auth tokens / passwords cached
 *  - no private documents cached
 *  - no financial data cached
 *  - authenticated API calls always go to the network
 *
 * Offline: navigation falls back to the cached shell; the React app then uses
 * IndexedDB drafts + the sync queue for offline produce listing.
 */
const CACHE = 'm2m-shell-v1';
const SHELL = ['/', '/index.html', '/logo-icon.png', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls — always hit the network (fresh data, no auth leaks)
  if (url.pathname.startsWith('/api/')) return;

  // Navigation requests: network-first, fall back to cached app shell when offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});