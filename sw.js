const CACHE_NAME = 'reiskompas-v1-5-0-static';

// Same-origin app-shell — moet volledig slagen, anders installeert de SW niet.
const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

// Cross-origin assets — best effort. Leaflet is CORS-cachebaar, dus de kaart-
// bibliotheek werkt ook offline. Tiles en fonts blijven netwerk-afhankelijk
// (offline val je terug op systeemfont; kaarttegels laden niet, maar de UI crasht niet).
const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // faal niet als een CDN-asset even niet bereikbaar is
    await Promise.allSettled(CDN_ASSETS.map(u => cache.add(new Request(u, { mode: 'cors' }))));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('reiskompas-') && k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isAppShell = url.origin === location.origin;

  if (isAppShell) {
    // app-shell: cache-first, met netwerk-update op de achtergrond
    event.respondWith(
      caches.match(req).then(cached =>
        cached || fetch(req).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return resp;
        })
      )
    );
    return;
  }

  // cross-origin (Leaflet, fonts, tiles, API's): netwerk-first, val terug op cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
