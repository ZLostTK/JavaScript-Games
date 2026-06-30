# Arquitectura Moderna (Vite + ESM)

El motor vive en `src/` y se empaqueta con **Vite**. Los juegos en `games/` importan módulos ESM; el build de producción genera bundles minificados en `dist/`.

---

## Estructura `src/`

```
src/
├── core/           Engine, DOMEngine, GameBoot, EventBus, RenderBridge
├── modules/        Input, Audio, Online, MobileControls, UI
├── components/     Transform, Velocity, Collider, SpriteData
├── systems/        Movement, Physics, Render, Animation
├── ecs/            World, Component, System (bases)
├── boot/           Shims que instalan globals para juegos legacy
└── index.js        Barrel export del motor
```

## Arranque de un juego (patrón actual)

### `index.html`
```html
<script type="module" src="./main.js"></script>
```

### `main.js`
```javascript
import '../../src/boot/canvas-mobile.js'; // o canvas.js, dom.js, canvas-online.js
import { GameBoot } from '../../src/core/GameBoot.js';
import { game } from './script.js';

GameBoot.start(game, { canvasId: 'game', width: 480, height: 640 });
```

### Boot shims (`src/boot/`)

| Archivo | Instala en `globalThis` |
|---------|-------------------------|
| `canvas.js` | Engine, Input, Audio, EventBus, GameBoot, UI… |
| `canvas-mobile.js` | canvas + MobileControls |
| `canvas-online.js` | canvas + Online, OnlineLobby |
| `pixi.js` | canvas + PIXIEngine |
| `little.js` | canvas + LittleEngine |
| `dom.js` | DOMEngine, EventBus, AnimationSystem… |
| `dom-online.js` | dom + Online |

Los juegos no migrados a imports directos siguen usando `Engine`, `Input`, etc. como globals.

## Scripts npm

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Servidor Vite con HMR |
| `pnpm build` | Build de producción → `dist/` |
| `pnpm build:report` | Build + reporte de tamaños de bundles |
| `pnpm preview` | Sirve `dist/` localmente |
| `pnpm test` | Vitest (EventBus, ECS) |

## Build de producción

- **Minificación:** esbuild (JS + CSS)
- **Tree-shaking:** Rollup elimina exports no usados por entrada
- **Code splitting:** `peerjs` en chunk separado; cada juego es entrada independiente
- **Assets:** `public/` se copia a `dist/` (games.json, iconos, sw.js)

## Despliegue

| Plataforma | Config | Salida |
|------------|--------|--------|
| GitHub Pages | `.github/workflows/deploy-pages.yml` | `dist/` |
| Vercel | `vercel.json` | `dist/` |
| Netlify | `netlify.toml` | `dist/` |

## Estado de migración por juego

Ver tabla completa en [plans/tools/migrate.md](../../plans/tools/migrate.md#estado-de-migración-por-juego).

| Nivel | Significado |
|-------|-------------|
| **ESM** | `main.js` + boot shim |
| **EventBus** | Input/audio/red vía eventos |
| **ECS** | Entidades con World + sistemas |

Juegos piloto: **Snake** (EventBus), **Arkanoid** (EventBus + ECS).

---

## Carpeta `engine/`

Queda solo lo que no está empaquetado en `src/`:

- `engine/docs/` — documentación
- `engine/sprite-processor.js` — sprites, animaciones y `SpriteStateMachine`
- `engine/pixi.min.js` — librería PIXI.js (cargada vía `<script>` antes del ESM)
- `engine/littlejs.min.js` — librería LittleJS (cargada vía `<script>` antes del ESM)
- `public/engine/game-shell.css` — estilos compartidos del shell de juegos (servido en `/engine/game-shell.css`)

Los adapters `PIXIEngine` y `LittleEngine` se importan desde `src/core/` vía boot shims `pixi.js`/`little.js`.

Los módulos del motor viven en `src/` y se importan vía boot shims o ESM directo.

Ver también: [EventBus](EVENT_BUS.md) · [ECS](ECS.md) · [README](README.md)
