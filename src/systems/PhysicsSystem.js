import { System } from '../ecs/System.js';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';
import { Collider } from '../components/Collider.js';
import { EventBus } from '../core/EventBus.js';
import { Events } from '../core/Events.js';

function circleAabbOverlap(cx, cy, r, rx, ry, rw, rh) {
	const nearX = Math.max(rx, Math.min(cx, rx + rw));
	const nearY = Math.max(ry, Math.min(cy, ry + rh));
	const dx = cx - nearX;
	const dy = cy - nearY;
	return dx * dx + dy * dy < r * r;
}

/** Colisiones entre entidades y rebotes opcionales en bordes del mundo. */
export class PhysicsSystem extends System {
	/**
	 * @param {import('../ecs/World.js').World} world
	 * @param {{ onCollision?: (a: number, b: number) => void }} [opts]
	 */
	constructor(world, opts = {}) {
		super(world);
		this.onCollision = opts.onCollision ?? null;
	}

	update(_dt) {
		const { w, h } = this.world.bounds;
		const solids = this.world.query(Transform, Collider)
			.filter((id) => this.world.getComponent(id, Collider).solid);

		for (const id of solids) {
			const t = this.world.getComponent(id, Transform);
			const c = this.world.getComponent(id, Collider);
			const v = this.world.getComponent(id, Velocity);
			if (!c.bounce || !v) continue;

			const walls = c.bounceWalls ?? { left: true, right: true, top: true, bottom: true };

			if (c.shape === 'circle') {
				if (walls.left && t.x - c.r < 0) { t.x = c.r; v.vx = Math.abs(v.vx); EventBus.emit(Events.ECS_WALL_BOUNCE, { id }); }
				if (walls.right && t.x + c.r > w) { t.x = w - c.r; v.vx = -Math.abs(v.vx); EventBus.emit(Events.ECS_WALL_BOUNCE, { id }); }
				if (walls.top && t.y - c.r < 0) { t.y = c.r; v.vy = Math.abs(v.vy); EventBus.emit(Events.ECS_WALL_BOUNCE, { id }); }
				if (walls.bottom && t.y + c.r > h) { t.y = h - c.r; v.vy = -Math.abs(v.vy); EventBus.emit(Events.ECS_WALL_BOUNCE, { id }); }
			}
		}

		for (let i = 0; i < solids.length; i++) {
			for (let j = i + 1; j < solids.length; j++) {
				const a = solids[i];
				const b = solids[j];
				if (this._overlaps(a, b)) {
					EventBus.emit(Events.ECS_COLLISION, { a, b });
					this.onCollision?.(a, b);
				}
			}
		}
	}

	_overlaps(a, b) {
		const ta = this.world.getComponent(a, Transform);
		const ca = this.world.getComponent(a, Collider);
		const tb = this.world.getComponent(b, Transform);
		const cb = this.world.getComponent(b, Collider);

		if (ca.shape === 'circle' && cb.shape === 'aabb') {
			return circleAabbOverlap(ta.x, ta.y, ca.r, tb.x, tb.y, cb.w, cb.h);
		}
		if (cb.shape === 'circle' && ca.shape === 'aabb') {
			return circleAabbOverlap(tb.x, tb.y, cb.r, ta.x, ta.y, ca.w, ca.h);
		}
		return ta.x < tb.x + cb.w && ta.x + ca.w > tb.x
			&& ta.y < tb.y + cb.h && ta.y + ca.h > tb.y;
	}
}
