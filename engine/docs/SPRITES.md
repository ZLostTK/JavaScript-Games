# Sprites y Animaciones

El engine provee dos clases para manejar gráficos 2D: `SpriteProcessor` (bajo nivel, utilidades estáticas) y `SpriteManager` (alto nivel, orientado a objetos, agrupamiento y gestión). 

El sistema es **agnóstico del motor**, lo que significa que detectará automáticamente si estás usando `PIXIEngine`, `Engine` (Canvas) o `DOMEngine` y convertirá los sprites al formato necesario (`PIXI.Sprite`, un bloque de renderizado en Canvas, o un `HTMLElement`).

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
    { name: 'player_walk1', x: 64, y: 0, width: 32, height: 32 }
];

await manager.load('assets/characters.png', spritesData, {
    name: 'hero',               // Nombre del grupo
    groupByPrefix: true,        // Agrupará automáticamente por prefijos si existieran (ej. 'player_')
    animations: {               // Defines las animaciones de antemano
        idle: { frames: ['player_idle'], speed: 1 },
        walk: { frames: ['player_walk0', 'player_walk1'], speed: 10, loop: true }
    }
});
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
    // Dibujar el frame actual de la animación
    const texture = playerAnim.getTexture();
    ctx.drawImage(texture.image, texture.sx, texture.sy, texture.sw, texture.sh, x, y, w, h);
}
```

### Usar Animaciones (DOMEngine)

Si estás construyendo un juego usando DOMEngine, el manager puede crear un elemento HTML que se anima cambiando el `background-position` mediante CSS.

```javascript
// Crea un div y lo configura con CSS para mostrar la animación
let domElement = manager.createAnimatedDOM('hero', 'walk');

// Lo añades al DOM
document.getElementById('game-container').appendChild(domElement.element);

// En tu loop, debes actualizarlo
update(dt) {
    domElement.update(dt); // Esto cambia el CSS frame a frame
}
```

---

## 2. SpriteProcessor (Avanzado)

Si no necesitas agrupar cosas y solo quieres cortar una imagen rápida o crear una cuadrícula uniforme (como un Tileset para un mapa), usa `SpriteProcessor`.

### Cortar una cuadrícula perfecta (Tilesets)

Útil para mapas de tiles donde todos los cuadros miden lo mismo (ej. 32x32).

```javascript
const tiles = await SpriteProcessor.processGrid('assets/tileset.png', {
    spriteWidth: 32,
    spriteHeight: 32,
    columns: 10,  // Cuántas columnas tiene la imagen
    rows: 10,     // Cuántas filas tiene la imagen
    scale: 2,     // Escalar a 64x64 internamente
    nameGenerator: (col, row) => `tile_${col}_${row}` // Nombrarlos automáticamente
});

// Ahora tienes tiles['tile_0_0'], tiles['tile_0_1'] etc.
```

### Conversión Manual

Si por alguna razón necesitas el formato específico de un motor:

```javascript
// spriteData es un objeto de sprite interno
const myPixiSprite = SpriteProcessor.toPIXI(spriteData);
const myCanvasTex = SpriteProcessor.toCanvas(spriteData);
const myHTMLElement = SpriteProcessor.toDOM(spriteData);
```
