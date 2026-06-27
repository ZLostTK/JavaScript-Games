# Juegos offline y Service Worker

Cómo funciona la descarga de juegos, la caché PWA y el service worker (`sw.js`).

---

## Visión general

### ¿Para qué sirve?
Permitir que el **hub** cargue como PWA y que cada juego pueda **descargarse individualmente** para jugarse sin conexión. El service worker sirve los archivos cacheados cuando no hay red.

### ¿Cuándo interviene?
- **Al instalar la PWA**: precache del hub (`index.html`, `games.json`, shell del engine).
- **Al pulsar el botón de descarga** en una tarjeta de juego: `main.js` guarda ese juego y todas sus dependencias en la misma caché.
- **Al navegar offline**: `sw.js` responde desde caché si la red falla.

### ¿Cómo está organizado?

```
games.json          ← manifest con cache.hubPrecache + extraCacheFiles por juego
     ↓
sw.js               ← estrategias fetch + migración de caché
main.js             ← botón descargar / eliminar / actualizar
scan-games.js       ← genera games.json y detecta deps desde index.html
```

Nombre de caché activa: **`js-games-v2`** (definido en `games.json → cache.name`).

---

## Estrategias del Service Worker

### ¿Para qué sirven?
Equilibrar **actualizaciones rápidas online** con **juego offline** fiable.

### ¿Cuándo aplica cada una?

| Estrategia | Recursos | Comportamiento |
|------------|----------|----------------|
| **Network-First** | `.html`, `.js`, `.css`, `.json`, `/engine/*`, `/games/*` | Red primero; si falla, caché. Online siempre recibe la versión nueva. |
| **Cache-First** | Imágenes SVG del hub, assets binarios | Caché primero; si no existe, red y guardar. |
| **Bypass** | URLs con `?_nocache` | Siempre red (comprobación de actualizaciones). |

### ¿Cómo funciona en código?

Ver `sw.js`:
- `install` → lee `games.json` y precachea `cache.hubPrecache`.
- `activate` → migra entradas de `js-games-v1` a `js-games-v2` y borra cachés legacy.
- `fetch` → enruta según tipo de recurso.

---

## Descarga manual de un juego

### ¿Para qué sirve?
Guardar **un juego concreto** y todas sus dependencias para jugarlo sin internet (el hub online puede seguir mostrando juegos no descargados).

### ¿Cuándo usarlo?
Cuando el usuario pulsa el icono de descarga en la tarjeta del juego. No descarga automáticamente todos los juegos del catálogo.

### ¿Qué archivos se guardan?

Por cada juego, `main.js` construye la lista con `buildGameCacheUrls()`:

1. **Base del juego**: `index.html`, `style.css`, `script.js`, imagen de tarjeta.
2. **Shell compartido**: `engine/game-shell.css` (siempre).
3. **Dependencias auto-detectadas**: scripts y CSS del engine referenciados en el `index.html` del juego (`extraCacheFiles` en `games.json`).
4. **Assets extra**: definidos manualmente en `scripts/scan-games.js` (p. ej. `words.js`, sprites, imágenes del ahorcado).

Ejemplo de deps detectadas desde `index.html`:

```
engine/theme.js
engine/render-bridge.js
engine/input.js
engine/audio.js
engine/engine.js
engine/ui-canvas.js
engine/online-lobby.js
engine/peerjs.min.js
engine/online.js
engine/game-boot.js
```

### ¿Cómo actualizar un juego descargado?

Si `script.js` cambió en el servidor, el botón pasa a estado **actualizar** (icono azul). Un clic borra la caché antigua del juego y vuelve a descargar la lista completa.

---

## games.json y scan-games.js

### ¿Para qué sirven?
Fuente única de verdad para el hub, la PWA y la caché offline.

### ¿Cuándo regenerarlo?
Tras añadir un juego, cambiar scripts del engine en `index.html`, o modificar assets extra:

```bash
node scripts/scan-games.js
```

### ¿Qué genera?

```json
{
  "cache": {
    "name": "js-games-v2",
    "hubPrecache": ["./index.html", "./engine/theme.js", "..."],
    "gameBaseFiles": ["index.html", "style.css", "script.js"],
    "alwaysInclude": ["engine/game-shell.css"],
    "legacyCaches": ["js-games-v1"]
  },
  "games": [
    {
      "id": "snake",
      "path": "games/snake/",
      "extraCacheFiles": ["engine/theme.js", "engine/engine.js", "..."]
    }
  ]
}
```

`extraCacheFiles` se **fusiona** automáticamente desde el `index.html` del juego + entradas manuales en `scan-games.js` (assets que no aparecen como script/link).

---

## Migración de caché v1 → v2

### ¿Por qué?
La arquitectura del engine añadió módulos compartidos (`render-bridge.js`, `game-boot.js`, `game-shell.css`, etc.). Los juegos descargados con v1 no los incluían.

### ¿Qué hace el SW al activarse?
1. Copia todas las entradas de `js-games-v1` a `js-games-v2`.
2. Elimina `js-games-v1`.
3. Los juegos ya descargados siguen funcionando; conviene **re-descargar** cada juego para incluir los nuevos módulos del engine.

---

## Limitaciones

- **CDN externo** (Font Awesome): no se cachea; iconos pueden no verse offline.
- **Multijugador online**: PeerJS requiere red; el modo offline solo aplica a juegos locales.
- **Primer visitante offline**: solo tiene lo precacheado del hub, no juegos no descargados.

---

## Documentación relacionada

- [Arquitectura de Juegos](GAME_ARCHITECTURE.md) — módulos del engine cacheados
- [README del repo](../../README.md) — visión general PWA
