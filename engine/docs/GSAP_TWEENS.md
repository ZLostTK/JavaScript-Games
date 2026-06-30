# GSAP — Animaciones y Tweens de UI

Librería de animación de alto rendimiento para propiedades de objetos, DOM, canvas y más.

**Librería:** `engine/gsap.min.js` — [GSAP](https://gsap.com/)

## Carga

```html
<script src="../../engine/gsap.min.js"></script>
<script type="module" src="./main.js"></script>
```

## Componente ECS: `Tween`

```javascript
import { Tween } from '../../src/components/Tween.js';

const id = world.createEntity();
world.addComponent(id, Tween, {
  target: myObject,
  duration: 0.5,
  props: { x: 200, opacity: 0.5 },
  ease: 'power2.out',
  yoyo: true,
  repeat: 1,
});
```

### Propiedades

| Campo | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `target` | `object` | auto (Transform) | Objeto a animar |
| `duration` | `number` | `0.5` | Duración en segundos |
| `props` | `object` | `{}` | Propiedades a animar |
| `ease` | `string` | `'power2.out'` | Función de easing |
| `delay` | `number` | `0` | Retraso antes de iniciar |
| `yoyo` | `boolean` | `false` | Rebote ida y vuelta |
| `repeat` | `number` | `0` | Repeticiones (-1 = infinito) |
| `paused` | `boolean` | `false` | Pausado al crear |

## Sistema ECS: `TweenSystem`

```javascript
import { TweenSystem } from '../../src/systems/TweenSystem.js';

const tweens = new TweenSystem(world);
world.addSystem(tweens);

// Matar un tween
tweens.kill(entityId);
```

### Comportamiento

- Cuando se añade un `Tween` a una entidad, el sistema crea automáticamente un `gsap.to()` en el siguiente frame.
- Si no se especifica `target`, se usa el `Transform` de la entidad.
- `onComplete` se llama al terminar la animación.
- `kill()` detiene y limpia el tween asociado.

## Uso sin ECS

```javascript
gsap.to('.my-class', { x: 100, duration: 1, ease: 'back.out(1.7)' });
gsap.fromTo(element, { opacity: 0 }, { opacity: 1, duration: 0.3 });
gsap.timeline()
  .to(el, { x: 100 })
  .to(el, { y: 50 });
```
