import { Component } from '../ecs/Component.js';

export class PhysicsBody extends Component {
	static get type() { return 'physicsBody'; }

	constructor({ body = null, isStatic = false, density = 0.001, friction = 0.1, restitution = 0, shape = 'rectangle', width = 32, height = 32, radius = 16, label = '' } = {}) {
		super();
		this.body = body;
		this.isStatic = isStatic;
		this.density = density;
		this.friction = friction;
		this.restitution = restitution;
		this.shape = shape;
		this.width = width;
		this.height = height;
		this.radius = radius;
		this.label = label;
	}
}
