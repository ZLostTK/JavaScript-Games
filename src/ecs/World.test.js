import { describe, it, expect, vi } from 'vitest';
import { World } from './World.js';
import { Transform } from '../components/Transform.js';
import { Velocity } from '../components/Velocity.js';
import { Collider } from '../components/Collider.js';
import { MovementSystem } from '../systems/MovementSystem.js';
import { PhysicsSystem } from '../systems/PhysicsSystem.js';
import { AnimationSystem } from '../systems/AnimationSystem.js';
import { SpriteData } from '../components/SpriteData.js';
import { EventBus } from '../core/EventBus.js';
import { Events } from '../core/Events.js';

describe('World', () => {
	it('crea entidades y consulta por componentes', () => {
		const world = new World();
		const id = world.createEntity();
		world.addComponent(id, Transform, { x: 10, y: 20 });
		world.addComponent(id, Velocity, { vx: 100, vy: 0 });

		expect(world.query(Transform, Velocity)).toEqual([id]);
		expect(world.getComponent(id, Transform).x).toBe(10);
	});

	it('elimina entidades y componentes', () => {
		const world = new World();
		const id = world.createEntity();
		world.addComponent(id, Transform, { x: 1, y: 1 });
		world.destroyEntity(id);
		expect(world.query(Transform)).toEqual([]);
	});
});

describe('MovementSystem', () => {
	it('aplica velocidad a transform', () => {
		const world = new World();
		const id = world.createEntity();
		world.addComponent(id, Transform, { x: 0, y: 0 });
		world.addComponent(id, Velocity, { vx: 100, vy: 50 });
		world.addSystem(new MovementSystem(world));

		world.update(0.5);
		const t = world.getComponent(id, Transform);
		expect(t.x).toBe(50);
		expect(t.y).toBe(25);
	});
});

describe('PhysicsSystem', () => {
	it('rebota en paredes y emite evento', () => {
		EventBus.clear();
		const world = new World();
		world.bounds = { w: 100, h: 100 };
		const id = world.createEntity();
		world.addComponent(id, Transform, { x: 4, y: 50 });
		world.addComponent(id, Velocity, { vx: -200, vy: 0 });
		world.addComponent(id, Collider, {
			shape: 'circle',
			r: 5,
			solid: true,
			bounce: true,
		});
		world.addSystem(new PhysicsSystem(world));

		const wallFn = vi.fn();
		EventBus.on(Events.ECS_WALL_BOUNCE, wallFn);
		world.update(0.1);

		expect(world.getComponent(id, Transform).x).toBe(5);
		expect(world.getComponent(id, Velocity).vx).toBe(200);
		expect(wallFn).toHaveBeenCalled();
	});
});

describe('AnimationSystem + SpriteStateMachine', () => {
	it('actualiza fsm en entidades ECS', () => {
		const world = new World();
		const id = world.createEntity();
		const fsm = { update: vi.fn(), getTexture: () => null };
		world.addComponent(id, SpriteData, { fsm, width: 32, height: 32 });
		world.addComponent(id, Transform, { x: 0, y: 0 });

		AnimationSystem.updateEntities(world, 0.016);
		expect(fsm.update).toHaveBeenCalledWith(0.016);
	});
});
