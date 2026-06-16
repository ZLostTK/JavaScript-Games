const game = {
  init() {
    this.board = Array(9).fill(null);
    this.player = 'X';
    this.ai = 'O';
    this.turn = 'X';
    this.gameOver = false;
    this.winner = null;
    this.winLine = null;
    this.scores = { X: 0, O: 0, draws: 0 };

    Audio.synth('place', 'sine', 600, 0.08, 0.2);
    Audio.synth('win', 'square', 400, 0.3, 0.15);
    Audio.synth('draw', 'saw', 200, 0.3, 0.1);

    this.size = Math.min(Engine.W, Engine.H) * 0.7;
    this.offsetX = (Engine.W - this.size) / 2;
    this.offsetY = (Engine.H - this.size) / 2 - 20;
    this.cellSize = this.size / 3;
    this.restartCd = 0;
    this.hadTouch = false;
    this.hadMouse = false;
  },

  update(dt) {
    if (this.gameOver) {
      this.restartCd -= dt;
      if (this.restartCd <= 0) {
        const hasTouch = Input.getTouchCount() > 0;
        if (Input.isPressed('Space') || (Input.isMousePressed() && !this.hadMouse) || (hasTouch && !this.hadTouch)) {
          this.init();
          return;
        }
        this.hadTouch = hasTouch;
        this.hadMouse = Input.isMousePressed();
      }
      return;
    }

    if (this.turn === this.player) {
      const mouse = Input.getMouse();
      const hasTouch = Input.getTouchCount() > 0;
      let col = -1, row = -1, clicked = false;

      if (Input.isMousePressed() && !this.hadMouse) {
        col = Math.floor((mouse.x - this.offsetX) / this.cellSize);
        row = Math.floor((mouse.y - this.offsetY) / this.cellSize);
        clicked = true;
      }

      if (!clicked && hasTouch && !this.hadTouch) {
        const touch = Input.getTouch();
        col = Math.floor((touch.x - this.offsetX) / this.cellSize);
        row = Math.floor((touch.y - this.offsetY) / this.cellSize);
        clicked = true;
      }
      this.hadTouch = hasTouch;
      this.hadMouse = Input.isMousePressed();

      if (clicked && col >= 0 && col < 3 && row >= 0 && row < 3) {
        this.makeMove(row * 3 + col);
      }
    } else {
      if (!this._aiTimer) this._aiTimer = 0.3;
      this._aiTimer -= dt;
      if (this._aiTimer <= 0) {
        this._aiTimer = null;
        const idx = this.getBestMove();
        if (idx !== -1) this.makeMove(idx);
      }
    }
  },

  makeMove(idx) {
    if (this.board[idx] !== null) return;
    this.board[idx] = this.turn;
    Audio.play('place');

    const result = this.checkWinner();
    if (result) {
      this.gameOver = true;
      this.winner = result.winner;
      this.winLine = result.line;
      if (result.winner === 'draw') {
        this.scores.draws++;
        Audio.play('draw');
      } else {
        this.scores[result.winner]++;
        Audio.play('win');
      }
    } else {
      this.turn = this.turn === 'X' ? 'O' : 'X';
    }
  },

  checkWinner() {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const l of lines) {
      if (this.board[l[0]] && this.board[l[0]] === this.board[l[1]] && this.board[l[1]] === this.board[l[2]]) {
        return { winner: this.board[l[0]], line: l };
      }
    }
    if (this.board.every(c => c !== null)) return { winner: 'draw', line: null };
    return null;
  },

  getBestMove() {
    let best = -1, bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (this.board[i] !== null) continue;
      this.board[i] = this.ai;
      const score = this.anxer(this.board, 0, false);
      this.board[i] = null;
      if (score > bestScore) { bestScore = score; best = i; }
    }
    return best;
  },

  anxer(board, depth, isMax) {
    const result = this.evaluate(board, depth);
    if (result !== null) return result;
    let best = isMax ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue;
      board[i] = isMax ? this.ai : this.player;
      const score = this.anxer(board, depth + 1, !isMax);
      board[i] = null;
      best = isMax ? Math.max(best, score) : Math.min(best, score);
    }
    return best;
  },

  evaluate(board, depth) {
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    for (const l of lines) {
      if (board[l[0]] && board[l[0]] === board[l[1]] && board[l[1]] === board[l[2]]) {
        return board[l[0]] === this.ai ? 10 - depth : depth - 10;
      }
    }
    if (board.every(c => c !== null)) return 0;
    return null;
  },

  render(ctx) {
    Engine.rect(0, 0, Engine.W, Engine.H, '#0f0f1a');
    Engine.text('Tic Tac Toe', Engine.W / 2, 30, '#e94560', 24);

    const s = this.cellSize;
    const ox = this.offsetX;
    const oy = this.offsetY;

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(ox + i * s, oy + 5); ctx.lineTo(ox + i * s, oy + 3 * s - 5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox + 5, oy + i * s); ctx.lineTo(ox + 3 * s - 5, oy + i * s); ctx.stroke();
    }

    ctx.font = `${s * 0.55}px 'Courier New', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 9; i++) {
      if (!this.board[i]) continue;
      const cx = ox + (i % 3) * s + s / 2;
      const cy = oy + Math.floor(i / 3) * s + s / 2;
      ctx.fillStyle = this.board[i] === 'X' ? '#e94560' : '#533483';
      ctx.fillText(this.board[i], cx, cy + 2);
    }

    if (this.winLine) {
      ctx.strokeStyle = '#4ecca3';
      ctx.lineWidth = 4;
      const a = this.winLine[0], c = this.winLine[2];
      ctx.beginPath();
      ctx.moveTo(ox + (a % 3) * s + s / 2, oy + Math.floor(a / 3) * s + s / 2);
      ctx.lineTo(ox + (c % 3) * s + s / 2, oy + Math.floor(c / 3) * s + s / 2);
      ctx.stroke();
    }

    if (this.gameOver) {
      const msg = this.winner === 'draw' ? "It's a draw!"
        : this.winner === this.player ? 'You win!' : 'AI wins!';
      Engine.text(msg, Engine.W / 2, Engine.H - 75,
        this.winner === this.player ? '#4ecca3' : '#e0e0e0', 22);
      Engine.text('Tap or press Space', Engine.W / 2, Engine.H - 45, '#a0a0b0', 14);
    } else {
      Engine.text(this.turn === this.player ? 'Your turn (X)' : 'AI thinking...',
        Engine.W / 2, Engine.H - 60, '#a0a0b0', 16);
    }

    Engine.text(`You ${this.scores.X} - ${this.scores.O} AI  Draws: ${this.scores.draws}`,
      Engine.W / 2, Engine.H - 25, '#a0a0b0', 13);
  }
};

Engine.init('game', { width: 400, height: 480, bg: '#0f0f1a' }).start(game);
