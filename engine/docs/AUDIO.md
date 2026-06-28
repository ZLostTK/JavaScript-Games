# Sistema de Audio

El módulo `Audio` envuelve la potente `Web Audio API` del navegador para ofrecer un manejo sencillo de efectos de sonido, música de fondo, y síntesis procedural de sonido (creación de sonidos mediante código sin usar archivos).

## ¿Para qué sirve?
Para cargar y reproducir recursos de audio MP3, WAV, OGG, etc., con control de volumen y loops. También permite generar pitidos y sonidos retro al vuelo sin cargar archivos pesados.

## ¿Cuándo utilizarlo?
Siempre que tu juego necesite feedback sonoro. Funciona con **Engine, PIXIEngine, LittleEngine y DOMEngine** — no depende del renderizador. Cada motor llama `Audio.init()` en su `init()`.

---

## Inicialización

El contexto de audio debe ser inicializado, idealmente después de que la página haya cargado o como respuesta al primer clic del usuario (políticas del navegador).

```javascript
Audio.init();
```

---

## Carga y Reproducción de Archivos

### Métodos

- **`Audio.load(name, url) -> Promise`**
  Carga un archivo de audio y lo asocia a un nombre en caché. Como es asíncrono, debes usar `await` o un `.then()`.
- **`Audio.play(name, vol = 1, loop = false) -> { source, gain }`**
  Reproduce un audio previamente cargado. 
  - `name`: Nombre asignado en `.load()`.
  - `vol`: Volumen (0 a 1).
  - `loop`: `true` si es música de fondo que debe repetirse.
  Devuelve el nodo fuente y el nodo de ganancia por si necesitas manipularlos directamente (ej. para detenerlos después).

### Ejemplo
```javascript
async function initGame() {
    Audio.init();
    
    // Cargar los recursos
    await Audio.load('explosion', 'assets/audio/boom.wav');
    await Audio.load('bgm', 'assets/audio/music.mp3');
    
    // Reproducir música en bucle al 50% de volumen
    Audio.play('bgm', 0.5, true);
}

// Más tarde en el update
function onPlayerHit() {
    Audio.play('explosion', 0.8);
}
```

---

## Síntesis Procedural (Retro/Arcade)

Perfecto para game jams o juegos de estilo retro donde no quieres incluir archivos externos pesados.

### Métodos

- **`Audio.synth(name, type = 'sine', freq = 440, duration = 0.1, volume = 0.3, slideFreq = null)`**
  Genera una onda y la **guarda en caché** bajo `name` para reproducirla después con `Audio.play()`. No suena al definirla.
  - `name` (string): Identificador usado luego en `Audio.play(name)`.
  - `type` (string): `'sine'` (suave), `'square'` (estridente/8-bits), `'saw'` (sierra, metálico), `'noise'` (ruido blanco, útil para explosiones). Cualquier otro valor produce una onda senoidal.
  - `freq` (number): Frecuencia en Hercios. (ej. 440 es un La central).
  - `duration` (number): Duración en segundos (ej. 0.1).
  - `volume` (number): Volumen de 0 a 1.
  - `slideFreq` (number|null): Frecuencia final para un deslizamiento de tono (ej. 880 → 1760 en un "win").

- **`Audio.synth({ type, freq, duration, volume, slideFreq })`**
  Variante con objeto que **reproduce el sonido al instante** (one-shot), sin guardarlo en caché. Útil para eventos puntuales sin nombre.

### Ejemplos Comunes
```javascript
// Definir sonidos al iniciar el juego
Audio.synth('jump', 'sine', 600, 0.15, 0.5);
Audio.synth('coin', 'square', 1200, 0.1);
Audio.synth('win',  'sine', 523, 0.55, 0.22, 880);  // slide de tono

// Reproducir cuando ocurra el evento
Audio.play('jump');
Audio.play('coin', 0.8);

// One-shot inmediato (sin nombre)
Audio.synth({ type: 'noise', freq: 80, duration: 0.35, volume: 0.4 });
```

---

## Controles Globales

- **`Audio.resume()`**
  Intenta reanudar el contexto de audio. Los navegadores pausan el audio hasta que el usuario interactúa (ej. hace clic). Si ves que el audio no suena, puedes llamar a esto tras un click.
- **`Audio.toggleMute() -> boolean`**
  Silencia o restaura todo el audio del motor. Devuelve `true` si quedó en silencio, `false` si tiene sonido. Útil para un botón de "Mute" en la UI.
