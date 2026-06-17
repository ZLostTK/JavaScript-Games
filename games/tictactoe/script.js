/* ─────────────────────────────────────────────────────────
   Tic Tac Toe — script.js
   Modes: vs. IA  |  1v1 (same device)  |  Online (PeerJS)
   ───────────────────────────────────────────────────────── */

// ── DOM refs for the online overlay ──────────────────────
const onlineUI       = document.getElementById('online-ui');
const onlineTitle    = document.getElementById('online-title');
const onlineStatus   = document.getElementById('online-status');
const hostView       = document.getElementById('host-view');
const joinView       = document.getElementById('join-view');
const roomCodeDisp   = document.getElementById('room-code-display');
const roomCodeInput  = document.getElementById('room-code-input');
const copyBtn        = document.getElementById('copy-btn');
const joinBtn        = document.getElementById('join-btn');
const onlineBackBtn  = document.getElementById('online-back-btn');

// ── PeerJS state ──────────────────────────────────────────
let peer = null;
let conn = null;

function destroyPeer() {
  if (conn) { try { conn.close(); } catch (_) {} conn = null; }
  if (peer) { try { peer.destroy(); } catch (_) {} peer = null; }
}

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

// ── Helper: draw a rounded rect button on canvas ──────────
function drawBtn(ctx, label, x, y, w, h, accent, hover) {
  const r = 10;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = hover
    ? accent + 'cc'
    : accent + '33';
  ctx.fill();
  ctx.strokeStyle = accent + 'aa';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = hover ? '#fff' : accent;
  ctx.font = "bold 17px 'Courier New', monospace";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2);
  ctx.restore();
}

// ── Hit-test a button defined by {x,y,w,h} ───────────────
function hitBtn(gx, gy, btn) {
  return gx >= btn.x && gx <= btn.x + btn.w &&
         gy >= btn.y && gy <= btn.y + btn.h;
}

