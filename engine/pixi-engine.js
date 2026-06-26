class PIXIEngine {
	static app = null;
	static W = 800;
	static H = 600;
	static _game = null;
	static _running = false;
	static _last = 0;

	static init(containerId, opts = {}) {
		const container = document.getElementById(containerId);
		if (!container) throw new Error(`PIXIEngine.init: no se encontró #${containerId}`);
		
		this.W = opts.width || 800;
		this.H = opts.height || 600;
		this._game = null;
		this._running = false;

		if (typeof Input !== 'undefined') Input.init(null);
		if (typeof Audio !== 'undefined') Audio.init();

		this.app = new PIXI.Application({
			width: this.W,
			height: this.H,
			backgroundColor: opts.bg ?? 0x1a1a2e,
			antialias: true,
			resolution: window.devicePixelRatio || 1,
			autoDensity: true,
		});

		container.appendChild(this.app.canvas);
		this._resize();
		window.addEventListener('resize', () => this._resize());

		return this;
	}

	static _resize() {
		const canvas = this.app.canvas;
		const parent = canvas.parentElement || document.body;
		const pw = parent.clientWidth;
		const ph = parent.clientHeight;
		const s = Math.min(pw / this.W, ph / this.H);
		canvas.style.width = `${this.W * s}px`;
		canvas.style.height = `${this.H * s}px`;
	}

	static toGame(x, y) {
		const canvas = this.app.canvas;
		const s = canvas.offsetWidth / this.W;
		return { x: x / s, y: y / s };
	}

	static start(game) {
		this._game = game;
		this._running = true;
		this._last = performance.now();
		if (game.init) game.init();
		this.app.ticker.add(() => this._loop());
	}

	static _loop() {
		if (!this._running) return;
		const now = performance.now();
		const dt = Math.min((now - this._last) / 1000, 0.05);
		this._last = now;
		const g = this._game;
		if (g.update) g.update(dt);
		if (g.render) g.render();
		if (typeof Input !== 'undefined') Input.endFrame();
	}

	static stop() {
		this._running = false;
		if (this.app) this.app.destroy(true, { children: true, texture: true });
	}

	static addChild(child) {
		this.app.stage.addChild(child);
	}

	static removeChild(child) {
		this.app.stage.removeChild(child);
	}
}
