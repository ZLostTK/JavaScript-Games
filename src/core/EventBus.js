/**
 * Bus de eventos pub/sub central del motor.
 *
 * @module core/EventBus
 * @see engine/docs/EVENT_BUS.md
 *
 * @example
 * import { EventBus, Events } from '../../src/index.js';
 *
 * EventBus.on(Events.INPUT_KEY_PRESSED, ({ code }) => {
 *   if (code === 'Space') player.jump();
 * });
 *
 * EventBus.emit(Events.AUDIO_PLAY, { name: 'hit' });
 */
export class EventBus {
	static _listeners = new Map();

	/**
	 * Registra un listener para un evento.
	 * @param {string} event - Nombre del evento (usar constantes de `Events`)
	 * @param {(data: unknown) => void} fn - Callback
	 * @returns {() => void} Función para desuscribirse
	 */
	static on(event, fn) {
		if (!this._listeners.has(event)) this._listeners.set(event, new Set());
		this._listeners.get(event).add(fn);
		return () => this.off(event, fn);
	}

	/**
	 * Registra un listener que se ejecuta una sola vez.
	 * @param {string} event
	 * @param {(data: unknown) => void} fn
	 */
	static once(event, fn) {
		const wrapper = (data) => {
			this.off(event, wrapper);
			fn(data);
		};
		return this.on(event, wrapper);
	}

	/**
	 * Elimina un listener.
	 * @param {string} event
	 * @param {(data: unknown) => void} fn
	 */
	static off(event, fn) {
		const set = this._listeners.get(event);
		if (!set) return;
		set.delete(fn);
		if (set.size === 0) this._listeners.delete(event);
	}

	/**
	 * Emite un evento a todos los suscriptores.
	 * @param {string} event
	 * @param {unknown} [data] - Payload del evento
	 */
	static emit(event, data) {
		const set = this._listeners.get(event);
		if (!set) return;
		for (const fn of [...set]) fn(data);
	}

	/**
	 * Limpia listeners. Sin argumento borra todos.
	 * @param {string} [event]
	 */
	static clear(event) {
		if (event) this._listeners.delete(event);
		else this._listeners.clear();
	}
}
