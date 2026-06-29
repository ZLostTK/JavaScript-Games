import { Component } from '../ecs/Component.js';

export class Transform extends Component {
	static get type() { return 'transform'; }

	constructor({ x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1 } = {}) {
		super();
		this.x = x;
		this.y = y;
		this.rotation = rotation;
		this.scaleX = scaleX;
		this.scaleY = scaleY;
	}
}
