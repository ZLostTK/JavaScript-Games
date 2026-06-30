import { Input } from '../modules/Input.js';
import { Audio } from '../modules/Audio.js';
import { RenderBridge } from './RenderBridge.js';

export class LittleEngine {
	static rendererType = 'little';
	static W = 800;
	static H = 600;
	static _game = null;
	static _running = false;
	static _opts = {};
	static _container = null;
	static _scale = 1;

	static init(containerId, opts = {}) {
		const container = document.getElementById(containerId);
		if (!container) throw new Error(`LittleEngine.init: no se encontró #${containerId}`);

		this.W = opts.width || 800;
		this.H = opts.height || 600;
		this._opts = opts;
		this._container = container;
		this._game = null;
		this._running = false;

		Audio.init();
		RenderBridge.setActive(this);

		return this;
	}

	static toGame(x, y) {
		const canvas = typeof mainCanvas !== 'undefined' ? mainCanvas : null;
		if (!canvas) return { x, y };
		const s = canvas.offsetWidth / this.W || 1;
		return { x: x / s, y: y / s };
	}

	static start(game) {
		this._game = game;
		this._running = true;
		const opts = this._opts;

		RenderBridge.setActive(this);

		setShowSplashScreen(false);
		setCanvasPixelated(true);
		setTilesPixelated(true);
		setGravity(vec2(0, 0));
		setGLEnable(false);
		setCanvasClearColor(rgb(0.08, 0.1, 0.14, 1));

		if (opts.width && opts.height) {
			setCanvasFixedSize(vec2(opts.width, opts.height));
		}
		if (opts.tileSize) {
			setTileDefaultSize(vec2(opts.tileSize));
		}
		if (opts.padding != null) {
			setTileDefaultPadding(opts.padding);
		}

		engineInit(
			async () => {
				RenderBridge.bindInput();
				if (game.init) await game.init();
			},
			() => {
				if (this._game?.update) this._game.update(timeDelta);
				Input.endFrame();
			},
			() => {},
			() => {
				if (this._game?.render) this._game.render();
			},
			() => {},
			opts.images || [],
			this._container
		);
	}

	static stop() {
		this._running = false;
		if (typeof engineObjectsDestroy === 'function') engineObjectsDestroy();
	}
}
