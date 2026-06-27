# Sprites y Animaciones

El engine provee tres clases para manejar gráficos 2D: `SpriteProcessor` (bajo nivel, utilidades estáticas), `SpriteManager` (alto nivel, orientado a objetos, agrupamiento y gestión) y `EntityComposer` (composición de entidades por capas).

El sistema es **agnóstico del motor**. `SpriteProcessor.detectEngine()` consulta `RenderBridge` para detectar el motor activo (`canvas`, `pixi`, `little` → canvas para sprites 2D) y convierte sprites al formato necesario.

---

## 1. SpriteManager (Recomendado)

`SpriteManager` es la forma más fácil y ordenada de organizar los gráficos de tu juego. Permite cargar hojas de sprites (spritesheets) y agruparlos por personaje o entorno.

### Inicialización

Generalmente crearás una instancia global para tu juego:

```javascript
const manager = new SpriteManager();
// Opcionalmente forzar el engine si detecta incorrectamente:
// const manager = new SpriteManager(PIXIEngine, 'pixi');
```

### Cargar un SpriteSheet

Puedes definir cómo "cortar" una imagen grande usando `load`.

```javascript
const spritesData = [
    { name: 'player_idle', x: 0, y: 0, width: 32, height: 32 },
    { name: 'player_walk0', x: 32, y: 0, width: 32, height: 32 },
    { name: 'player_walk1', x: 64, y: 0, width: 32, height: 32 },
    { name: 'player_walk2', x: 96, y: 0, width: 32, height: 32 },
    { name: 'player_walk3', x: 128, y: 0, width: 32, height: 32 },
];

await manager.load('assets/characters.png', spritesData, {
    name: 'hero',
    animations: {
        idle: 'player_idle',                              // Simplificado: string directo
        walk: { frames: 'player_walk{0-3}', speed: 10 },  // Rango con llaves
    }
});
```

### Rangos de Animación (¡Nuevo!)

Ya no necesitas escribir `walk1, walk2, walk3...` manualmente. Soporta tres formatos:

| Formato | Ejemplo | Resuelve |
|---------|---------|----------|
| `prefijo{expr}` | `walk{0-3}` | walk0, walk1, walk2, walk3 |
| `prefijo{expr}` | `walk{1,4,6-9}` | walk1, walk4, walk6, walk7, walk8, walk9 |
| Números solos | `0-3` | usa el nombre de animación como prefijo → walk0, walk1, walk2, walk3 |
| Números con coma | `1,4,6-9` | usa el nombre de animación como prefijo → walk1, walk4, walk6, walk7, walk8, walk9 |
| Legacy | `walk0-3` | walk0, walk1, walk2, walk3 |

```javascript
// Todas estas formas son equivalentes:
animations: {
    walk: { frames: ['player_walk0', 'player_walk1', 'player_walk2', 'player_walk3'] },
    walk: { frames: 'player_walk{0-3}' },
    walk: { frames: 'player_walk0-3' },
    walk: 'player_walk{0-3}',              // versión simplificada (speed=10, loop=true)
    walk: '0-3',                           // usa 'walk' como prefijo → walk0, walk1, walk2, walk3
}

// Rangos complejos (saltos + rangos):
animations: {
    attack: 'attack{1,3,5-8}',  // attack1, attack3, attack5, attack6, attack7, attack8
}
```

### Usar Animaciones (Canvas y PIXI)

Si estás usando PIXI o Canvas puro, puedes pedir la animación ya formateada:

```javascript
// Obtener una animación lista para usar en PIXI o Canvas
let playerAnim = manager.createAnimationAs('hero', 'walk');

// En PIXIEngine:
PIXIEngine.addChild(playerAnim); // En PIXI es un PIXI.AnimatedSprite
playerAnim.play();

// En Canvas puro (engine.js):
update(dt) {
    playerAnim.update(dt);
}
render(ctx) {
    const texture = playerAnim.getTexture();
    ctx.drawImage(texture, x, y);
}
```

> **Nota sobre `createAnimationAs`**: Cuando no se pasan opciones, el motor hereda automáticamente `speed`, `loop` y `onComplete` de la definición de la animación cargada con `manager.load()`. En PIXI, esto significa que `speed: 10` equivale a 10 fps en `PIXI.AnimatedSprite.animationSpeed`. Si necesitas sobrescribir algún valor al instanciar, pásalo como segundo argumento:
> ```javascript
> // Sobrescribe speed, hereda loop y onComplete de la definición
> let anim = manager.createAnimationAs('hero', 'walk', { speed: 20 });
> ```

