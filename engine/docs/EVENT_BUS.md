# EventBus — Sistema Central de Eventos

Pub/sub desacoplado para comunicación entre módulos del motor (`Input`, `Audio`, `Online`, `AnimationSystem`) y la lógica de juegos.

**Código fuente:** `src/core/EventBus.js`, `src/core/Events.js`

---

## ¿Para qué sirve?

Evitar acoplamiento directo entre subsistemas. En lugar de que un juego llame `Audio.play()` en cada acción, puede emitir `Events.AUDIO_PLAY` y dejar que `Audio` reaccione de forma centralizada.

## API

```javascript
import { EventBus, Events } from '../../src/index.js';

// Suscribirse
const unsub = EventBus.on(Events.INPUT_KEY_PRESSED, ({ code }) => {
  if (code === 'Space') jump();
});

// Una sola vez
EventBus.once(Events.ONLINE_CONNECTED, ({ role }) => startGame(role));

// Emitir
EventBus.emit(Events.AUDIO_PLAY, { name: 'score', vol: 0.8 });

// Desuscribirse
EventBus.off(Events.INPUT_KEY_PRESSED, handler);
unsub(); // también válido — on() devuelve función de cleanup
```

## Constantes de eventos (`Events`)

| Constante | Emitido por | Escuchado por |
|-----------|-------------|---------------|
| `INPUT_KEY_DOWN` | Input | Juegos / sistemas |
| `INPUT_KEY_PRESSED` | Input | Juegos |
| `INPUT_KEY_UP` | Input | Juegos |
| `AUDIO_PLAY` | Juegos | Audio |
| `AUDIO_SYNTH` | Juegos | Audio |
| `AUDIO_MUTE_TOGGLE` | UI | Audio |
| `ONLINE_HOST_READY` | Online | Lobby / juego |
| `ONLINE_CONNECTED` | Online | Lobby / juego |
| `ONLINE_DATA` | Online | Juego |
| `ONLINE_DISCONNECT` | Online | Juego |
| `ONLINE_ERROR` | Online | Juego |
| `ECS_COLLISION` | PhysicsSystem | Juego |
| `ECS_WALL_BOUNCE` | PhysicsSystem | Juego |
| `ANIMATION_REGISTER` | Juego | AnimationSystem |
| `ANIMATION_SET_STATE` | Juego | AnimationSystem |
| `ANIMATION_UNREGISTER` | Juego | AnimationSystem |

## Retrocompatibilidad

`Online.on('onData', cb)` sigue funcionando: internamente registra el callback en el EventBus con el evento mapeado `ONLINE_DATA`.

`Input.isDown()` / `isPressed()` permanecen disponibles para juegos no migrados.

## Piloto migrado

- **Snake** — input por teclado y audio vía EventBus
- **Arkanoid** — input, audio, colisiones ECS vía EventBus

---

Ver también: [ECS](ECS.md) · [Arquitectura moderna](MODERN_STACK.md) · [API](API.md)
