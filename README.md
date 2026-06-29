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
- **PWA (Hybrid Cache)** - Service worker (`sw.js`, cache `js-games-v3`) with hybrid strategy: **Network-First** for code (`/engine/*`, `/games/*`, HTML/JS/CSS) and **Cache-First** for images. Each game can be downloaded individually from the hub; `scan-games.js` detects engine dependencies from `index.html`. Auto-migrates from v1/v2 caches. See [engine/docs/OFFLINE.md](./engine/docs/OFFLINE.md).
- **Dark Mode** - Full dark theme (`#0f0f1a` background) with a consistent red/purple accent palette across the hub and all games.
- **AI Opponent** - Tic Tac Toe features an AI that plays optimally; Connect 4 has AI opponent; Arkanoid and Snake are single-player with progressive difficulty.

## Adding a New Game

1. Create a new folder under `games/` with `index.html`, `style.css`, and `script.js`.
2. Use the shared engine via `<script>` tags (order matters):

   **Canvas games (Engine):**
   ```html
   <script src="../../engine/theme.js"></script>
   <script src="../../engine/render-bridge.js"></script>
   <script src="../../engine/input.js"></script>
   <script src="../../engine/audio.js"></script>
   <script src="../../engine/engine.js"></script>
   <script src="../../engine/ui-canvas.js"></script>
   <script src="../../engine/game-boot.js"></script>
   ```

   **PIXI.js games (WebGL):**
   ```html
   <script src="../../engine/theme.js"></script>
   <script src="../../engine/render-bridge.js"></script>
   <script src="../../engine/input.js"></script>
   <script src="../../engine/audio.js"></script>
   <script src="../../engine/pixi.min.js"></script>
   <script src="../../engine/pixi-engine.js"></script>
   <script src="../../engine/game-boot.js"></script>
   ```

   **DOM games (HTML/CSS, no canvas):**
   ```html
   <script src="../../engine/theme.js"></script>
   <script src="../../engine/render-bridge.js"></script>
   <script src="../../engine/input.js"></script>
   <script src="../../engine/audio.js"></script>
   <script src="../../engine/dom-engine.js"></script>
   <script src="../../engine/game-boot.js"></script>
   ```

   **Optional modules** (add as needed):
   ```html
   <script src="../../engine/sprite-processor.js"></script>   <!-- Sprites/animations -->
   <script src="../../engine/online.js"></script>             <!-- P2P multiplayer -->
   <script src="../../engine/online-lobby.js"></script>       <!-- Lobby overlay UI -->
   <script src="../../engine/peerjs.min.js"></script>         <!-- PeerJS dependency -->
   <script src="../../engine/mobile-controls.js"></script>    <!-- Touch D-pad -->
   <script src="../../engine/ui-canvas.js"></script>          <!-- Canvas menus -->
   ```

   Also include `game-shell.css` for base styles:
   ```html
   <link rel="stylesheet" href="../../engine/game-shell.css">
   ```

   For the recommended startup pattern see the [Game Architecture docs](engine/docs/GAME_ARCHITECTURE.md).

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
├── engine/                        # Shared game engine
│   ├── theme.js                   # Color palette & typography (all games)
│   ├── render-bridge.js           # Agnostic bridge Engine/PIXI/LittleJS/DOM
│   ├── input.js                   # Keyboard, mouse, touch (unified)
│   ├── audio.js                   # Procedural sound synthesis
│   ├── engine.js                  # Canvas 2D game loop, drawing primitives
│   ├── pixi-engine.js             # PIXI.js (WebGL) engine adapter
│   ├── pixi.min.js                # PIXI.js library
│   ├── littlejs-engine.js         # LittleJS engine adapter
│   ├── littlejs.min.js            # LittleJS library
│   ├── dom-engine.js              # DOM sub-engine (HTML/CSS, manual render)
│   ├── game-boot.js               # Unified boot (auto-detect renderer)
│   ├── game-shell.css             # Base reset, online lobby UI, D-pad styles
│   ├── ui-canvas.js               # Canvas UI helpers (buttons, menus)
│   ├── sprite-processor.js        # Sprite cutting, engine conversion, debug grid
│   ├── online.js                  # P2P multiplayer (PeerJS/WebRTC)
│   ├── online-lobby.js            # Shared DOM lobby overlay (host/join UI)
│   ├── peerjs.min.js              # PeerJS library
│   ├── mobile-controls.js         # Touch D-pad binding
│   └── docs/                      # Full documentation
├── games/                         # Individual game directories
│   ├── tictactoe/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # AI, 3x3 grid
│   ├── connect4/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # AI opponent, 7x6 grid, online MP
│   ├── typingspeed/
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── words.js               # ES / EN word pools
│   │   └── script.js              # WPM typing test (DOM engine)
│   ├── wordscramble/
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── words.js               # ES / EN scrambled words
│   │   └── script.js              # Timed word unscramble (DOM engine)
│   ├── arkanoid/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Paddle physics, 40 bricks, 3 lives
│   ├── snake/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Grid movement, swipe, wall wrap
│   ├── hangman/
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── words.js               # Word pools
│   │   ├── images/                # SVG hangman states & GIFs
│   │   └── script.js              # 1v1 online & random modes (DOM engine)
│   ├── flappybird/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Physics-based pipe dodging
│   ├── butterfly-effect/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # 3D Lorenz Attractor chaos visualization
│   ├── minesweeper/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Grid-based bomb logic
│   ├── lightsout/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Puzzle solver
│   ├── sudoku/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Number puzzle
│   ├── othello/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # 2-player strategy board game
│   ├── playeranimation/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # PIXI.js sprite animation test
│   ├── domino/
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── words.js
│   │   └── script.js              # 4-player online dominoes (DOM engine)
│   ├── pacman/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Classic maze chase
│   ├── spaceinvaders/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Alien shooter
│   └── voidsector/
│       ├── index.html
│       ├── style.css
│       └── script.js              # Space combat game
├── assets/
│   ├── imgs_games/                # Game thumbnails (SVG)
│   ├── images/
│   └── sounds/
├── scripts/
│   └── scan-games.js              # Auto-generate games.json from filesystem
├── index.html                     # Hub - minimal landing page
├── style.css                      # Hub styles (responsive grid, dark theme)
├── main.js                        # Hub logic - fetches games.json, renders cards
├── games.json                     # Game manifest
├── manifest.json                  # PWA manifest
├── sw.js                          # Service worker (js-games-v3, hybrid cache)
└── icon.svg                       # PWA icon
```

## Tech Stack

| Layer | Tech |
|---|---|---|
| Runtime | Vanilla JS (no frameworks, no bundler) |
| Rendering | Canvas 2D (`Engine`), WebGL/PIXI.js (`PIXIEngine`), LittleJS (`LittleEngine`), DOM/CSS (`DOMEngine`) |
| Input | Keyboard (`keydown/keyup`), Mouse, Touch (`touchstart/touchend/touchmove`) |
| Audio | Web Audio API (`OscillatorNode` / `AudioBufferSourceNode`) |
| Multiplayer | PeerJS / WebRTC (`Online` + `OnlineLobby`) |
| Sprites | SpriteProcessor, SpriteManager, EntityComposer, SpriteStateMachine |
| PWA | Service Worker + Web App Manifest |
| Icons | Inline Unicode emoji in cards; SVG for PWA icon |

---

*A collection of classic arcade games built with vanilla JavaScript.*
