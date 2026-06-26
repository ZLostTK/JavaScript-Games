# Referencia API

Esta página sirve como índice general para todas las llamadas del sistema. Para entender **por qué**, **cuándo** y **cómo** usar cada una, haz clic en el enlace de la documentación completa de su respectivo módulo.

## [Motores Core](CORE_ENGINES.md)

### `Engine` (Canvas)
```javascript
Engine.init(canvasId, { width, height, scaleMode, bg })
Engine.start(game)
Engine.stop()
Engine.toGame(x, y)
Engine.rect(x, y, w, h, color)
Engine.circle(x, y, r, color)
Engine.text(txt, x, y, color, size, align)
```

### `DOMEngine` (HTML/CSS)
```javascript
DOMEngine.init(containerId, { fps })
DOMEngine.start(game)
DOMEngine.stop()
DOMEngine.resume()
DOMEngine.render()
DOMEngine.el(id)
DOMEngine.create(tag, cls, parent)
DOMEngine.clear(el)
DOMEngine.setText(el, text)
DOMEngine.setStyle(el, styles)
DOMEngine.on(target, event, handler, opts)
DOMEngine.createGrid(parent, rows, cols, onClick, onCtx)
```

### `PIXIEngine` (WebGL)
```javascript
PIXIEngine.init(containerId, { width, height, bg })
PIXIEngine.start(game)
PIXIEngine.stop()
PIXIEngine.addChild(child)
PIXIEngine.removeChild(child)
```

---

## [Input](INPUT.md)
```javascript
Input.init(canvasElement)
Input.isDown(key)
Input.isPressed(key)
Input.isReleased(key)
Input.getMouse()
Input.isMousePressed()
Input.getTouch(index)
Input.getTouchCount()
Input.isTouchStarted()
Input.endFrame() // IMPORTANTE: Llamar por frame
```

---

## [Audio](AUDIO.md)
```javascript
Audio.init()
Audio.resume()
Audio.load(name, url)
Audio.play(name, volume, loop)
Audio.synth({ type, freq, duration, volume })
Audio.toggleMute()
```

---

## [Online](ONLINE.md)
```javascript
Online.on(eventString, callbackFunction) // 'onHostReady', 'onConnected', 'onData', etc.
Online.host(onRoomCreated)
Online.join(roomCode)
Online.send(data, connectionId)
Online.sendToAll(data)
Online.destroy()
```

---

## [Sprites y Animaciones](SPRITES.md)

### `SpriteManager`
```javascript
const manager = new SpriteManager(EngineClass, engineType)
manager.load(imagePath, spriteData, options)
manager.getSprite(group, name)
manager.getAnimation(group, animationName)
manager.createAnimationAs(group, animationName, options)
manager.createAnimatedDOM(group, animationName, options)
```

### `SpriteProcessor` (Estático)
```javascript
SpriteProcessor.loadSpriteSheet(path, data, opts)
SpriteProcessor.processGrid(path, opts)
SpriteProcessor.createAnimation(sprites, frames, opts)
SpriteProcessor.toPIXI(sprite)
SpriteProcessor.toCanvas(sprite)
SpriteProcessor.toDOM(sprite)
```