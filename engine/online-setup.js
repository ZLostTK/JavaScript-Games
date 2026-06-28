/** Encapsula el flujo canvas online-setup + OnlineLobby host/join/disconnect */
class OnlineSetup {
	constructor(handlers = {}, opts = {}) {
		this._handlers = handlers;
		this._opts = {
			selectState: opts.selectState ?? 'select',
			setupState: opts.setupState ?? 'online-setup',
			activeStates: opts.activeStates ?? ['playing', 'gameover'],
			disconnectWinner: opts.disconnectWinner ?? '__disconnect__',
			...opts,
		};

		this.menu = opts.menu ?? UIMenu.onlineSetup(opts.menuOpts);

		if (typeof OnlineLobby !== 'undefined') {
			OnlineLobby.onCancel(() => this.cancel());
		}
	}

	get setupState() {
		return this._opts.setupState;
	}

	/** Llamar cuando state === 'online-setup' y hay clickPos (o usar handleInput) */
	handleClick(clickPos) {
		if (!clickPos) return null;
		const id = this.menu.handleClick(clickPos.x, clickPos.y);
		if (id === 'host') this.host();
		else if (id === 'join') this.join();
		else if (id === 'back') this.cancel();
		return id;
	}

	handleInput() {
		return this.menu.handleInput();
	}

	render(ctx, overrides) {
		this.menu.draw(ctx, overrides);
	}

	show(game) {
		if (game) game.state = this._opts.setupState;
	}

	host(overrides = {}) {
		if (typeof OnlineLobby === 'undefined') return;

		const h = { ...this._handlers, ...overrides };
		OnlineLobby.host({
			onConnected: (role) => h.onConnected?.(role),
			onData: (data) => h.onData?.(data),
			onDisconnect: () => this._onDisconnect(h),
			onError: (err) => h.onError?.(err),
			onReady: () => h.onReady?.(),
		}, h.lobbyOptions);
	}

	join(overrides = {}) {
		if (typeof OnlineLobby === 'undefined') return;

		const h = { ...this._handlers, ...overrides };
		OnlineLobby.prepareJoin({
			onConnected: (role) => h.onConnected?.(role),
			onData: (data) => h.onData?.(data),
			onDisconnect: () => this._onDisconnect(h),
			onError: (err) => h.onError?.(err),
		}, h.lobbyOptions);
	}

	cancel() {
		if (typeof OnlineLobby !== 'undefined') OnlineLobby.cancel();
		this._handlers.onCancel?.();
	}

	_onDisconnect(h) {
		if (h.onDisconnect) {
			h.onDisconnect();
			return;
		}

		const game = h.game;
		if (!game) return;

		if (this._opts.activeStates.includes(game.state)) {
			game.winner = this._opts.disconnectWinner;
			game.state = 'gameover';
			if ('restartCd' in game) game.restartCd = 2;
		} else if (game.state === this._opts.setupState) {
			this.cancel();
			game.state = this._opts.selectState;
		}

		if (typeof Online !== 'undefined') Online.destroy();
	}

	/** Factory con game object y callbacks típicos de tablero */
	static forGame(game, opts = {}) {
		const {
			onConnected,
			onData,
			onDisconnect,
			onCancel,
			startOnline = (role) => game.startGame?.('online', role),
			...rest
		} = opts;

		return new OnlineSetup({
			game,
			onConnected: onConnected ?? ((role) => {
				if ('onlineConnected' in game) game.onlineConnected = true;
				startOnline(role);
			}),
			onData,
			onDisconnect,
			onCancel: onCancel ?? (() => { game.state = rest.selectState ?? 'select'; }),
		}, rest);
	}
}
