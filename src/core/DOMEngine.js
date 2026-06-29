import { Input } from '../modules/Input.js';
import { Audio } from '../modules/Audio.js';
import { AnimationSystem } from '../systems/AnimationSystem.js';

export class DOMEngine {
	static init(containerId, opts = {}) {
		this.container = document.getElementById(containerId);
		if (!this.container) {
			throw new Error(`DOMEngine.init: no se encontró #${containerId}`);
		}

		this._fpsLimit = opts.fps ?? 60;
		this._msPerFrame = this._fpsLimit > 0 ? 1000 / this._fpsLimit : 0;
		this._last = 0;
		this._running = false;
		this._game = null;

		Input.init(null);
		Audio.init();
		AnimationSystem.init();

		return this;
	}

	static start(game) {
		this._game = game;
		this._running = true;
		this._last = performance.now();

		if (game.init) game.init();
		if (game.render) game.render();

		requestAnimationFrame(t => this._loop(t));
	}

	static _loop(now) {
		if (!this._running) return;

		const elapsed = now - this._last;

		if (this._msPerFrame > 0 && elapsed < this._msPerFrame) {
			requestAnimationFrame(t => this._loop(t));
			return;
		}

		const dt = Math.min(elapsed / 1000, 0.1);
		this._last = now;

		const g = this._game;
		if (g.update) g.update(dt);

		AnimationSystem.update(dt);
		Input.endFrame();

		requestAnimationFrame(t => this._loop(t));
	}

	static stop() {
		this._running = false;
	}

	static resume() {
		if (!this._running) {
			this._running = true;
			this._last = performance.now();
			requestAnimationFrame(t => this._loop(t));
		}
	}

	static render() {
		if (this._game?.render) this._game.render();
	}

	static el(id) {
		return document.getElementById(id);
	}

	static create(tag, cls = '', parent = null) {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		if (parent) parent.appendChild(el);
		return el;
	}

	static clear(el) {
		while (el.firstChild) el.removeChild(el.firstChild);
	}

	static setText(el, text) {
		el.textContent = text;
	}

	static setHTML(el, html) {
		el.innerHTML = html;
	}

	static addClass(el, ...cls) {
		el.classList.add(...cls);
	}

	static removeClass(el, ...cls) {
		el.classList.remove(...cls);
	}

	static toggleClass(el, cls, force) {
		el.classList.toggle(cls, force);
	}

	static setStyle(el, styles) {
		Object.assign(el.style, styles);
	}

	static on(target, event, handler, opts) {
		target.addEventListener(event, handler, opts);
		return () => target.removeEventListener(event, handler, opts);
	}

	static createGrid(parent, rows, cols, onClick, onCtx) {
		this.clear(parent);
		parent.style.setProperty('--grid-cols', cols);
		parent.style.setProperty('--grid-rows', rows);

		const grid = [];
		for (let r = 0; r < rows; r++) {
			grid[r] = [];
			for (let c = 0; c < cols; c++) {
				const cell = this.create('div', 'cell', parent);
				cell.dataset.row = r;
				cell.dataset.col = c;

				if (onClick) {
					cell.addEventListener('click', e => onClick(r, c, e));
				}
				if (onCtx) {
					cell.addEventListener('contextmenu', e => {
						e.preventDefault();
						onCtx(r, c, e);
					});
				}

				grid[r][c] = cell;
			}
		}
		return grid;
	}

	static showOverlay(message, subMessage = '', onDismiss = null) {
		this.hideOverlay();

		const overlay = this.create('div', 'dom-engine-overlay', this.container);
		overlay.id = 'dom-engine-overlay';

		const box = this.create('div', 'dom-engine-overlay-box', overlay);
		const msg = this.create('p', 'dom-engine-overlay-msg', box);
		msg.textContent = message;

		if (subMessage) {
			const sub = this.create('p', 'dom-engine-overlay-sub', box);
			sub.textContent = subMessage;
		}

		if (onDismiss) {
			overlay.style.cursor = 'pointer';
			overlay.addEventListener('click', () => {
				this.hideOverlay();
				onDismiss();
			});
		}

		return overlay;
	}

	static hideOverlay() {
		const prev = document.getElementById('dom-engine-overlay');
		if (prev) prev.remove();
	}
}
