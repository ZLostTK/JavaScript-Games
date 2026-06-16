# JavaScript Games — Arcade Collection

<div align="center">
<img src="./icon.svg" width="200" alt="JS Games Icon">
</div>

A collection of classic arcade games built with vanilla JavaScript, featuring a shared game engine, unified input system, procedurally generated audio, and PWA support for installability.

## Games

- **[Tic Tac Toe](./games/tictactoe/)** — Classic 3-in-a-row against an AI opponent.
- **[Arkanoid](./games/arkanoid/)** — Break bricks with paddle and ball physics (40 bricks across 5 rows, 3 lives, score tracking).
- **[Snake](./games/snake/)** — Grow the snake by eating food with wall wrapping, swipe controls, and progressive speed.
- **[Efecto Mariposa](./games/butterfly-effect/)** — Chaotic 3D Lorenz Attractor simulation with interactive parameters, camera controls, and particle tracking.

## Features

- **Shared Game Engine** — `Engine` class provides a unified game loop, canvas management with responsive `fit` scaling, and drawing primitives (`rect`, `circle`, `text`)
- **Unified Input** — `Input` class normalises keyboard, mouse, and multi-touch events into a single API with gesture detection (swipe) and just-pressed/released semantics
- **Procedural Audio** — `Audio` class synthesises sounds at runtime (square, sine, saw, noise waves with envelope shaping); no external audio files required
- **Hub Page** — Minimalist game grid reads `games.json` and auto-renders game cards with thumbnails, descriptions, and a Play button; fully responsive (auto-fill grid, 1 col on mobile)
- **Auto-Discovery** — `scripts/scan-games.js` scans the `games/` directory and regenerates `games.json` so new games appear on the hub automatically
- **PWA** — Service worker (cache-first strategy) caches all engine files, hub assets, and game pages; `manifest.json` enables install-as-app on Chrome, Edge, and Samsung Internet
- **Dark Mode** — Full dark theme (`#0f0f1a` background) with a consistent red/purple accent palette across the hub and all games
- **AI Opponent** — Tic Tac Toe features an AI that plays optimally; Arkanoid and Snake are single-player with progressive difficulty

## Adding a New Game

1. Create a new folder under `games/` with `index.html`, `style.css`, and `script.js`
2. Use the shared engine via `<script>` tags:
   ```html
   <script src="../../engine/input.js"></script>
   <script src="../../engine/audio.js"></script>
   <script src="../../engine/engine.js"></script>
   ```
3. Register the game in `games.json` (or run `node scripts/scan-games.js`)

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
├── sw.js                          # Service worker (cache-first)
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
