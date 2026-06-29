/** Clase base para sistemas de lógica del ECS. */
export class System {
	/** @param {import('./World.js').World} world */
	constructor(world) {
		this.world = world;
	}

	/** @param {number} _dt */
	update(_dt) {}

	/** @param {CanvasRenderingContext2D} _ctx */
	render(_ctx) {}
}
