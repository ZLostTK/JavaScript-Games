// script.js — Sky Dash game object (PIXI renderer)
// Follows hub conventions: init() / update(dt) / render(), Engine.toGame()
// equivalent via PIXIEngine.toGame(), Audio.resume() on first input,
// SpriteStateMachine-driven animation, no emojis in canvas rendering.

import { SpriteProcessor } from '../../engine/sprite-processor.js';
import { PIXIEngine, Input, Audio, SpriteStateMachine } from './engine-shim.js';

const GRAVITY = 1400;
const DASH_FORCE = -480;
const SCROLL_SPEED_BASE = 220;
const SCROLL_SPEED_MAX = 420;
const SPAWN_INTERVAL_BASE = 1.35;
const ORB_CHANCE = 0.55;

const STORAGE_KEY = 'skydash_best';

class Cloud {
  constructor(tex, x, y, speedMul) {
    this.sprite = new PIXI.Sprite(tex);
    this.sprite.anchor.set(0, 0.5);
    this.sprite.x = x;
    this.sprite.y = y;
    this.speedMul = speedMul;
    PIXIEngine.addChild(this.sprite);
  }
  update(dt, scrollSpeed) {
    this.sprite.x -= scrollSpeed * this.speedMul * dt;
  }
  destroy() {
    PIXIEngine.removeChild(this.sprite);
  }
}

class Obstacle {
  constructor(tex, x, y) {
    this.sprite = new PIXI.Sprite(tex);
    this.sprite.anchor.set(0.5, 1);
    this.sprite.x = x;
    this.sprite.y = y;
    PIXIEngine.addChild(this.sprite);
    this.dead = false;
  }
  get w() { return this.sprite.width; }
  get h() { return this.sprite.height; }
  update(dt, scrollSpeed) {
    this.sprite.x -= scrollSpeed * dt;
    if (this.sprite.x < -60) this.dead = true;
  }
  get bounds() {
    return {
      x: this.sprite.x - this.w / 2,
      y: this.sprite.y - this.h,
      w: this.w,
      h: this.h,
    };
  }
  destroy() {
    PIXIEngine.removeChild(this.sprite);
  }
}

class Orb {
  constructor(texFrames, x, y) {
    this.fsm = new SpriteStateMachine(this, {
      idle: { frames: texFrames, loop: true, speed: 4 },
    }, 'idle');
    this.sprite = new PIXI.Sprite(texFrames[0]);
    this.sprite.anchor.set(0.5);
    this.sprite.x = x;
    this.sprite.y = y;
    PIXIEngine.addChild(this.sprite);
    this.dead = false;
    this.collected = false;
  }
  update(dt, scrollSpeed) {
    this.sprite.x -= scrollSpeed * dt;
    this.fsm.update(dt);
    this.sprite.texture = this.fsm.getTexture();
    if (this.sprite.x < -40) this.dead = true;
  }
  get bounds() {
    const hw = this.sprite.width / 2, hh = this.sprite.height / 2;
    return { x: this.sprite.x - hw, y: this.sprite.y - hh, w: this.sprite.width, h: this.sprite.height };
  }
  destroy() {
    PIXIEngine.removeChild(this.sprite);
  }
}

function aabbOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export const game = {
  state: 'loading', // loading -> ready -> playing -> dead
  sprites: null,
  player: null,
  fsm: null,
  vy: 0,
  py: 0,
  groundY: 0,
  ceilingY: 0,
  obstacles: [],
  orbs: [],
  clouds: [],
  islands: [],
  distance: 0,
  best: 0,
  scrollSpeed: SCROLL_SPEED_BASE,
  spawnTimer: 0,
  elapsedTime: 0,
  hud: { score: null, best: null },
  overlays: { start: null, gameover: null, finalScore: null },

  async init() {
    this.best = Number(localStorage.getItem(STORAGE_KEY) || 0);

    this.hud.score = document.getElementById('score-display');
    this.hud.best = document.getElementById('best-display');
    this.overlays.start = document.getElementById('start-overlay');
    this.overlays.gameover = document.getElementById('gameover-overlay');
    this.overlays.finalScore = document.getElementById('final-score');
    this.hud.best.textContent = `Best: ${this.best} m`;

    document.getElementById('start-btn').addEventListener('click', () => this.startRun());
    document.getElementById('retry-btn').addEventListener('click', () => this.startRun());

    try {
      await this.loadAssets();
      this.buildScene();
      this.state = 'ready';
    } catch (err) {
      console.error('[SkyDash] failed to initialize:', err);
      const startP = this.overlays.start.querySelector('p');
      if (startP) startP.textContent = 'Failed to load game assets. Check the console for details.';
    }
  },

  async loadAssets() {
    const resp = await fetch('./assets/spritesheet.json');
    const spriteData = await resp.json();
    const raw = await SpriteProcessor.loadSpriteSheet('./assets/spritesheet.png', spriteData, { scale: 0.2 });
    this.sprites = {};
    for (const [name, s] of Object.entries(raw)) {
      this.sprites[name] = PIXI.Texture.from(s.texture);
    }
  },

  buildScene() {
    this.groundY = PIXIEngine.H;
    this.ceilingY = 0;
    this.py = PIXIEngine.H / 2;

    // Parallax cloud layer (background)
    for (let i = 0; i < 5; i++) {
      const x = (i / 5) * PIXIEngine.W * 1.4;
      const y = 40 + Math.random() * (PIXIEngine.H - 100);
      const cloud = new Cloud(this.sprites.cloud, x, y, 0.25 + Math.random() * 0.2);
      cloud.sprite.alpha = 0.5 + Math.random() * 0.3;
      this.clouds.push(cloud);
    }

    // Ground + ceiling island strips (decorative, tiled)
    this.islands = [];
    this._iw = this.sprites.island.width;
    this._ih = this.sprites.island.height;
    this._in = Math.ceil(PIXIEngine.W / this._iw) + 2;
    for (let i = 0; i < this._in; i++) {
      const top = new PIXI.Sprite(this.sprites.island);
      top.anchor.set(0, 0);
      top.x = i * this._iw;
      top.y = -this._ih;
      top.rotation = Math.PI;
      top.x += this._iw;
      PIXIEngine.addChild(top);

      const bottom = new PIXI.Sprite(this.sprites.island);
      bottom.anchor.set(0, 0);
      bottom.x = i * this._iw;
      bottom.y = PIXIEngine.H - this._ih;
      PIXIEngine.addChild(bottom);

      this.islands.push(top, bottom);
    }

    // Player sprite driven by SpriteStateMachine (3-frame flap loop)
    this.fsm = new SpriteStateMachine(this, {
      fly: {
        frames: [this.sprites.player_fly0, this.sprites.player_fly1, this.sprites.player_fly3, this.sprites.player_fly1],
        loop: true,
        speed: 5,
      },
    }, 'fly');

    this.player = new PIXI.Sprite(this.sprites.player_fly0);
    this.player.anchor.set(0.5);
    this.player.x = PIXIEngine.W * 0.28;
    this.player.y = this.py;
    PIXIEngine.addChild(this.player);
  },
  startRun() {
    if (!this.player) return;

    this.overlays.start.classList.add('hidden');
    this.overlays.gameover.classList.add('hidden');

    this.obstacles.forEach((o) => o.destroy());
    this.orbs.forEach((o) => o.destroy());

    this.obstacles = [];
    this.orbs = [];

    this.distance = 0;
    this.vy = 0;
    this.py = PIXIEngine.H / 2;
    this.scrollSpeed = SCROLL_SPEED_BASE;
    this.spawnTimer = 0;
    this.elapsedTime = 0;
    this.player.rotation = 0;
    this.state = 'playing';
    Audio.resume();
  },

  dash() {
    if (this.state !== 'playing') return;
    this.vy = DASH_FORCE;
    Audio.synth({ freq: 520, duration: 0.08, type: 'triangle', volume: 0.15 });
  },

  spawnWave() {
    const x = PIXIEngine.W + 60;
    const lane = Math.random();
    const oh = this.sprites.obstacle_spike.height;
    const y = oh / 2 + lane * (PIXIEngine.H - oh);
    this.obstacles.push(new Obstacle(this.sprites.obstacle_spike, x, y));

    if (Math.random() < ORB_CHANCE) {
      const orbY = 40 + Math.random() * (PIXIEngine.H - 80);
      const orbX = x + 70 + Math.random() * 60;
      this.orbs.push(new Orb([this.sprites.orb_0, this.sprites.orb_1], orbX, orbY));
    }
  },

  endRun() {
    this.state = 'dead';
    Audio.synth({ freq: 140, duration: 0.3, type: 'sawtooth', volume: 0.2 });
    const meters = Math.floor(this.distance);
    if (meters > this.best) {
      this.best = meters;
      localStorage.setItem(STORAGE_KEY, String(this.best));
      this.hud.best.textContent = `Best: ${this.best} m`;
    }
    this.overlays.finalScore.textContent = `Distance: ${meters} m`;
    this.overlays.gameover.classList.remove('hidden');
  },

  update(dt) {
    dt = Math.min(dt, 1 / 30);

    // Input — keyboard, mouse, touch all trigger dash
    if (Input.isPressed('Space') || Input.isPointerJustDown()) {
      if (this.state === 'playing') {
        this.dash();
      }
    }
    Input._endFrame();

    // Cloud parallax always drifts gently for ambience
    const ambientSpeed = this.state === 'playing' ? this.scrollSpeed : SCROLL_SPEED_BASE * 0.3;
    for (const c of this.clouds) {
      c.update(dt, ambientSpeed * 0.4);
      if (c.sprite.x < -130) c.sprite.x = PIXIEngine.W + Math.random() * 100;
    }

	if (this.state === 'loading') return;
	if (this.state !== 'playing') {
		this.fsm.update(dt);
		this.player.texture = this.fsm.getTexture();
		return;
	}

    this.elapsedTime += dt;
    this.distance += (this.scrollSpeed * dt) / 28;
    this.scrollSpeed = Math.min(SCROLL_SPEED_MAX, SCROLL_SPEED_BASE + this.elapsedTime * 6);

    // Physics
    this.vy += GRAVITY * dt;
    this.py += this.vy * dt;
    this.player.y = this.py;
    this.player.rotation = Math.max(-0.5, Math.min(0.8, this.vy / 1200));

    this.fsm.update(dt);
    this.player.texture = this.fsm.getTexture();

    // Screen-edge collision (touching top/bottom = crash)
    if (this.player.y - this.player.height / 2 <= 0 || this.player.y + this.player.height / 2 >= PIXIEngine.H) {
      this.endRun();
      return;
    }

    // Scroll decorative islands
    for (const tile of this.islands) {
      tile.x -= this.scrollSpeed * dt;
      if (tile.x < -this._iw) tile.x += this._iw * this._in;
    }

    // Spawn obstacles
    this.spawnTimer -= dt;
    const interval = Math.max(0.65, SPAWN_INTERVAL_BASE - this.elapsedTime * 0.02);
    if (this.spawnTimer <= 0) {
      this.spawnWave();
      this.spawnTimer = interval;
    }

    // Update + collide obstacles
    const playerBounds = {
      x: this.player.x - this.player.width / 2,
      y: this.player.y - this.player.height / 2,
      w: this.player.width,
      h: this.player.height,
    };

    for (const o of this.obstacles) {
      o.update(dt, this.scrollSpeed);
      if (aabbOverlap(playerBounds, o.bounds)) {
        this.endRun();
        return;
      }
    }
    this.obstacles = this.obstacles.filter((o) => {
      if (o.dead) o.destroy();
      return !o.dead;
    });

    // Update + collect orbs
    for (const orb of this.orbs) {
      orb.update(dt, this.scrollSpeed);
      if (!orb.collected && aabbOverlap(playerBounds, orb.bounds)) {
        orb.collected = true;
        orb.dead = true;
        this.distance += 5;
        Audio.synth({ freq: 880, duration: 0.1, type: 'sine', volume: 0.18 });
      }
    }
    this.orbs = this.orbs.filter((o) => {
      if (o.dead) o.destroy();
      return !o.dead;
    });

    this.hud.score.textContent = `${Math.floor(this.distance)} m`;
  },

  render() {
    // PIXI renders the stage automatically each tick; nothing manual needed.
  },
};
