# JavaScript Games - Arcade Collection

<div align="center">
<img src="./icon.svg" width="200" alt="JS Games Icon">
</div>

A collection of classic arcade games built with vanilla JavaScript, featuring a shared game engine, unified input system, procedurally generated audio, and PWA support for installability.

## Games

<!-- GAMES_START -->

- **[Ahorcado](./games/hangman/)** - Guess the secret word - Random and 1v1 modes
- **[Arkanoid](./games/arkanoid/)** - Break bricks with paddle and ball
- **[Busca Minas](./games/minesweeper/)** - Find the bombs using logic and arrays
- **[Conecta 4](./games/connect4/)** - Connect 4 chips in a row before the AI
- **[Domino](./games/domino/)** - 4-player online dominoes game
- **[Efecto Mariposa](./games/butterfly-effect/)** - Chaotic visualization of the Lorenz Attractor
- **[Flappy Bird](./games/flappybird/)** - Fly between pipes without crashing
- **[Fuera Luces!](./games/lightsout/)** - Turn off all the lights in the fewest possible pulses
- **[Gato - Ateti](./games/tictactoe/)** - Classic 3-in-a-row against AI
- **[Othello - Reversi](./games/othello/)** - Classic strategy board game for two players
- **[Pac-Man](./games/pacman/)** - Classic maze chase - eat dots and avoid ghosts
- **[Snake Game](./games/snake/)** - Grow the snake by eating food
- **[Space Invaders](./games/spaceinvaders/)** - Defend Earth from alien invaders
- **[Sudoku](./games/sudoku/)** - Solve the sudoku puzzle
- **[Typing Speed](./games/typingspeed/)** - Test your typing speed - ES / EN word pools
- **[Void Sector](./games/voidsector/)** - Space combat game with online multiplayer
- **[Word Scramble](./games/wordscramble/)** - Unscramble the letters - ES / EN

<!-- GAMES_END -->

## Features

- **Multi-Engine Rendering** - Three renderers: **Engine** (Canvas 2D), **PIXIEngine** (WebGL via PIXI.js), **LittleEngine** (LittleJS), plus **DOMEngine** for HTML/CSS games. All connected via `RenderBridge` for agnostic shared utilities.
- **Matter.js Physics** - `MatterPhysicsSystem` con `PhysicsBody` component para simulación física 2D (gravedad, colisiones, fuerzas).
- **Pathfinding** - `PathfindingSystem` con `PathAgent` component para rutas A* en grids.
- **Advanced Audio** - `Howler.js` para audio sprites, fade multi-pista y multi-formato.
- **UI Animations** - `GSAP` para tweens de alto rendimiento con `Tween` component ECS.
- **Roguelike Dungeon** - `ROT.js` para generación procedural de mazmorras y FOV.
- **RenderBridge** - Agnostic bridge so shared modules (`UICanvas`, `GameBoot`, `SpriteProcessor`) work with any engine without coupling.
- **Sprites & Animations** - `SpriteProcessor` cuts tilesets, `SpriteManager` groups sprites by character, `EntityComposer` builds layered entities, and `SpriteStateMachine` handles animation states. Debug grid (`Alt+D`) for preview.
- **Unified Input** - `Input` class normalises keyboard, mouse, and multi-touch events into a single API with gesture detection (swipe) and just-pressed/released semantics.
- **Procedural Audio** - `Audio` class synthesises sounds at runtime (square, sine, saw, noise waves with envelope shaping); no external audio files required.
- **Online Multiplayer (P2P)** - `Online` module wraps PeerJS (WebRTC) for P2P multiplayer. `OnlineLobby` provides a shared DOM overlay for room creation/join with lobby list and code clipboard.
- **Canvas UI Helpers** - `UICanvas` provides `drawButton()`, `hitTest()`, `getPointer()`, and `layoutButtons()` for canvas-based menus, compatible with all engines.
- **Theme System** - `Theme` object provides a shared color palette (`bg`, `accent`, `success`, etc.) and font families (`mono`, `ui`) used by all games.
- **Game Shell CSS** - `game-shell.css` provides base reset, safe-area-aware layout, back button, online lobby overlay UI, and mobile D-pad controls.
- **Mobile Controls** - `MobileControls` binds on-screen D-pad buttons to game properties, auto-shown on touch devices.
- **GameBoot** - Unified boot sequence: `GameBoot.start()` auto-detects the renderer. Also exposes `startCanvas()`, `startPIXI()`, `startLittle()`, `startDOM()`.
- **Hub Page** - Minimalist game grid reads `games.json` and auto-renders game cards with thumbnails, descriptions, and a Play button; fully responsive (auto-fill grid, 1 col on mobile).
- **Auto-Discovery** - `scripts/scan-games.js` scans the `games/` directory and updates `games.json` automatically. This runs via a GitHub Workflow on every push.
- **PWA (Hybrid Cache)** - Service worker (`sw.js`, cache `js-games-v4`) with hybrid strategy: **Network-First** for code (`/games/*`, HTML/JS/CSS) and **Cache-First** for images. Engine code is bundled by Vite into `dist/assets/`. Each game can be downloaded individually from the hub; `scan-games.js` detects engine dependencies from `index.html`. Auto-migrates from v1/v2/v3 caches. See [engine/docs/OFFLINE.md](./engine/docs/OFFLINE.md).
- **Dark Mode** - Full dark theme (`#0f0f1a` background) with a consistent red/purple accent palette across the hub and all games.
- **AI Opponent** - Tic Tac Toe features an AI that plays optimally; Connect 4 has AI opponent; Arkanoid and Snake are single-player with progressive difficulty.

