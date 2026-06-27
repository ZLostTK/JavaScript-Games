# Motores Core (Core Engines)

El sistema soporta múltiples motores de renderizado. Todos siguen el contrato de **Game Object**: `init()`, `update(dt)` y (opcionalmente) `render()`.

Los tres motores gráficos principales — **Engine**, **PIXIEngine** y **LittleEngine** — registran automáticamente el motor activo en `RenderBridge`, permitiendo que módulos compartidos (`UICanvas`, `GameBoot`, `SpriteProcessor`) funcionen sin acoplarse a uno concreto.

---

## RenderBridge (puente agnóstico)

Carga obligatoria **antes** del motor, **después** de `theme.js`:

```html
<script src="../../engine/render-bridge.js"></script>
```

```javascript
RenderBridge.W          // ancho lógico del motor activo
RenderBridge.H          // alto lógico
RenderBridge.toGame(x, y)  // pantalla → coordenadas de juego
RenderBridge.type()     // 'canvas' | 'pixi' | 'little'
RenderBridge.ctx        // contexto 2D (solo Engine)
RenderBridge.canvas     // elemento canvas activo
```

---

## 1. Engine (Canvas 2D Base)

El motor principal usando la API Canvas 2D nativa del navegador.

### ¿Para qué sirve?
Es ideal para juegos 2D tradicionales como plataformas, disparos, juegos retro o simulaciones de físicas simples.

### ¿Cuándo utilizarlo?
Cuando necesites un control directo píxel por píxel, no requieras el máximo rendimiento de WebGL, o quieras mantener las dependencias al mínimo.

### Declaración y Opciones

```javascript
Engine.init(canvasId, options)
```
- **`canvasId`** *(string)*: ID del elemento `<canvas>` en el HTML.
- **`options`** *(object)*:
  - `width` (number): Ancho interno del juego (resolución lógica).
  - `height` (number): Alto interno del juego.
  - `scaleMode` (string): Modo de escalado: `'fit'` (mantiene proporción, recorta si es necesario), `'cover'` (cubre todo el contenedor, escala con `Math.max`).
  - `bg` (string): Color de fondo en formato CSS (ej. `'#1a1a2e'`).

### Métodos del Engine

- `Engine.start(game)`: Inicia el bucle principal. El objeto `game` debe tener `init()`, `update(dt)`, y `render(ctx)`.
- `Engine.stop()`: Detiene la ejecución del juego.
- `Engine.toGame(x, y) -> { x, y }`: Convierte coordenadas de la pantalla (ej. de un clic) a las coordenadas lógicas internas del canvas (teniendo en cuenta el `scaleMode`). Útil para procesar clics precisos.
- `Engine.rect(x, y, w, h, color)`: Dibuja un rectángulo (helper rápido).
- `Engine.circle(x, y, r, color)`: Dibuja un círculo.
- `Engine.text(txt, x, y, color, size, align)`: Dibuja texto simple.

### Ejemplo de Uso Completo

```javascript
const myGame = {
    init() {
        this.playerX = 100;
    },
    update(dt) {
        // dt es delta time en segundos (ej. 0.016 para 60 FPS)
        this.playerX += 50 * dt; 
    },
    render(ctx) {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.playerX, 100, 32, 32);
    }
};

Engine.init('my-canvas', { width: 800, height: 600, scaleMode: 'fit' });
Engine.start(myGame);

// O con GameBoot (recomendado):
GameBoot.start(myGame, { canvasId: 'my-canvas', width: 800, height: 600 });
```

---

## 2. DOMEngine

Un motor sin Canvas que manipula elementos HTML (divs, spans, imágenes) usando CSS.

### ¿Para qué sirve?
Manipula el árbol DOM directamente en cada frame o en respuesta a eventos. 

### ¿Cuándo utilizarlo?
Para juegos de mesa (Ajedrez, Tres en Raya), juegos de cartas, juegos de trivia, simuladores de interfaz de usuario, o puzzles donde cada pieza puede ser un elemento `<div>` que recibe clics estándar. No es apto para juegos de acción con muchas partículas.

### Declaración y Opciones

```javascript
DOMEngine.init(containerId, options)
```
- **`containerId`** *(string)*: ID del `<div>` contenedor del juego.
- **`options`** *(object)*:
  - `fps` (number): Límite de fotogramas por segundo. Usar 0 para sin límite (depender de RequestAnimationFrame).

### Métodos Principales

- `DOMEngine.start(game)`: Inicia el loop. A diferencia del canvas, aquí `render()` suele ser manual o menos frecuente, enfocado en actualizar las clases CSS.
- `DOMEngine.stop()`: Detiene el loop sin destruir el estado del juego.
- `DOMEngine.resume()`: Reanuda el loop después de `stop()`.
- `DOMEngine.render()`: Llama manualmente a `game.render()`. No se llama automáticamente en el loop.
- `DOMEngine.el(id) -> HTMLElement`: Atajo para `document.getElementById()`.
- `DOMEngine.create(tag, cls, parent) -> HTMLElement`: Crea un elemento (ej. `'div'`), le asigna clases separadas por espacio, y lo añade al `parent`.
- `DOMEngine.clear(el)`: Elimina todos los hijos de un elemento.
- `DOMEngine.setText(el, text)`: Establece `textContent`.
- `DOMEngine.setHTML(el, html)`: Establece `innerHTML`.
- `DOMEngine.addClass(el, ...cls)`: Añade una o varias clases CSS.
- `DOMEngine.removeClass(el, ...cls)`: Elimina una o varias clases CSS.
- `DOMEngine.toggleClass(el, cls, force)`: Alterna una clase CSS.
- `DOMEngine.setStyle(el, styles)`: Aplica múltiples estilos CSS desde un objeto a un elemento.
- `DOMEngine.on(target, event, handler, opts) -> fn`: Añade un Event Listener que es seguro limpiar después (devuelve una función de limpieza).
- `DOMEngine.createGrid(parent, rows, cols, onClick, onCtx)`: Crea rápidamente un tablero (grid) de celdas. Devuelve una matriz 2D con los elementos.
- `DOMEngine.showOverlay(message, subMessage, onDismiss) -> HTMLElement`: Muestra un overlay modal (win/lose/pausa). Se elimina al hacer clic si `onDismiss` está definido.
- `DOMEngine.hideOverlay()`: Elimina el overlay creado por `showOverlay()`.

