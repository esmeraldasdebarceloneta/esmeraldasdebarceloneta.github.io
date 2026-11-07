/* Esmeraldas de Barceloneta — service worker de la PWA.
   v2: el DOCUMENTO (la página) se busca SIEMPRE en la red primero, para que
   el visitante vea la versión más reciente al momento; la copia guardada
   solo se usa si no hay conexión. Los archivos fijos (íconos, manifiesto)
   se sirven de la copia guardada y se actualizan en segundo plano. */
const CACHE = 'esmeraldas-pwa-v2';
const CORE = [
  './',
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'icon-maskable-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
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
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const isDoc = event.request.mode === 'navigate'
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('.html');
  if (isDoc) {
    // Red primero para las páginas: siempre la versión más reciente.
    event.respondWith(
      fetch(event.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('index.html', copy));
        }
        return res;
      }).catch(() => caches.match('index.html', { ignoreSearch: true }))
    );
    return;
  }
  // Archivos fijos: copia guardada al instante, actualización en segundo plano.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => {
      const refresh = fetch(event.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || refresh;
    })
  );
});
