import { Engine } from './Engine.js';
import { DOMEngine } from './DOMEngine.js';
import { Theme } from '../utils/Theme.js';

/** Standard boot sequence — canvas ESM; legacy engines via globalThis until migrated */
export class GameBoot {
	static _whenReady(fn) {
		if (document.readyState === 'loading') {
			window.addEventListener('DOMContentLoaded', fn);
		} else {
			fn();
		}
	}

	static _resolveRenderer(opts = {}) {
		const { PIXIEngine, LittleEngine } = globalThis;
		if (opts.renderer) return opts.renderer;
		if (PIXIEngine && opts.engine === PIXIEngine) return 'pixi';
		if (LittleEngine && opts.engine === LittleEngine) return 'little';
		if (opts.engine === Engine) return 'canvas';
		return 'canvas';
	}

	static start(game, opts = {}) {
		const renderer = this._resolveRenderer(opts);
		if (renderer === 'pixi') return this.startPIXI(game, opts);
		if (renderer === 'little') return this.startLittle(game, opts);
		return this.startCanvas(game, opts);
	}

	static startCanvas(game, opts = {}) {
		this._whenReady(() => {
			const engine = opts.engine || Engine;
			engine.init(opts.canvasId || 'game', {
				width: opts.width || 800,
				height: opts.height || 600,
				bg: opts.bg || Theme.colors.bg,
				scaleMode: opts.scaleMode,
			});
			opts.beforeStart?.(game, engine);
			engine.start(game);
		});
	}

	static startPIXI(game, opts = {}) {
		const { PIXIEngine } = globalThis;
		if (!PIXIEngine) {
			throw new Error('GameBoot.startPIXI: carga pixi.min.js y pixi-engine.js');
		}
		this._whenReady(async () => {
			await PIXIEngine.init(
				opts.containerId || opts.canvasId || 'game-container',
				{
					width: opts.width || 800,
					height: opts.height || 600,
					bg: opts.bg ?? 0x0f0f1a,
				},
			);
			opts.beforeStart?.(game, PIXIEngine);
			PIXIEngine.start(game);
		});
	}

	static startLittle(game, opts = {}) {
		const { LittleEngine } = globalThis;
		if (!LittleEngine) {
			throw new Error('GameBoot.startLittle: carga littlejs.min.js y littlejs-engine.js');
		}
		this._whenReady(() => {
			LittleEngine.init(opts.containerId || opts.canvasId || 'game-container', {
				width: opts.width || 800,
				height: opts.height || 600,
				tileSize: opts.tileSize,
				padding: opts.padding,
				images: opts.images || [],
			});
			opts.beforeStart?.(game, LittleEngine);
			LittleEngine.start(game);
		});
	}

	static startDOM(game, opts = {}) {
		this._whenReady(() => {
			DOMEngine.init(opts.containerId || 'game-container', {
				fps: opts.fps || 60,
			});
			DOMEngine.start(game);
		});
	}
}
