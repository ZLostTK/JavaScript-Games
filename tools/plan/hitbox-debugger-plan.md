# Hitbox Debugger Plan

**Propósito:** Overlay visual que renderiza todas las regiones interactivas registradas (botones, sliders, áreas clickeables) para debuggear layouts de menú sin adivinar coordenadas.

---

## Referencias

- `engine/ui-canvas.js` → `UICanvas.hitTest(gx, gy, btn)`, `UICanvas.layoutButtons(count, opts)`, `UICanvas.getPointer()`
- `engine/docs/GAME_ARCHITECTURE.md` → sección UICanvas, patrón `_btns`
- Todos los juegos tienen código como:
```js
this._btns = {
  play: { x: 100, y: 200, w: 200, h: 50, label: 'Jugar' },
  ...
};
```

---

## Features

**Modo de uso**
- [ ] Tecla de activación: `F2` o `H` (toggle on/off)
- [ ] Se auto-inyecta al cargar: `<script src="../../tools/hitbox-debugger.js"></script>`
- [ ] Alternativa: modo API donde el juego registra explícitamente sus regiones

**Inyección pasiva (sin modificar el juego)**
- [ ] Escanea el game object en busca de propiedades que contengan arrays/objetos con `x, y, w, h`
- [ ] Detecta patrones comunes: `this._btns`, `this.buttons`, `this._buttons`
- [ ] Renderiza rectángulos semitransparentes sobre esas regiones
- [ ] Muestra el nombre de la propiedad/key como label

**Registro manual (recomendado)**
```js
// En init() del juego:
HitboxDebugger.register('play',   { x: 100, y: 200, w: 200, h: 50 });
HitboxDebugger.register('online', { x: 100, y: 270, w: 200, h: 50 });
HitboxDebugger.register('quit',   { x: 100, y: 340, w: 200, h: 50 });
```
- [ ] Método `HitboxDebugger.register(id, rect)` con `rect = { x, y, w, h }`
- [ ] Método `HitboxDebugger.registerGroup(groupId, rects)` para arrays de botones
- [ ] Método `HitboxDebugger.unregister(id)`
- [ ] Método `HitboxDebugger.clear()`

**Visualización de overlays**
- [ ] Rectángulo semitransparente `rgba(233, 69, 96, 0.25)` (color `accent`) sobre cada región
- [ ] Borde más visible: `rgba(233, 69, 96, 0.6)` de 1.5px
- [ ] Label con el nombre del botón centrado, fuente mono 11px
- [ ] Si el botón tiene `label` o `text`, mostrar ese en vez del id
- [ ] Cursor hover: resaltar el rectángulo bajo el mouse (más opaco, borde blanco)

**Panel informativo**
- [ ] Panel pequeño en esquina inferior derecha
- [ ] Muestra coordenadas del mouse/touch en espacio de juego
- [ ] Muestra el botón actualmente bajo el cursor (si hay hit)
- [ ] Muestra dimensiones del botón seleccionado

**Auto-detección de layout**
- [ ] Cuando se activa, intenta detectar regiones automáticamente:
  - Busca `game._btns`, `game.buttons` en el game object
  - Busca propiedades cuyo valor tenga `x, y, w, h`
  - Genera IDs tipo `_btn_0`, `_btn_1` para regiones sin nombre
- [ ] Opción para ignorar auto-detección y solo mostrar regiones registradas manualmente

**Exportación de layout**
- [ ] Botón invisible (Ctrl+E) para copiar el layout actual como JSON
- [ ] Formato compatible con `UICanvas.layoutButtons()`:
```json
[
  { "id": "play",  "x": 100, "y": 200, "w": 200, "h": 50 },
  { "id": "setup", "x": 100, "y": 270, "w": 200, "h": 50 }
]
```

**Compatibilidad con motores**
- [ ] Detecta `RenderBridge` para coordenadas correctas
- [ ] En Canvas 2D: dibuja sobre el ctx directamente (en post-render)
- [ ] En PIXI: crea un `PIXI.Graphics` overlay
- [ ] En LittleJS: usa overlay canvas con posición absoluta
- [ ] Fallback: overlay DOM con `position: absolute` sobre el contenedor del juego

**UI/UX**
- [ ] 100% standalone, un solo archivo JS
- [ ] Sin dependencias externas
- [ ] Toggle rápido con tecla (F2)
- [ ] No interfiere con click handlers del juego (pointer-events: none en los overlays)
- [ ] Se limpia automáticamente al desactivar
