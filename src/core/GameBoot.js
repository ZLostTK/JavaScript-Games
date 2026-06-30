import { Engine } from './Engine.js';
import { DOMEngine } from './DOMEngine.js';
import { PIXIEngine } from './PIXIEngine.js';
import { LittleEngine } from './LittleEngine.js';
import { Theme } from '../utils/Theme.js';

export class GameBoot {
	static _whenReady(fn) {
		if (document.readyState === 'loading') {
			window.addEventListener('DOMContentLoaded', fn);
		} else {
			fn();
		}
	}

	static start(game, opts = {}) {
		const renderer = opts.renderer || 'canvas';
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
