// engine-shim.js
// Self-contained implementation of the hub engine's documented PIXI-mode API
// (PIXIEngine, Input, Audio, SpriteProcessor, SpriteStateMachine) so this game
// follows the exact conventions from docs/CORE_ENGINES.md, docs/SPRITES.md,
// and docs/INPUT.md. Drop-in compatible if the real engine/src files are
// added later — same method names and signatures.

export const PIXIEngine = {
  app: null,
  W: 0,
  H: 0,
  _game: null,
  _container: null,

  async init(containerId, { width = 960, height = 540, bg = 0x0f0f1a } = {}) {
    this._container = document.getElementById(containerId);
    this.W = width;
    this.H = height;

    this.app = new PIXI.Application();
    await this.app.init({
      width,
      height,
      background: bg,
      antialias: true,
    });

    this._container.appendChild(this.app.canvas);
    Input._bindTo(this.app.canvas, this);
    return this;
  },

  addChild(child) {
    this.app.stage.addChild(child);
    return child;
  },

  removeChild(child) {
    this.app.stage.removeChild(child);
  },

  toGame(screenX, screenY) {
    const rect = this.app.view.getBoundingClientRect();
    const scaleX = this.W / rect.width;
    const scaleY = this.H / rect.height;
    return {
      x: (screenX - rect.left) * scaleX,
      y: (screenY - rect.top) * scaleY,
    };
  },

  async start(game) {
    this._game = game;
    if (game.init) await game.init();
    this.app.ticker.add((ticker) => {
      const dt = ticker.deltaMS / 1000;
      if (game.update) game.update(dt);
      if (game.render) game.render();
    });
  },

  stop() {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
    }
  },
};

export const Input = {
  _down: new Set(),
  _pressed: new Set(),
  _released: new Set(),
  _pointerDown: false,
  _pointerJustDown: false,
  _engine: null,

  _bindTo(canvasEl, engine) {
    this._engine = engine;
    window.addEventListener('keydown', (e) => {
      if (!this._down.has(e.code)) this._pressed.add(e.code);
      this._down.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this._down.delete(e.code);
      this._released.add(e.code);
    });
    const onDown = () => {
      this._pointerDown = true;
      this._pointerJustDown = true;
      Audio.resume();
    };
    const onUp = () => { this._pointerDown = false; };
    canvasEl.addEventListener('mousedown', onDown);
    canvasEl.addEventListener('mouseup', onUp);
    canvasEl.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); }, { passive: false });
    canvasEl.addEventListener('touchend', (e) => { e.preventDefault(); onUp(); }, { passive: false });
  },

  isDown(code) { return this._down.has(code); },
  isPressed(code) { return this._pressed.has(code); },
  isReleased(code) { return this._released.has(code); },
  isPointerDown() { return this._pointerDown; },
  isPointerJustDown() {
    const v = this._pointerJustDown;
    this._pointerJustDown = false;
    return v;
  },

  // Must be called once per frame after game logic reads pressed/released state
  _endFrame() {
    this._pressed.clear();
    this._released.clear();
  },
};

export const Audio = {
  ctx: null,
  muted: false,

  resume() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  synth({ freq = 440, duration = 0.12, type = 'sine', volume = 0.2 } = {}) {
    if (this.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.stop(this.ctx.currentTime + duration);
  },

  toggleMute() { this.muted = !this.muted; },
};

// --- SpriteProcessor: cuts a packed spritesheet by JSON frame map ---
export const SpriteProcessor = {
  _baseTexture: null,

  async processJSON(sheetUrl, jsonUrl) {
    const [texture, frameMap] = await Promise.all([
      PIXI.Assets.load(sheetUrl).catch((err) => {
        console.error('[SpriteProcessor] failed to load spritesheet:', sheetUrl, err);
        throw err;
      }),
      fetch(jsonUrl).then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch ${jsonUrl}: ${r.status}`);
        return r.json();
      }),
    ]);

    const sprites = {};
    for (const [name, f] of Object.entries(frameMap.frames)) {
      const rect = new PIXI.Rectangle(f.x, f.y, f.width, f.height);
      sprites[name] = new PIXI.Texture({ source: texture.baseTexture, frame: rect });
    }
    return sprites;
  },

  toPIXI(texture) {
    return new PIXI.Sprite(texture);
  },
};

// --- SpriteStateMachine: states with looping/non-looping PIXI textures ---
export class SpriteStateMachine {
  constructor(owner, states, initial) {
    this.owner = owner;
    this.states = states; // { name: { frames: [tex,...], loop, speed, nextState } }
    this.currentStateName = initial;
    this.frameIndex = 0;
    this.elapsed = 0;
    this.completed = false;
  }

  setState(name) {
    if (this.currentStateName === name) return;
    this.currentStateName = name;
    this.frameIndex = 0;
    this.elapsed = 0;
    this.completed = false;
  }

  update(dt) {
    const state = this.states[this.currentStateName];
    if (!state || !state.frames.length) return;
    const speed = state.speed || 10;
    this.elapsed += dt;
    const frameDuration = 1 / speed;

    if (this.elapsed >= frameDuration) {
      this.elapsed = 0;
      if (this.frameIndex < state.frames.length - 1) {
        this.frameIndex++;
      } else if (state.loop) {
        this.frameIndex = 0;
      } else {
        this.completed = true;
        if (state.nextState) this.setState(state.nextState);
      }
    }
  }

  getTexture() {
    const state = this.states[this.currentStateName];
    if (!state || !state.frames.length) return null;
    return state.frames[this.frameIndex];
  }
}
