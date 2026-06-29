# ECS — Entity Component System

Sistema de entidades y componentes para separar **datos** (componentes) de **lógica** (sistemas).

**Código fuente:** `src/ecs/`, `src/components/`, `src/systems/`

---

## Conceptos

| Concepto | Descripción |
|----------|-------------|
| **World** | Contenedor de entidades, componentes y sistemas |
| **Entity** | ID numérico que agrupa componentes |
| **Component** | Datos puros (posición, velocidad, sprite…) |
| **System** | Lógica que opera sobre entidades con ciertos componentes |

## Inicio rápido

```javascript
import { World } from '../../src/ecs/World.js';
import { Transform, Velocity, SpriteData, Collider } from '../../src/components/index.js';
import { MovementSystem, PhysicsSystem, RenderSystem } from '../../src/systems/index.js';

const world = new World();
world.bounds = { w: 480, h: 640 };

const ball = world.createEntity();
world.addTag(ball, 'ball');
world.addComponent(ball, Transform, { x: 240, y: 400 });
world.addComponent(ball, Velocity, { vx: 200, vy: -250 });
world.addComponent(ball, SpriteData, { shape: 'circle', radius: 6, color: '#4ecca3' });
world.addComponent(ball, Collider, {
  shape: 'circle', r: 6, solid: true, bounce: true,
  bounceWalls: { left: true, right: true, top: true, bottom: false },
});

world.addSystem(new MovementSystem(world));
world.addSystem(new PhysicsSystem(world, {
  onCollision: (a, b) => { /* lógica de juego */ },
}));
world.addSystem(new RenderSystem(world));

// En update(dt):
world.update(dt);

// En render(ctx):
world.render(ctx);
```

## Componentes disponibles

### `Transform`
`x`, `y`, `rotation`, `scaleX`, `scaleY`

### `Velocity`
`vx`, `vy` — píxeles por segundo

### `Collider`
- `shape`: `'aabb'` | `'circle'`
- `w`, `h`, `r` — dimensiones
- `solid`, `bounce`, `bounceWalls`, `tag`

### `SpriteData`
- `color`, `width`, `height`, `radius`, `shape`
- `fsm` — instancia de `SpriteStateMachine` (ver [SPRITES.md](SPRITES.md))
- `hidden` — omitir en render

## Sistemas disponibles

| Sistema | Función |
|---------|---------|
| `MovementSystem` | `Transform` += `Velocity` × dt |
| `PhysicsSystem` | Rebotes en bordes + colisiones AABB/círculo |
| `RenderSystem` | Dibuja `Transform` + `SpriteData` vía `RenderBridge` |
| `AnimationSystem` | Actualiza `SpriteData.fsm` y máquinas del EventBus |

## SpriteStateMachine

Asigna la FSM al componente y el motor la actualiza cada frame:

```javascript
import { AnimationSystem } from '../../src/systems/AnimationSystem.js';

// Opción A: en el componente
world.addComponent(id, SpriteData, { fsm: myFsm, width: 32, height: 32 });

// Opción B: vía EventBus
EventBus.emit(Events.ANIMATION_REGISTER, { id: 'hero', machine: myFsm });
EventBus.emit(Events.ANIMATION_SET_STATE, { id: 'hero', state: 'walk' });
```

`Engine` llama `AnimationSystem.update(dt, game.world)` automáticamente si el juego expone `world`.

## Piloto migrado

**Arkanoid** — paleta, pelota y ladrillos son entidades ECS; puntuación y vidas permanecen en el game object.

---

Ver también: [EventBus](EVENT_BUS.md) · [Arquitectura moderna](MODERN_STACK.md) · [Sprites](SPRITES.md)
