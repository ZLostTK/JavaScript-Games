import { Component } from '../ecs/Component.js';

export class DungeonTile extends Component {
	static get type() { return 'dungeonTile'; }

	constructor({ tileType = 'wall', x = 0, y = 0, walkable = false, visible = true, explored = false, color = '#333' } = {}) {
		super();
		this.tileType = tileType;
		this.x = x;
		this.y = y;
		this.walkable = walkable;
		this.visible = visible;
		this.explored = explored;
		this.color = color;
	}
}
