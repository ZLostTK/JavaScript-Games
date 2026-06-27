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
PIXIEngine.toGame(x, y)
PIXIEngine.addChild(child)
PIXIEngine.removeChild(child)
```

### `LittleEngine` (LittleJS)
```javascript
LittleEngine.init(containerId, { width, height, tileSize, padding, images })
LittleEngine.start(game)
LittleEngine.stop()
LittleEngine.toGame(x, y)
```

---

## [RenderBridge](GAME_ARCHITECTURE.md) — puente entre motores

```javascript
RenderBridge.setActive(engine)   // llamado automáticamente por cada motor
RenderBridge.active()
RenderBridge.type()              // 'canvas' | 'pixi' | 'little'
RenderBridge.W | RenderBridge.H
RenderBridge.toGame(x, y)
RenderBridge.ctx                 // solo Engine (Canvas 2D)
RenderBridge.canvas
RenderBridge.bindInput()
```

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
manager.createAnimationAs(group, animationName, options) // hereda speed/loop/onComplete de la definición
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

## Utilidades compartidas de juegos

Ver [GAME_ARCHITECTURE.md](GAME_ARCHITECTURE.md) para la guía completa.

### `Theme`
```javascript
Theme.colors.bg | .accent | .accent2 | .success | .warning | .muted | .text
Theme.font.mono | .ui
```

### `UICanvas`
```javascript
UICanvas.drawButton(ctx, label, x, y, w, h, accent, hover, disabled?)
UICanvas.hitTest(gx, gy, btn)
UICanvas.hitFirst(gx, gy, buttons)
UICanvas.getPointer()
UICanvas.layoutButtons(count, opts)
```

### `OnlineLobby`
```javascript
OnlineLobby.onCancel(cb)
OnlineLobby.show() | .hide() | .isVisible()
OnlineLobby.setStatus(msg) | .setTitle(msg)
OnlineLobby.host({ onConnected, onData, onDisconnect, onError })
OnlineLobby.prepareJoin({ onConnected, onData, onDisconnect, onError })
OnlineLobby.cancel()
```

### `MobileControls`
```javascript
MobileControls.bind(game, { 'btn-up': 'btnUp', ... })
```

### `GameBoot`
```javascript
GameBoot.start(game, { renderer, canvasId, containerId, width, height, bg, engine, beforeStart })
GameBoot.startCanvas(game, opts)   // Engine (Canvas 2D)
GameBoot.startPIXI(game, opts)
GameBoot.startLittle(game, opts)   // LittleJS
GameBoot.startDOM(game, opts)
// renderer: 'canvas' (default) | 'pixi' | 'little'
```