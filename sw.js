const CACHE = 'js-games-v1';
const PRECACHE = [
  './', './index.html', './style.css', './main.js', './games.json',
  './manifest.json', './icon.svg',
  './engine/engine.js', './engine/input.js', './engine/audio.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('?_nocache')) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(r => {
      if (e.request.url.startsWith(self.location.origin) && e.request.method === 'GET') {
        const clone = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return r;
    }))
  );
});
