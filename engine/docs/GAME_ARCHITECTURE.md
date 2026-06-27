# Arquitectura de Juegos

Capa de utilidades compartidas para los juegos en `games/`. Separa la **lógica del juego** de la **infraestructura repetida** (arranque, estilos, menús canvas, lobby online, controles móviles) y la hace **retrocompatible** con los tres motores gráficos: **Engine** (Canvas 2D), **PIXIEngine** (WebGL) y **LittleEngine** (LittleJS).

---

## Visión general

### ¿Para qué sirve?
Evitar que cada juego reimplemente los mismos patrones: boot del motor, paleta de colores, botones en canvas, overlay de multijugador y controles táctiles. Centraliza eso en módulos pequeños que cualquier juego puede importar con `<script>` tags, sin bundler.

### ¿Cuándo utilizarlo?
Siempre que crees o mantengas un juego en `games/`. Úsalo desde el inicio en juegos nuevos; en juegos existentes, migra gradualmente sustituyendo helpers locales (`drawBtn`, wiring de `#online-ui`, etc.) por los módulos compartidos.

### ¿Cómo encaja en el stack?

```
index.html
  ├── game-shell.css      ← estilos comunes
  ├── theme.js            ← colores/tipografías
  ├── render-bridge.js    ← puente entre motores
  ├── input.js / audio.js ← subsistemas desacoplados
  ├── engine.js | pixi-engine.js | littlejs-engine.js
  ├── ui-canvas.js        ← menús canvas (opcional)
  ├── online-lobby.js     ← lobby P2P (opcional)
  ├── mobile-controls.js  ← D-pad táctil (opcional)
  ├── game-boot.js        ← arranque unificado
  └── script.js           ← solo lógica de tu juego
```

El **Game Object** sigue siendo el contrato común:

```javascript
const game = {
    init() { /* setup */ },
    update(dt) { /* lógica */ },
    render(ctx) { /* opcional según motor */ }
};
```

---

## RenderBridge

### ¿Para qué sirve?
Conectar módulos compartidos (`UICanvas`, `SpriteProcessor`) con el motor de renderizado activo sin acoplarlos a `Engine` directamente. Expone `W`, `H`, `toGame()`, `ctx` y `canvas` de forma uniforme.

### ¿Cuándo utilizarlo?
No lo llamas manualmente en la mayoría de casos: cada motor lo registra en `init()` / `start()`. Consulta `RenderBridge` solo si escribes utilidades nuevas que necesiten coordenadas o dimensiones del juego y deben funcionar con Canvas, PIXI y LittleJS.

### ¿Cómo usarlo?

Carga obligatoria **después** de `theme.js` y **antes** del motor:

```html
<script src="../../engine/render-bridge.js"></script>
```

```javascript
RenderBridge.W              // ancho lógico
RenderBridge.H              // alto lógico
RenderBridge.toGame(x, y)   // pantalla → coordenadas de juego
RenderBridge.type()         // 'canvas' | 'pixi' | 'little'
RenderBridge.ctx            // contexto 2D (solo Engine)
RenderBridge.canvas         // canvas activo
RenderBridge.bindInput()    // vincula Input al canvas (PIXI/LittleJS)
```

---

## GameBoot

### ¿Para qué sirve?
Unificar el arranque del juego: esperar `DOMContentLoaded`, inicializar el motor elegido y llamar a `start(game)` con la misma API en todos los proyectos.

### ¿Cuándo utilizarlo?
En lugar de `Engine.init(...).start(game)`, `window.onload = ...` o llamadas sueltas repartidas por el `script.js`. Es el punto de entrada recomendado para juegos nuevos y migrados.

### ¿Cómo usarlo?

**Canvas 2D (Engine)** — comportamiento por defecto, retrocompatible:

```javascript
GameBoot.start(game, { canvasId: 'game', width: 400, height: 480 });
```

**PIXI (WebGL):**

```javascript
GameBoot.startPIXI(game, { containerId: 'game-container', width: 640, height: 480 });
// equivalente: GameBoot.start(game, { renderer: 'pixi', containerId: '...', ... })
```

**LittleJS:**

