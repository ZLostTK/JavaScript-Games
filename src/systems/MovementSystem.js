import { System } from '../ecs/System.js';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';

/** Aplica velocidad a posición (px/s). */
export class MovementSystem extends System {
	update(dt) {
		for (const id of this.world.query(Transform, Velocity)) {
			const t = this.world.getComponent(id, Transform);
			const v = this.world.getComponent(id, Velocity);
			t.x += v.vx * dt;
			t.y += v.vy * dt;
		}
	}
}