### Usar Animaciones (DOMEngine)

```javascript
let domElement = manager.createAnimatedDOM('hero', 'walk');
document.getElementById('game-container').appendChild(domElement.element);

update(dt) {
    domElement.update(dt);
}
```

---

## 2. Composición de Entidades por Capas (¡Nuevo!)

Con `EntityComposer` puedes armar personajes y objetos a partir de partes independientes (cuerpo, cabeza, arma, etc.). Cada parte puede tener su propia animación y posición relativa.

### Definir una composición desde SpriteManager

```javascript
// Cargar las partes por separado o juntas
await manager.load('assets/character-body.png', bodyData, { name: 'hero_body' });
await manager.load('assets/character-head.png', headData, { name: 'hero_head' });

// Definir la composición
manager.compose('player', {
    body: {
        group: 'hero_body',
        sprite: 'body_idle',
        x: 0, y: 0, z: 0,
        animations: {
            idle: 'body_idle',
            walk: 'body_walk{0-3}',
        }
    },
    head: {
        group: 'hero_head',
        sprite: 'head_idle',
        x: 0, y: -20, z: 1,     // desplazado arriba, delante del cuerpo
        animations: {
            idle: 'head_idle',
            walk: 'head_walk{0-3}',
        }
    },
    hat: {
        group: 'hero_head',
        sprite: 'hat_crown',
        x: -2, y: -32, z: 2,    // encima de la cabeza
    }
});

// Usar en el juego
const player = manager.getComposition('player');
player.setAnimations({ body: 'walk', head: 'walk' });

// En el loop:
update(dt) {
    player.update(dt);
}

render(ctx) {
    player.render(ctx, this.x, this.y);
}
```

### Uso directo de EntityComposer

```javascript
const tank = new EntityComposer(manager)
    .addSlot('base', {
        group: 'vehicles',
        sprite: 'tank_body',
        x: 0, y: 0, z: 0,
        animations: { drive: 'tank_drive{1-4}' }
    })
    .addSlot('turret', {
        group: 'vehicles',
        sprite: 'tank_turret',
        x: 5, y: -10, z: 1,
        animations: { aim: 'tank_aim{1-3}' }
    });

tank.setAnimation('turret', 'aim');
```

### Métodos de EntityComposer

| Método | Descripción |
|--------|-------------|
| `addSlot(name, def)` | Agrega una capa con sprite, posición, z-index y animaciones |
| `setAnimation(slot, anim)` | Cambia la animación de una capa |
| `setAnimations({slot: anim})` | Cambia animaciones de múltiples capas |
| `getTexture(slot)` | Obtiene el canvas/textura actual de una capa |
| `update(dt)` | Actualiza todas las animaciones activas |
| `render(ctx, x, y)` | Renderiza en canvas ordenado por z |
| `toPIXI()` | Crea un `PIXI.Container` con todas las capas |
| `toDOM()` | Crea un `HTMLElement` posicionado con capas |

---

## 3. SpriteProcessor (Avanzado)

Si no necesitas agrupar cosas y solo quieres cortar una imagen rápida o crear una cuadrícula uniforme (como un Tileset para un mapa), usa `SpriteProcessor`.

### Cortar una cuadrícula perfecta (Tilesets)

Útil para mapas de tiles donde todos los cuadros miden lo mismo (ej. 32x32).

```javascript
const tiles = await SpriteProcessor.processGrid('assets/tileset.png', {
    spriteWidth: 32,
    spriteHeight: 32,
    columns: 10,
    rows: 10,
    scale: 2,
    nameGenerator: (col, row) => `tile_${col}_${row}`
});
```

### Conversión Manual

```javascript
const myPixiSprite = SpriteProcessor.toPIXI(spriteData);
const myCanvasTex = SpriteProcessor.toCanvas(spriteData);
const myHTMLElement = SpriteProcessor.toDOM(spriteData);
```

---

## 4. Debug Grid de Sprites

`SpriteProcessor` incluye un visor de sprites en cuadrícula para depuración. Muestra todos los sprites cargados en el `SpriteManager` con sus nombres y animaciones.

### Abrir el Debug Grid

Presiona la tecla **`D`** (sin Ctrl/Alt/Meta) cuando haya un `SpriteManager` cargado (ej. `window.spriteManager`). Vuelve a presionar `D` o `Escape` para cerrar.

### Interfaz

| Sección | Descripción |
|---------|-------------|
| **Columna izquierda** | Sprites raw ordenados por número (sprite40–sprite338) + animaciones agrupadas por grupo |
| **Columna derecha** | Panel de previsualización (oculto hasta hacer click en un asset) |

