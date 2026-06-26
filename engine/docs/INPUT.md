# Sistema de Input

El módulo `Input` provee un sistema unificado para manejar eventos de teclado, ratón (mouse) y pantalla táctil (touch). Se encarga de rastrear el estado exacto de cada tecla/botón por frame, solucionando problemas comunes del DOM como la repetición automática de teclas o el seguimiento de múltiples dedos simultáneos.

## ¿Para qué sirve?
Centraliza la lógica de controles del usuario para que tu objeto `game` solo necesite hacer preguntas simples por frame, como "¿Está saltando ahora?" o "¿Hizo clic en la pantalla?".

## ¿Cuándo utilizarlo?
Siempre que tu juego requiera interacciones del usuario en tiempo real (moverse con flechas, disparar con espacio, tocar un botón en pantalla táctil).

---

## Inicialización

Debes inicializar el módulo pasándole el elemento HTML (usualmente el canvas) donde se van a capturar los eventos del ratón o táctiles. Si solo necesitas teclado, puedes pasar `null`.

```javascript
// Si usas Engine o PIXIEngine, pásale el canvas.
const canvas = document.getElementById('my-canvas');
Input.init(canvas);
```

**Importante:** En tu game loop principal (usualmente manejado por el motor automáticamente), al finalizar cada frame se debe llamar a `Input.endFrame()` para resetear los estados de "presionado este frame" a falso.

---

## Teclado (Keyboard)

Usa los códigos de tecla de la API moderna de JS (`KeyboardEvent.code`).
*Ejemplos:* `'KeyW'`, `'ArrowUp'`, `'Space'`, `'Enter'`.

### Métodos

- **`Input.isDown(key) -> boolean`**
  ¿Está la tecla mantenida presionada en este momento? (Útil para caminar, acelerar).
- **`Input.isPressed(key) -> boolean`**
  ¿La tecla fue presionada *justo en este frame*? (Útil para saltar, disparar un solo proyectil, abrir un menú; evita que el jugador salte 60 veces por segundo por dejar pulsado el espacio).
- **`Input.isReleased(key) -> boolean`**
  ¿La tecla fue soltada en este frame?

### Ejemplo
```javascript
update(dt) {
    if (Input.isDown('ArrowRight')) {
        player.x += speed * dt; // Se mueve mientras la mantenga
    }
    
    if (Input.isPressed('Space')) {
        player.jump(); // Salta solo una vez al presionar
    }
}
```

---

## Ratón (Mouse)

### Métodos

- **`Input.getMouse() -> { x, y, down, px, py, pdown }`**
  Obtiene el estado actual del ratón.
  - `x, y`: Coordenadas actuales respecto al elemento canvas.
  - `down`: `true` si el botón izquierdo está pulsado.
  - `px, py`: Coordenadas del frame anterior.
  - `pdown`: Estado del botón en el frame anterior.
- **`Input.isMousePressed() -> boolean`**
  ¿Se hizo clic *justo en este frame*?

### Ejemplo
```javascript
update(dt) {
    if (Input.isMousePressed()) {
        const mouse = Input.getMouse();
        spawnBullet(mouse.x, mouse.y);
    }
}
```

---

## Pantalla Táctil (Touch)

Soporta multitouch, permitiendo leer la posición independiente de cada dedo en la pantalla.

### Métodos

- **`Input.getTouchCount() -> number`**
  Cantidad de toques (dedos) activos actualmente en la pantalla.
- **`Input.getTouch(index) -> { id, x, y }`**
  Obtiene la información de un toque específico (0 para el primero, 1 para el segundo, etc.).
- **`Input.isTouchStarted() -> boolean`**
  ¿Se inició un nuevo toque en cualquier lugar de la pantalla en este frame? Útil como alternativa a `isMousePressed()` en móviles.

### Ejemplo
```javascript
update(dt) {
    // Si tocan la pantalla, ir a la posición del primer dedo
    if (Input.getTouchCount() > 0) {
        const touch = Input.getTouch(0);
        player.targetX = touch.x;
        player.targetY = touch.y;
    }
}
```
