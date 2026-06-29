import { Engine } from '../../src/core/Engine.js';
import { Input } from '../../src/modules/Input.js';
import { Audio } from '../../src/modules/Audio.js';
import { EventBus } from '../../src/core/EventBus.js';
import { Events } from '../../src/core/Events.js';
import { MobileControls } from '../../src/modules/MobileControls.js';
import { World } from '../../src/ecs/World.js';
import { Transform } from '../../src/components/Transform.js';
import { Velocity } from '../../src/components/Velocity.js';
import { Collider } from '../../src/components/Collider.js';
import { SpriteData } from '../../src/components/SpriteData.js';
import { MovementSystem } from '../../src/systems/MovementSystem.js';
import { PhysicsSystem } from '../../src/systems/PhysicsSystem.js';
import { RenderSystem } from '../../src/systems/RenderSystem.js';

const PADDLE_W = 80;
const PADDLE_H = 12;
const BALL_R = 6;
const BALL_SPEED = 300;
const BRICK_W = 52;
const BRICK_H = 18;
const BRICK_PAD = 4;
const BRICK_TOP = 40;
const BRICK_COLORS = ['#e94560', '#533483', '#0f3460', '#4ecca3', '#e94560'];

function brickLayout() {
	const bricks = [];
	for (let r = 0; r < 5; r++) {
		for (let c = 0; c < 8; c++) {
			bricks.push({
				x: c * (BRICK_W + BRICK_PAD) + BRICK_PAD + 10,
				y: r * (BRICK_H + BRICK_PAD) + BRICK_TOP,
				color: BRICK_COLORS[r],
			});
		}
	}
	return bricks;
}

