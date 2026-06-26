# Motor de Juegos JavaScript - Documentación Oficial

Una biblioteca modular diseñada para crear juegos 2D en la web. Su principal fortaleza es ser **agnóstica al motor de renderizado**, permitiéndote escribir la lógica de tu juego una sola vez y renderizarla utilizando Canvas 2D nativo, DOM/CSS, o WebGL (a través de PIXI.js), dependiendo de las necesidades de tu proyecto.

## Índice de Contenidos

1. [Conceptos Básicos y Arquitectura](#arquitectura-y-conceptos-básicos)
2. [Estructura de un Proyecto](#estructura-de-un-proyecto)
3. **Módulos Principales:**
   - [Motores Core (Canvas, DOM, PIXI)](CORE_ENGINES.md)
   - [Sistema de Input (Teclado, Mouse, Táctil)](INPUT.md)
   - [Sistema de Audio (Sonidos, Música, Síntesis)](AUDIO.md)
   - [Sistema Online (Multijugador P2P)](ONLINE.md)
   - [Gestión de Sprites y Animaciones](SPRITES.md)
4. [Referencia Rápida API](API.md)

---

## Arquitectura y Conceptos Básicos

El motor está diseñado en base a **Sistemas Desacoplados**. Esto significa que el Input no sabe cómo funciona el Renderizado, y el Audio no sabe sobre los Sprites. Tu código de juego actúa como el puente que los une.

Todo juego debe declarar un **Game Object** (Objeto de Juego) que cumpla con este contrato:

```javascript
const myGame = {
    // 1. Setup inicial. Se llama una vez.
    init() { 
        this.x = 0;
    },
    
    // 2. Lógica del juego. Se llama frame a frame.
    // 'dt' es el delta time (tiempo transcurrido desde el último frame en segundos).
    update(dt) { 
        this.x += 100 * dt; // Mueve 100 píxeles por segundo
    },
    
    // 3. Renderizado (Opcional, depende del Engine).
    render(ctx) { 
        // Solo necesario si usas Engine (Canvas puro) o DOMEngine de forma manual.
    }
};
```

Luego, le pasas este objeto al motor de tu elección:
```javascript
Engine.start(myGame); 
// o PIXIEngine.start(myGame);
// o DOMEngine.start(myGame);
```

---

## Estructura de un Proyecto

Un juego típico usando este motor necesita un archivo HTML básico y scripts para la lógica. No requiere empaquetadores (bundlers) complejos como Webpack, a menos que lo desees.

### index.html
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Mi Gran Juego</title>
    <!-- Estilos base para centrar el juego -->
    <style>
        body { background: #111; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        canvas, #game-container { border: 2px solid #333; }
    </style>
</head>
<body>
    <!-- Contenedor o Canvas -->
    <canvas id="game-canvas"></canvas>

    <!-- Importar los módulos del Engine -->
    <script src="engine/engine.js"></script>
    <script src="engine/input.js"></script>
    <script src="engine/audio.js"></script>
    
    <!-- Lógica de tu juego -->
    <script src="game.js"></script>
</body>
</html>
```

### game.js
```javascript
const game = {
    init() {
        // Inicializa los subsistemas necesarios
        Input.init(document.getElementById('game-canvas'));
        
        // Estado del jugador
        this.player = { x: 100, y: 100, speed: 200 };
    },
    
    update(dt) {
        // Terminar el frame de Input siempre al final (o principio) del update
        if (Input.isDown('ArrowRight')) this.player.x += this.player.speed * dt;
        if (Input.isDown('ArrowLeft')) this.player.x -= this.player.speed * dt;
        if (Input.isDown('ArrowUp')) this.player.y -= this.player.speed * dt;
        if (Input.isDown('ArrowDown')) this.player.y += this.player.speed * dt;
        
        // Sonido de salto al presionar espacio
        if (Input.isPressed('Space')) {
            Audio.synth({ type: 'square', freq: 440, duration: 0.1 });
        }
        
        Input.endFrame(); // ¡Crítico para resetear isPressed/isReleased!
    },
    
    render(ctx) {
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, 800, 600); // Fondo
        
        ctx.fillStyle = 'lime';
        ctx.fillRect(this.player.x, this.player.y, 32, 32); // Jugador
    }
};

window.onload = () => {
    // Iniciar audio requiere una interacción del usuario, lo ideal es
    // hacerlo en el primer clic o usando un botón de 'Start Game'.
    document.addEventListener('click', () => Audio.init(), { once: true });
    
    // Configurar e iniciar motor
    Engine.init('game-canvas', { width: 800, height: 600 });
    Engine.start(game);
};
```

---

## ¿Siguiente Paso?

Dependiendo del tipo de juego que vayas a construir, lee la documentación sobre **[Motores Core](CORE_ENGINES.md)** para elegir el renderizador correcto, o aprende a cargar recursos en **[Sprites y Animaciones](SPRITES.md)**.