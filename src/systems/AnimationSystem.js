import { EventBus } from '../core/EventBus.js';
import { Events } from '../core/Events.js';
import { SpriteData } from '../components/SpriteData.js';

/**
 * Actualiza máquinas de animación registradas vía EventBus o en SpriteData.fsm.
 * Compatible con SpriteStateMachine de engine/sprite-processor.js.
 */
export class AnimationSystem {
	static _machines = new Map();
	static _initialized = false;

	static init() {
		if (this._initialized) return;
		this._initialized = true;

		EventBus.on(Events.ANIMATION_REGISTER, ({ id, machine }) => {
			if (id && machine) this._machines.set(id, machine);
		});

		EventBus.on(Events.ANIMATION_UNREGISTER, ({ id }) => {
			if (id) this._machines.delete(id);
		});

		EventBus.on(Events.ANIMATION_SET_STATE, ({ id, state }) => {
			const machine = this._machines.get(id);
			if (machine?.setState) machine.setState(state);
		});
	}

	static register(id, machine) {
		this._machines.set(id, machine);
	}

	static unregister(id) {
		this._machines.delete(id);
	}

	static setState(id, state) {
		const machine = this._machines.get(id);
		if (machine?.setState) machine.setState(state);
	}

	static update(dt, world = null) {
		for (const machine of this._machines.values()) {
			if (machine.update) machine.update(dt);
		}
		if (world) this.updateEntities(world, dt);
	}

	/** Actualiza SpriteStateMachine en entidades ECS. */
	static updateEntities(world, dt) {
		for (const id of world.query(SpriteData)) {
			const sprite = world.getComponent(id, SpriteData);
			if (sprite?.fsm?.update) sprite.fsm.update(dt);
		}
	}

	static clear() {
		this._machines.clear();
	}
}