### Ejemplo de Uso Completo

```javascript
const ticTacToe = {
    init() {
        const board = DOMEngine.el('board-container');
        this.grid = DOMEngine.createGrid(board, 3, 3, (row, col, cell) => {
            DOMEngine.setText(cell, 'X'); // Al hacer clic, marca 'X'
        });
    },
    update(dt) { /* Lógica asíncrona si fuera necesaria */ },
    render() { /* Solo si usas un loop continuo para animaciones CSS */ }
};

DOMEngine.init('game-ui', { fps: 30 });
DOMEngine.start(ticTacToe);
```

---

## 3. PIXIEngine

Un motor envolvente para la popular librería WebGL [PIXI.js](https://pixijs.com/).

### ¿Para qué sirve?
Delega el renderizado a la GPU (WebGL) manteniendo la misma estructura de game loop.

### ¿Cuándo utilizarlo?
Cuando tu juego requiera alto rendimiento gráfico: cientos o miles de sprites en pantalla, sistemas de partículas complejos, filtros/shaders avanzados, o juegos Arcade muy fluidos.

### Declaración y Opciones

```javascript
PIXIEngine.init(containerId, options)
```
- **`containerId`** *(string)*: Contenedor HTML donde PIXI inyectará su propio `<canvas>`.
- **`options`** *(object)*:
  - `width` y `height` (number): Resolución.
  - `bg` (number hexadecimal): Color de fondo (ej. `0x1a1a2e`).

### Propiedades

- `PIXIEngine.W`: Ancho lógico del juego.
- `PIXIEngine.H`: Alto lógico del juego.

### Métodos Principales

- `PIXIEngine.start(game)`: Inicia la aplicación PIXI.
- `PIXIEngine.stop()`: Detiene el juego y destruye la aplicación PIXI.
- `PIXIEngine.addChild(child)`: Añade un `PIXI.Sprite` o `PIXI.Container` a la escena principal (`stage`).
- `PIXIEngine.removeChild(child)`: Quita un elemento de la escena.

### Ejemplo de Uso Completo

```javascript
let playerSprite;

const pixiGame = {
    init() {
        // Asume que PIXI ya cargó la textura previamente
        playerSprite = PIXI.Sprite.from('player.png');
        PIXIEngine.addChild(playerSprite);
    },
    update(dt) {
        playerSprite.x += 100 * dt;
    }
};

PIXIEngine.init('game-container', { width: 800, height: 600, bg: 0x000000 });
PIXIEngine.start(pixiGame);

// O con GameBoot:
GameBoot.startPIXI(pixiGame, { containerId: 'game-container', width: 800, height: 600 });
// GameBoot.start(pixiGame, { renderer: 'pixi', ... })
```

**Notas de compatibilidad:**
- `PIXIEngine.toGame(x, y)` convierte coordenadas de pantalla a lógicas (igual que Engine).
- `Input` se vincula automáticamente al canvas PIXI tras `init()`.
- `render()` en el game object es opcional; PIXI renderiza la escena en cada tick.

---

## 4. LittleEngine (LittleJS)

Wrapper para [LittleJS](https://github.com/KilledByAPixel/LittleJS). Ideal para juegos pixel-art con tiles y sprites ligeros.

### ¿Cuándo utilizarlo?
Game jams, plataformas retro, juegos basados en tilemap donde LittleJS aporta física y renderizado integrados.

### Declaración y Opciones

```javascript
LittleEngine.init(containerId, options)
```
- **`containerId`**: `<div>` donde LittleJS inyecta su canvas.
- **`options`**:
  - `width`, `height` (number): Resolución lógica.
  - `tileSize` (number): Tamaño de tile por defecto.
  - `padding` (number): Padding entre tiles.
  - `images` (string[]): Rutas de imágenes a precargar.

### Métodos

- `LittleEngine.rendererType`: Siempre `'little'`.
- `LittleEngine.start(game)`: Inicia el loop LittleJS.
- `LittleEngine.stop()`: Detiene y destruye objetos.
- `LittleEngine.toGame(x, y)`: Convierte coordenadas de pantalla (compatible con `UICanvas.getPointer()`).
- `LittleEngine.W`, `LittleEngine.H`: Dimensiones lógicas.

### Ejemplo

```javascript
const littleGame = {
    init() {
        // Usar API LittleJS: new EngineObject(), tile(), etc.
    },
    update(dt) {
        // dt = timeDelta de LittleJS
    },
    render() {
        // postRender hook — dibujado adicional
    }
};

GameBoot.startLittle(littleGame, {
    containerId: 'game-container',
    width: 640, height: 480,
    tileSize: 16,
    images: ['tilemap.png'],
});
```

**Scripts requeridos:**
```html
<script src="../../engine/littlejs.min.js"></script>
<script src="../../engine/littlejs-engine.js"></script>
```
