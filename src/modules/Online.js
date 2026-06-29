import Peer from 'peerjs';
import { EventBus } from '../core/EventBus.js';
import { OnlineEventMap } from '../core/Events.js';

export class Online {
	static peer = null;
	static conn = null;
	static _conns = new Map();
	static callbacks = {};

	static on(event, callback) {
		this.callbacks[event] = callback;
		const busEvent = OnlineEventMap[event];
		if (busEvent) EventBus.on(busEvent, callback);
	}

	static _emit(event, ...args) {
		const busEvent = OnlineEventMap[event];
		if (busEvent) {
			const data = args.length <= 1 ? args[0] : args;
			EventBus.emit(busEvent, data);
		}
		if (this.callbacks[event]) this.callbacks[event](...args);
	}

	static genCode() {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
		let c = '';
		for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
		return c;
	}

	static host(codeCreatedCb) {
		this.destroy();
		const code = this.genCode();
		if (codeCreatedCb) codeCreatedCb(code);
		console.log('[Online] host() called. Room code:', code);

		this.peer = new Peer(code, { debug: 0 });

		this.peer.on('open', () => {
			console.log('[Online] host: peer open');
			this._emit('onHostReady', code);
		});

		this.peer.on('connection', (c) => {
			console.log('[Online] host: incoming connection from', c.peer);
			this._conns.set(c.peer, c);
			this.conn = c;
			this._setupHostConn(c);
		});

		this.peer.on('error', (err) => {
			console.error('[Online] host: peer error', err);
			this._emit('onError', err);
		});
	}

	static _setupHostConn(c) {
		c.on('open', () => {
			console.log('[Online] host: connection open!', c.peer);
			this._emit('onConnected', 'host');
		});

		c.on('data', (raw) => {
			try {
				const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
				this._emit('onData', data, c.peer);
			} catch {
				this._emit('onData', raw, c.peer);
			}
		});

		c.on('close', () => {
			console.log('[Online] host: connection closed', c.peer);
			this._conns.delete(c.peer);
			this._emit('onDisconnect', c.peer);
		});

		c.on('error', (err) => {
			console.error('[Online] host: connection error', c.peer, err);
			this._conns.delete(c.peer);
			this._emit('onError', err);
			this._emit('onDisconnect', c.peer);
		});
	}

	static join(code) {
		this.destroy();
		console.log('[Online] join() called for code:', code);
		this.peer = new Peer({ debug: 0 });

		this.peer.on('open', (id) => {
			console.log('[Online] guest: peer open, my id:', id, 'connecting to:', code);
			this.conn = this.peer.connect(code, { reliable: true });
			this._setupConn();

			this.conn.on('open', () => {
				console.log('[Online] guest: connection open!');
				this._emit('onConnected', 'guest');
			});
		});

		this.peer.on('error', (err) => {
			console.error('[Online] guest: peer error', err);
			this._emit('onError', err);
		});
	}

	static _setupConn() {
		if (!this.conn) return;
		this.conn.on('data', (raw) => {
			try {
				const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
				this._emit('onData', data);
			} catch {
				this._emit('onData', raw);
			}
		});

		this.conn.on('close', () => {
			console.log('[Online] connection closed');
			this._emit('onDisconnect');
		});

		this.conn.on('error', (err) => {
			console.error('[Online] connection error', err);
			this._emit('onError', err);
			this._emit('onDisconnect');
		});
	}

	static send(data, connId) {
		const payload = typeof data === 'string' ? data : JSON.stringify(data);

		if (connId) {
			const c = this._conns.get(connId);
			if (c && c.open) {
				c.send(payload);
			} else if (this.conn && this.conn.open) {
				this.conn.send(payload);
			}
			return;
		}

		if (this._conns.size > 0) {
			this._conns.forEach((c) => {
				if (c.open) c.send(payload);
			});
		} else if (this.conn && this.conn.open) {
			this.conn.send(payload);
		}
	}

	static sendToAll(data) {
		this.send(data);
	}

	static destroy() {
		this._conns.forEach((c) => { try { c.close(); } catch (_) {} });
		this._conns.clear();
		if (this.conn) { try { this.conn.close(); } catch (_) {} this.conn = null; }
		if (this.peer) { try { this.peer.destroy(); } catch (_) {} this.peer = null; }
		console.log('[Online] destroyed');
	}
}
