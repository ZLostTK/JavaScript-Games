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
  ├── ui-canvas.js        ← primitivas de botón canvas (opcional)
  ├── ui-menu.js          ← menús declarativos (opcional)
  ├── game-states.js      ← máquina de estados (opcional)
  ├── game-overlay.js     ← overlay de gameover (opcional)
  ├── online-lobby.js     ← lobby P2P DOM (opcional)
  ├── online-setup.js     ← flujo online-setup canvas (opcional)
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

**Canvas 2D (Engine)** - comportamiento por defecto, retrocompatible:

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
En juegos con pantallas de selección (`'select'`, `'online-setup'`, `'gameover'`) renderizadas en canvas. **No** lo uses para UI basada en HTML - ahí usa `DOMEngine` o markup directo.

| Función | Engine | PIXI | LittleJS |
|---------|--------|------|----------|
| `getPointer()`, `hitTest()` | ✓ | ✓ | ✓ |
| `drawButton()` | ✓ | - | - |

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

Para menús completos con varios botones, título y manejo de clics, prefiere **UIMenu** (ver abajo).

---

## UIMenu

### ¿Para qué sirve?
Constructor de menús canvas **declarativo**. Sustituye el patrón repetido de `_btns` + posicionamiento manual + `UICanvas.drawButton` + `UICanvas.hitTest` en cada juego (~50–100 líneas por pantalla).

Define botones como datos (`id`, `label`, `y`, `accent`) y delega layout, hover, dibujo e input en un solo objeto.

### ¿Cuándo utilizarlo?
En cualquier pantalla canvas con botones: menú principal (`'select'`), submenú online (`'online-setup'`), pausa o gameover con acciones. **No** lo uses en UI HTML/DOM - ahí usa markup o `DOMEngine`.

Requiere: `theme.js`, `render-bridge.js`, `input.js`, `ui-canvas.js`, `ui-menu.js` y motor Canvas 2D para `draw()`.

| Método | Engine | PIXI | LittleJS |
|--------|--------|------|----------|
| `handleClick()`, `handleInput()` | ✓ | ✓ | ✓ |
| `draw()` | ✓ | - | - |

### ¿Cómo usarlo?

```html
<script src="../../engine/ui-canvas.js"></script>
<script src="../../engine/ui-menu.js"></script>
```

```javascript
// Menú personalizado
this.menu = new UIMenu([
    { id: 'play',  label: 'Jugar',  y: 200 },
    { id: 'setup', label: 'Online', y: 270, accent: Theme.colors.success },
    { id: 'exit',  label: 'Salir',  y: 340, accent: Theme.colors.muted },
], { title: 'Mi Juego', subtitle: 'Elige una opción' });

// Presets incluidos
this.modeMenu   = UIMenu.modeSelect({ title: 'Conecta 4', footer: 'Conecta 4 · Vanilla JS' });
this.onlineMenu = UIMenu.onlineSetup();

// En render:
this.menu.draw(ctx);

// En update - devuelve el id del botón pulsado o null:
const id = this.menu.handleInput();
if (id === 'play') this.startGame();
```

Métodos útiles: `getButton(id)`, `updateHover()`, `relayout()` (tras cambio de viewport), `handleClick(x, y)` (si ya tienes `clickPos` propio).

---

## GameStates

### ¿Para qué sirve?
Mini manejador de estados que elimina el `switch (this.state)` duplicado en `update()` y `render()`. Cada estado expone `init`, `update`, `render`, `enter` y `exit` como métodos del game object.

Centraliza transiciones y evita olvidar inicializar o limpiar al cambiar de pantalla.

### ¿Cuándo utilizarlo?
En juegos con máquina de estados explícita: `'select' → 'online-setup' → 'playing' → 'gameover'`. Especialmente útil cuando `update` y `render` crecen y repiten la misma condición de estado.

No es obligatorio en juegos de un solo estado (p. ej. snake arcade sin menú) ni cuando el flujo es trivial (2–3 líneas de `if`).

Requiere solo `game-states.js`. Compatible con todos los motores.

### ¿Cómo usarlo?

```html
<script src="../../engine/game-states.js"></script>
```