```javascript
GameBoot.startLittle(game, {
    containerId: 'game-container',
    width: 640, height: 480,
    tileSize: 16,
    images: ['spritesheet.png'],
});
```

**DOM (sin canvas de juego):**

```javascript
GameBoot.startDOM(game, { containerId: 'game-container', fps: 60 });
```

Hook opcional antes de `start`:

```javascript
GameBoot.startCanvas(game, {
    canvasId: 'gameCanvas',
    width: 480, height: 640,
    beforeStart: (g, engine) => g.setupTouchButtons(engine.canvas),
});
```

---

## Theme

### ¿Para qué sirve?
Definir una paleta y tipografías comunes para que todos los juegos compartan la misma identidad visual sin repetir hexadecimales en cada `script.js`.

### ¿Cuándo utilizarlo?
Siempre que dibujes UI, texto o fondos en canvas. Sustituye colores hardcodeados (`'#e94560'`) por `Theme.colors.accent`.

### ¿Cómo usarlo?

```javascript
Engine.rect(0, 0, Engine.W, Engine.H, Theme.colors.bg);
Engine.text('Puntuación', x, y, Theme.colors.success, 18);
ctx.font = Theme.font.mono;
```

Colores disponibles: `bg`, `accent`, `accent2`, `success`, `warning`, `info`, `muted`, `text`, `textMuted`, `textDim`.

---

## UICanvas

### ¿Para qué sirve?
Helpers para menús dibujados en canvas: botones redondeados, hit-test de rectángulos y conversión del puntero a coordenadas lógicas vía `RenderBridge`.

### ¿Cuándo utilizarlo?
En juegos con pantallas de selección (`'select'`, `'online-setup'`, `'gameover'`) renderizadas en canvas. **No** lo uses para UI basada en HTML — ahí usa `DOMEngine` o markup directo.

| Función | Engine | PIXI | LittleJS |
|---------|--------|------|----------|
| `getPointer()`, `hitTest()` | ✓ | ✓ | ✓ |
| `drawButton()` | ✓ | — | — |

`drawButton()` requiere contexto Canvas 2D (`RenderBridge.ctx`). En PIXI/LittleJS dibuja la UI con sprites o la API nativa del motor; usa `hitTest` y `getPointer` para la lógica de clics.

### ¿Cómo usarlo?

```javascript
const p = UICanvas.getPointer();

// Dibujar (solo Engine / ctx disponible)
UICanvas.drawButton(ctx, 'Jugar', bx, by, bw, bh, Theme.colors.accent, UICanvas.hitTest(p.x, p.y, btn));

// Hit-test en update
if (UICanvas.hitTest(clickPos.x, clickPos.y, this._btns.play)) this.startGame();

// Fila de botones de menú
const [b1, b2, b3] = UICanvas.layoutButtons(3, { startY: 140, width: 220 });
```

---

## OnlineLobby

### ¿Para qué sirve?
Encapsular el overlay DOM de multijugador (`#online-ui`): crear sala, unirse, copiar código y cancelar. Elimina ~50–100 líneas de wiring repetido por juego sobre `Online` + PeerJS.

### ¿Cuándo utilizarlo?
En cualquier juego con modo online P2P que use el bloque HTML estándar `#online-ui` (como tictactoe o connect4). Para lobbies custom (p. ej. domino con 4 jugadores y lista de sala), extiende el HTML pero puedes reutilizar `OnlineLobby` para host/join básico.

Requiere: `peerjs.min.js`, `online.js`, `online-lobby.js` y el markup `#online-ui` en `index.html`.

### ¿Cómo usarlo?

```javascript
OnlineLobby.onCancel(() => game._cancelOnline());

// Host
_hostGame() {
    OnlineLobby.host({
        onConnected: () => this.startGame('online', 'host'),
        onData: (data) => { if (data.type === 'move') this.applyMove(data); },
        onDisconnect: () => this._onDisconnect(),
        onError: (err) => { /* opcional */ },
    });
},

// Guest
_joinGame() {
    OnlineLobby.prepareJoin({
        onConnected: () => this.startGame('online', 'guest'),
        onData: (data) => { if (data.type === 'move') this.applyMove(data); },
        onDisconnect: () => this._onDisconnect(),
    });
},

_cancelOnline() {
    OnlineLobby.cancel();
    this.state = 'select';
}
```