### Preview (click en cualquier sprite o animación)

- **Sprite ampliado** 256×256 con escalado automático
- **Slider de rotación** (0–360°) con ejes de referencia
- **Controles de animación** (solo para animaciones multi-frame):
  - Botón Play/Pause
  - Slider de frame (scrub manual)
  - Slider de velocidad (1–20 fps)
  - Checkbox **"Bucle infinito"**: marcado = loop infinito, desmarcado = reproduce una vez y se detiene en el último frame (como un estado sin loop)

### Cerrar

- Click en el botón ✕
- Presionar `D` o `Escape`
- Click fuera del overlay

---

## 5. Sistema de Estados (`SpriteState` / `SpriteStateMachine`)

Define estados con animaciones (looping o no-looping) y transiciones automáticas. Un estado sin **loop** reproduce la animación una vez y se detiene en el último frame. Si tiene `nextState`, transiciona automáticamente al terminar.

Útil para proyectiles, explosiones, animaciones de muerte, IA de enemigos, etc.

### SpriteState

Representa un estado individual con su propia animación.

```javascript
const estado = new SpriteState({
    name: 'explotar',
    frames: explosionFrames,      // Array<HTMLCanvasElement>
    speed: 12,                    // FPS (default 10)
    loop: false,                  // true = infinito, false = una vez
    nextState: 'done',           // Estado al que transicionar al terminar (solo no-loop)
    onEnter: (entity) => { /* al entrar al estado */ },
    onUpdate: (entity, dt) => { /* cada frame */ },
    onExit: (entity) => { /* al salir del estado */ },
    onComplete: (entity) => { /* cuando la animación termina (solo no-loop) */ },
});
```

#### Propiedades

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `name` | `string` | Nombre del estado |
| `frames` | `Array<Canvas>` | Texturas de cada frame |
| `currentFrame` | `number` | Frame actual |
| `progress` | `number` | Progreso 0–1 |
| `completed` | `boolean` | ¿Animación terminó? (no-loop) |
| `loop` | `boolean` | ¿Reproduce en bucle? |

#### Métodos

| Método | Descripción |
|--------|-------------|
| `update(dt)` | Avanza la animación |
| `getTexture()` | Canvas del frame actual |
| `reset()` | Reinicia al frame 0 |

### SpriteStateMachine

Máquina de estados completa con transiciones automáticas.

```javascript
const fsm = new SpriteStateMachine(
    owner,           // Entidad dueña (proyectil, enemigo, etc.)
    {                // Mapa de estados
        idle:  { frames: idleFrames,  loop: true },
        walk:  { frames: walkFrames,  loop: true },
        atk:   { frames: atkFrames,   loop: false, nextState: 'idle' },
        hit:   { frames: hitFrames,   loop: false, nextState: 'dead',
                 onComplete: (e) => spawnParticles(e) },
        dead:  { frames: [vacio],     loop: false },
    },
    'idle'           // Estado inicial
);

// En el game loop:
update(dt) {
    fsm.update(dt);
    const tex = fsm.getTexture();
    if (tex) ctx.drawImage(tex, x, y);
}

// Cambiar estado manualmente:
fsm.setState('hit');
```

#### Métodos

| Método | Descripción |
|--------|-------------|
| `addState(name, config)` | Agrega o reemplaza un estado |
| `setState(name)` | Transiciona al estado (dispara onExit → onEnter) |
| `update(dt)` | Actualiza el estado actual + auto-transición si `nextState` |
| `getTexture()` | Textura del frame actual |

#### Propiedades

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `currentStateName` | `string` | Estado activo |
| `prevStateName` | `string` | Estado anterior |
| `stateTime` | `number` | Segundos en el estado actual |
| `progress` | `number` | Progreso del estado actual (0–1) |
| `completed` | `boolean` | ¿El estado actual terminó? |

### Ejemplo: Proyectil con explosión

```javascript
class Projectil {
    constructor() {
        this.fsm = new SpriteStateMachine(this, {
            fly:  { frames: flechaFrames, loop: true },
            hit:  { frames: explosionFrames, loop: false, nextState: 'done' },
            done: { frames: [canvasVacio], loop: false },
        });
        this.fsm.setState('fly');
    }
    update(dt) {
        if (this.fsm.currentStateName === 'fly') {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }
        this.fsm.update(dt);
        if (this.fsm.currentStateName === 'done') {
            mundo.remover(this);
        }
    }
    render(ctx) {
        const tex = this.fsm.getTexture();
        if (tex) ctx.drawImage(tex, this.x, this.y);
    }
}
```