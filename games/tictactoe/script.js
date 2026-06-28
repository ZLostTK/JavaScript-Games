/* Tic Tac Toe - vs. IA | 1v1 | Online (PeerJS) */

const game = {
  state: "select",
  mode: null,
  onlineRole: null,
  mySymbol: null,
  onlineConnected: false,

  board: null,
  player: "X",
  ai: "O",
  turn: "X",
  gameOver: false,
  winner: null,
  winLine: null,
  scores: { X: 0, O: 0, draws: 0 },

  hadMouse: false,
  hadTouch: false,
  _aiTimer: null,
  restartCd: 0,

  size: 0,
  offsetX: 0,
  offsetY: 0,
  cellSize: 0,
  _btns: {},

  init() {
    this.state = "select";
    this.mode = null;
    this.onlineRole = null;
    this.mySymbol = null;
    this.onlineConnected = false;

    this.board = Array(9).fill(null);
    this.player = "X";
    this.ai = "O";
    this.turn = "X";
    this.gameOver = false;
    this.winner = null;
    this.winLine = null;
    this.scores = { X: 0, O: 0, draws: 0 };
    this.hadMouse = false;
    this.hadTouch = false;
    this._aiTimer = null;
    this.restartCd = 0;
    this._btns = {};

    this._computeLayout();

    Audio.synth("place", "sine", 600, 0.08, 0.2);
    Audio.synth("win", "square", 400, 0.3, 0.15);
    Audio.synth("draw", "saw", 200, 0.3, 0.1);
  },

  _computeLayout() {
    this.size = Math.min(Engine.W, Engine.H) * 0.7;
    this.offsetX = (Engine.W - this.size) / 2;
    this.offsetY = (Engine.H - this.size) / 2 - 10;
    this.cellSize = this.size / 3;
  },

  startGame(mode, role) {
    this.mode = mode;
    this.onlineRole = role || null;
    this.mySymbol = mode === "online" && role === "guest" ? "O" : "X";
    this.player = this.mySymbol;
    this.ai = this.mySymbol === "X" ? "O" : "X";

    this.board = Array(9).fill(null);
    this.turn = "X";
    this.gameOver = false;
    this.winner = null;
    this.winLine = null;
    this.hadMouse = Input.isMousePressed();
    this.hadTouch = Input.getTouchCount() > 0;
    this._aiTimer = null;
    this.restartCd = 0;

    this.state = "playing";
  },

  update(dt) {
    this._computeLayout();

    const gm = UICanvas.getPointer();
    const touch = Input.getTouch();
    const gt = touch ? Engine.toGame(touch.x, touch.y) : null;

    const mouseClick = Input.isMousePressed() && !this.hadMouse;
    const touchTap = Input.getTouchCount() > 0 && !this.hadTouch;
    this.hadMouse = Input.isMousePressed();
    this.hadTouch = Input.getTouchCount() > 0;

    const clickPos = mouseClick ? gm : touchTap ? gt : null;

    if (this.state === "select") {
      if (clickPos) {
        if (
          this._btns.ai &&
          UICanvas.hitTest(clickPos.x, clickPos.y, this._btns.ai)
        )
          this.startGame("ai");
        if (
          this._btns.pvp &&
          UICanvas.hitTest(clickPos.x, clickPos.y, this._btns.pvp)
        )
          this.startGame("pvp");
        if (
          this._btns.online &&
          UICanvas.hitTest(clickPos.x, clickPos.y, this._btns.online)
        )
          this._showOnlineSetup();
      }
      return;
    }

    if (this.state === "online-setup") {
      if (clickPos) {
        if (
          this._btns.host &&
          UICanvas.hitTest(clickPos.x, clickPos.y, this._btns.host)
        )
          this._hostGame();
        if (
          this._btns.join &&
          UICanvas.hitTest(clickPos.x, clickPos.y, this._btns.join)
        )
          this._joinGame();
        if (
          this._btns.back &&
          UICanvas.hitTest(clickPos.x, clickPos.y, this._btns.back)
        )
          this._cancelOnline();
      }
      return;
    }

    if (this.state === "gameover") {
      this.restartCd -= dt;
      if (this.restartCd <= 0 && clickPos) this._returnToSelect();
      return;
    }

    if (this.state !== "playing") return;

    const isMyTurn = this._isMyTurn();

    if (isMyTurn) {
      if (clickPos) {
        const col = Math.floor((clickPos.x - this.offsetX) / this.cellSize);
        const row = Math.floor((clickPos.y - this.offsetY) / this.cellSize);
        if (col >= 0 && col < 3 && row >= 0 && row < 3) {
          const idx = row * 3 + col;
          if (this.board[idx] === null) this.makeMove(idx, true);
        }
      }
      if (Input.isPressed("Space")) this._returnToSelect();
    } else if (this.mode === "ai") {
      if (!this._aiTimer) this._aiTimer = 0.3;
      this._aiTimer -= dt;
      if (this._aiTimer <= 0) {
        this._aiTimer = null;
        const idx = this.getBestMove();
        if (idx !== -1) this.makeMove(idx, false);
      }
    }
  },

  _isMyTurn() {
    if (this.gameOver) return false;
    if (this.mode === "pvp") return true;
    if (this.mode === "ai") return this.turn === this.player;
    if (this.mode === "online") return this.turn === this.mySymbol;
    return false;
  },

  makeMove(idx, isLocal) {
    if (this.board[idx] !== null) return;
    this.board[idx] = this.turn;
    Audio.play("place");

    if (isLocal && this.mode === "online") {
      Online.send({ type: "move", index: idx });
    }

    const result = this.checkWinner();
    if (result) {
      this.gameOver = true;
      this.winner = result.winner;
      this.winLine = result.line;
      this.state = "gameover";
      this.restartCd = 1.2;
      if (result.winner === "draw") {
        this.scores.draws++;
        Audio.play("draw");
      } else {
        this.scores[result.winner]++;
        Audio.play("win");
      }
    } else {
      this.turn = this.turn === "X" ? "O" : "X";
    }
  },

  checkWinner() {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const l of lines) {
      if (
        this.board[l[0]] &&
        this.board[l[0]] === this.board[l[1]] &&
        this.board[l[1]] === this.board[l[2]]
      ) {
        return { winner: this.board[l[0]], line: l };
      }
    }
    if (this.board.every((c) => c !== null))
      return { winner: "draw", line: null };
    return null;
  },

  getBestMove() {
    let best = -1,
      bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (this.board[i] !== null) continue;
      this.board[i] = this.ai;
      const score = this._minimax(this.board, 0, false);
      this.board[i] = null;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  },

  _minimax(board, depth, isMax) {
    const result = this._evaluate(board, depth);
    if (result !== null) return result;
    let best = isMax ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== null) continue;
      board[i] = isMax ? this.ai : this.player;
      const score = this._minimax(board, depth + 1, !isMax);
      board[i] = null;
      best = isMax ? Math.max(best, score) : Math.min(best, score);
    }
    return best;
  },

  _evaluate(board, depth) {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];
    for (const l of lines) {
      if (
        board[l[0]] &&
        board[l[0]] === board[l[1]] &&
        board[l[1]] === board[l[2]]
      ) {
        return board[l[0]] === this.ai ? 10 - depth : depth - 10;
      }
    }
    if (board.every((c) => c !== null)) return 0;
    return null;
  },

  _returnToSelect() {
    OnlineLobby.cancel();
    this.state = "select";
    this.mode = null;
    this.board = Array(9).fill(null);
    this.turn = "X";
    this.gameOver = false;
    this.winner = null;
    this.winLine = null;
    this._aiTimer = null;
  },

  _showOnlineSetup() {
    this.state = "online-setup";
  },

  _cancelOnline() {
    OnlineLobby.cancel();
    this.state = "select";
  },

  _hostGame() {
    OnlineLobby.host({
      onConnected: () => {
        this.onlineConnected = true;
        this.startGame("online", "host");
      },
      onData: (data) => {
        if (data.type === "move") this.makeMove(data.index, false);
      },
      onDisconnect: () => this._onDisconnect(),
    });
  },

  _joinGame() {
    OnlineLobby.prepareJoin({
      onConnected: () => {
        this.onlineConnected = true;
        this.startGame("online", "guest");
      },
      onData: (data) => {
        if (data.type === "move") this.makeMove(data.index, false);
      },
      onDisconnect: () => this._onDisconnect(),
    });
  },

  _onDisconnect() {
    if (this.state === "playing" || this.state === "gameover") {
      this.winner = "__disconnect__";
      this.state = "gameover";
      this.restartCd = 2;
    }
    Online.destroy();
  },

  render(ctx) {
    Engine.rect(0, 0, Engine.W, Engine.H, Theme.colors.bg);

    const W = Engine.W,
      H = Engine.H;
    const gm = UICanvas.getPointer();

    if (this.state === "select") {
      Engine.text("Tic Tac Toe", W / 2, 50, Theme.colors.accent, 28);
      Engine.text("Elige modo de juego", W / 2, 90, Theme.colors.textMuted, 14);

      const bw = 200,
        bh = 52,
        bx = W / 2 - bw / 2;
      const b1 = { x: bx, y: 140, w: bw, h: bh };
      const b2 = { x: bx, y: 210, w: bw, h: bh };
      const b3 = { x: bx, y: 280, w: bw, h: bh };

      this._btns.ai = b1;
      this._btns.pvp = b2;
      this._btns.online = b3;

      UICanvas.drawButton(
        ctx,
        "vs. IA",
        b1.x,
        b1.y,
        b1.w,
        b1.h,
        Theme.colors.accent,
        UICanvas.hitTest(gm.x, gm.y, b1),
      );
      UICanvas.drawButton(
        ctx,
        "1 vs 1",
        b2.x,
        b2.y,
        b2.w,
        b2.h,
        Theme.colors.accent2,
        UICanvas.hitTest(gm.x, gm.y, b2),
      );
      UICanvas.drawButton(
        ctx,
        "En línea",
        b3.x,
        b3.y,
        b3.w,
        b3.h,
        Theme.colors.success,
        UICanvas.hitTest(gm.x, gm.y, b3),
      );

      Engine.text(
        "Tic Tac Toe · Vanilla JS",
        W / 2,
        H - 20,
        Theme.colors.textDim,
        11,
      );
      return;
    }

    if (this.state === "online-setup") {
      Engine.text("En línea", W / 2, 50, Theme.colors.success, 28);
      Engine.text("¿Qué quieres hacer?", W / 2, 90, Theme.colors.textMuted, 14);

      const bw = 210,
        bh = 52,
        bx = W / 2 - bw / 2;
      const b1 = { x: bx, y: 140, w: bw, h: bh };
      const b2 = { x: bx, y: 210, w: bw, h: bh };
      const b3 = { x: bx, y: 310, w: bw, h: bh };

      this._btns.host = b1;
      this._btns.join = b2;
      this._btns.back = b3;

      UICanvas.drawButton(
        ctx,
        "Crear partida",
        b1.x,
        b1.y,
        b1.w,
        b1.h,
        Theme.colors.success,
        UICanvas.hitTest(gm.x, gm.y, b1),
      );
      UICanvas.drawButton(
        ctx,
        "Unirse",
        b2.x,
        b2.y,
        b2.w,
        b2.h,
        Theme.colors.accent2,
        UICanvas.hitTest(gm.x, gm.y, b2),
      );
      UICanvas.drawButton(
        ctx,
        "← Volver",
        b3.x,
        b3.y,
        b3.w,
        b3.h,
        Theme.colors.muted,
        UICanvas.hitTest(gm.x, gm.y, b3),
      );
      return;
    }

    if (this.state === "playing" || this.state === "gameover") {
      this._renderBoard(ctx, W, H, gm);
    }
  },

  _renderBoard(ctx, W, H, gm) {
    const s = this.cellSize;
    const ox = this.offsetX;
    const oy = this.offsetY;

    Engine.text("Tic Tac Toe", W / 2, 28, Theme.colors.accent, 20);
    const modeLabel =
      this.mode === "ai"
        ? "vs. IA"
        : this.mode === "pvp"
          ? "1 vs 1"
          : "En línea";
    Engine.text(modeLabel, W / 2, 50, Theme.colors.textDim, 11);

    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(ox + i * s, oy + 6);
      ctx.lineTo(ox + i * s, oy + 3 * s - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ox + 6, oy + i * s);
      ctx.lineTo(ox + 3 * s - 6, oy + i * s);
      ctx.stroke();
    }

    if (this.state === "playing" && this._isMyTurn()) {
      const hc = Math.floor((gm.x - ox) / s);
      const hr = Math.floor((gm.y - oy) / s);
      if (hc >= 0 && hc < 3 && hr >= 0 && hr < 3) {
        const idx = hr * 3 + hc;
        if (!this.board[idx]) {
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fillRect(ox + hc * s + 2, oy + hr * s + 2, s - 4, s - 4);
        }
      }
    }

    ctx.font = `${s * 0.55}px ${Theme.font.mono}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 9; i++) {
      if (!this.board[i]) continue;
      const cx = ox + (i % 3) * s + s / 2;
      const cy = oy + Math.floor(i / 3) * s + s / 2;
      ctx.fillStyle =
        this.board[i] === "X" ? Theme.colors.accent : Theme.colors.accent2;
      ctx.fillText(this.board[i], cx, cy + 2);
    }

    if (this.winLine) {
      ctx.strokeStyle = Theme.colors.success;
      ctx.lineWidth = 4;
      const a = this.winLine[0],
        c = this.winLine[2];
      ctx.beginPath();
      ctx.moveTo(ox + (a % 3) * s + s / 2, oy + Math.floor(a / 3) * s + s / 2);
      ctx.lineTo(ox + (c % 3) * s + s / 2, oy + Math.floor(c / 3) * s + s / 2);
      ctx.stroke();
    }

    const labelX = this._xLabel();
    const labelO = this._oLabel();

    if (this.state === "gameover") {
      let msg, col;
      if (this.winner === "__disconnect__") {
        msg = "Rival desconectado";
        col = Theme.colors.accent;
      } else if (this.winner === "draw") {
        msg = "Empate";
        col = Theme.colors.text;
      } else if (this.mode === "online") {
        msg = this.winner === this.mySymbol ? "Ganaste!" : "Perdiste";
        col =
          this.winner === this.mySymbol
            ? Theme.colors.success
            : Theme.colors.accent;
      } else if (this.mode === "pvp") {
        msg = `Gana ${this.winner === "X" ? labelX : labelO}`;
        col = this.winner === "X" ? Theme.colors.accent : Theme.colors.accent2;
      } else {
        msg = this.winner === this.player ? "Ganaste!" : "Gana la IA";
        col =
          this.winner === this.player
            ? Theme.colors.success
            : Theme.colors.text;
      }
      Engine.text(msg, W / 2, H - 72, col, 22);
      Engine.text("Toca para continuar", W / 2, H - 44, Theme.colors.muted, 13);
    } else {
      let turnMsg;
      if (this.mode === "online") {
        turnMsg = this._isMyTurn() ? "Tu turno" : "Turno del rival";
      } else if (this.mode === "pvp") {
        turnMsg = `Turno de ${this.turn === "X" ? labelX : labelO}`;
      } else {
        turnMsg = this.turn === this.player ? "Tu turno" : "IA pensando...";
      }
      Engine.text(turnMsg, W / 2, H - 60, Theme.colors.textMuted, 15);
    }

    Engine.text(
      `${labelX}: ${this.scores.X}   ${labelO}: ${this.scores.O}   Empates: ${this.scores.draws}`,
      W / 2,
      H - 18,
      Theme.colors.textDim,
      12,
    );
  },

  _xLabel() {
    if (this.mode === "ai") return this.mySymbol === "X" ? "Tú (X)" : "IA (X)";
    if (this.mode === "pvp") return "J1 (X)";
    if (this.mode === "online")
      return this.mySymbol === "X" ? "Tú (X)" : "Rival (X)";
    return "X";
  },

  _oLabel() {
    if (this.mode === "ai") return this.mySymbol === "O" ? "Tú (O)" : "IA (O)";
    if (this.mode === "pvp") return "J2 (O)";
    if (this.mode === "online")
      return this.mySymbol === "O" ? "Tú (O)" : "Rival (O)";
    return "O";
  },
};

OnlineLobby.onCancel(() => game._cancelOnline());
GameBoot.start(game, { canvasId: "game", width: 400, height: 480 });
