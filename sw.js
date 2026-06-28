// Service Worker - caché híbrida para hub PWA y juegos descargados
// Versión: 2026-06-27-02
// Manifest: games.json → cache.name, cache.hubPrecache, cache.legacyCaches

const CACHE = "js-games-v3";
const LEGACY_CACHES = ["js-games-v1", "js-games-v2"];

const PRECACHE_FALLBACK = [
  "./",
  "./index.html",
  "./style.css",
  "./main.js",
  "./games.json",
  "./manifest.json",
  "./icon.svg",
  "./engine/game-shell.css",
  "./engine/theme.js",
  "./engine/render-bridge.js",
  "./engine/input.js",
  "./engine/audio.js",
  "./engine/game-boot.js",
];

/** Código y config: red primero (actualizaciones inmediatas online) */
function isNetworkFirst(url) {
  if (url.origin !== self.location.origin) return false;
  const p = url.pathname;
  return (
    p.endsWith(".html") ||
    p.endsWith(".css") ||
    p.endsWith(".js") ||
    p.endsWith(".json") ||
    p === "/" ||
    p.includes("/engine/") ||
    p.includes("/games/")
  );
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    fetch("./games.json")
      .then((r) => r.json())
      .then((data) => {
        const list = data.cache?.hubPrecache || PRECACHE_FALLBACK;
        const name = data.cache?.name || CACHE;
        return caches.open(name).then((c) => c.addAll(list));
      })
      .catch(() => caches.open(CACHE).then((c) => c.addAll(PRECACHE_FALLBACK)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      // Migrar entradas de cachés legacy (juegos descargados previamente)
      for (const legacy of LEGACY_CACHES) {
        const oldCache = await caches.open(legacy);
        const current = await caches.open(CACHE);
        const keys = await oldCache.keys();
        await Promise.all(
          keys.map(async (req) => {
            const res = await oldCache.match(req);
            if (res) await current.put(req, res);
          }),
        );
        await caches.delete(legacy);
      }

      // Eliminar cualquier otra caché huérfana distinta a la activa
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE).map((n) => caches.delete(n)),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // Bypass explícito (p. ej. HEAD de comprobación de actualización)
  if (e.request.url.includes("?_nocache")) {
    e.respondWith(fetch(e.request));
    return;
  }

  const url = new URL(e.request.url);

  if (isNetworkFirst(url)) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request)),
    );
    return;
  }

  // Imágenes, SVG del hub, assets binarios: caché primero
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      });
    }),
  );
});