// ── Main game object ──────────────────────────────────────
const game = {

  // ── state: 'select' | 'online-setup' | 'playing' | 'gameover'
  state: 'select',
  mode: null,          // 'ai' | 'pvp' | 'online'
  onlineRole: null,    // 'host' | 'guest'
  mySymbol: null,      // 'X' | 'O'
  onlineConnected: false,

  // ── board ─────────────────────────────────────────────
  board: null,
  player: 'X',
  ai: 'O',
  turn: 'X',
  gameOver: false,
  winner: null,
  winLine: null,
  scores: { X: 0, O: 0, draws: 0 },

  // ── input helpers ─────────────────────────────────────
  hadMouse: false,
  hadTouch: false,
  _aiTimer: null,
  restartCd: 0,

  // ── layout ────────────────────────────────────────────
  size: 0,
  offsetX: 0,
  offsetY: 0,
  cellSize: 0,

  // ── button rects (recomputed in render) ───────────────
  _btns: {},

  // ─────────────────────────────────────────────────────
  init() {
    this.state = 'select';
    this.mode = null;
    this.onlineRole = null;
    this.mySymbol = null;
    this.onlineConnected = false;

    this.board = Array(9).fill(null);
    this.player = 'X';
    this.ai = 'O';
    this.turn = 'X';
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

    Audio.synth('place', 'sine', 600, 0.08, 0.2);
    Audio.synth('win',   'square', 400, 0.3, 0.15);
    Audio.synth('draw',  'saw', 200, 0.3, 0.1);
  },

  _computeLayout() {
    this.size    = Math.min(Engine.W, Engine.H) * 0.7;
    this.offsetX = (Engine.W - this.size) / 2;
    this.offsetY = (Engine.H - this.size) / 2 - 10;
    this.cellSize = this.size / 3;
  },

  // ─────────────────────────────────────────────────────
  startGame(mode, role) {
    this.mode       = mode;
    this.onlineRole = role || null;
    this.mySymbol   = (mode === 'online' && role === 'guest') ? 'O' : 'X';
    this.player     = this.mySymbol;
    this.ai         = this.mySymbol === 'X' ? 'O' : 'X';

    this.board      = Array(9).fill(null);
    this.turn       = 'X';
    this.gameOver   = false;
    this.winner     = null;
    this.winLine    = null;
    this.hadMouse   = false;
    this.hadTouch   = false;
    this._aiTimer   = null;
    this.restartCd  = 0;

    this.state = 'playing';
  },

  // ─────────────────────────────────────────────────────
  update(dt) {
    this._computeLayout();

    const mouse = Input.getMouse();
    const gm    = Engine.toGame(mouse.x, mouse.y);
    const touch = Input.getTouch();
    const gt    = touch ? Engine.toGame(touch.x, touch.y) : null;

    const mouseClick = Input.isMousePressed() && !this.hadMouse;
    const touchTap   = Input.getTouchCount() > 0 && !this.hadTouch;
    this.hadMouse = Input.isMousePressed();
    this.hadTouch = Input.getTouchCount() > 0;

    const clickPos = mouseClick ? gm : (touchTap ? gt : null);

    // ── SELECT screen ────────────────────────────────
    if (this.state === 'select') {
      if (clickPos) {
        if (this._btns.ai     && hitBtn(clickPos.x, clickPos.y, this._btns.ai))     this.startGame('ai');
        if (this._btns.pvp    && hitBtn(clickPos.x, clickPos.y, this._btns.pvp))    this.startGame('pvp');
        if (this._btns.online && hitBtn(clickPos.x, clickPos.y, this._btns.online)) this._showOnlineSetup();
      }
      return;
    }

    // ── ONLINE-SETUP screen ───────────────────────────
    if (this.state === 'online-setup') {
      if (clickPos) {
        if (this._btns.host && hitBtn(clickPos.x, clickPos.y, this._btns.host)) this._hostGame();
        if (this._btns.join && hitBtn(clickPos.x, clickPos.y, this._btns.join)) this._joinGame();
        if (this._btns.back && hitBtn(clickPos.x, clickPos.y, this._btns.back)) this._cancelOnline();
      }
      return;
    }

    // ── GAMEOVER ─────────────────────────────────────
    if (this.state === 'gameover') {
      this.restartCd -= dt;
      if (this.restartCd <= 0 && clickPos) {
        this._returnToSelect();
      }
      return;
    }

    // ── PLAYING ──────────────────────────────────────
    if (this.state !== 'playing') return;

    const isMyTurn = this._isMyTurn();

    if (isMyTurn) {
      if (clickPos) {
        const col = Math.floor((clickPos.x - this.offsetX) / this.cellSize);
        const row = Math.floor((clickPos.y - this.offsetY) / this.cellSize);
        if (col >= 0 && col < 3 && row >= 0 && row < 3) {
          const idx = row * 3 + col;
          if (this.board[idx] === null) {
            this.makeMove(idx, true);
          }
        }
      }
      if (Input.isPressed('Space')) this._returnToSelect();
    } else if (this.mode === 'ai') {
      // AI turn
      if (!this._aiTimer) this._aiTimer = 0.3;
      this._aiTimer -= dt;
      if (this._aiTimer <= 0) {
        this._aiTimer = null;
        const idx = this.getBestMove();
        if (idx !== -1) this.makeMove(idx, false);
      }
    }
    // online: opponent moves are applied via conn.on('data') below
  },

  _isMyTurn() {
    if (this.gameOver) return false;
    if (this.mode === 'pvp')    return true;           // both players on same device
    if (this.mode === 'ai')     return this.turn === this.player;
    if (this.mode === 'online') return this.turn === this.mySymbol;
    return false;
  },

  // ─────────────────────────────────────────────────────
  makeMove(idx, isLocal) {
    if (this.board[idx] !== null) return;
    this.board[idx] = this.turn;
    Audio.play('place');

    // Send to peer if local move in online mode
    if (isLocal && this.mode === 'online' && conn) {
      conn.send(JSON.stringify({ type: 'move', index: idx }));
    }

    const result = this.checkWinner();
    if (result) {
      this.gameOver = true;
      this.winner   = result.winner;
      this.winLine  = result.line;
      this.state    = 'gameover';
      this.restartCd = 1.2;
      if (result.winner === 'draw') { this.scores.draws++; Audio.play('draw'); }
      else                          { this.scores[result.winner]++; Audio.play('win'); }
    } else {
      this.turn = this.turn === 'X' ? 'O' : 'X';
    }
  },

  // ─────────────────────────────────────────────────────
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

  // ── Minimax ──────────────────────────────────────────
  getBestMove() {
    let best = -1, bestScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (this.board[i] !== null) continue;
      this.board[i] = this.ai;
      const score = this._minimax(this.board, 0, false);
      this.board[i] = null;
      if (score > bestScore) { bestScore = score; best = i; }
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

  // ── Navigation helpers ────────────────────────────────
  _returnToSelect() {
    destroyPeer();
    onlineUI.classList.add('hidden');
    this.state = 'select';
    this.mode  = null;
    this.board = Array(9).fill(null);
    this.turn  = 'X';
    this.gameOver = false;
    this.winner   = null;
    this.winLine  = null;
    this._aiTimer = null;
  },

  _showOnlineSetup() {
    this.state = 'online-setup';
  },

  _cancelOnline() {
    destroyPeer();
    onlineUI.classList.add('hidden');
    this.state = 'select';
  },

  // ── PeerJS — Host ─────────────────────────────────────
  _hostGame() {
    destroyPeer();
    const code = genCode();

    // Show overlay immediately
    onlineTitle.textContent  = 'Crear partida';
    onlineStatus.textContent = 'Esperando a un rival...';
    hostView.classList.remove('hidden');
    joinView.classList.add('hidden');
    roomCodeDisp.textContent = code;
    onlineUI.classList.remove('hidden');

    peer = new Peer(code, { debug: 0 });

    peer.on('open', () => {
      onlineStatus.textContent = 'Esperando conexión...';
    });

    peer.on('connection', (c) => {
      conn = c;
      conn.on('open', () => {
        onlineUI.classList.add('hidden');
        hostView.classList.add('hidden');
        this.onlineConnected = true;
        this.startGame('online', 'host');
      });
      conn.on('data', (raw) => {
        const data = JSON.parse(raw);
        if (data.type === 'move') this.makeMove(data.index, false);
      });
      conn.on('close', () => this._onDisconnect());
      conn.on('error', () => this._onDisconnect());
    });

    peer.on('error', (err) => {
      onlineStatus.textContent = 'Error: ' + err.type;
    });
  },

  // ── PeerJS — Join ─────────────────────────────────────
  _joinGame() {
    destroyPeer();

    onlineTitle.textContent  = 'Unirse a partida';
    onlineStatus.textContent = 'Introduce el código del anfitrión';
    hostView.classList.add('hidden');
    joinView.classList.remove('hidden');
    roomCodeInput.value      = '';
    onlineUI.classList.remove('hidden');

    peer = new Peer({ debug: 0 });

    peer.on('error', (err) => {
      onlineStatus.textContent = 'Error: ' + err.type;
    });

    // The join button submits the code
    joinBtn.onclick = () => {
      const code = roomCodeInput.value.trim().toUpperCase();
      if (code.length < 4) { onlineStatus.textContent = 'Código demasiado corto'; return; }
      onlineStatus.textContent = 'Conectando...';
      joinBtn.disabled = true;

      conn = peer.connect(code, { reliable: true });

      conn.on('open', () => {
        onlineUI.classList.add('hidden');
        joinView.classList.add('hidden');
        this.onlineConnected = true;
        this.startGame('online', 'guest');
      });
      conn.on('data', (raw) => {
        const data = JSON.parse(raw);
        if (data.type === 'move') this.makeMove(data.index, false);
      });
      conn.on('close', () => this._onDisconnect());
      conn.on('error', () => {
        onlineStatus.textContent = 'No se pudo conectar. Verifica el código.';
        joinBtn.disabled = false;
      });
    };
  },

  _onDisconnect() {
    if (this.state === 'playing' || this.state === 'gameover') {
      this.winner = '__disconnect__';
      this.state  = 'gameover';
      this.restartCd = 2;
    }
    destroyPeer();
  },

  // ─────────────────────────────────────────────────────
  render(ctx) {
    Engine.rect(0, 0, Engine.W, Engine.H, '#0f0f1a');

    const W = Engine.W, H = Engine.H;
    const mouse = Input.getMouse();
    const gm    = Engine.toGame(mouse.x, mouse.y);

    // ── SELECT screen ──────────────────────────────────
    if (this.state === 'select') {
      Engine.text('Tic Tac Toe', W / 2, 50, '#e94560', 28);
      Engine.text('Elige modo de juego', W / 2, 90, '#808090', 14);

      const bw = 200, bh = 52, bx = W / 2 - bw / 2;
      const b1 = { x: bx, y: 140, w: bw, h: bh };
      const b2 = { x: bx, y: 210, w: bw, h: bh };
      const b3 = { x: bx, y: 280, w: bw, h: bh };

      this._btns.ai     = b1;
      this._btns.pvp    = b2;
      this._btns.online = b3;

      drawBtn(ctx, 'vs. IA',    b1.x, b1.y, b1.w, b1.h, '#e94560', hitBtn(gm.x, gm.y, b1));
      drawBtn(ctx, '1 vs 1',    b2.x, b2.y, b2.w, b2.h, '#533483', hitBtn(gm.x, gm.y, b2));
      drawBtn(ctx, 'En línea',  b3.x, b3.y, b3.w, b3.h, '#4ecca3', hitBtn(gm.x, gm.y, b3));

      Engine.text('Tic Tac Toe · Vanilla JS', W / 2, H - 20, '#303050', 11);
      return;
    }

    // ── ONLINE-SETUP screen ────────────────────────────
    if (this.state === 'online-setup') {
      Engine.text('En línea', W / 2, 50, '#4ecca3', 28);
      Engine.text('¿Qué quieres hacer?', W / 2, 90, '#808090', 14);

      const bw = 210, bh = 52, bx = W / 2 - bw / 2;
      const b1 = { x: bx, y: 140, w: bw, h: bh };
      const b2 = { x: bx, y: 210, w: bw, h: bh };
      const b3 = { x: bx, y: 310, w: bw, h: bh };

      this._btns.host = b1;
      this._btns.join = b2;
      this._btns.back = b3;

      drawBtn(ctx, 'Crear partida', b1.x, b1.y, b1.w, b1.h, '#4ecca3', hitBtn(gm.x, gm.y, b1));
      drawBtn(ctx, 'Unirse',        b2.x, b2.y, b2.w, b2.h, '#533483', hitBtn(gm.x, gm.y, b2));
      drawBtn(ctx, '← Volver',     b3.x, b3.y, b3.w, b3.h, '#606070', hitBtn(gm.x, gm.y, b3));
      return;
    }

    // ── PLAYING / GAMEOVER ─────────────────────────────
    if (this.state === 'playing' || this.state === 'gameover') {
      this._renderBoard(ctx, W, H, gm);
    }
  },

  _renderBoard(ctx, W, H, gm) {
    const s  = this.cellSize;
    const ox = this.offsetX;
    const oy = this.offsetY;

    // Title + mode badge
    Engine.text('Tic Tac Toe', W / 2, 28, '#e94560', 20);
    const modeLabel = this.mode === 'ai' ? 'vs. IA' : this.mode === 'pvp' ? '1 vs 1' : 'En línea';
    Engine.text(modeLabel, W / 2, 50, '#404060', 11);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth   = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(ox + i*s, oy + 6); ctx.lineTo(ox + i*s, oy + 3*s - 6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox + 6, oy + i*s); ctx.lineTo(ox + 3*s - 6, oy + i*s); ctx.stroke();
    }

    // Hover highlight (only on player's turn)
    if (this.state === 'playing' && this._isMyTurn()) {
      const hc = Math.floor((gm.x - ox) / s);
      const hr = Math.floor((gm.y - oy) / s);
      if (hc >= 0 && hc < 3 && hr >= 0 && hr < 3) {
        const idx = hr * 3 + hc;
        if (!this.board[idx]) {
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(ox + hc*s + 2, oy + hr*s + 2, s - 4, s - 4);
        }
      }
    }

    // Pieces
    ctx.font          = `${s * 0.55}px 'Courier New', monospace`;
    ctx.textAlign     = 'center';
    ctx.textBaseline  = 'middle';
    for (let i = 0; i < 9; i++) {
      if (!this.board[i]) continue;
      const cx = ox + (i % 3) * s + s / 2;
      const cy = oy + Math.floor(i / 3) * s + s / 2;
      ctx.fillStyle = this.board[i] === 'X' ? '#e94560' : '#533483';
      ctx.fillText(this.board[i], cx, cy + 2);
    }

    // Win line
    if (this.winLine) {
      ctx.strokeStyle = '#4ecca3';
      ctx.lineWidth   = 4;
      const a = this.winLine[0], c = this.winLine[2];
      ctx.beginPath();
      ctx.moveTo(ox + (a % 3)*s + s/2, oy + Math.floor(a/3)*s + s/2);
      ctx.lineTo(ox + (c % 3)*s + s/2, oy + Math.floor(c/3)*s + s/2);
      ctx.stroke();
    }

    // Status / game-over messages
    const labelX = this._xLabel();
    const labelO = this._oLabel();

    if (this.state === 'gameover') {
      let msg, col;
      if (this.winner === '__disconnect__') {
        msg = 'Rival desconectado';  col = '#e94560';
      } else if (this.winner === 'draw') {
        msg = 'Empate';              col = '#e0e0e0';
      } else if (this.mode === 'online') {
        msg = this.winner === this.mySymbol ? 'Ganaste!' : 'Perdiste';
        col = this.winner === this.mySymbol ? '#4ecca3' : '#e94560';
      } else if (this.mode === 'pvp') {
        msg = `Gana ${this.winner === 'X' ? labelX : labelO}`;
        col = this.winner === 'X' ? '#e94560' : '#533483';
      } else {
        msg = this.winner === this.player ? 'Ganaste!' : 'Gana la IA';
        col = this.winner === this.player ? '#4ecca3' : '#e0e0e0';
      }
      Engine.text(msg,                   W/2, H - 72, col, 22);
      Engine.text('Toca para continuar', W/2, H - 44, '#606080', 13);
    } else {
      let turnMsg;
      if (this.mode === 'online') {
        turnMsg = this._isMyTurn() ? 'Tu turno' : 'Turno del rival';
      } else if (this.mode === 'pvp') {
        turnMsg = `Turno de ${this.turn === 'X' ? labelX : labelO}`;
      } else {
        turnMsg = this.turn === this.player ? 'Tu turno' : 'IA pensando...';
      }
      Engine.text(turnMsg, W/2, H - 60, '#a0a0b0', 15);
    }

    // Score
    const dLabel = this.mode === 'pvp' ? 'Empates' : 'Empates';
    Engine.text(
      `${labelX}: ${this.scores.X}   ${labelO}: ${this.scores.O}   ${dLabel}: ${this.scores.draws}`,
      W/2, H - 18, '#404060', 12
    );
  },

  _xLabel() {
    if (this.mode === 'ai')     return this.mySymbol === 'X' ? 'Tú (X)' : 'IA (X)';
    if (this.mode === 'pvp')    return 'J1 (X)';
    if (this.mode === 'online') return this.mySymbol === 'X' ? 'Tú (X)' : 'Rival (X)';
    return 'X';
  },
  _oLabel() {
    if (this.mode === 'ai')     return this.mySymbol === 'O' ? 'Tú (O)' : 'IA (O)';
    if (this.mode === 'pvp')    return 'J2 (O)';
    if (this.mode === 'online') return this.mySymbol === 'O' ? 'Tú (O)' : 'Rival (O)';
    return 'O';
  }
};

// ── HTML button wiring ────────────────────────────────────
copyBtn.addEventListener('click', () => {
  const code = roomCodeDisp.textContent;
  navigator.clipboard.writeText(code).then(() => {
    copyBtn.textContent = '¡Copiado!';
    setTimeout(() => { copyBtn.textContent = 'Copiar código'; }, 1800);
  });
});

onlineBackBtn.addEventListener('click', () => {
  game._cancelOnline();
});

// ── Boot ──────────────────────────────────────────────────
Engine.init('game', { width: 400, height: 480, bg: '#0f0f1a' }).start(game);