La lógica de red sigue en `Online.send()` / `Online.on('onData')` — ver [ONLINE.md](ONLINE.md).

**Lobbies custom** (domino 4 jugadores, void sector con tabs 1v1/co-op, hangman con pantalla de espera): usa los helpers de panel sin reimplementar copy/join/back:

```javascript
// Host multijugador (no ocultar al primer connect)
OnlineLobby.showHostPanel(code);
OnlineLobby.updateLobbyList(['Tú (Host)', 'Jugador 2']);
OnlineLobby.enableStart(false, 'Esperando jugadores...');
OnlineLobby.onStartClick(() => { /* iniciar partida */ });

// Guest
OnlineLobby.showJoinPanel();
OnlineLobby.wireDefaultJoin((code) => Online.join(code));

// Pantalla de espera sin host/join views
OnlineLobby.showStatusOnly('En línea', 'Esperando al host...');
```

Pasa `{ hideOnConnect: false }` a `host()` / `prepareJoin()` si el overlay debe permanecer visible tras conectar (p. ej. lobby de varios jugadores).

#### Métodos adicionales

| Método | Descripción |
|--------|-------------|
| `getJoinCode()` | Obtiene el código ingresado en el campo de unirse |
| `enableJoin(enabled)` | Habilita/deshabilita el botón de unirse |
| `setJoinHandler(cb)` | Establece el callback que se ejecuta al presionar el botón unirse |

---

## MobileControls

### ¿Para qué sirve?
Vincular botones on-screen (`#btn-up`, `#btn-left`, etc.) a propiedades booleanas del game object, con soporte touch y mouse, y mostrar el panel solo en dispositivos táctiles.

### ¿Cuándo utilizarlo?
En juegos arcade jugables en móvil (snake, arkanoid) que incluyan `#mobile-controls` en el HTML. No sustituye gestos swipe propios del juego.

### ¿Cómo usarlo?

HTML (estilos en `game-shell.css`):

```html
<div id="mobile-controls" class="mobile-controls hidden">
  <!-- D-pad con ids btn-up, btn-down, btn-left, btn-right -->
</div>
```

```javascript
init() {
    this.btnUp = false;
    this.btnDown = false;
    MobileControls.bind(this, {
        'btn-up': 'btnUp',
        'btn-down': 'btnDown',
        'btn-left': 'btnLeft',
        'btn-right': 'btnRight',
    });
},

update(dt) {
    if (Input.isDown('ArrowUp') || this.btnUp) { /* mover arriba */ }
}
```

---

## game-shell.css

### ¿Para qué sirve?
Centralizar estilos repetidos en todos los juegos: reset, contenedor fullscreen, botón volver, overlay online y controles móviles.

### ¿Cuándo utilizarlo?
Siempre. Enlázalo **antes** de `style.css` del juego; el CSS del juego solo debe contener reglas específicas (tablero, animaciones, layout propio).

### ¿Cómo usarlo?

```html
<link rel="stylesheet" href="../../engine/game-shell.css">
<link rel="stylesheet" href="style.css">
```

---

## Plantilla de proyecto

### ¿Para qué sirve?
Garantizar que todos los juegos carguen scripts en el orden correcto y compartan la misma estructura HTML.

### ¿Cuándo utilizarlo?
Como base al crear un juego nuevo o al migrar uno existente.

### ¿Cómo montarlo?

**index.html (Canvas + online opcional):**

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
        <!-- #online-ui opcional — ver OnlineLobby -->
    </div>

    <script src="../../engine/theme.js"></script>
    <script src="../../engine/render-bridge.js"></script>
    <script src="../../engine/input.js"></script>
    <script src="../../engine/audio.js"></script>
    <script src="../../engine/engine.js"></script>
    <script src="../../engine/ui-canvas.js"></script>
    <script src="../../engine/game-boot.js"></script>
    <script src="script.js"></script>
