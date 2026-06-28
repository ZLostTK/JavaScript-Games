# Input Visualizer Plan

**Propósito:** Overlay de depuración que muestra en tiempo real el estado del input (teclado, mouse, touch, FPS). Se inyecta en cualquier juego sin modificar su código. Compatible con los 3 motores (Canvas, PIXI, LittleJS, DOM).

---

## Referencias

- `engine/input.js` → `Input.isDown(key)`, `Input.isPressed(key)`, `Input.getMouse()`, `Input.getTouch()`, `Input.getTouchCount()`
- `engine/render-bridge.js` → `RenderBridge.W`, `RenderBridge.H`, `RenderBridge.ctx`
- `engine/game-shell.css` → estilos base del proyecto
- `engine/docs/INPUT.md` → documentación del sistema de input

---

## Features

**Activación**
- [ ] Tecla de activación: `F1` o `` ` `` (backtick) para mostrar/ocultar
- [ ] No intercepta ni modifica el input del juego
- [ ] Se inyecta como `<div>` overlay con `position: fixed; z-index: 9999`
- [ ] No requiere modificar el `game` object ni el HTML

**Panel de teclado**
- [ ] Lista en vivo de teclas actualmente presionadas (`Input.isDown`)
- [ ] Mostrar `key.code` (ej. `ArrowUp`, `Space`, `KeyW`)
- [ ] Resaltar visualmente las teclas activas
- [ ] Contador de teclas presionadas

**Panel de mouse**
- [ ] Coordenadas del mouse: `x, y` en pantalla
- [ ] Coordenadas convertidas a juego: `RenderBridge.toGame(x, y)`
- [ ] Estado del botón: `down / up`
- [ ] Indicador visual de click (pequeño círculo que aparece al hacer click)

**Panel táctil**
- [ ] Número de toques activos: `Input.getTouchCount()`
- [ ] Lista de toques: `id, x, y` por cada dedo
- [ ] Indicador visual: círculos semitransparentes en la posición de cada toque (overlay sobre el canvas)
- [ ] Mostrar si hubo `isTouchStarted()` en el frame actual

**Panel de rendimiento**
- [ ] FPS actual (calculado sobre ventana de 500ms)
- [ ] Delta time del frame actual (`dt`)
- [ ] Tamaño del canvas/renderer (`W × H`)
- [ ] Motor activo: `RenderBridge.type()`

**Estilo y posición**
- [ ] Panel semitransparente, fondo `rgba(0,0,0,0.7)`
- [ ] Texto monoespaciado, color verde neón (`#4ecca3`) — estilo terminal
- [ ] Posición: esquina superior izquierda por defecto
- [ ] Arrastrable: click en header del panel y drag para reposicionar
- [ ] Tamaño de fuente: 11px (compacto, no interfiere con el juego)
- [ ] Opacidad configurable: teclas `+` / `-` para subir/bajar opacidad

**Indicadores visuales en canvas**
- [ ] Crosshair en la posición del mouse (cruz de 10px, color `accent`)
- [ ] Círculos de toque (color `info`, relleno semitransparente)
- [ ] Se renderizan sobre el canvas real del juego, no en el overlay DOM
- [ ] No interfieren con `Input.endFrame()` ni el ciclo del juego

**Modo de inyección**
```html
<!-- Agregar al final del <body> en cualquier juego -->
<script src="../../tools/input-visualizer.js"></script>
```
- [ ] El script se auto-inicializa al cargarse
- [ ] Detecta el canvas activo automáticamente (vía `RenderBridge` o `document.querySelector('canvas')`)
- [ ] Si `RenderBridge` no está disponible aún, espera 500ms y reintenta
- [ ] No requiere configuración

**Datos mostrados (ejemplo)**
```
FPS: 60 | dt: 16.7ms | Engine: canvas
Keys: ArrowLeft Space
Mouse: (320, 240) → game:(160, 120) [DOWN]
Touch: 1  id:0 (300, 200)
```

**UI/UX**
- [ ] 100% standalone, un solo archivo JS
- [ ] Sin dependencias
- [ ] No usa shadow DOM (simpleza)
- [ ] Se limpia solo si se recarga la página o se remueve el script
