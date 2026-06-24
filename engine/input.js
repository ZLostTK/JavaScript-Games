class Input {
	static init(canvas) {
		this._keys = {};
		this._pressed = {};
		this._released = {};
		this._touches = [];
		this._touchStarted = [];
		this._touchEnded = [];
		this._mouse = { x: 0, y: 0, down: false, px: 0, py: 0, pdown: false };
		
		this._onKeyDown = (e) => {
			if (e.repeat) return;
			if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
				return;
			}
			this._keys[e.code] = true;
			this._pressed[e.code] = true;
			e.preventDefault();
		};
		
		this._onKeyUp = (e) => {
			if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
				return;
			}
			this._keys[e.code] = false;
			this._released[e.code] = true;
			e.preventDefault();
		};
		
		this._onTouchStart = (e) => {
			for (const t of e.changedTouches) {
				const r = canvas.getBoundingClientRect();
				const pt = { id: t.identifier, x: t.clientX - r.left, y: t.clientY - r.top };
				this._touches.push(pt);
				this._touchStarted.push(pt);
			}
			e.preventDefault();
		};
		
		this._onTouchEnd = (e) => {
			for (const t of e.changedTouches) {
				this._touches = this._touches.filter(t2 => t2.id !== t.identifier);
				this._touchEnded.push(t.identifier);
			}
			e.preventDefault();
		};
		
		this._onTouchMove = (e) => {
			for (const t of e.changedTouches) {
				const existing = this._touches.find(t2 => t2.id === t.identifier);
				if (existing) {
					const r = canvas.getBoundingClientRect();
					existing.x = t.clientX - r.left;
					existing.y = t.clientY - r.top;
				}
			}
			e.preventDefault();
		};
		
		this._onMouseDown = (e) => {
			this._mouse.down = true;
			this._mouse.x = e.offsetX;
			this._mouse.y = e.offsetY;
		};
		
		this._onMouseUp = (e) => {
			this._mouse.down = false;
			this._mouse.x = e.offsetX;
			this._mouse.y = e.offsetY;
		};
		
		this._onMouseMove = (e) => {
			this._mouse.x = e.offsetX;
			this._mouse.y = e.offsetY;
		};
		
		window.addEventListener('keydown', this._onKeyDown);
		window.addEventListener('keyup', this._onKeyUp);
		if (canvas) {
			canvas.addEventListener('touchstart', this._onTouchStart, { passive: false });
			canvas.addEventListener('touchend', this._onTouchEnd, { passive: false });
			canvas.addEventListener('touchmove', this._onTouchMove, { passive: false });
			canvas.addEventListener('mousedown', this._onMouseDown);
			canvas.addEventListener('mouseup', this._onMouseUp);
			canvas.addEventListener('mousemove', this._onMouseMove);
		}
	}
	
	static isDown(key) { return !!this._keys[key]; }
	static isPressed(key) { return !!this._pressed[key]; }
	static isReleased(key) { return !!this._released[key]; }
	static getTouch(i = 0) { return this._touches[i] || null; }
	static getTouchCount() { return this._touches.length; }
	static isTouchStarted() { return this._touchStarted.length > 0; }
	static getMouse() { return this._mouse; }
	static isMousePressed() { return this._mouse.down && !this._mouse.pdown; }
	
	static endFrame() {
		this._pressed = {};
		this._released = {};
		this._touchStarted = [];
		this._touchEnded = [];
		this._mouse.px = this._mouse.x;
		this._mouse.py = this._mouse.y;
		this._mouse.pdown = this._mouse.down;
	}
}
