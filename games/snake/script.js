const game = {
  init() {
    this.grid = 20;
    this.cols = Math.floor(Engine.W / this.grid);
    this.rows = Math.floor(Engine.H / this.grid);

    this.snake = [{ x: Math.floor(this.cols / 2), y: Math.floor(this.rows / 2) }];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = this.spawnFood();
    this.score = 0;
    this.gameOver = false;
    this.moveTimer = 0;
    this.moveInterval = 0.15;

    this.swiping = false;
    this.swipeStart = { x: 0, y: 0 };

    Audio.synth('eat', 'sine', 600, 0.08, 0.15);
    Audio.synth('die', 'saw', 100, 0.4, 0.15);

    this.btnUp = false;
    this.btnDown = false;
    this.btnLeft = false;
    this.btnRight = false;
    
    MobileControls.bind(this, { 'btn-up': 'btnUp', 'btn-down': 'btnDown', 'btn-left': 'btnLeft', 'btn-right': 'btnRight' });
  },

  spawnFood() {
    const occ = new Set(this.snake.map(s => `${s.x},${s.y}`));
    let p;
    do { p = { x: Math.floor(Math.random() * this.cols), y: Math.floor(Math.random() * this.rows) }; }
    while (occ.has(`${p.x},${p.y}`));
    return p;
  },

  update(dt) {
    if (this.gameOver) {
      if (Input.isPressed('Space') || Input.isPressed('Enter')) this.init();
      return;
    }

    let reqDir = null;

    if (this.lastPressed) {
      if (this.lastPressed === 'btnUp') reqDir = {x: 0, y: -1};
      else if (this.lastPressed === 'btnDown') reqDir = {x: 0, y: 1};
      else if (this.lastPressed === 'btnLeft') reqDir = {x: -1, y: 0};
      else if (this.lastPressed === 'btnRight') reqDir = {x: 1, y: 0};
    }

    if (!reqDir) {
      if (Input.isPressed('ArrowUp') || this.btnUp) reqDir = {x: 0, y: -1};
      else if (Input.isPressed('ArrowDown') || this.btnDown) reqDir = {x: 0, y: 1};
      else if (Input.isPressed('ArrowLeft') || this.btnLeft) reqDir = {x: -1, y: 0};
      else if (Input.isPressed('ArrowRight') || this.btnRight) reqDir = {x: 1, y: 0};
    }

    if (reqDir) {
      if (reqDir.x !== 0 && this.dir.x === 0) this.nextDir = reqDir;
      if (reqDir.y !== 0 && this.dir.y === 0) this.nextDir = reqDir;
    }

    const touch = Input.getTouch();
    if (touch) {
      if (!this.swiping) {
        this.swiping = true;
        this.swipeStart.x = touch.x;
        this.swipeStart.y = touch.y;
      } else {
        const dx = touch.x - this.swipeStart.x;
        const dy = touch.y - this.swipeStart.y;
        if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
          if (Math.abs(dx) > Math.abs(dy))
            this.nextDir = dx > 0 ? { x: 1, y: 0 } : { x: -1, y: 0 };
          else
            this.nextDir = dy > 0 ? { x: 0, y: 1 } : { x: 0, y: -1 };
          this.swiping = false;
        }
      }
    } else {
      this.swiping = false;
    }

    this.moveInterval = Math.max(0.05, 0.15 - this.score * 0.002);
    this.moveTimer += dt;
    if (this.moveTimer < this.moveInterval) return;
    this.moveTimer = 0;

    this.dir = { ...this.nextDir };

    const head = {
      x: this.snake[0].x + this.dir.x,
      y: this.snake[0].y + this.dir.y
    };

    if (head.x < 0) head.x = this.cols - 1;
    if (head.x >= this.cols) head.x = 0;
    if (head.y < 0) head.y = this.rows - 1;
    if (head.y >= this.rows) head.y = 0;

    if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.gameOver = true;
      Audio.play('die');
      return;
    }

    this.snake.unshift(head);
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score++;
      Audio.play('eat');
      this.food = this.spawnFood();
    } else {
      this.snake.pop();
    }
  },

  render(ctx) {
    Engine.rect(0, 0, Engine.W, Engine.H, '#0f0f1a');

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath(); ctx.moveTo(x * this.grid, 0); ctx.lineTo(x * this.grid, Engine.H); ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * this.grid); ctx.lineTo(Engine.W, y * this.grid); ctx.stroke();
    }

    this.snake.forEach((s, i) => {
      Engine.rect(s.x * this.grid, s.y * this.grid, this.grid - 1, this.grid - 1,
        i === 0 ? '#4ecca3' : '#2d9e7a');
    });

    Engine.rect(this.food.x * this.grid, this.food.y * this.grid,
      this.grid - 1, this.grid - 1, '#e94560');

    Engine.text(`Score: ${this.score}`, Engine.W / 2, 20, '#e0e0e0', 18);

    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, Engine.W, Engine.H);
      Engine.text('Game Over', Engine.W / 2, Engine.H / 2 - 20, '#e94560', 36);
      Engine.text(`Score: ${this.score}`, Engine.W / 2, Engine.H / 2 + 20, '#e0e0e0', 20);
      Engine.text('Press Space to restart', Engine.W / 2, Engine.H / 2 + 60, '#a0a0b0', 14);
    }
  }
};

GameBoot.start(game, { canvasId: 'game', width: 400, height: 400 });
