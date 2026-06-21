const game = {
  init() {
    this.paddleW = 80;
    this.paddleH = 12;
    this.paddleY = Engine.H - 40;
    this.paddleX = Engine.W / 2 - this.paddleW / 2;

    this.ballR = 6;
    this.ballX = Engine.W / 2;
    this.ballY = this.paddleY - this.ballR;
    this.ballDX = 3;
    this.ballDY = -4;
    this.ballSpeed = 5;
    this.ballLaunched = false;

    this.bricks = [];
    const bw = 52, bh = 18, pad = 4, top = 40;
    const colors = ['#e94560', '#533483', '#0f3460', '#4ecca3', '#e94560'];
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 8; c++)
        this.bricks.push({
          x: c * (bw + pad) + pad + 10,
          y: r * (bh + pad) + top,
          w: bw, h: bh, alive: true, color: colors[r]
        });

    this.score = 0;
    this.lives = 3;
    this.gameOver = false;
    this.won = false;

    Audio.synth('hit', 'square', 300, 0.06, 0.1);
    Audio.synth('brick', 'sine', 500, 0.08, 0.15);
    Audio.synth('lose', 'saw', 150, 0.3, 0.15);
    Audio.synth('win', 'square', 600, 0.4, 0.15);

    this.btnLeft = false;
    this.btnRight = false;
    this.btnAction = false;
    if (!this.buttonsBound) {
      const bindBtn = (id, prop) => {
        const el = document.getElementById(id);
        if (el) {
          const down = (e) => { e.preventDefault(); this[prop] = true; };
          const up = (e) => { e.preventDefault(); this[prop] = false; };
          el.addEventListener('touchstart', down, {passive: false});
          el.addEventListener('touchend', up, {passive: false});
          el.addEventListener('mousedown', down);
          el.addEventListener('mouseup', up);
          el.addEventListener('mouseleave', up);
        }
      };
      bindBtn('btn-left', 'btnLeft');
      bindBtn('btn-right', 'btnRight');
      bindBtn('btn-action', 'btnAction');
      
      if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        const mc = document.getElementById('mobile-controls');
        if (mc) mc.classList.remove('hidden');
      }
      this.buttonsBound = true;
    }
  },

  update(dt) {
    if (this.gameOver) {
      if (Input.isPressed('Space') || Input.isPressed('Enter')) this.init();
      return;
    }

    const mouse = Input.getMouse();
    const touch = Input.getTouch();
    const speed = 350 * dt;

    if (Input.isDown('ArrowLeft') || this.btnLeft) this.paddleX -= speed;
    if (Input.isDown('ArrowRight') || this.btnRight) this.paddleX += speed;
    if (touch) {
      this.paddleX = touch.x - this.paddleW / 2;
    } else if (mouse.down) {
      this.paddleX = mouse.x - this.paddleW / 2;
    }
    this.paddleX = Math.max(0, Math.min(Engine.W - this.paddleW, this.paddleX));

    if (!this.ballLaunched) {
      this.ballX = this.paddleX + this.paddleW / 2;
      this.ballY = this.paddleY - this.ballR;
      if (Input.isDown('Space') || Input.isPressed('Enter') || Input.isMousePressed() || Input.isTouchStarted() || this.btnAction) {
        this.ballLaunched = true;
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
        this.ballDX = Math.cos(angle) * this.ballSpeed;
        this.ballDY = Math.sin(angle) * this.ballSpeed;
      }
      return;
    }

    this.ballX += this.ballDX;
    this.ballY += this.ballDY;

    if (this.ballX - this.ballR < 0) { this.ballX = this.ballR; this.ballDX = -this.ballDX; Audio.play('hit'); }
    if (this.ballX + this.ballR > Engine.W) { this.ballX = Engine.W - this.ballR; this.ballDX = -this.ballDX; Audio.play('hit'); }
    if (this.ballY - this.ballR < 0) { this.ballY = this.ballR; this.ballDY = -this.ballDY; Audio.play('hit'); }

    if (this.ballY + this.ballR > Engine.H) {
      this.lives--;
      Audio.play('lose');
      if (this.lives <= 0) { this.gameOver = true; return; }

      const bw = 52, bh = 18, pad = 4, top = 40;
      const colors = ['#e94560', '#533483', '#0f3460', '#4ecca3', '#e94560'];
      const shiftY = 3 * (bh + pad);
      for (const b of this.bricks) {
        if (b.alive) b.y += shiftY;
      }
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 8; c++) {
          this.bricks.push({
            x: c * (bw + pad) + pad + 10,
            y: r * (bh + pad) + top,
            w: bw, h: bh, alive: true, color: colors[r % colors.length]
          });
        }
      }

      this.ballLaunched = false;
      this.ballX = this.paddleX + this.paddleW / 2;
      this.ballY = this.paddleY - this.ballR;
      return;
    }

    if (this.ballDY > 0 &&
        this.ballY + this.ballR >= this.paddleY &&
        this.ballY + this.ballR <= this.paddleY + this.paddleH + 5 &&
        this.ballX >= this.paddleX && this.ballX <= this.paddleX + this.paddleW) {
      const hit = (this.ballX - this.paddleX) / this.paddleW - 0.5;
      const angle = hit * Math.PI * 0.6 - Math.PI / 2;
      const spd = Math.sqrt(this.ballDX * this.ballDX + this.ballDY * this.ballDY);
      this.ballDX = Math.cos(angle) * spd;
      this.ballDY = Math.sin(angle) * spd;
      this.ballY = this.paddleY - this.ballR;
      Audio.play('hit');
    }

    for (const b of this.bricks) {
      if (!b.alive) continue;
      if (this.ballX + this.ballR > b.x && this.ballX - this.ballR < b.x + b.w &&
          this.ballY + this.ballR > b.y && this.ballY - this.ballR < b.y + b.h) {
        b.alive = false;
        this.score += 10 * this.lives;
        Audio.play('brick');
        const ox = Math.min(this.ballX + this.ballR - b.x, b.x + b.w - (this.ballX - this.ballR));
        const oy = Math.min(this.ballY + this.ballR - b.y, b.y + b.h - (this.ballY - this.ballR));
        if (ox < oy) this.ballDX = -this.ballDX;
        else this.ballDY = -this.ballDY;
        break;
      }
    }

    if (this.bricks.every(b => !b.alive)) {
      this.gameOver = true;
      this.won = true;
      Audio.play('win');
    }
  },

  render(ctx) {
    Engine.rect(0, 0, Engine.W, Engine.H, '#0f0f1a');

    for (const b of this.bricks)
      if (b.alive) Engine.rect(b.x, b.y, b.w, b.h, b.color);

    Engine.rect(this.paddleX, this.paddleY, this.paddleW, this.paddleH, '#e0e0e0');
    Engine.circle(this.ballX, this.ballY, this.ballR, '#4ecca3');

    Engine.text(`Score: ${this.score}`, Engine.W / 2, 15, '#e0e0e0', 16);
    Engine.text(`♥ ${this.lives}`, Engine.W - 40, 15, '#e94560', 16);

    if (!this.ballLaunched && !this.gameOver)
      Engine.text('Press Space or tap to launch', Engine.W / 2, Engine.H / 2 + 80, '#a0a0b0', 16);

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, Engine.W, Engine.H);
      Engine.text(this.won ? 'You Win!' : 'Game Over', Engine.W / 2, Engine.H / 2 - 20,
        this.won ? '#4ecca3' : '#e94560', 32);
      Engine.text(`Score: ${this.score}`, Engine.W / 2, Engine.H / 2 + 20, '#e0e0e0', 20);
      Engine.text('Press Space to restart', Engine.W / 2, Engine.H / 2 + 60, '#a0a0b0', 14);
    }
  }
};

Engine.init('game', { width: 480, height: 640, bg: '#0f0f1a' }).start(game);
