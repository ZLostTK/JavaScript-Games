/** Shared DOM overlay for PeerJS online lobby */
class OnlineLobby {
	static _els = null;
	static _onCancel = null;
	static _joinHandler = null;

	static _ensure() {
		if (this._els) return this._els;
		const root = document.getElementById('online-ui');
		if (!root) return null;

		this._els = {
			root,
			title: document.getElementById('online-title'),
			status: document.getElementById('online-status'),
			hostView: document.getElementById('host-view'),
			joinView: document.getElementById('join-view'),
			codeDisplay: document.getElementById('room-code-display'),
			codeInput: document.getElementById('room-code-input'),
			copyBtn: document.getElementById('copy-btn'),
			joinBtn: document.getElementById('join-btn'),
			backBtn: document.getElementById('online-back-btn'),
			startOnlineBtn: document.getElementById('start-online-btn'),
			lobbyList: document.getElementById('lobby-list'),
			lobbyLabel: document.getElementById('lobby-label'),
		};

		this._wireStaticEvents();
		return this._els;
	}

	static _wireStaticEvents() {
		const e = this._els;
		if (!e || e._wired) return;
		e._wired = true;

		e.copyBtn?.addEventListener('click', () => {
			const code = e.codeDisplay?.textContent;
			if (!code) return;
			navigator.clipboard.writeText(code).then(() => {
				const prev = e.copyBtn.textContent;
				e.copyBtn.textContent = '¡Copiado!';
				setTimeout(() => { e.copyBtn.textContent = prev; }, 1800);
			});
		});

		e.backBtn?.addEventListener('click', () => {
			this.cancel();
			this._onCancel?.();
		});

		e.joinBtn?.addEventListener('click', () => this._joinHandler?.());
	}

	static onCancel(cb) {
		this._onCancel = cb;
	}

	static show() {
		this._ensure()?.root.classList.remove('hidden');
	}

	static hide() {
		this._ensure()?.root.classList.add('hidden');
	}

	static isVisible() {
		const e = this._ensure();
		return e && !e.root.classList.contains('hidden');
	}

	static setStatus(msg) {
		const e = this._ensure();
		if (e?.status) e.status.textContent = msg;
	}

	static setTitle(msg) {
		const e = this._ensure();
		if (e?.title) e.title.textContent = msg;
	}

	static showHostPanel(code) {
		const e = this._ensure();
		if (!e) return;
		this.setTitle('Crear partida');
		this.setStatus('Creando sala...');
		e.hostView?.classList.remove('hidden');
		e.joinView?.classList.add('hidden');
		if (e.codeDisplay) e.codeDisplay.textContent = code;
		this.show();
	}

	static showJoinPanel() {
		const e = this._ensure();
		if (!e) return;
		this.setTitle('Unirse a partida');
		this.setStatus('Introduce el código del anfitrión');
		e.hostView?.classList.add('hidden');
		e.joinView?.classList.remove('hidden');
		if (e.codeInput) e.codeInput.value = '';
		this.show();
	}

	static cancel() {
		if (typeof Online !== 'undefined') Online.destroy();
		this.hide();
		const e = this._ensure();
		e?.hostView?.classList.add('hidden');
		e?.joinView?.classList.add('hidden');
		if (e?.joinBtn) e.joinBtn.disabled = false;
	}

	static getJoinCode() {
		return (this._ensure()?.codeInput?.value || '').trim().toUpperCase();
	}

	static enableJoin(enabled) {
		const e = this._ensure();
		if (e?.joinBtn) e.joinBtn.disabled = !enabled;
	}

	static host(handlers = {}) {
		if (typeof Online === 'undefined') return;
		const { onReady, onConnected, onData, onDisconnect, onError } = handlers;

		Online.on('onHostReady', () => this.setStatus('Esperando conexión...'));
		Online.on('onConnected', (role) => {
			this.hide();
			this._ensure()?.hostView?.classList.add('hidden');
			onConnected?.(role);
		});
		Online.on('onData', onData);
		Online.on('onDisconnect', onDisconnect);
		Online.on('onError', (err) => {
			this.setStatus('Error: ' + (err?.type || err));
			onError?.(err);
		});

		Online.host((code) => this.showHostPanel(code));
		onReady?.();
	}

	static prepareJoin(handlers = {}) {
		if (typeof Online === 'undefined') return;
		const { onConnected, onData, onDisconnect, onError } = handlers;

		Online.destroy();
		this.showJoinPanel();

		Online.on('onError', () => {
			this.setStatus('Error al conectar');
			this.enableJoin(true);
			onError?.();
		});
		Online.on('onConnected', (role) => {
			this.hide();
			this._ensure()?.joinView?.classList.add('hidden');
			onConnected?.(role);
		});
		Online.on('onData', onData);
		Online.on('onDisconnect', onDisconnect);

		this._joinHandler = () => {
			const code = this.getJoinCode();
			if (code.length < 4) {
				this.setStatus('Código demasiado corto');
				return;
			}
			this.setStatus('Conectando...');
			this.enableJoin(false);
			Online.join(code);
		};
	}
}
