/** Menú canvas declarativo — sustituye _btns + drawButton + hitTest repetido en cada juego */
class UIMenu {
	constructor(items, opts = {}) {
		this.items = items;
		this.opts = {
			centerX: opts.centerX,
			startY: opts.startY ?? 140,
			width: opts.width ?? 220,
			height: opts.height ?? 48,
			gap: opts.gap ?? 70,
			title: opts.title,
			subtitle: opts.subtitle,
			titleY: opts.titleY ?? 50,
			subtitleY: opts.subtitleY ?? 90,
			titleColor: opts.titleColor ?? Theme.colors.accent,
			subtitleColor: opts.subtitleColor ?? Theme.colors.textMuted,
			titleSize: opts.titleSize ?? 28,
			subtitleSize: opts.subtitleSize ?? 14,
			footer: opts.footer,
			footerY: opts.footerY,
			footerColor: opts.footerColor ?? Theme.colors.textDim,
			footerSize: opts.footerSize ?? 11,
			defaultAccent: opts.defaultAccent ?? Theme.colors.accent,
		};
		this._buttons = [];
		this._hover = {};
		this._layout();
	}

	_layout() {
		const W = typeof RenderBridge !== 'undefined' ? RenderBridge.W : 400;
		const centerX = this.opts.centerX ?? W / 2;
		const { width, height, gap, startY, defaultAccent } = this.opts;

		let autoIndex = 0;
		this._buttons = this.items.map((item) => {
			const w = item.w ?? width;
			const h = item.h ?? height;
			const hasY = item.y !== undefined;
			const y = hasY ? item.y : startY + autoIndex * gap;
			if (!hasY) autoIndex++;

			return {
				id: item.id,
				label: item.label,
				accent: item.accent ?? defaultAccent,
				disabled: !!item.disabled,
				x: item.x ?? centerX - w / 2,
				y,
				w,
				h,
			};
		});
	}

	/** Recalcula posiciones si cambió el viewport */
	relayout() {
		this._layout();
	}

	getButton(id) {
		return this._buttons.find(b => b.id === id) ?? null;
	}

	getButtons() {
		return this._buttons;
	}

	updateHover() {
		const p = UICanvas.getPointer();
		this._hover = {};
		for (const btn of this._buttons) {
			this._hover[btn.id] = UICanvas.hitTest(p.x, p.y, btn);
		}
	}

	isHovered(id) {
		return !!this._hover[id];
	}

	draw(ctx, overrides = {}) {
		const drawCtx = ctx || (typeof RenderBridge !== 'undefined' ? RenderBridge.ctx : null);
		if (!drawCtx) return;

		const W = RenderBridge.W;
		const H = RenderBridge.H;
		const o = { ...this.opts, ...overrides };

		if (o.title) {
			Engine.text(o.title, W / 2, o.titleY, o.titleColor, o.titleSize);
		}
		if (o.subtitle) {
			Engine.text(o.subtitle, W / 2, o.subtitleY, o.subtitleColor, o.subtitleSize);
		}

		this.updateHover();

		for (const btn of this._buttons) {
			UICanvas.drawButton(
				drawCtx, btn.label, btn.x, btn.y, btn.w, btn.h,
				btn.accent, this._hover[btn.id], btn.disabled,
			);
		}

		if (o.footer) {
			const fy = o.footerY ?? H - 20;
			Engine.text(o.footer, W / 2, fy, o.footerColor, o.footerSize);
		}
	}

	handleClick(gx, gy) {
		for (const btn of this._buttons) {
			if (!btn.disabled && UICanvas.hitTest(gx, gy, btn)) return btn.id;
		}
		return null;
	}

	/** Devuelve el id del botón pulsado este frame (ratón o touch), o null */
	handleInput(opts = {}) {
		const { skipIfLobbyVisible = true } = opts;
		if (skipIfLobbyVisible && typeof OnlineLobby !== 'undefined' && OnlineLobby.isVisible()) {
			return null;
		}

		const toGame = RenderBridge.toGame.bind(RenderBridge);

		if (Input.isMousePressed()) {
			const m = Input.getMouse();
			const gm = toGame(m.x, m.y);
			return this.handleClick(gm.x, gm.y);
		}

		if (Input.isTouchStarted()) {
			const t = Input.getTouch(0);
			if (t) {
				const gt = toGame(t.x, t.y);
				return this.handleClick(gt.x, gt.y);
			}
		}

		return null;
	}

	/** Menú estándar: vs IA / 1 vs 1 / En línea */
	static modeSelect(opts = {}) {
		const accents = [Theme.colors.accent, Theme.colors.accent2, Theme.colors.success];
		const labels = opts.labels ?? ['vs. IA', '1 vs 1', 'En línea'];
		const ids = opts.ids ?? ['ai', 'pvp', 'online'];

		return new UIMenu(
			ids.map((id, i) => ({
				id,
				label: labels[i],
				accent: accents[i],
			})),
			{
				title: opts.title ?? 'Elige modo de juego',
				subtitle: opts.subtitle,
				footer: opts.footer,
				...opts,
			},
		);
	}

	/** Submenú online: crear / unirse / volver */
	static onlineSetup(opts = {}) {
		return new UIMenu(
			[
				{ id: 'host', label: opts.hostLabel ?? 'Crear partida', y: 140, accent: Theme.colors.success },
				{ id: 'join', label: opts.joinLabel ?? 'Unirse', y: 210, accent: Theme.colors.accent2 },
				{ id: 'back', label: opts.backLabel ?? '← Volver', y: 310, accent: Theme.colors.muted },
			],
			{
				title: opts.title ?? 'En línea',
				subtitle: opts.subtitle ?? '¿Qué quieres hacer?',
				titleColor: opts.titleColor ?? Theme.colors.success,
				...opts,
			},
		);
	}
}
