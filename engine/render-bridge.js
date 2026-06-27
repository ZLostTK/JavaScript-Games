/**
 * Puente agnóstico entre módulos compartidos y los 3 motores de renderizado:
 * Engine (Canvas 2D), PIXIEngine (WebGL) y LittleEngine (LittleJS).
 */
class RenderBridge {
	static _active = null;

	static setActive(engine) {
		this._active = engine || null;
	}

	static active() {
		if (this._active) return this._active;

		if (typeof Engine !== 'undefined' && Engine._running) return Engine;
		if (typeof PIXIEngine !== 'undefined' && PIXIEngine._running) return PIXIEngine;
		if (typeof LittleEngine !== 'undefined' && LittleEngine._running) return LittleEngine;

		if (typeof Engine !== 'undefined' && Engine.canvas) return Engine;
		if (typeof PIXIEngine !== 'undefined' && PIXIEngine.app) return PIXIEngine;
		if (typeof LittleEngine !== 'undefined' && LittleEngine._container) return LittleEngine;

		return typeof Engine !== 'undefined' ? Engine : null;
	}

	static type() {
		const e = this.active();
		return e?.rendererType || 'canvas';
	}

	static get W() {
		return this.active()?.W ?? 800;
	}

	static get H() {
		return this.active()?.H ?? 600;
	}

	static toGame(x, y) {
		const e = this.active();
		if (e?.toGame) return e.toGame(x, y);
		return { x, y };
	}

	static get ctx() {
		return this.active()?.ctx ?? null;
	}

	static get canvas() {
		const e = this.active();
		if (e?.canvas) return e.canvas;
		if (e?.app?.canvas) return e.app.canvas;
		if (typeof mainCanvas !== 'undefined') return mainCanvas;
		return null;
	}

	static bindInput() {
		const canvas = this.canvas;
		if (typeof Input !== 'undefined' && canvas) Input.init(canvas);
	}
}
