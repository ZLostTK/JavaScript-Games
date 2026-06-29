import { Component } from '../ecs/Component.js';

export class Collider extends Component {
	static get type() { return 'collider'; }

	constructor({
		shape = 'aabb',
		w = 0,
		h = 0,
		r = 0,
		solid = true,
		bounce = false,
		bounceWalls = null,
		tag = '',
	} = {}) {
		super();
		this.shape = shape;
		this.w = w;
		this.h = h;
		this.r = r;
		this.solid = solid;
		this.bounce = bounce;
		this.bounceWalls = bounceWalls;
		this.tag = tag;
	}
}