```javascript
init() {
    this.states = new GameStates({
        select: {
            update(dt) { /* input del menú */ },
            render(ctx) { this.menu.draw(ctx); },
        },
        playing: {
            init() { this.resetBoard(); },
            update(dt) { /* lógica de partida */ },
            render(ctx) { this._renderBoard(ctx); },
        },
        gameover: {
            init() { this.restartCd = 1.2; },
            update(dt) { if (this.restartCd > 0) this.restartCd -= dt; },
            render(ctx) { GameOverlay.draw(ctx, { title: 'Fin', cooldown: this.restartCd }); },
        },
    }, 'select', this);
},

update(dt) { this.states.update(dt); },
render(ctx) { this.states.render(ctx); },

// Transición:
this.states.set('playing');
this.states.is('gameover');  // true/false
```

`set(name)` ejecuta `exit` del estado anterior e `init` del nuevo. Si no pasas `ctx` al constructor, usa `this.states.bind(this)`.

---

## GameOverlay

### ¿Para qué sirve?
Pantalla de fin de partida unificada: overlay semitransparente + título + puntuación + líneas extra + hint *"Toca para continuar"*. Opcionalmente dibuja un panel con borde (estilo flappybird).

Elimina ~30 líneas repetidas de `fillRect` + `Engine.text` en cada juego.

### ¿Cuándo utilizarlo?
Al mostrar game over, victoria, derrota o desconexión online encima del tablero/juego. **No** sustituye gameovers muy custom (othello con disco ganador, flappybird con marcador rival) - en esos casos usa `GameOverlay.drawDim()` o combina `panel: true` con `lines` extra.

Requiere: `theme.js`, `render-bridge.js`, `game-overlay.js` y motor con `Engine.text` (Canvas 2D).

### ¿Cómo usarlo?

```html
<script src="../../engine/game-overlay.js"></script>
```

```javascript
// Game over básico
GameOverlay.draw(ctx, {
    title: 'Game Over',
    titleColor: Theme.colors.accent,
    score: this.score,
    scoreLabel: 'Puntuación',
    hint: 'Toca para continuar',
    cooldown: this.restartCd,  // oculta el hint hasta que llegue a 0
});

// Con panel y líneas extra
GameOverlay.draw(ctx, {
    title: '¡Ganaste! 🎉',
    titleColor: Theme.colors.success,
    panel: true,
    lines: [{ text: `Rival: ${this.rivalScore}`, color: Theme.colors.info }],
});

// Resultado online (helper)
const { title, color } = GameOverlay.onlineResult(this.winner, this.myPiece);
GameOverlay.draw(ctx, { title, titleColor: color, score: this.score });

// Solo oscurecer el fondo
GameOverlay.drawDim(ctx, 0.75);
GameOverlay.canContinue(this.restartCd);  // true si se puede continuar
```

---

## OnlineSetup

### ¿Para qué sirve?
Encapsula el flujo **canvas** de multijugador: submenú host/join/back + wiring de `OnlineLobby.host()` / `prepareJoin()` + manejo por defecto de desconexión. Elimina ~80 líneas de boilerplate que se repiten en connect4, tictactoe, minesweeper, etc.

Complementa a `OnlineLobby` (overlay DOM) - no lo reemplaza.

### ¿Cuándo utilizarlo?
En juegos P2P con pantalla `'online-setup'` dibujada en canvas y markup estándar `#online-ui`. Usa `OnlineSetup.forGame()` cuando el flujo sea el típico: conectar → `startGame('online', role)` → sincronizar movimientos vía `onData`.

**No** lo uses si el lobby es totalmente custom (domino 4 jugadores, void sector con tabs 1v1/co-op) - ahí mantén `OnlineLobby` directo.

Requiere: `ui-menu.js`, `online-lobby.js`, `online-setup.js`, `peerjs.min.js`, `online.js` y `#online-ui` en el HTML.

### ¿Cómo usarlo?

```html
<script src="../../engine/ui-menu.js"></script>
<script src="../../engine/online-lobby.js"></script>
<script src="../../engine/online-setup.js"></script>
```

