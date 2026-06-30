# Howler.js — Audio Avanzado

Reproductor de audio con soporte multi-canal, sprites de audio, fade, loop y control de volumen por pista.

**Librería:** `engine/howler.min.js` — [Howler.js](https://howlerjs.com/)

## Carga

```html
<script src="../../engine/howler.min.js"></script>
<script type="module" src="./main.js"></script>
```

## Uso básico

```javascript
const sound = new Howl({
  src: ['assets/sounds/explosion.mp3', 'assets/sounds/explosion.ogg'],
  volume: 0.5,
  loop: false,
});

sound.play();

// Con fade
sound.fade(0, 1, 500);  // fade in 500ms
```

## Audio Sprites

Un solo archivo con múltiples segmentos:

```javascript
const sprite = new Howl({
  src: ['assets/sounds/sprites.webm'],
  sprite: {
    shoot: [0, 300],
    explosion: [300, 700],
    powerup: [1000, 400],
  },
});

sprite.play('shoot');
```

## Control global

```javascript
Howler.volume(0.5);     // volumen global
Howler.mute(true);       // silenciar todo
```

## Comparación con `Audio` nativo

| Característica | `Audio` (Web Audio) | `Howl` (Howler.js) |
|---------------|---------------------|-------------------|
| Síntesis procedural | ✓ | ✗ |
| Archivos externos | ✓ | ✓ |
| Audio sprites | ✗ | ✓ |
| Fade por pista | ✗ | ✓ |
| Multi-formato | manual | automático |
| Caché | por nombre | automática |
