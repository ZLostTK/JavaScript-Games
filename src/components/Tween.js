import { Component } from '../ecs/Component.js';

export class Tween extends Component {
	static get type() { return 'tween'; }

	constructor({ target = null, duration = 0.5, props = {}, ease = 'power2.out', delay = 0, yoyo = false, repeat = 0, onComplete = null, paused = false } = {}) {
		super();
		this.target = target;
		this.duration = duration;
		this.props = props;
		this.ease = ease;
		this.delay = delay;
		this.yoyo = yoyo;
		this.repeat = repeat;
		this.onComplete = onComplete;
		this.paused = paused;
		this.tween = null;
	}
}
