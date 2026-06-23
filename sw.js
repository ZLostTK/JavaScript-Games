// Version: 2026-06-23-03
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
	// Ignorar peticiones que no sean GET (como sockets o analíticas de terceros)
	if (e.request.method !== 'GET') return;
	
	// Si tiene query param de bypass, ir directo a la red
	if (e.request.url.includes('?_nocache')) {
		e.respondWith(fetch(e.request));
		return;
	}
	
	const url = new URL(e.request.url);
	
	// ESTRATEGIA: Network-First (Red primero, caer en caché si está offline)
	// Para código (HTML, JS, CSS, JSON), directorio raíz, y directorios de los juegos
	const isNetworkFirstAsset = 
	url.pathname.endsWith('.html') ||
	url.pathname.endsWith('.css') ||
	url.pathname.endsWith('.js') ||
	url.pathname.endsWith('.json') ||
	url.pathname === '/' ||
	url.pathname === '/JavaScript-Games/' ||
	(url.pathname.includes('/games/') && url.pathname.endsWith('/'));
	
	if (isNetworkFirstAsset && url.origin === self.location.origin) {
		e.respondWith(
			fetch(e.request)
			.then(res => {
				if (res.ok) {
					const clone = res.clone();
					caches.open(CACHE).then(c => c.put(e.request, clone));
				}
				return res;
			})
			.catch(() => {
				return caches.match(e.request);
			})
		);
		return;
	}
	
	// ESTRATEGIA: Cache-First (Caché primero, si no existe buscar en red y guardar)
	// Para imágenes, sonidos, manifest y otros recursos estáticos
	e.respondWith(
		caches.match(e.request).then(cachedResponse => {
			if (cachedResponse) {
				return cachedResponse;
			}
			return fetch(e.request).then(networkResponse => {
				if (networkResponse.ok && url.origin === self.location.origin) {
					const clone = networkResponse.clone();
					caches.open(CACHE).then(c => c.put(e.request, clone));
				}
				return networkResponse;
			});
		})
	);
});