## Adding a New Game

1. Create a new folder under `games/` with `index.html`, `style.css`, and `script.js`.
2. Use the shared engine via `<script>` tags (order matters):

   **Modern (ESM modules with Vite):**
   ```html
   <script type="module" src="./main.js"></script>
   ```

   Inside `main.js`, import from `src/`:
   ```js
   import '../../src/boot/canvas-mobile.js'; // or canvas.js, dom.js, canvas-online.js
   import { GameBoot } from '../../src/core/GameBoot.js';
   import { game } from './script.js';

   GameBoot.start(game, { canvasId: 'game', width: 800, height: 600 });
   ```

   **Librerías externas opcionales — cargar vía `<script>` antes del module:**
   ```html
   <script src="../../engine/pixi.min.js"></script>       <!-- PIXI.js (WebGL) -->
   <script src="../../engine/littlejs.min.js"></script>    <!-- LittleJS -->
   <script src="../../engine/matter.min.js"></script>      <!-- Matter.js (física) -->
   <script src="../../engine/howler.min.js"></script>      <!-- Howler.js (audio) -->
   <script src="../../engine/pathfinding-browser.min.js"></script>  <!-- Pathfinding -->
   <script src="../../engine/gsap.min.js"></script>        <!-- GSAP (tweens) -->
   <script src="../../engine/rot.min.js"></script>         <!-- ROT.js (dungeon) -->
   ```
   Los adapters y componentes ECS se importan desde `src/`.

   **Boot shims disponibles en `src/boot/`:**

   | Shim | Instala en globalThis |
   |------|-----------------------|
   | `canvas.js` | Engine, Input, Audio, EventBus, GameBoot, UI |
   | `canvas-mobile.js` | canvas + MobileControls |
   | `canvas-online.js` | canvas + Online, OnlineLobby |
   | `pixi.js` | canvas + PIXIEngine |
   | `little.js` | canvas + LittleEngine |
   | `dom.js` | DOMEngine, EventBus, AnimationSystem |
   | `dom-online.js` | dom + Online |

   Also include `game-shell.css` for base styles:
   ```html
   <link rel="stylesheet" href="../../engine/game-shell.css">
   ```

   For the full architecture see the [engine docs](engine/docs/README.md).

3. Push your changes. A GitHub Actions workflow will automatically run `scripts/scan-games.js` to update `games.json` and deploy it to GitHub Pages. You can also run it locally via `node scripts/scan-games.js`.

Each game directory is self-contained and can be opened independently - the engine is loaded via relative paths.

## Setup

```bash
npx serve .
# or
python3 -m http.server 8000
```

Open `http://localhost:8000` in your browser. The hub lists all registered games; click any card to play.

## Structure

