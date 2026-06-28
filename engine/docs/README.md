# Motor de Juegos JavaScript - Documentación Oficial

Biblioteca modular para juegos 2D web. Es **agnóstica al motor de renderizado**: la misma lógica de juego puede ejecutarse con **Engine** (Canvas 2D), **PIXIEngine** (WebGL), **LittleEngine** (LittleJS) o **DOMEngine** (HTML/CSS).

Los módulos compartidos (`Theme`, `UICanvas`, `UIMenu`, `GameStates`, `GameOverlay`, `OnlineLobby`, `OnlineSetup`, `MobileControls`, `GameBoot`) son **retrocompatibles** con los tres motores gráficos principales gracias a `RenderBridge`.

## Índice de Contenidos

1. [Conceptos Básicos y Arquitectura](#arquitectura-y-conceptos-básicos)
2. [Estructura de un Proyecto](#estructura-de-un-proyecto)
3. **Módulos Principales:**
   - [Motores Core (Canvas, DOM, PIXI, LittleJS)](CORE_ENGINES.md)
   - [Arquitectura de Juegos (plantillas y utilidades)](GAME_ARCHITECTURE.md)
   - [Sistema de Input (Teclado, Mouse, Táctil)](INPUT.md)
   - [Sistema de Audio (Sonidos, Música, Síntesis)](AUDIO.md)
   - [Sistema Online (Multijugador P2P)](ONLINE.md)
   - [Gestión de Sprites y Animaciones](SPRITES.md)
   - [Juegos offline y Service Worker](OFFLINE.md)
4. [Referencia Rápida API](API.md)

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

### index.html (plantilla mínima)

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

    <!-- Orden de carga recomendado -->
    <script src="../../engine/theme.js"></script>
    <script src="../../engine/render-bridge.js"></script>
    <script src="../../engine/input.js"></script>
    <script src="../../engine/audio.js"></script>
    <script src="../../engine/engine.js"></script>          <!-- o pixi/littlejs según motor -->
    <script src="../../engine/ui-canvas.js"></script>
    <script src="../../engine/ui-menu.js"></script>       <!-- opcional: menús declarativos -->
    <script src="../../engine/game-states.js"></script>   <!-- opcional: máquina de estados -->
    <script src="../../engine/game-overlay.js"></script>   <!-- opcional: overlay gameover -->
    <script src="../../engine/game-boot.js"></script>
    <script src="script.js"></script>
</body>
</html>
```

### Orden de scripts por motor

| Motor | Scripts adicionales |
|-------|---------------------|
| **Engine** (Canvas) | `engine.js` |
| **PIXIEngine** | `pixi.min.js`, `pixi-engine.js`, `sprite-processor.js` |
| **LittleEngine** | `littlejs.min.js`, `littlejs-engine.js` |
| **DOMEngine** | `dom-engine.js` (sin `ui-canvas.js`) |
| **Online** | `peerjs.min.js`, `online.js`, `online-lobby.js`, `online-setup.js` |
| **Menús / estados / overlay** | `ui-menu.js`, `game-states.js`, `game-overlay.js` (opcionales, ver [GAME_ARCHITECTURE.md](GAME_ARCHITECTURE.md)) |
| **Móvil** | `mobile-controls.js` |

---

## ¿Siguiente Paso?

- Elige renderizador: **[Motores Core](CORE_ENGINES.md)**
- Estructura de juegos en `games/`: **[Arquitectura de Juegos](GAME_ARCHITECTURE.md)**
- Sprites y animaciones: **[Sprites](SPRITES.md)**
