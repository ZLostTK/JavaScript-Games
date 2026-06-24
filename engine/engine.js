class Engine {
	static init(canvasId, opts = {}) {
		this.canvas = document.getElementById(canvasId);
		this.ctx = this.canvas.getContext('2d');
		this.W = opts.width || 800;
		this.H = opts.height || 600;
		this.scaleMode = opts.scaleMode || 'fit';
		this.bg = opts.bg || '#1a1a2e';
		
		Input.init(this.canvas);
		Audio.init();
		
		this._resize();
		window.addEventListener('resize', () => this._resize());
		
		this._last = performance.now();
		this._running = false;
		this._game = null;
		
		return this;
	}
	
	static _resize() {
		const p = this.canvas.parentElement || document.body;
		const pw = p.clientWidth;
		const ph = p.clientHeight;
		const s = Math.min(pw / this.W, ph / this.H);
		this._scale = s;
		this.canvas.width = this.W;
		this.canvas.height = this.H;
		if (this.scaleMode === 'fit') {
			this.canvas.style.width = `${this.W * s}px`;
			this.canvas.style.height = `${this.H * s}px`;
		}
	}
	
	/** Convert CSS-pixel coords (offsetX/offsetY or touch) → logical canvas coords */
	static toGame(x, y) {
		const s = this._scale || 1;
		return { x: x / s, y: y / s };
	}
	
	static start(game) {
		this._game = game;
		this._running = true;
		if (game.init) game.init();
		this._loop(performance.now());
	}
	
	static _loop(now) {
		if (!this._running) return;
		const dt = Math.min((now - this._last) / 1000, 0.05);
		this._last = now;
		const g = this._game;
		if (g.update) g.update(dt);
		if (g.render) {
			this.ctx.clearRect(0, 0, this.W, this.H);
			g.render(this.ctx);
		}
		Input.endFrame();
		requestAnimationFrame(t => this._loop(t));
	}
	
	static stop() { this._running = false; }
	
	static rect(x, y, w, h, color) {
		this.ctx.fillStyle = color;
		this.ctx.fillRect(x, y, w, h);
	}
	
	static circle(x, y, r, color) {
		this.ctx.fillStyle = color;
		this.ctx.beginPath();
		this.ctx.arc(x, y, r, 0, Math.PI * 2);
		this.ctx.fill();
	}
	
	static text(txt, x, y, color, size = 20, align = 'center') {
		this.ctx.fillStyle = color;
		this.ctx.font = `${size}px 'Courier New', monospace`;
		this.ctx.textAlign = align;
		this.ctx.textBaseline = 'middle';
		this.ctx.fillText(txt, x, y);
	}
}
