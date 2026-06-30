# Matter.js — Física 2D

Motor de física 2D avanzado con detección de colisiones, cuerpos rígidos, gravedad y restricciones.

**Librería:** `engine/matter.min.js` — [Matter.js](https://brm.io/matter-js/)

## Carga

```html
<script src="../../engine/matter.min.js"></script>
<script type="module" src="./main.js"></script>
```

## Componente ECS: `PhysicsBody`

```javascript
import { PhysicsBody } from '../../src/components/PhysicsBody.js';

const id = world.createEntity();
world.addComponent(id, Transform, { x: 200, y: 300 });
world.addComponent(id, PhysicsBody, {
  shape: 'circle',
  radius: 16,
  density: 0.001,
  friction: 0.1,
  restitution: 0.8,
});
```

### Propiedades

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `body` | `Matter.Body` | `null` | Referencia al cuerpo (se asigna al crear) |
| `shape` | `string` | `'rectangle'` | `'rectangle'` o `'circle'` |
| `width` | `number` | `32` | Ancho (rectángulo) |
| `height` | `number` | `32` | Alto (rectángulo) |
| `radius` | `number` | `16` | Radio (círculo) |
| `density` | `number` | `0.001` | Densidad |
| `friction` | `number` | `0.1` | Fricción |
| `restitution` | `number` | `0` | Elasticidad (0–1) |
| `isStatic` | `boolean` | `false` | Si es estático |
| `label` | `string` | `''` | Etiqueta para colisiones |

## Sistema ECS: `MatterPhysicsSystem`

```javascript
import { MatterPhysicsSystem } from '../../src/systems/MatterPhysicsSystem.js';

const physics = new MatterPhysicsSystem(world, {
  bounds: { x: 0, y: 0, w: 800, h: 600 },
});
world.addSystem(physics);
physics.init();

// Crear el cuerpo físico de una entidad
physics.createBody(entityId, posX, posY);

// Aplicar fuerza
physics.applyForce(entityId, { x: 0.05, y: -0.1 });

// Fijar velocidad
physics.setVelocity(entityId, { x: 5, y: 0 });

// Eliminar cuerpo
physics.removeBody(entityId);
```

### Comportamiento

- `init()` crea el engine Matter.js con gravedad por defecto (0, 1). Si se pasan `bounds`, genera paredes invisibles.
- `update(dt)` ejecuta `Matter.Engine.update()` y sincroniza `Transform` de cada entidad con la posición/ángulo del cuerpo.
- Al crear un cuerpo con `createBody()`, se enlaza automáticamente al `PhysicsBody.body`.

## Uso sin ECS

```javascript
const engine = Matter.Engine.create();
const box = Matter.Bodies.rectangle(200, 200, 50, 50);
Matter.Composite.add(engine.world, box);
Matter.Engine.update(engine, 16.67);
```
