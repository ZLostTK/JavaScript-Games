class Online {
  static peer = null;
  static conn = null;
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
      this.conn = c;
      this._setupConn();
      c.on('open', () => {
        console.log('[Online] host: connection open!');
        if (this.callbacks.onConnected) this.callbacks.onConnected('host');
      });
    });

    this.peer.on('error', (err) => {
      console.error('[Online] host: peer error', err);
      if (this.callbacks.onError) this.callbacks.onError(err);
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

  static send(data) {
    if (this.conn && this.conn.open) {
      this.conn.send(typeof data === 'string' ? data : JSON.stringify(data));
    }
  }

  static destroy() {
    if (this.conn) { try { this.conn.close(); } catch (_) {} this.conn = null; }
    if (this.peer) { try { this.peer.destroy(); } catch (_) {} this.peer = null; }
    console.log('[Online] destroyed');
  }
}