```javascript
init() {
    this.online = OnlineSetup.forGame(this, {
        onData: (data) => { if (data.type === 'move') this.makeMove(data.index, false); },
    });
},

update(dt) {
    if (this.state === 'online-setup') {
        this.online.handleClick(clickPos);  // o this.online.handleInput()
        return;
    }
},

render(ctx) {
    if (this.state === 'online-setup') {
        this.online.render(ctx);
        return;
    }
},

// Manual (sin forGame):
this.online = new OnlineSetup({
    game: this,
    onConnected: (role) => this.startGame('online', role),
    onData: (data) => this.applyMove(data),
    onCancel: () => { this.state = 'select'; },
});
this.online.host();   // o .join()
this.online.cancel();
```

Por defecto, `_onDisconnect` pone `winner = '__disconnect__'`, `state = 'gameover'` y `restartCd = 2` si el juego estaba en `'playing'` o `'gameover'`. Personaliza con `onDisconnect` o `activeStates`.

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

La lógica de red sigue en `Online.send()` / `Online.on('onData')` - ver [ONLINE.md](ONLINE.md).

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
        <!-- #online-ui opcional - ver OnlineLobby -->
    </div>

    <script src="../../engine/theme.js"></script>
    <script src="../../engine/render-bridge.js"></script>
    <script src="../../engine/input.js"></script>
    <script src="../../engine/audio.js"></script>
    <script src="../../engine/engine.js"></script>
    <script src="../../engine/ui-canvas.js"></script>
    <script src="../../engine/ui-menu.js"></script>
    <script src="../../engine/game-states.js"></script>
    <script src="../../engine/game-overlay.js"></script>
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

Añadir si aplica: `peerjs.min.js` + `online.js` + `online-lobby.js` + `online-setup.js`, `mobile-controls.js`.

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
| **Game object** | `{ init, update, render? }` - el motor invoca estos métodos |
| **Máquina de estados** | `'select' → 'online-setup' → 'playing' → 'gameover'` - preferir `GameStates` |
| **Menús canvas** | `UIMenu` / presets `modeSelect()` / `onlineSetup()`, no `_btns` manuales |
| **Game over** | `GameOverlay.draw()`, no `fillRect` + textos sueltos |
| **Colores** | `Theme.colors.*`, no hex sueltos |
| **CSS** | Común en `game-shell.css`; específico en `style.css` |
| **Boot** | `GameBoot.start*()`, no `Engine.init` suelto al final del archivo |
| **Online UI** | `OnlineLobby` + `OnlineSetup`, no wiring manual de `#copy-btn` / `#join-btn` |

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
Ver sección **GameBoot**. Los módulos compartidos (`Theme`, `Input`, `Audio`, `Online`, `UIMenu`, `GameStates`, `GameOverlay`, `OnlineLobby`, `OnlineSetup`, `MobileControls`) funcionan con los tres motores gráficos; solo cambia el script del renderizador y la llamada `GameBoot.start*`.

---

## Compatibilidad entre motores

| Módulo | Engine | PIXI | LittleJS | DOM |
|--------|--------|------|----------|-----|
| `Theme` | ✓ | ✓ | ✓ | ✓ |
| `RenderBridge` | ✓ | ✓ | ✓ | - |
| `UICanvas` (puntero/hit-test) | ✓ | ✓ | ✓ | - |
| `UICanvas.drawButton` | ✓ | - | - | - |
| `UIMenu` (input/hit-test) | ✓ | ✓ | ✓ | - |
| `UIMenu.draw` | ✓ | - | - | - |
| `GameStates` | ✓ | ✓ | ✓ | ✓ |
| `GameOverlay` | ✓ | - | - | - |
| `OnlineLobby` | ✓ | ✓ | ✓ | ✓ |
| `OnlineSetup` | ✓ | ✓ | ✓ | ✓ |
| `MobileControls` | ✓ | ✓ | ✓ | ✓ |
| `GameBoot` | ✓ | ✓ | ✓ | ✓ |
| `Input` / `Audio` / `Online` | ✓ | ✓ | ✓ | ✓ |

---

## Documentación relacionada

- [Motores Core](CORE_ENGINES.md) - API de Engine, PIXIEngine, LittleEngine, DOMEngine
- [Input](INPUT.md) - teclado, ratón, touch
- [Online](ONLINE.md) - PeerJS, envío de mensajes
- [Offline / Service Worker](OFFLINE.md) - descarga de juegos, caché PWA
- [API](API.md) - referencia rápida de todos los módulos
