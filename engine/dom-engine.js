/* ═══════════════════════════════════════════════════════════════
DOMEngine - Sub-engine para juegos HTML/CSS/JS (sin Canvas)
═══════════════════════════════════════════════════════════════

Diferencias clave vs Engine (canvas):
──────────────────────────────────────
• No requiere <canvas>. Trabaja sobre un <div id="container">.
• El game loop (requestAnimationFrame) ejecuta SOLO update(dt).
• render() es MANUAL: el juego llama DOMEngine.render() cuando
el estado cambia, no automáticamente cada frame.
• Input.init() se llama con (null) → solo captura teclado.
• Audio y Online se usan exactamente igual que con Engine.

Uso básico:
──────────────────────────────────────
window.onload = () => {
	DOMEngine.init('game-container');
DOMEngine.start(myGame);
};

El game object implementa:
init()       → setup inicial, poblar el DOM
update(dt)   → lógica de tiempo (timers, IA, animaciones)
render()     → manipular DOM cuando el estado cambia
Llamar con: DOMEngine.render()

═══════════════════════════════════════════════════════════════ */

class DOMEngine {
	/* ─────────────────────────────────────────
	Inicialización
	───────────────────────────────────────── */
	
	/**
	* Monta el engine sobre un div existente.
	* @param {string} containerId  id del <div> raíz del juego
	* @param {object} opts
	*   opts.fps   {number}  - límite de FPS del loop (default: 60, 0 = sin límite)
	*/
	static init(containerId, opts = {}) {
		this.container = document.getElementById(containerId);
		if (!this.container) {
			throw new Error(`DOMEngine.init: no se encontró #${containerId}`);
		}
		
		this._fpsLimit   = opts.fps ?? 60;
		this._msPerFrame = this._fpsLimit > 0 ? 1000 / this._fpsLimit : 0;
		this._last       = 0;
		this._running    = false;
		this._game       = null;
		
		// Input sólo de teclado (sin canvas)
		if (typeof Input !== 'undefined') {
			Input.init(null);
		}
		
		// Audio
		if (typeof Audio !== 'undefined') {
			Audio.init();
		}
		
		return this;
	}
	
	/* ─────────────────────────────────────────
	Game Loop
	───────────────────────────────────────── */
	
	/**
	* Arranca el juego.
	* @param {object} game  - objeto con init(), update(dt), [render()]
	*/
	static start(game) {
		this._game    = game;
		this._running = true;
		this._last    = performance.now();
		
		if (game.init) game.init();
		
		// Render inicial
		if (game.render) game.render();
		
		requestAnimationFrame(t => this._loop(t));
	}
	
	static _loop(now) {
		if (!this._running) return;
		
		const elapsed = now - this._last;
		
		// Throttle si hay límite de FPS
		if (this._msPerFrame > 0 && elapsed < this._msPerFrame) {
			requestAnimationFrame(t => this._loop(t));
			return;
		}
		
		const dt = Math.min(elapsed / 1000, 0.1); // capped a 100ms
		this._last = now;
		
		const g = this._game;
		if (g.update) g.update(dt);
		
		// Limpiar estado de Input al final del frame
		if (typeof Input !== 'undefined') {
			Input.endFrame();
		}
		
		requestAnimationFrame(t => this._loop(t));
	}
	
	/** Para el loop sin destruir el estado del juego. */
	static stop() {
		this._running = false;
	}
	
	/** Reanuda el loop después de stop(). */
	static resume() {
		if (!this._running) {
			this._running = true;
			this._last    = performance.now();
			requestAnimationFrame(t => this._loop(t));
		}
	}
	
	/**
	* Llama a game.render() manualmente.
	* Úsalo siempre que el estado del juego cambie.
	* No se llama automáticamente en el loop.
	*/
	static render() {
		if (this._game && this._game.render) {
			this._game.render();
		}
	}
	
