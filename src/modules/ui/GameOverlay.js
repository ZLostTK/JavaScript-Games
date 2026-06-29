import { Engine } from '../../core/Engine.js';
import { RenderBridge } from '../../core/RenderBridge.js';
import { Theme } from '../../utils/Theme.js';

/** Overlay de fin de partida unificado */
export class GameOverlay {
	static draw(ctx, opts = {}) {
		const drawCtx = ctx || RenderBridge.ctx;
		if (!drawCtx) return;

		const W = RenderBridge.W;
		const H = RenderBridge.H;
		const {
			dim = 0.65,
			dimColor = `rgba(0,0,0,${dim})`,
			title,
			titleColor = Theme.colors.accent,
			titleSize = 32,
			titleY,
			lines = [],
			score,
			scoreLabel = 'Puntuación',
			scoreColor = Theme.colors.text,
			scoreSize = 20,
			hint = 'Toca para continuar',
			hintColor = Theme.colors.muted,
			hintSize = 14,
			showHint = true,
			cooldown = 0,
			panel = false,
			panelWidth = 280,
			panelHeight = 200,
			panelOffsetY = -20,
			panelFill = 'rgba(5,10,24,0.88)',
			panelStroke = Theme.colors.warning + '66',
		} = opts;

		drawCtx.save();
		drawCtx.fillStyle = dimColor;
		drawCtx.fillRect(0, 0, W, H);
		drawCtx.restore();

		const cx = W / 2;
		let cy = H / 2;

		if (panel) {
			const pw = panelWidth;
			const ph = panelHeight;
			const px = cx - pw / 2;
			const py = cy - ph / 2 + panelOffsetY;

			drawCtx.save();
			drawCtx.fillStyle = panelFill;
			drawCtx.beginPath();
			drawCtx.roundRect(px, py, pw, ph, 18);
			drawCtx.fill();
			drawCtx.strokeStyle = panelStroke;
			drawCtx.lineWidth = 1.5;
			drawCtx.beginPath();
			drawCtx.roundRect(px, py, pw, ph, 18);
			drawCtx.stroke();
			drawCtx.restore();

			cy = py + ph / 2;
		}

		let y = titleY ?? (panel ? cy - 60 : cy - 40);

		if (title) {
			Engine.text(title, cx, y, titleColor, titleSize);
			y += titleSize + 12;
		}

		if (score !== undefined && score !== null) {
			const scoreText =
				typeof score === 'number' || typeof score === 'string'
					? `${scoreLabel}: ${score}`
					: String(score);
			Engine.text(scoreText, cx, y, scoreColor, scoreSize);
			y += scoreSize + 16;
		}

		for (const line of lines) {
			const ly = line.y ?? y;
			Engine.text(
				line.text,
				line.x ?? cx,
				ly,
				line.color ?? Theme.colors.textMuted,
				line.size ?? 16,
				line.align,
			);
			y = ly + (line.size ?? 16) + 10;
		}

		if (showHint && GameOverlay.canContinue(cooldown)) {
			const hintY = opts.hintY ?? (panel ? cy + 70 : H / 2 + 60);
			Engine.text(hint, cx, hintY, hintColor, hintSize);
		}
	}

	static drawDim(ctx, alpha = 0.65) {
		const drawCtx = ctx || RenderBridge.ctx;
		if (!drawCtx) return;
		drawCtx.fillStyle = `rgba(0,0,0,${alpha})`;
		drawCtx.fillRect(0, 0, RenderBridge.W, RenderBridge.H);
	}

	static canContinue(cooldown) {
		return cooldown === undefined || cooldown <= 0;
	}

	static onlineResult(winner, myId, opts = {}) {
		if (winner === '__disconnect__' || winner === 'disconnect') {
			return { title: 'Rival desconectado', color: Theme.colors.accent };
		}
		if (winner === 'draw' || winner === 0) {
			return {
				title: opts.drawText ?? '¡Empate!',
				color: Theme.colors.warning,
			};
		}
		const won = winner === myId;
		return {
			title: won
				? (opts.winText ?? '¡Ganaste! 🎉')
				: (opts.loseText ?? '¡Perdiste!'),
			color: won ? Theme.colors.success : Theme.colors.accent,
		};
	}
}
