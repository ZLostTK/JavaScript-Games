import { System } from '../ecs/System.js';
import { Transform } from '../components/Transform.js';
import { PhysicsBody } from '../components/PhysicsBody.js';

export class MatterPhysicsSystem extends System {
	constructor(world, opts = {}) {
		super(world);
		this.engine = null;
		this.worldBounds = opts.bounds || null;
	}

	init() {
		if (typeof Matter === 'undefined') return;
		this.engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });

		if (this.worldBounds) {
			const { x, y, w, h } = this.worldBounds;
			const walls = [
				Matter.Bodies.rectangle(x + w / 2, y - 25, w, 50, { isStatic: true }),
				Matter.Bodies.rectangle(x + w / 2, y + h + 25, w, 50, { isStatic: true }),
				Matter.Bodies.rectangle(x - 25, y + h / 2, 50, h, { isStatic: true }),
				Matter.Bodies.rectangle(x + w + 25, y + h / 2, 50, h, { isStatic: true }),
			];
			Matter.Composite.add(this.engine.world, walls);
		}
	}

	update(dt) {
		if (!this.engine || typeof Matter === 'undefined') return;
		Matter.Engine.update(this.engine, dt * 1000);

		for (const id of this.world.query(Transform, PhysicsBody)) {
			const t = this.world.getComponent(id, Transform);
			const pb = this.world.getComponent(id, PhysicsBody);
			if (!pb.body) continue;
			t.x = pb.body.position.x;
			t.y = pb.body.position.y;
			t.rotation = pb.body.angle;
		}
	}

	createBody(id, x, y) {
		const pb = this.world.getComponent(id, PhysicsBody);
		if (!pb || typeof Matter === 'undefined') return;

		let body;
		if (pb.shape === 'circle') {
			body = Matter.Bodies.circle(x, y, pb.radius, {
				isStatic: pb.isStatic,
				density: pb.density,
				friction: pb.friction,
				restitution: pb.restitution,
				label: pb.label || `entity_${id}`,
			});
		} else {
			body = Matter.Bodies.rectangle(x, y, pb.width, pb.height, {
				isStatic: pb.isStatic,
				density: pb.density,
				friction: pb.friction,
				restitution: pb.restitution,
				label: pb.label || `entity_${id}`,
			});
		}
		pb.body = body;
		Matter.Composite.add(this.engine.world, body);
		return body;
	}

	removeBody(id) {
		const pb = this.world.getComponent(id, PhysicsBody);
		if (pb?.body && typeof Matter !== 'undefined') {
			Matter.Composite.remove(this.engine.world, pb.body);
			pb.body = null;
		}
	}

	applyForce(id, force) {
		const pb = this.world.getComponent(id, PhysicsBody);
		if (pb?.body) Matter.Body.applyForce(pb.body, pb.body.position, force);
	}

	setVelocity(id, velocity) {
		const pb = this.world.getComponent(id, PhysicsBody);
		if (pb?.body) Matter.Body.setVelocity(pb.body, velocity);
	}
}
