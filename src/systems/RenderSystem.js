import { System } from '../ecs/System.js';
import { Transform } from '../components/Transform.js';
import { SpriteData } from '../components/SpriteData.js';
import { RenderBridge } from '../core/RenderBridge.js';

/** Dibuja entidades con Transform + SpriteData. */
export class RenderSystem extends System {
	render(ctx) {
		const engine = RenderBridge.active();
		if (!engine) return;

		for (const id of this.world.query(Transform, SpriteData)) {
			const t = this.world.getComponent(id, Transform);
			const s = this.world.getComponent(id, SpriteData);
			if (s.hidden) continue;

			if (s.fsm) {
				const tex = s.fsm.getTexture();
				if (tex) ctx.drawImage(tex, t.x, t.y, s.width, s.height);
				continue;
			}

			if (s.shape === 'circle') {
				engine.circle(t.x, t.y, s.radius, s.color);
			} else {
				engine.rect(t.x, t.y, s.width, s.height, s.color);
			}
		}
	}
}
