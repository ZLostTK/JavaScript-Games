/**
 * Administrador de entidades, componentes y sistemas ECS.
 *
 * @module ecs/World
 * @see engine/docs/ECS.md
 *
 * @example
 * const world = new World();
 * world.bounds = { w: 480, h: 640 };
 * const id = world.createEntity();
 * world.addComponent(id, Transform, { x: 100, y: 200 });
 * world.addSystem(new MovementSystem(world));
 * world.update(dt);
 */
export class World {
	constructor() {
		/** @type {Set<number>} */
		this._entities = new Set();
		/** @type {Map<string, Map<number, object>>} */
		this._components = new Map();
		/** @type {Map<number, Set<string>>} */
		this._tags = new Map();
		/** @type {import('./System.js').System[]} */
		this._systems = [];
		this._nextId = 1;
		/** Límites del mundo para PhysicsSystem (px). */
		this.bounds = { w: 800, h: 600 };
	}

	/** @returns {number} ID de la nueva entidad */
	createEntity() {
		const id = this._nextId++;
		this._entities.add(id);
		return id;
	}

	/** @param {number} id */
	destroyEntity(id) {
		this._entities.delete(id);
		this._tags.delete(id);
		for (const store of this._components.values()) store.delete(id);
	}

	/** @param {number} id @param {string} tag */
	addTag(id, tag) {
		if (!this._tags.has(id)) this._tags.set(id, new Set());
		this._tags.get(id).add(tag);
	}

	/** @param {number} id @param {string} tag @returns {boolean} */
	hasTag(id, tag) {
		return this._tags.get(id)?.has(tag) ?? false;
	}

	/** @param {number} id @param {string} tag */
	removeTag(id, tag) {
		this._tags.get(id)?.delete(tag);
	}

	/**
	 * @param {number} entityId
	 * @param {typeof import('./Component.js').Component} ComponentClass
	 * @param {object} [data]
	 * @returns {object} Instancia del componente
	 */
	addComponent(entityId, ComponentClass, data = {}) {
		const type = ComponentClass.type;
		if (!this._components.has(type)) this._components.set(type, new Map());
		const comp = data instanceof ComponentClass ? data : new ComponentClass(data);
		this._components.get(type).set(entityId, comp);
		return comp;
	}

	/**
	 * @param {number} entityId
	 * @param {typeof import('./Component.js').Component} ComponentClass
	 */
	getComponent(entityId, ComponentClass) {
		return this._components.get(ComponentClass.type)?.get(entityId) ?? null;
	}

	/** @param {number} entityId @param {typeof import('./Component.js').Component} ComponentClass */
	hasComponent(entityId, ComponentClass) {
		return this._components.get(ComponentClass.type)?.has(entityId) ?? false;
	}

	/** @param {number} entityId @param {typeof import('./Component.js').Component} ComponentClass */
	removeComponent(entityId, ComponentClass) {
		this._components.get(ComponentClass.type)?.delete(entityId);
	}

	/**
	 * Entidades que tienen todos los componentes indicados.
	 * @param {...typeof import('./Component.js').Component} ComponentClasses
	 * @returns {number[]}
	 */
	query(...ComponentClasses) {
		const types = ComponentClasses.map((C) => C.type);
		const primary = this._components.get(types[0]);
		if (!primary) return [];

		const result = [];
		for (const id of primary.keys()) {
			if (!this._entities.has(id)) continue;
			if (types.every((t) => this._components.get(t)?.has(id))) result.push(id);
		}
		return result;
	}

	/** @param {import('./System.js').System} system */
	addSystem(system) {
		this._systems.push(system);
		return system;
	}

	/** @param {number} dt - Delta time en segundos */
	update(dt) {
		for (const system of this._systems) {
			if (system.update) system.update(dt);
		}
	}

	/** @param {CanvasRenderingContext2D} ctx */
	render(ctx) {
		for (const system of this._systems) {
			if (system.render) system.render(ctx);
		}
	}

	clear() {
		this._entities.clear();
		this._components.clear();
		this._tags.clear();
		this._systems = [];
		this._nextId = 1;
	}
}
