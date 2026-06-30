# ROT.js — Generación de Mazmorras (Roguelike)

Toolkit para juegos roguelike: generación procedural de mazmorras, FOV, pathfinding, y utilidades para grids.

**Librería:** `engine/rot.min.js` — [ROT.js](https://ondras.github.io/rot.js/hp/)

## Carga

```html
<script src="../../engine/rot.min.js"></script>
<script type="module" src="./main.js"></script>
```

## Componente ECS: `DungeonTile`

```javascript
import { DungeonTile } from '../../src/components/DungeonTile.js';

const tile = world.createEntity();
world.addComponent(tile, DungeonTile, {
  tileType: 'wall',
  x: 5,
  y: 3,
  walkable: false,
  color: '#555',
});
```

### Propiedades

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `tileType` | `string` | `'wall'` | `'wall'`, `'floor'`, `'door'` |
| `x` / `y` | `number` | `0` | Coordenadas en grid |
| `walkable` | `boolean` | `false` | Si se puede atravesar |
| `visible` | `boolean` | `true` | Visible actualmente |
| `explored` | `boolean` | `false` | Ya fue visto |
| `color` | `string` | `'#333'` | Color del tile |

## Generación de Mazmorras

```javascript
// Mazmorra estilo cueva (células)
const cavern = new ROT.Map.Cellular(80, 24);
cavern.randomize(0.5);
for (let i = 0; i < 4; i++) cavern.create();

// Mazmorra con habitaciones
const dungeon = new ROT.Map.Digger(80, 24);
dungeon.create((x, y, type) => {
  // type = 0 (pared) o 1 (suelo)
});

// Mazmorra unificada
const unified = new ROT.Map.Uniform(80, 24);
unified.create((x, y, type) => { /* ... */ });
```

## FOV (Campo de Visión)

```javascript
const fov = new ROT.FOV.PreciseShadowcasting((x, y) => {
  return map[x][y] !== 1; // true si es transitable
});

fov.compute(10, 12, 6, (x, y, r, visibility) => {
  // x, y = tile visible
  // visibility = 0..1 (0 = borde del rango)
});
```

## Utilidades

```javascript
// Aleatorio con semilla
const rng = new ROT.RNG();

// Colores HSL/RGB
const color = ROT.Color.fromString('#e94560');
const rgb = ROT.Color.toRGB(color);
const hsl = ROT.Color.rgb2hsl(color);
```
