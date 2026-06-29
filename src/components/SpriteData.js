import { Component } from '../ecs/Component.js';

export class SpriteData extends Component {
	static get type() { return 'sprite'; }

	constructor({
		color = '#ffffff',
		width = 0,
		height = 0,
		radius = 0,
		shape = 'rect',
		fsm = null,
		hidden = false,
	} = {}) {
		super();
		this.color = color;
		this.width = width;
		this.height = height;
		this.radius = radius;
		this.shape = shape;
		/** @type {import('../../engine/sprite-processor.js').SpriteStateMachine|null} */
		this.fsm = fsm;
		this.hidden = hidden;
	}
}