</body>
</html>
```

**Scripts según motor:**

| Motor | Sustituir `engine.js` por |
|-------|---------------------------|
| **PIXI** | `pixi.min.js`, `pixi-engine.js`, `sprite-processor.js` |
| **LittleJS** | `littlejs.min.js`, `littlejs-engine.js` |
| **DOM** | `dom-engine.js` (omitir `ui-canvas.js`) |

Añadir si aplica: `peerjs.min.js` + `online.js` + `online-lobby.js`, `mobile-controls.js`.

**script.js mínimo:**

```javascript
const game = {
    init() { /* estado, Audio.synth(), MobileControls.bind(...) */ },
    update(dt) { /* Input, lógica, UICanvas.hitTest en menús */ },
    render(ctx) { /* Engine.rect, UICanvas.drawButton, Theme.colors */ },
};

GameBoot.start(game, { canvasId: 'game', width: 400, height: 480 });
```

---

## Convenciones de diseño

### ¿Para qué sirven?
Mantener coherencia entre los ~20 juegos del repositorio y reducir sorpresas al leer código ajeno.

### ¿Cuándo aplicarlas?
En todo juego nuevo y al refactorizar uno existente.

### ¿Cuáles son?

| Convención | Detalle |
|------------|---------|
| **Game object** | `{ init, update, render? }` — el motor invoca estos métodos |
| **Máquina de estados** | `'select' → 'online-setup' → 'playing' → 'gameover'` en juegos con menú |
| **Colores** | `Theme.colors.*`, no hex sueltos |
| **CSS** | Común en `game-shell.css`; específico en `style.css` |
| **Boot** | `GameBoot.start*()`, no `Engine.init` suelto al final del archivo |
| **Online UI** | `OnlineLobby`, no wiring manual de `#copy-btn` / `#join-btn` |

---

## Elegir motor de renderizado

### ¿Para qué sirve esta decisión?
Cada motor optimiza un tipo de juego distinto. Elegir bien evita pelear contra la herramienta.

### ¿Cuándo usar cada uno?

| Tipo de juego | Motor | Por qué |
|---------------|-------|---------|
| Arcade, tablero, retro canvas | `Engine` | Control directo 2D, mínimas dependencias |
| Sprites WebGL, partículas, alto FPS | `PIXIEngine` | GPU, batching, filtros |
| Pixel-art, tiles, game jam | `LittleEngine` | Tiles, física y sprites integrados |
| Formularios, texto, UI rica | `DOMEngine` | HTML/CSS nativo, sin canvas de juego |
| Simulación custom | Sin motor | Loop propio (p. ej. butterfly-effect) |

### ¿Cómo arrancarlo?
Ver sección **GameBoot**. Los módulos compartidos (`Theme`, `Input`, `Audio`, `Online`, `OnlineLobby`, `MobileControls`) funcionan con los tres motores gráficos; solo cambia el script del renderizador y la llamada `GameBoot.start*`.

---

## Compatibilidad entre motores

| Módulo | Engine | PIXI | LittleJS | DOM |
|--------|--------|------|----------|-----|
| `Theme` | ✓ | ✓ | ✓ | ✓ |
| `RenderBridge` | ✓ | ✓ | ✓ | — |
| `UICanvas` (puntero/hit-test) | ✓ | ✓ | ✓ | — |
| `UICanvas.drawButton` | ✓ | — | — | — |
| `OnlineLobby` | ✓ | ✓ | ✓ | ✓ |
| `MobileControls` | ✓ | ✓ | ✓ | ✓ |
| `GameBoot` | ✓ | ✓ | ✓ | ✓ |
| `Input` / `Audio` / `Online` | ✓ | ✓ | ✓ | ✓ |

---

## Documentación relacionada

- [Motores Core](CORE_ENGINES.md) — API de Engine, PIXIEngine, LittleEngine, DOMEngine
- [Input](INPUT.md) — teclado, ratón, touch
- [Online](ONLINE.md) — PeerJS, envío de mensajes
- [Offline / Service Worker](OFFLINE.md) — descarga de juegos, caché PWA
- [API](API.md) — referencia rápida de todos los módulos
