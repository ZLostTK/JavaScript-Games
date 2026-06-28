# Animation Previewer Plan

**Propósito:** Preview visual de animaciones cuadro a cuadro. Definir nombre, frames, velocidad, loop, y exportar la definición lista para `SpriteProcessor.defineAnimations()` o `SpriteManager.load(..., { animations })`.

---

## Referencias

- `engine/sprite-processor.js:213` → `defineAnimations(sprites, animationDefs)`
  - Formato: `{ animName: { frames, speed, loop, onComplete } }`
  - `frames` puede ser: `["frame1", "frame2"]` o `"prefijo{0-3}"` o `"prefijo0-3"`
- `games/playeranimation/script.js:190` → ejemplo real de definiciones
- `engine/sprite-processor.js:1073` → `SpriteManager.load()` con `animations` option

---

## Features

**Carga de sprites**
- [ ] Input file selector — carga imágenes individuales (PNG, GIF, WebP)
- [ ] Drag & drop múltiples archivos
- [ ] Ordenar frames por drag & drop en lista
- [ ] Auto-orden por nombre (numérico, alfabético)
- [ ] Cargar un JSON de sprite sheet (output del Sprite Cutter) + la imagen
- [ ] Mostrar nombre de archivo + dimensiones junto a cada frame

**Preview de animación**
- [ ] Canvas central donde se reproduce la animación
- [ ] Play / Pause
- [ ] Frame a frame manual (anterior/siguiente)
- [ ] Slider de scrub (arrastrar para ir a cualquier frame)
- [ ] **Bucle / One-shot** toggle
- [ ] **Velocidad:** slider de FPS (1-60, valor por defecto 10)
- [ ] Mostrar número de frame actual / total (ej. `3/12`)
- [ ] Fondo configurable (transparente, color, checkerboard)
- [ ] Escala de preview: 1x, 2x, 4x, fit

**Definición de animaciones**
- [ ] Tabla/lista de animaciones creadas (nombre + frames + speed + loop)
- [ ] Botón **New Animation** → dar nombre, seleccionar frames de la lista
- [ ] Ordenar frames por drag dentro de la animación
- [ ] Editar speed (FPS) por animación
- [ ] Toggle loop por animación
- [ ] Renombrar animación
- [ ] Duplicar animación
- [ ] Eliminar animación
- [ ] Indicador visual de frame actual en la lista de frames

**Soporte multi-animación**
- [ ] Crear múltiples animaciones desde el mismo set de frames
- [ ] Sidebar con lista de animaciones (click para seleccionar y previsualizar)
- [ ] Transición suave al cambiar entre animaciones en preview

**Exportación**
- [ ] Botón **Export Animation JSON** → descarga definiciones
- [ ] Vista previa del JSON
- [ ] Botón **Copy to Clipboard**
- [ ] Formato exacto:
```json
{
  "idle":   { "frames": ["idle"],           "speed": 2,  "loop": true },
  "walk":   { "frames": ["walk_0","walk_1"], "speed": 4,  "loop": true },
  "jump":   { "frames": ["jump_0","jump_1"], "speed": 4,  "loop": false },
  "fall":   { "frames": ["fall_0"],          "speed": 2,  "loop": true },
  "crouch": { "frames": ["crouch_0"],        "speed": 2,  "loop": true }
}
```
- [ ] Opción de exportar para uso directo en `SpriteManager.load()`:
```json
{
  "animations": { ... }
}
```

**Testing rápido**
- [ ] Botón **Test in Engine** → mini canvas que renderiza con `Engine.rect` de fondo y dibuja el frame actual centrado, simulando cómo se vería en el juego real
- [ ] Mostrar FPS real de la animación (no el configurado, el real renderizado)

**UI/UX**
- [ ] 100% standalone sin dependencias
- [ ] Layout: preview central grande, sidebar izquierda con frames cargados, panel derecho con controles de animación
- [ ] Tema oscuro
- [ ] Responsive
- [ ] Atajos de teclado: Space=play/pause, ←/→=frame anterior/siguiente, R=reiniciar
