# JavaScript Games — Arcade Collection

<div align="center">
<img src="./icon.svg" width="200" alt="JS Games Icon">
</div>

A collection of classic arcade games built with vanilla JavaScript, featuring a shared game engine, unified input system, procedurally generated audio, and PWA support for installability.

## Games

<!-- GAMES_START -->

- **[Ahorcado](./games/hangman/)** — Guess the secret word - Random and 1v1 modes
- **[Arkanoid](./games/arkanoid/)** — Break bricks with paddle and ball
- **[Busca Minas](./games/minesweeper/)** — Find the bombs using logic and arrays
- **[Conecta 4](./games/connect4/)** — Connect 4 chips in a row before the AI
- **[Efecto Mariposa](./games/butterfly-effect/)** — Chaotic visualization of the Lorenz Attractor
- **[Flappy Bird](./games/flappybird/)** — Fly between pipes without crashing
- **[Fuera Luces!](./games/lightsout/)** — Turn off all the lights in the fewest possible pulses
- **[Gato - Ateti](./games/tictactoe/)** — Classic 3-in-a-row against AI
- **[Othello - Reversi](./games/othello/)** — Classic strategy board game for two players
- **[Snake Game](./games/snake/)** — Grow the snake by eating food
- **[Space Invaders](./games/spaceinvaders/)** — Classic arcade game - Shoot aliens
- **[Sudoku](./games/sudoku/)** — Solve the sudoku puzzle

<!-- GAMES_END -->

## Features

- **Shared Game Engine** — `Engine` class provides a unified game loop, canvas management with responsive `fit` scaling, and drawing primitives (`rect`, `circle`, `text`)
- **Unified Input** — `Input` class normalises keyboard, mouse, and multi-touch events into a single API with gesture detection (swipe) and just-pressed/released semantics
- **Procedural Audio** — `Audio` class synthesises sounds at runtime (square, sine, saw, noise waves with envelope shaping); no external audio files required
- **Hub Page** — Minimalist game grid reads `games.json` and auto-renders game cards with thumbnails, descriptions, and a Play button; fully responsive (auto-fill grid, 1 col on mobile)
- **Auto-Discovery** — `scripts/scan-games.js` scans the `games/` directory and updates `games.json` automatically. This runs via a GitHub Workflow on every push.
- **PWA (Hybrid Cache)** — Service worker uses a hybrid strategy: Network-First for core hub files (`index.html`, `games.json`, etc.) to ensure new games appear immediately when online, and Cache-First for static assets and manually saved game files.
- **Dark Mode** — Full dark theme (`#0f0f1a` background) with a consistent red/purple accent palette across the hub and all games
- **AI Opponent** — Tic Tac Toe features an AI that plays optimally; Arkanoid and Snake are single-player with progressive difficulty

## Adding a New Game

1. Create a new folder under `games/` with `index.html`, `style.css`, and `script.js`.
2. Use the shared engine via `<script>` tags:
   ```html
   <script src="../../engine/input.js"></script>
   <script src="../../engine/audio.js"></script>
   <script src="../../engine/engine.js"></script>
   ```
3. Push your changes. A GitHub Actions workflow will automatically run `scripts/scan-games.js` to update `games.json` and deploy it to GitHub Pages. You can also run it locally via `node scripts/scan-games.js`.

Each game directory is self-contained and can be opened independently — the engine is loaded via relative paths.

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
│   ├── input.js                   # Keyboard, mouse, touch (unified)
│   ├── audio.js                   # Procedural sound synthesis
│   └── engine.js                  # Game loop, canvas, drawing primitives
├── games/                         # Individual game directories
│   ├── tictactoe/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # AI, 3x3 grid
│   ├── arkanoid/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Paddle physics, 40 bricks, 3 lives
│   ├── snake/
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js              # Grid movement, swipe, wall wrap
│   └── butterfly-effect/
│       ├── index.html
│       ├── style.css
│       └── script.js              # 3D Lorenz Attractor chaos visualization
├── assets/
│   ├── images/
│   └── sounds/
├── scripts/
│   └── scan-games.js              # Auto-generate games.json from filesystem
├── index.html                     # Hub — minimal landing page
├── style.css                      # Hub styles (responsive grid, dark theme)
├── main.js                        # Hub logic — fetches games.json, renders cards
├── games.json                     # Game manifest
├── manifest.json                  # PWA manifest
├── sw.js                          # Service worker (hybrid network-first/cache-first)
└── icon.svg                       # PWA icon
```

## Tech Stack

| Layer | Tech |
|---|---|
| Runtime | Vanilla JS (no frameworks, no bundler) |
| Rendering | Canvas 2D (`fit` scaling) |
| Input | Keyboard (`keydown/keyup`), Mouse, Touch (`touchstart/touchend/touchmove`) |
| Audio | Web Audio API (`OscillatorNode` / `AudioBufferSourceNode`) |
| PWA | Service Worker + Web App Manifest |
| Icons | Inline Unicode emoji in cards; SVG for PWA icon |

---

*A collection of classic arcade games built with vanilla JavaScript.*
