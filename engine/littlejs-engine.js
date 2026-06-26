class LittleEngine {
	static _game = null;
	static _running = false;
	static _opts = {};

	static init(canvasId, opts = {}) {
		if (!document.getElementById(canvasId))
			throw new Error(`LittleEngine.init: no se encontró #${canvasId}`);

		if (typeof Input !== 'undefined') Input.init(null);
		if (typeof Audio !== 'undefined') Audio.init();

		this._game = null;
		this._running = false;
		this._opts = opts;

		return this;
	}

	static start(game) {
		this._game = game;
		this._running = true;

		if (game.init) game.init();

		const opts = this._opts;
		engineInit(
			() => {},
			() => { if (this._game && this._game.update) this._game.update(timeDelta); },
			() => { if (this._game && this._game.render) this._game.render(); },
			opts.tileSize || 16,
			opts.size || vec2(800, 600),
			opts.plugins || []
		);
	}

	static stop() {
		this._running = false;
	}
}
