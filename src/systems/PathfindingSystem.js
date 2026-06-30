import { System } from '../ecs/System.js';
import { Transform } from '../components/Transform.js';
import { PathAgent } from '../components/PathAgent.js';
import { Velocity } from '../components/Velocity.js';

export class PathfindingSystem extends System {
	constructor(world, opts = {}) {
		super(world);
		this.grid = null;
		this.finder = null;
		this.tileSize = opts.tileSize || 32;
	}

	setGrid(matrix, tileSize) {
		if (typeof PF === 'undefined') return;
		this.tileSize = tileSize || this.tileSize;
		this.grid = new PF.Grid(matrix);
		this.finder = new PF.AStarFinder();
	}

	update(dt) {
		if (!this.finder || typeof PF === 'undefined') return;

		for (const id of this.world.query(Transform, PathAgent)) {
			const t = this.world.getComponent(id, Transform);
			const a = this.world.getComponent(id, PathAgent);
			const v = this.world.getComponent(id, Velocity);

			a.elapsed += dt;
			if (a.elapsed < a.updateInterval) continue;
			a.elapsed = 0;

			if (!a.path || a.path.length === 0) {
				const from = this._worldToGrid(t.x, t.y);
				const to = this._worldToGrid(a.targetX, a.targetY);
				this.grid.setWalkableAt(a.col, a.row, true);
				a.path = this.finder.findPath(from.x, from.y, to.x, to.y, this.grid.clone());
				a.pathIndex = 0;
				a.col = from.x;
				a.row = from.y;
			}

			if (a.path && a.pathIndex < a.path.length) {
				const [gx, gy] = a.path[a.pathIndex];
				const wx = gx * this.tileSize + this.tileSize / 2;
				const wy = gy * this.tileSize + this.tileSize / 2;
				const dx = wx - t.x;
				const dy = wy - t.y;
				const dist = Math.hypot(dx, dy);

				if (dist < 2) {
					a.pathIndex++;
					a.col = gx;
					a.row = gy;
				} else if (v) {
					const angle = Math.atan2(dy, dx);
					v.vx = Math.cos(angle) * a.speed;
					v.vy = Math.sin(angle) * a.speed;
				}
			}
		}
	}

	_worldToGrid(x, y) {
		return {
			x: Math.floor(x / this.tileSize),
			y: Math.floor(y / this.tileSize),
		};
	}
}
