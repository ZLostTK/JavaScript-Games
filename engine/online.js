class Online {
	static peer = null;
	static conn = null;          // kept for legacy guest / single-conn games
	static _conns = new Map();   // peerId → DataConnection (host multi-peer)
	static callbacks = {};
	
	static on(event, callback) {
		this.callbacks[event] = callback;
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
			if (this.callbacks.onHostReady) this.callbacks.onHostReady(code);
		});
		
		this.peer.on('connection', (c) => {
			console.log('[Online] host: incoming connection from', c.peer);
			// Store each connection separately (multi-peer support)
			this._conns.set(c.peer, c);
			// Also keep this.conn pointing to latest for legacy code
			this.conn = c;
			this._setupHostConn(c);
		});
		
		this.peer.on('error', (err) => {
			console.error('[Online] host: peer error', err);
			if (this.callbacks.onError) this.callbacks.onError(err);
		});
	}
	
	static _setupHostConn(c) {
		c.on('open', () => {
			console.log('[Online] host: connection open!', c.peer);
			// Fire onConnected with 'host' role (legacy compat)
			if (this.callbacks.onConnected) this.callbacks.onConnected('host');
		});

		c.on('data', (raw) => {
			try {
				const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
				// Pass connId so domino can distinguish guests
				if (this.callbacks.onData) this.callbacks.onData(data, c.peer);
			} catch (e) {
				if (this.callbacks.onData) this.callbacks.onData(raw, c.peer);
			}
		});

		c.on('close', () => {
			console.log('[Online] host: connection closed', c.peer);
			this._conns.delete(c.peer);
			if (this.callbacks.onDisconnect) this.callbacks.onDisconnect(c.peer);
		});

		c.on('error', (err) => {
			console.error('[Online] host: connection error', c.peer, err);
			this._conns.delete(c.peer);
			if (this.callbacks.onError) this.callbacks.onError(err);
			if (this.callbacks.onDisconnect) this.callbacks.onDisconnect(c.peer);
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
				if (this.callbacks.onConnected) this.callbacks.onConnected('guest');
			});
		});
		
		this.peer.on('error', (err) => {
			console.error('[Online] guest: peer error', err);
			if (this.callbacks.onError) this.callbacks.onError(err);
		});
	}
	
	static _setupConn() {
		if (!this.conn) return;
		this.conn.on('data', (raw) => {
			try {
				const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
				if (this.callbacks.onData) this.callbacks.onData(data);
			} catch (e) {
				if (this.callbacks.onData) this.callbacks.onData(raw);
			}
		});
		
		this.conn.on('close', () => {
			console.log('[Online] connection closed');
			if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
		});
		
		this.conn.on('error', (err) => {
			console.error('[Online] connection error', err);
			if (this.callbacks.onError) this.callbacks.onError(err);
			if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
		});
	}
	
	/**
	 * Send a message.
	 * @param {object} data
	 * @param {string} [connId]  - peer ID to target (host multi-peer). If omitted:
	 *   • host: sends to ALL connected guests
	 *   • guest: sends to host via this.conn
	 */
	static send(data, connId) {
		const payload = typeof data === 'string' ? data : JSON.stringify(data);

		if (connId) {
			// Send to a specific peer
			const c = this._conns.get(connId);
			if (c && c.open) {
				c.send(payload);
			} else if (this.conn && this.conn.open) {
				// Fallback to legacy single conn (2-player games, guest side)
				this.conn.send(payload);
			}
			return;
		}

		// No connId: broadcast to all (host) or send to host (guest)
		if (this._conns.size > 0) {
			// Host: send to every connected guest
			this._conns.forEach((c) => {
				if (c.open) c.send(payload);
			});
		} else if (this.conn && this.conn.open) {
			// Guest (single conn to host)
			this.conn.send(payload);
		}
	}

	/** Convenience alias used by domino broadcast */
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
