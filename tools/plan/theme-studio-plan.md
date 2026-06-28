# Theme Studio Plan

**Propósito:** Editor visual de la paleta `Theme.colors` con preview en vivo de botones, texto, fondos y layouts. Exporta el objeto `Theme` listo para copiar a `engine/theme.js`.

---

## Referencias

- `engine/theme.js` → estructura exacta del Theme
- `engine/ui-canvas.js` → `drawButton()`, `layoutButtons()` para preview
- `engine/game-shell.css` → estilos del shell (colores fondo, bordes)
- `engine/docs/GAME_ARCHITECTURE.md:124` → documentación de Theme

---

## Features

**Selector de colores (10 colores)**
- [ ] Input de color picker nativo (`<input type="color">`) para cada uno
- [ ] Input HEX alternativo (editable)
- [ ] Input RGBA alternativo (sliders R/G/B/A)
- [ ] Botón **Reset to defaults** (restaurar colores originales de `theme.js`)
- [ ] Botón **Random palette** (generar colores armónicos)
- [ ] Swatch circular de previsualización para cada color

| Color     | Uso                          | Default     |
|-----------|------------------------------|-------------|
| `bg`      | Fondo de canvas/juego        | `#0f0f1a`   |
| `accent`  | Color primario de botones    | `#e94560`   |
| `accent2` | Color secundario             | `#533483`   |
| `success` | Aciertos, puntos, verde      | `#4ecca3`   |
| `warning` | Advertencias, amarillo       | `#f5c518`   |
| `info`    | Información, azul            | `#4fc3f7`   |
| `muted`   | Elementos secundarios        | `#606070`   |
| `text`    | Texto principal              | `#e0e0e0`   |
| `textMuted`| Texto secundario            | `#a0a0b0`   |
| `textDim` | Texto muy tenue              | `#404060`   |

**Previsualización en vivo**
- [ ] Canvas/área de preview que se actualiza al cambiar cualquier color
- [ ] Fondo pintado con `bg`
- [ ] Botones renderizados con `UICanvas.drawButton()` usando `accent`, mostrando hover
- [ ] Texto de ejemplo en colores `text`, `textMuted`, `textDim`
- [ ] Botón secundario con `accent2`
- [ ] Indicador de éxito/warning/info (pequeños badges o textos)
- [ ] Layout de botones con `UICanvas.layoutButtons(3, ...)`
- [ ] Botón invisible que togglea entre **modo normal** y **modo hover** para testear

**Tipografía**
- [ ] Selector de font family para `font.mono` (pre-popular con las más comunes)
- [ ] Selector de font family para `font.ui`
- [ ] Preview de texto con ambas fuentes lado a lado
- [ ] Slider de tamaño de letra para preview

**Paletas predefinidas**
- [ ] Botón **Load defaults** → paleta actual del engine
- [ ] Botón **Dark retro** (verde neón sobre negro)
- [ ] Botón **Light theme** (fondo claro)
- [ ] Botón **Gameboy** (4 tonos verde)
- [ ] Botón **Cyberpunk** (magenta/cian/negro)

**Exportación**
- [ ] Vista previa del código JavaScript generado
- [ ] Botón **Copy to Clipboard**
- [ ] Botón **Export .js** → descarga archivo `theme.js`
- [ ] Código generado exactamente en formato de `engine/theme.js`
- [ ] Preservar comentarios de la estructura original

**Testing visual adicional**
- [ ] **Modo contraste**: marcar colores que no cumplen WCAG AA con texto (contraste < 4.5:1)
- [ ] Simulación de daltonismo (protanopia, deuteranopia, tritanopia)

**UI/UX**
- [ ] 100% standalone
- [ ] Layout: panel de colores a la izquierda, preview grande a la derecha
- [ ] Tema oscuro
- [ ] Responsive
- [ ] Colapsar panel de colores en móvil
- [ ] Atajo: `Ctrl+Z` para deshacer cambio de color