export const game = {
	init() {
		this.world = new World();
		this.world.bounds = { w: Engine.W, h: Engine.H };

		this.paddleW = PADDLE_W;
		this.paddleH = PADDLE_H;
		this.paddleY = Engine.H - 40;
		this.ballR = BALL_R;
		this.ballSpeed = BALL_SPEED;
		this.ballLaunched = false;
		this.score = 0;
		this.lives = 3;
		this.gameOver = false;
		this.won = false;
		this.brickIds = [];

		this._spawnEntities();
		this._setupSystems();

		Audio.synth('hit', 'square', 300, 0.06, 0.1);
		Audio.synth('brick', 'sine', 500, 0.08, 0.15);
		Audio.synth('lose', 'saw', 150, 0.3, 0.15);
		Audio.synth('win', 'square', 600, 0.4, 0.15);

		this.btnLeft = false;
		this.btnRight = false;
		this.btnAction = false;
		MobileControls.bind(this, { 'btn-left': 'btnLeft', 'btn-right': 'btnRight', 'btn-action': 'btnAction' });

		if (!this._onKeyPressed) {
			this._onKeyPressed = ({ code }) => {
				if (this.gameOver && (code === 'Space' || code === 'Enter')) this.init();
			};
			EventBus.on(Events.INPUT_KEY_PRESSED, this._onKeyPressed);
		}

		if (!this._onWallBounce) {
			this._onWallBounce = ({ id }) => {
				if (id === this.ballId) EventBus.emit(Events.AUDIO_PLAY, { name: 'hit' });
			};
			EventBus.on(Events.ECS_WALL_BOUNCE, this._onWallBounce);
		}
	},

	_spawnEntities() {
		const w = this.world;

		this.paddleId = w.createEntity();
		w.addTag(this.paddleId, 'paddle');
		w.addComponent(this.paddleId, Transform, { x: Engine.W / 2 - PADDLE_W / 2, y: this.paddleY });
		w.addComponent(this.paddleId, SpriteData, { width: PADDLE_W, height: PADDLE_H, color: '#e0e0e0' });
		w.addComponent(this.paddleId, Collider, { shape: 'aabb', w: PADDLE_W, h: PADDLE_H, tag: 'paddle' });

		this.ballId = w.createEntity();
		w.addTag(this.ballId, 'ball');
		const paddleT = w.getComponent(this.paddleId, Transform);
		w.addComponent(this.ballId, Transform, { x: paddleT.x + PADDLE_W / 2, y: this.paddleY - BALL_R });
		w.addComponent(this.ballId, Velocity, { vx: 0, vy: 0 });
		w.addComponent(this.ballId, SpriteData, { shape: 'circle', radius: BALL_R, color: '#4ecca3' });
		w.addComponent(this.ballId, Collider, {
			shape: 'circle',
			r: BALL_R,
			solid: true,
			bounce: true,
			bounceWalls: { left: true, right: true, top: true, bottom: false },
			tag: 'ball',
		});

		for (const b of brickLayout()) {
			const id = w.createEntity();
			w.addTag(id, 'brick');
			w.addComponent(id, Transform, { x: b.x, y: b.y });
			w.addComponent(id, SpriteData, { width: BRICK_W, height: BRICK_H, color: b.color });
			w.addComponent(id, Collider, { shape: 'aabb', w: BRICK_W, h: BRICK_H, tag: 'brick' });
			this.brickIds.push(id);
		}
	},

	_setupSystems() {
		this.world.addSystem(new MovementSystem(this.world));
		this.world.addSystem(new PhysicsSystem(this.world, {
			onCollision: (a, b) => this._onCollision(a, b),
		}));
		this.world.addSystem(new RenderSystem(this.world));
	},

	_onCollision(a, b) {
		const w = this.world;
		const ballId = w.hasTag(a, 'ball') ? a : w.hasTag(b, 'ball') ? b : null;
		const otherId = ballId === a ? b : a;
		if (!ballId) return;

		const ballT = w.getComponent(ballId, Transform);
		const ballV = w.getComponent(ballId, Velocity);

		if (w.hasTag(otherId, 'paddle')) {
			const paddleT = w.getComponent(otherId, Transform);
			const hit = (ballT.x - paddleT.x) / PADDLE_W - 0.5;
			const angle = hit * Math.PI * 0.6 - Math.PI / 2;
			const spd = Math.hypot(ballV.vx, ballV.vy) || this.ballSpeed;
			ballV.vx = Math.cos(angle) * spd;
			ballV.vy = Math.sin(angle) * spd;
			ballT.y = this.paddleY - BALL_R;
			EventBus.emit(Events.AUDIO_PLAY, { name: 'hit' });
			return;
		}

		if (w.hasTag(otherId, 'brick')) {
			const brickT = w.getComponent(otherId, Transform);
			const brickC = w.getComponent(otherId, Collider);
			w.getComponent(otherId, SpriteData).hidden = true;
			brickC.solid = false;
			w.removeTag(otherId, 'brick');
			this.score += 10 * this.lives;
			EventBus.emit(Events.AUDIO_PLAY, { name: 'brick' });

			const ox = Math.min(ballT.x + BALL_R - brickT.x, brickT.x + brickC.w - (ballT.x - BALL_R));
			const oy = Math.min(ballT.y + BALL_R - brickT.y, brickT.y + brickC.h - (ballT.y - BALL_R));
			if (ox < oy) ballV.vx = -ballV.vx;
			else ballV.vy = -ballV.vy;
		}
	},

	_resetBall() {
		const w = this.world;
		const paddleT = w.getComponent(this.paddleId, Transform);
		const ballT = w.getComponent(this.ballId, Transform);
		const ballV = w.getComponent(this.ballId, Velocity);
		ballT.x = paddleT.x + PADDLE_W / 2;
		ballT.y = this.paddleY - BALL_R;
		ballV.vx = 0;
		ballV.vy = 0;
		this.ballLaunched = false;
	},

	_addBrickRows() {
		const w = this.world;
		const shiftY = 3 * (BRICK_H + BRICK_PAD);
		for (const id of this.brickIds) {
			if (!w.hasTag(id, 'brick')) continue;
			w.getComponent(id, Transform).y += shiftY;
		}
		for (let r = 0; r < 3; r++) {
			for (let c = 0; c < 8; c++) {
				const id = w.createEntity();
				w.addTag(id, 'brick');
				w.addComponent(id, Transform, {
					x: c * (BRICK_W + BRICK_PAD) + BRICK_PAD + 10,
					y: r * (BRICK_H + BRICK_PAD) + BRICK_TOP,
				});
				w.addComponent(id, SpriteData, {
					width: BRICK_W,
					height: BRICK_H,
					color: BRICK_COLORS[r % BRICK_COLORS.length],
				});
				w.addComponent(id, Collider, { shape: 'aabb', w: BRICK_W, h: BRICK_H, tag: 'brick' });
				this.brickIds.push(id);
			}
		}
	},

	update(dt) {
		if (this.gameOver) return;

		const w = this.world;
		const paddleT = w.getComponent(this.paddleId, Transform);
		const ballT = w.getComponent(this.ballId, Transform);
		const ballV = w.getComponent(this.ballId, Velocity);
		const mouse = Input.getMouse();
		const touch = Input.getTouch();
		const speed = 350;

		if (Input.isDown('ArrowLeft') || this.btnLeft) paddleT.x -= speed * dt;
		if (Input.isDown('ArrowRight') || this.btnRight) paddleT.x += speed * dt;
		if (touch) paddleT.x = touch.x - PADDLE_W / 2;
		else if (mouse.down) paddleT.x = mouse.x - PADDLE_W / 2;
		paddleT.x = Math.max(0, Math.min(Engine.W - PADDLE_W, paddleT.x));

		if (!this.ballLaunched) {
			ballT.x = paddleT.x + PADDLE_W / 2;
			ballT.y = this.paddleY - BALL_R;
			if (Input.isDown('Space') || Input.isPressed('Enter') || Input.isMousePressed()
				|| Input.isTouchStarted() || this.btnAction) {
				this.ballLaunched = true;
				const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
				ballV.vx = Math.cos(angle) * this.ballSpeed;
				ballV.vy = Math.sin(angle) * this.ballSpeed;
			}
			return;
		}

		w.update(dt);

		if (ballT.y - BALL_R > Engine.H) {
			this.lives--;
			EventBus.emit(Events.AUDIO_PLAY, { name: 'lose' });
			if (this.lives <= 0) {
				this.gameOver = true;
				return;
			}
			this._addBrickRows();
			this._resetBall();
			return;
		}

		const aliveBricks = this.brickIds.filter((id) => w.hasTag(id, 'brick'));
		if (aliveBricks.length === 0) {
			this.gameOver = true;
			this.won = true;
			EventBus.emit(Events.AUDIO_PLAY, { name: 'win' });
		}
	},

	render(ctx) {
		Engine.rect(0, 0, Engine.W, Engine.H, '#0f0f1a');
		this.world.render(ctx);

		Engine.text(`Score: ${this.score}`, Engine.W / 2, 15, '#e0e0e0', 16);
		Engine.text(`♥ ${this.lives}`, Engine.W - 40, 15, '#e94560', 16);

		if (!this.ballLaunched && !this.gameOver) {
			Engine.text('Press Space or tap to launch', Engine.W / 2, Engine.H / 2 + 80, '#a0a0b0', 16);
		}

		if (this.gameOver) {
			ctx.fillStyle = 'rgba(0,0,0,0.6)';
			ctx.fillRect(0, 0, Engine.W, Engine.H);
			Engine.text(this.won ? 'You Win!' : 'Game Over', Engine.W / 2, Engine.H / 2 - 20,
				this.won ? '#4ecca3' : '#e94560', 32);
			Engine.text(`Score: ${this.score}`, Engine.W / 2, Engine.H / 2 + 20, '#e0e0e0', 20);
			Engine.text('Press Space to restart', Engine.W / 2, Engine.H / 2 + 60, '#a0a0b0', 14);
		}
	},
};
