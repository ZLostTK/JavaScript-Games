import { Component } from '../ecs/Component.js';

export class PathAgent extends Component {
	static get type() { return 'pathAgent'; }

	constructor({ targetX = 0, targetY = 0, speed = 100, waypoints = [], path = [], grid = null, col = 0, row = 0, updateInterval = 0.5 } = {}) {
		super();
		this.targetX = targetX;
		this.targetY = targetY;
		this.speed = speed;
		this.waypoints = waypoints;
		this.path = path;
		this.grid = grid;
		this.col = col;
		this.row = row;
		this.updateInterval = updateInterval;
		this.elapsed = 0;
		this.pathIndex = 0;
	}
}