```
├── engine/                        # Shared styles, CDN libs & docs
│   ├── game-shell.css             # Base reset, online lobby UI, D-pad styles
│   ├── pixi.min.js                # PIXI.js library (WebGL)
│   ├── littlejs.min.js            # LittleJS library
│   ├── matter.min.js              # Matter.js (física 2D)
│   ├── howler.min.js              # Howler.js (audio avanzado)
│   ├── pathfinding-browser.min.js # Pathfinding.js (rutas NPC)
│   ├── gsap.min.js                # GSAP (tweens UI)
│   ├── rot.min.js                 # ROT.js (mazmorras roguelike)
│   ├── sprite-processor.js        # Sprite cutting, engine conversion, debug grid
│   └── docs/                      # Full documentation
├── src/                           # Engine source (ESM modules, Vite build)
│   ├── core/                      # Engine, DOMEngine, PIXIEngine, LittleEngine, GameBoot, EventBus, RenderBridge
│   ├── modules/                   # Input, Audio, Online, MobileControls, UI
│   ├── components/                # Transform, Velocity, Collider, SpriteData
│   ├── systems/                   # Movement, Physics, Render, Animation
│   ├── ecs/                       # World, Component, System (bases)
│   ├── boot/                      # Boot shims (canvas.js, dom.js, …)
│   └── index.js                   # Barrel export
├── games/                         # Individual game directories
│   ├── arkanoid/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Paddle physics, 40 bricks, 3 lives
│   ├── butterfly-effect/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # 3D Lorenz Attractor chaos visualization
│   ├── connect4/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # AI opponent, 7x6 grid, online MP
│   ├── domino/
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── words.js
│   │   └── script.js              # 4-player online dominoes (DOM engine)
│   ├── flappybird/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Physics-based pipe dodging
│   ├── hangman/
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── words.js               # Word pools
│   │   ├── images/                # SVG hangman states & GIFs
│   │   └── script.js              # 1v1 online & random modes (DOM engine)
│   ├── lightsout/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Puzzle solver
│   ├── minesweeper/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Grid-based bomb logic
│   ├── othello/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # 2-player strategy board game
│   ├── pacman/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Classic maze chase
│   ├── snake/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Grid movement, swipe, wall wrap
│   ├── spaceinvaders/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Alien shooter
│   ├── sudoku/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Number puzzle
│   ├── tictactoe/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Classic 3-in-a-row against AI
│   ├── typingspeed/
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── words.js               # ES / EN word pools
│   │   └── script.js              # WPM typing test (DOM engine)
│   ├── voidsector/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Space combat game
│   └── wordscramble/
│       ├── index.html
│       ├── style.css
│       ├── words.js               # ES / EN scrambled words
│       └── script.js              # Timed word unscramble (DOM engine)
├── public/                        # Copied to dist/ as-is (Vite)
│   ├── engine/
│   │   └── game-shell.css
│   ├── games.json                 # Game manifest
│   ├── icon.svg                   # PWA icon
│   ├── manifest.json              # PWA manifest
│   ├── style.css                  # Hub styles (responsive grid, dark theme)
│   └── sw.js                      # Service worker (js-games-v4, hybrid cache)
├── assets/                        # Game assets (thumbnails, sprites, audio)
├── scripts/
│   └── scan-games.js              # Auto-generate games.json from filesystem
├── index.html                     # Hub - minimal landing page (Vite entry)
├── main.js                        # Hub logic - fetches games.json, renders cards
```

## Tech Stack

| Layer | Tech |
|---|---|---|
| Runtime | Vanilla JS (no frameworks, no bundler) |
| Rendering | Canvas 2D (`Engine`), WebGL/PIXI.js (`PIXIEngine`), LittleJS (`LittleEngine`), DOM/CSS (`DOMEngine`) |
| Physics | Matter.js (`MatterPhysicsSystem` + `PhysicsBody`) |
| Input | Keyboard (`keydown/keyup`), Mouse, Touch (`touchstart/touchend/touchmove`) |
| Audio | Web Audio API / Howler.js (`Audio`, `Howl`) |
| Multiplayer | PeerJS / WebRTC (`Online` + `OnlineLobby`) |
| Pathfinding | Pathfinding.js (`PathfindingSystem` + `PathAgent`) |
| Animations | GSAP (`TweenSystem` + `Tween`) |
| Roguelike | ROT.js (dungeon gen, FOV, RNG) |
| Sprites | SpriteProcessor, SpriteManager, EntityComposer, SpriteStateMachine |
| PWA | Service Worker + Web App Manifest |

---

*A collection of classic arcade games built with vanilla JavaScript.*
