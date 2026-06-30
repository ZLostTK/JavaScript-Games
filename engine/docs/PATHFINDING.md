# Pathfinding.js — Búsqueda de Rutas para NPCs

Algoritmos de pathfinding A*, Dijkstra, Best-First, etc. para grids 2D.

**Librería:** `engine/pathfinding-browser.min.js` — [Pathfinding.js](https://github.com/qiao/PathFinding.js)

## Carga

```html
<script src="../../engine/pathfinding-browser.min.js"></script>
<script type="module" src="./main.js"></script>
```

## Componente ECS: `PathAgent`

```javascript
import { PathAgent } from '../../src/components/PathAgent.js';

const id = world.createEntity();
world.addComponent(id, Transform, { x: 64, y: 64 });
world.addComponent(id, Velocity, { vx: 0, vy: 0 });
world.addComponent(id, PathAgent, {
  targetX: 400,
  targetY: 300,
  speed: 80,
  updateInterval: 0.3,
});
```

### Propiedades

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `targetX` | `number` | `0` | X destino en píxeles |
| `targetY` | `number` | `0` | Y destino en píxeles |
| `speed` | `number` | `100` | Velocidad de movimiento |
| `path` | `array` | `[]` | Ruta calculada `[[x,y],...]` |
| `pathIndex` | `number` | `0` | Índice del waypoint actual |
| `updateInterval` | `number` | `0.5` | Segundos entre recálculos |
| `col` / `row` | `number` | `0` | Posición en grid |

## Sistema ECS: `PathfindingSystem`

```javascript
import { PathfindingSystem } from '../../src/systems/PathfindingSystem.js';

const pathfinding = new PathfindingSystem(world, { tileSize: 32 });
world.addSystem(pathfinding);

// Definir el grid del mapa (0 = transitable, 1 = obstáculo)
const map = [
  [0, 0, 0, 1, 0],
  [0, 1, 0, 1, 0],
  [0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0],
];
pathfinding.setGrid(map, 32);
```

### Comportamiento

- En cada `update()`, las entidades con `PathAgent` recalculan su ruta si pasó el intervalo.
- Si la entidad también tiene `Velocity`, el sistema mueve la entidad hacia el siguiente waypoint.
- El grid se define con `setGrid(matrix, tileSize)`. Usa `PF.AStarFinder` por defecto.

## Uso sin ECS

```javascript
const grid = new PF.Grid([
  [0, 0, 0, 1, 0],
  [0, 1, 0, 1, 0],
]);
const finder = new PF.AStarFinder();
const path = finder.findPath(0, 0, 4, 0, grid);
```
