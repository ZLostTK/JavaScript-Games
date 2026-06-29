import { Input } from '../modules/Input.js';

/**
 * Puente agnóstico entre módulos compartidos y los motores de renderizado.
 * Evita import circular con Engine usando _active + fallbacks legacy en globalThis.
 */
export class RenderBridge {
	static _active = null;

	static setActive(engine) {
		this._active = engine || null;
	}

	static active() {
		if (this._active) return this._active;

		const { Engine, PIXIEngine, LittleEngine } = globalThis;
		if (Engine?._running) return Engine;
		if (PIXIEngine?._running) return PIXIEngine;
		if (LittleEngine?._running) return LittleEngine;
		if (Engine?.canvas) return Engine;
		if (PIXIEngine?.app) return PIXIEngine;
		if (LittleEngine?._container) return LittleEngine;

		return Engine ?? null;
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
		if (typeof globalThis.mainCanvas !== 'undefined') return globalThis.mainCanvas;
		return null;
	}

	static bindInput() {
		const canvas = this.canvas;
		if (canvas) Input.init(canvas);
	}
}
