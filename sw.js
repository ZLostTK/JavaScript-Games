// Service Worker - caché híbrida para hub PWA y juegos descargados
// Versión: 2026-06-29-v4
// Manifest: games.json → cache.name, cache.hubPrecache, cache.legacyCaches

const CACHE = "js-games-v4";
const LEGACY_CACHES = ["js-games-v1", "js-games-v2", "js-games-v3"];

const PRECACHE_FALLBACK = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./sw.js",
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
    p.includes("/assets/") ||
    p.includes("/engine/") ||
    p.includes("/games/")
  );
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      let list = PRECACHE_FALLBACK;
      let name = CACHE;
      try {
        const r = await fetch("./games.json");
        if (r.ok) {
          const data = await r.json();
          list = data.cache?.hubPrecache || PRECACHE_FALLBACK;
          name = data.cache?.name || CACHE;
        }
      } catch (_) {}
      const cache = await caches.open(name);
      await Promise.allSettled(list.map((url) => cache.add(url)));
    })().then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
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