	/* ─────────────────────────────────────────
	Utilidades DOM
	───────────────────────────────────────── */
	
	/** Shortcut: document.getElementById(id) */
	static el(id) {
		return document.getElementById(id);
	}
	
	/**
	* Crea un elemento HTML, le asigna clases y lo añade al padre.
	* @param {string}      tag     - nombre del tag ('div', 'button', 'span'…)
	* @param {string}      cls     - clases CSS separadas por espacio (opcional)
	* @param {HTMLElement} parent  - elemento padre al que se añade (opcional)
	* @returns {HTMLElement}
	*/
	static create(tag, cls = '', parent = null) {
		const el = document.createElement(tag);
		if (cls) el.className = cls;
		if (parent) parent.appendChild(el);
		return el;
	}
	
	/** Elimina todos los hijos de un elemento. */
	static clear(el) {
		while (el.firstChild) el.removeChild(el.firstChild);
	}
	
	/** Establece el texto visible de un elemento. */
	static setText(el, text) {
		el.textContent = text;
	}
	
	/** Establece el HTML interno de un elemento. */
	static setHTML(el, html) {
		el.innerHTML = html;
	}
	
	/** Añade una o varias clases CSS a un elemento. */
	static addClass(el, ...cls) {
		el.classList.add(...cls);
	}
	
	/** Elimina una o varias clases CSS de un elemento. */
	static removeClass(el, ...cls) {
		el.classList.remove(...cls);
	}
	
	/**
	* Alterna una clase CSS en un elemento.
	* @param {HTMLElement} el
	* @param {string}      cls
	* @param {boolean}     [force]  - true=añadir, false=quitar
	*/
	static toggleClass(el, cls, force) {
		el.classList.toggle(cls, force);
	}
	
	/**
	* Aplica múltiples estilos en línea a un elemento.
	* @param {HTMLElement} el
	* @param {object}      styles  - { property: value, … }
	*/
	static setStyle(el, styles) {
		Object.assign(el.style, styles);
	}
	
	/**
	* Añade un event listener y devuelve la función de cleanup.
	* @param {HTMLElement|EventTarget} target
	* @param {string}   event
	* @param {Function} handler
	* @param {object}   [opts]
	* @returns {Function}  - llamar para eliminar el listener
	*/
	static on(target, event, handler, opts) {
		target.addEventListener(event, handler, opts);
		return () => target.removeEventListener(event, handler, opts);
	}
	
	/**
	* Crea una rejilla de celdas como elementos DOM dentro de un contenedor.
	* Útil para juegos de tablero (buscaminas, connect4, sudoku…).
	*
	* @param {HTMLElement} parent   - contenedor donde se insertan las celdas
	* @param {number}      rows
	* @param {number}      cols
	* @param {Function}    onClick  - callback(row, col, event) al hacer click
	* @param {Function}    [onCtx]  - callback(row, col, event) en contextmenu
	* @returns {Array<Array<HTMLElement>>}  - matriz [row][col] de elementos
	*/
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
	
	/**
	* Muestra un overlay de estado (win/lose/pausa) sobre el contenedor.
	* El overlay se elimina al hacer click si onDismiss está definido.
	*
	* @param {string}   message
	* @param {string}   [subMessage]
	* @param {Function} [onDismiss]
	* @returns {HTMLElement}  - el elemento overlay creado
	*/
	static showOverlay(message, subMessage = '', onDismiss = null) {
		// Eliminar overlay previo si existe
		this.hideOverlay();
		
		const overlay = this.create('div', 'dom-engine-overlay', this.container);
		overlay.id = 'dom-engine-overlay';
		
		const box = this.create('div', 'dom-engine-overlay-box', overlay);
		const msg = this.create('p',   'dom-engine-overlay-msg', box);
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
	
	/** Elimina el overlay creado por showOverlay(). */
	static hideOverlay() {
		const prev = document.getElementById('dom-engine-overlay');
		if (prev) prev.remove();
	}
}
