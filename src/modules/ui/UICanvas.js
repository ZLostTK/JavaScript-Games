import { RenderBridge } from '../../core/RenderBridge.js';
import { Theme } from '../../utils/Theme.js';
import { Input } from '../Input.js';

/** Canvas UI helpers: buttons, hit-testing, pointer coords */
export class UICanvas {
	static drawButton(ctx, label, x, y, w, h, accent, hover, disabled = false) {
		const drawCtx = ctx || RenderBridge.ctx;
		if (!drawCtx) return;

		const r = 10;
		drawCtx.save();
		drawCtx.beginPath();
		drawCtx.roundRect(x, y, w, h, r);
		drawCtx.fillStyle = disabled ? 'rgba(40,40,60,0.4)' : (hover ? accent + 'cc' : accent + '33');
		drawCtx.fill();
		drawCtx.strokeStyle = disabled ? 'rgba(80,80,100,0.35)' : accent + 'aa';
		drawCtx.lineWidth = 1.5;
		drawCtx.stroke();
		drawCtx.fillStyle = disabled ? '#383858' : (hover ? '#fff' : accent);
		drawCtx.font = `bold ${disabled ? 16 : 17}px ${Theme.font.mono}`;
		drawCtx.textAlign = 'center';
		drawCtx.textBaseline = 'middle';
		drawCtx.fillText(label, x + w / 2, y + h / 2);
		drawCtx.restore();
	}

	static hitTest(gx, gy, btn) {
		return gx >= btn.x && gx <= btn.x + btn.w &&
			gy >= btn.y && gy <= btn.y + btn.h;
	}

	static hitFirst(gx, gy, buttons) {
		return buttons.find(b => this.hitTest(gx, gy, b)) || null;
	}

	static getPointer() {
		const touch = Input.getTouch();
		if (touch) return RenderBridge.toGame(touch.x, touch.y);
		const mouse = Input.getMouse();
		return RenderBridge.toGame(mouse.x, mouse.y);
	}

	static layoutButtons(count, opts = {}) {
		const {
			centerX = RenderBridge.W / 2,
			startY = 140,
			gap = 70,
			width = 220,
			height = 48,
		} = opts;
		const buttons = [];
		for (let i = 0; i < count; i++) {
			buttons.push({
				x: centerX - width / 2,
				y: startY + i * gap,
				w: width,
				h: height,
			});
		}
		return buttons;
	}
}
