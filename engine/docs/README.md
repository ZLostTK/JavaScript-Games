# Motor de Juegos JavaScript - Documentación Oficial

Biblioteca modular para juegos 2D web. Es **agnóstica al motor de renderizado**: la misma lógica de juego puede ejecutarse con **Engine** (Canvas 2D), **PIXIEngine** (WebGL), **LittleEngine** (LittleJS) o **DOMEngine** (HTML/CSS).

Los módulos compartidos (`Theme`, `UICanvas`, `UIMenu`, `GameOverlay`, `OnlineLobby`, `MobileControls`, `GameBoot`) son **retrocompatibles** con los tres motores gráficos principales gracias a `RenderBridge`.

## Índice de Contenidos

1. [Conceptos Básicos y Arquitectura](#arquitectura-y-conceptos-básicos)
2. [Estructura de un Proyecto](#estructura-de-un-proyecto)
3. **Módulos Principales:**
   - [Arquitectura moderna (Vite + ESM)](MODERN_STACK.md)
   - [EventBus (eventos centralizados)](EVENT_BUS.md)
   - [ECS (entidades y componentes)](ECS.md)
   - [Motores Core (Canvas, DOM, PIXI, LittleJS)](CORE_ENGINES.md)
   - [Arquitectura de Juegos (plantillas y utilidades)](API.md)
   - [Sistema de Input (Teclado, Mouse, Táctil)](INPUT.md)
   - [Sistema de Audio (Sonidos, Música, Síntesis)](AUDIO.md)
   - [Sistema Online (Multijugador P2P)](ONLINE.md)
   - [Gestión de Sprites y Animaciones](SPRITES.md)
   - [Juegos offline y Service Worker](OFFLINE.md)
4. **Librerías Externas:**
   - [Matter.js — Física 2D](MATTER_PHYSICS.md)
   - [Howler.js — Audio Avanzado](HOWLER_AUDIO.md)
   - [Pathfinding.js — Rutas para NPCs](PATHFINDING.md)
   - [GSAP — Tweens y Animaciones UI](GSAP_TWEENS.md)
   - [ROT.js — Mazmorras Roguelike](ROGUELIKE_DUNGEON.md)
5. [Referencia Rápida API](API.md)

---

## Arquitectura y Conceptos Básicos

El motor usa **sistemas desacoplados**: Input, Audio, Online y los utilitarios de UI no dependen de un renderizador concreto. `RenderBridge` conecta esos módulos con el motor activo.

Todo juego declara un **Game Object** con este contrato:

```javascript
const myGame = {
    init() { /* setup - puede ser async con PIXI/LittleJS */ },
    update(dt) { /* lógica por frame */ },
    render(ctx) { /* opcional: Canvas recibe ctx; PIXI/LittleJS sin argumentos */ }
};
```

Arranque recomendado (retrocompatible):

```javascript
// Canvas 2D (por defecto)
GameBoot.start(myGame, { canvasId: 'game', width: 800, height: 600 });

// WebGL / PIXI
GameBoot.start(myGame, { renderer: 'pixi', containerId: 'game-container', width: 800, height: 600 });

// LittleJS
GameBoot.start(myGame, { renderer: 'little', containerId: 'game-container', width: 640, height: 480, tileSize: 16 });
```

---

## Estructura de un Proyecto

### index.html (plantilla ESM — recomendada)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Mi Juego</title>
    <link rel="stylesheet" href="../../engine/game-shell.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-container">
        <canvas id="game"></canvas>
        <button id="back-btn" onclick="location.href='../../'">← Volver</button>
    </div>
    <script type="module" src="./main.js"></script>
</body>
</html>
```

### main.js (punto de entrada ESM)

```javascript
import '../../src/boot/canvas.js'; // o canvas-mobile.js, dom.js, pixi.js, little.js
import { GameBoot } from '../../src/core/GameBoot.js';
import { game } from './script.js';

GameBoot.start(game, { canvasId: 'game', width: 800, height: 600 });
```

### Orden de carga

| Motor | Carga |
|-------|-------|
| **Engine** (Canvas) | boot shim `canvas.js` (importa `src/core/Engine.js`) |
| **PIXIEngine** | `<script src="../../engine/pixi.min.js">` + boot shim `pixi.js` |
| **LittleEngine** | `<script src="../../engine/littlejs.min.js">` + boot shim `little.js` |
| **DOMEngine** | boot shim `dom.js` (importa `src/core/DOMEngine.js`) |
| **Online** | boot shim `canvas-online.js` o `dom-online.js` |
| **MobileControls** | boot shim `canvas-mobile.js` |

---

## ¿Siguiente Paso?

- Elige renderizador: **[Motores Core](CORE_ENGINES.md)**
- Estructura de juegos en `games/`: **[API y utilidades](API.md)**
- Sprites y animaciones: **[Sprites](SPRITES.md)**
