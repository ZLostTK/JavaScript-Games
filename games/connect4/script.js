/* ─────────────────────────────────────────────────────────
Conecta 4 — script.js
Modes: vs. IA  |  1v1 (same device)  |  Online (PeerJS)
───────────────────────────────────────────────────────── */

const COLS  = 7;
const ROWS  = 6;
const RED   = 1;   // player 1 / host
const YEL   = 2;   // player 2 / guest / AI

// ── DOM refs ──────────────────────────────────────────────
const onlineUI      = document.getElementById('online-ui');
const onlineTitle   = document.getElementById('online-title');
const onlineStatus  = document.getElementById('online-status');
const hostView      = document.getElementById('host-view');
const joinView      = document.getElementById('join-view');
const roomCodeDisp  = document.getElementById('room-code-display');
const roomCodeInput = document.getElementById('room-code-input');
const copyBtn       = document.getElementById('copy-btn');
const joinBtn       = document.getElementById('join-btn');
const onlineBackBtn = document.getElementById('online-back-btn');

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

// ── Canvas button helpers ─────────────────────────────────
function drawBtn(ctx, label, x, y, w, h, accent, hover) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fillStyle = hover ? accent + 'cc' : accent + '33';
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

function hitBtn(gx, gy, btn) {
    return gx >= btn.x && gx <= btn.x + btn.w &&
    gy >= btn.y && gy <= btn.y + btn.h;
}

// ── Main game object ──────────────────────────────────────
const game = {
    
    state: 'select',      // 'select'|'online-setup'|'playing'|'gameover'
    mode: null,           // 'ai'|'pvp'|'online'
    onlineRole: null,     // 'host'|'guest'
    myPiece: null,        // RED|YEL (online)
    onlineConnected: false,
    
    board: null,
    turn: RED,
    gameOver: false,
    winner: null,         // RED|YEL|0|'__disconnect__'
    winCells: null,
    scores: { red: 0, yel: 0, draws: 0 },
    
    hoverCol: -1,
    dropAnim: null,
    restartCd: 0,
    hadMouse: false,
    hadTouch: false,
    _aiTimer: null,
    
    cellSize: 0, boardW: 0, boardH: 0, boardX: 0, boardY: 0, radius: 0,
    _btns: {},
    
    // ─────────────────────────────────────────────────────
    init() {
        this.state = 'select'; this.mode = null; this.onlineRole = null;
        this.myPiece = null; this.onlineConnected = false;
        this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.turn = RED; this.gameOver = false; this.winner = null;
        this.winCells = null; this.scores = { red: 0, yel: 0, draws: 0 };
        this.hoverCol = -1; this.dropAnim = null; this.restartCd = 0;
        this.hadMouse = false; this.hadTouch = false; this._aiTimer = null;
        this._btns = {};
        
        Audio.synth('drop',  'sine',   420, 0.12, 0.18);
        Audio.synth('win',   'square', 520, 0.35, 0.15);
        Audio.synth('lose',  'saw',    160, 0.30, 0.15);
        Audio.synth('draw',  'sine',   260, 0.25, 0.12);
        Audio.synth('hover', 'sine',   700, 0.04, 0.06);
    },
    
    _computeLayout() {
        const pad = 24;
        const maxW = Engine.W - pad * 2;
        const maxH = Engine.H - 120;
        this.cellSize = Math.floor(Math.min(maxW / COLS, maxH / ROWS));
        this.boardW   = this.cellSize * COLS;
        this.boardH   = this.cellSize * ROWS;
        this.boardX   = Math.floor((Engine.W - this.boardW) / 2);
        this.boardY   = Math.floor((Engine.H - this.boardH) / 2) + 18;
        this.radius   = Math.floor(this.cellSize * 0.38);
    },
    
    startGame(mode, role) {
        this.mode = mode; this.onlineRole = role || null;
        this.myPiece = (mode === 'online' && role === 'guest') ? YEL : RED;
        this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.turn = RED; this.gameOver = false; this.winner = null;
        this.winCells = null; this.hoverCol = -1; this.dropAnim = null;
        this.restartCd = 0;
        // Inicializar con el estado actual para que el click del menú
        // no se registre como la primera acción del juego.
        this.hadMouse = Input.isMousePressed();
        this.hadTouch = Input.getTouchCount() > 0;
        this._aiTimer = null;
        this.state = 'playing';
    },
    
    _isMyTurn() {
        if (this.gameOver || this.dropAnim) return false;
        if (this.mode === 'pvp')    return true;
        if (this.mode === 'ai')     return this.turn === RED;
        if (this.mode === 'online') return this.turn === this.myPiece;
        return false;
    },
    
    colFromX(x) {
        const col = Math.floor((x - this.boardX) / this.cellSize);
        return (col >= 0 && col < COLS) ? col : -1;
    },
    
    dropRow(board, col) {
        for (let r = ROWS - 1; r >= 0; r--)
            if (board[r][col] === 0) return r;
        return -1;
    },
    
    placePiece(col, piece, isLocal) {
        const row = this.dropRow(this.board, col);
        if (row === -1) return false;
        if (isLocal && this.mode === 'online' && conn) {
            conn.send(JSON.stringify({ type: 'move', col }));
        }
        const targetY = this.boardY + row * this.cellSize + this.cellSize / 2;
        this.dropAnim = { col, row, piece, y: this.boardY - this.cellSize, targetY };
        return true;
    },
    
    resolvePlace(col, row, piece) {
        this.board[row][col] = piece;
        Audio.play('drop');
        const winCells = this.checkWin(this.board, piece);
        if (winCells) {
            this.gameOver = true; this.winner = piece; this.winCells = winCells;
            this.state = 'gameover'; this.restartCd = 1.2;
            if (piece === RED) this.scores.red++; else this.scores.yel++;
            const iWon = this.mode === 'online' ? piece === this.myPiece : piece === RED;
            Audio.play(iWon ? 'win' : 'lose');
            return;
        }
        if (this.isFull(this.board)) {
            this.gameOver = true; this.winner = 0; this.winCells = null;
            this.state = 'gameover'; this.restartCd = 1.2;
            this.scores.draws++; Audio.play('draw');
            return;
        }
        this.turn = piece === RED ? YEL : RED;
    },
    
    checkWin(board, piece) {
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] !== piece) continue;
                for (const [dr, dc] of dirs) {
                    const cells = [[r, c]];
                    for (let i = 1; i < 4; i++) {
                        const nr = r + dr*i, nc = c + dc*i;
                        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== piece) break;
                        cells.push([nr, nc]);
                    }
                    if (cells.length === 4) return cells;
                }
            }
        }
        return null;
    },
    
    isFull(board) { return board[0].every(c => c !== 0); },
    
    // ── AI ───────────────────────────────────────────────
    validCols(board) {
        return Array.from({ length: COLS }, (_, i) => i).filter(c => board[0][c] === 0);
    },
    applyMove(board, col, piece) {
        const row = this.dropRow(board, col);
        if (row === -1) return null;
        const nb = board.map(r => [...r]); nb[row][col] = piece; return nb;
    },
    scoreWindow(w, piece) {
        const opp = piece === YEL ? RED : YEL;
        const pc = w.filter(c => c === piece).length;
        const ec = w.filter(c => c === 0).length;
        const oc = w.filter(c => c === opp).length;
        let s = 0;
        if (pc === 4) s += 100;
        else if (pc === 3 && ec === 1) s += 5;
        else if (pc === 2 && ec === 2) s += 2;
        if (oc === 3 && ec === 1) s -= 4;
        return s;
    },
    scoreBoard(board, piece) {
        let score = 0;
        score += board.map(r => r[Math.floor(COLS/2)]).filter(c => c === piece).length * 3;
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c <= COLS-4; c++)
                score += this.scoreWindow(board[r].slice(c, c+4), piece);
        for (let c = 0; c < COLS; c++)
            for (let r = 0; r <= ROWS-4; r++)
                score += this.scoreWindow([board[r][c],board[r+1][c],board[r+2][c],board[r+3][c]], piece);
        for (let r = 0; r <= ROWS-4; r++)
            for (let c = 0; c <= COLS-4; c++)
                score += this.scoreWindow([board[r][c],board[r+1][c+1],board[r+2][c+2],board[r+3][c+3]], piece);
        for (let r = 3; r < ROWS; r++)
            for (let c = 0; c <= COLS-4; c++)
                score += this.scoreWindow([board[r][c],board[r-1][c+1],board[r-2][c+2],board[r-3][c+3]], piece);
        return score;
    },
    minimax(board, depth, alpha, beta, maximizing) {
        if (this.checkWin(board, YEL)) return { score:  100000 + depth };
        if (this.checkWin(board, RED)) return { score: -100000 - depth };
        if (this.isFull(board) || depth === 0) return { score: this.scoreBoard(board, YEL) };
        const cols = this.validCols(board);
        let bestCol = cols[Math.floor(cols.length / 2)];
        if (maximizing) {
            let best = -Infinity;
            for (const c of cols) {
                const { score } = this.minimax(this.applyMove(board, c, YEL), depth-1, alpha, beta, false);
                if (score > best) { best = score; bestCol = c; }
                alpha = Math.max(alpha, score);
                if (alpha >= beta) break;
            }
            return { score: best, col: bestCol };
        } else {
            let best = Infinity;
            for (const c of cols) {
                const { score } = this.minimax(this.applyMove(board, c, RED), depth-1, alpha, beta, true);
                if (score < best) { best = score; bestCol = c; }
                beta = Math.min(beta, score);
                if (alpha >= beta) break;
            }
            return { score: best, col: bestCol };
        }
    },
    getBestCol() { return this.minimax(this.board, 6, -Infinity, Infinity, true).col; },
    
    // ── Navigation ────────────────────────────────────────
    _returnToSelect() {
        destroyPeer(); onlineUI.classList.add('hidden');
        this.state = 'select'; this.mode = null;
        this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.turn = RED; this.gameOver = false; this.winner = null;
        this.winCells = null; this.dropAnim = null; this._aiTimer = null; this.hoverCol = -1;
    },
    _showOnlineSetup() { this.state = 'online-setup'; },
    _cancelOnline()    { destroyPeer(); onlineUI.classList.add('hidden'); this.state = 'select'; },
    
    // ── PeerJS Host ───────────────────────────────────────
    _hostGame() {
        destroyPeer();
        const code = genCode();
        onlineTitle.textContent = 'Crear partida';
        onlineStatus.textContent = 'Esperando a un rival...';
        hostView.classList.remove('hidden'); joinView.classList.add('hidden');
        roomCodeDisp.textContent = code; onlineUI.classList.remove('hidden');
        peer = new Peer(code, { debug: 0 });
        peer.on('open', () => { onlineStatus.textContent = 'Esperando conexión...'; });
        peer.on('connection', (c) => {
            conn = c;
            conn.on('open', () => {
                onlineUI.classList.add('hidden'); hostView.classList.add('hidden');
                this.onlineConnected = true; this.startGame('online', 'host');
            });
            conn.on('data', (raw) => {
                const data = JSON.parse(raw);
                if (data.type === 'move') this.placePiece(data.col, this.turn, false);
            });
            conn.on('close', () => this._onDisconnect());
            conn.on('error', () => this._onDisconnect());
        });
        peer.on('error', (err) => { onlineStatus.textContent = 'Error: ' + err.type; });
    },
    
    // ── PeerJS Join ───────────────────────────────────────
    _joinGame() {
        destroyPeer();
        onlineTitle.textContent = 'Unirse a partida';
        onlineStatus.textContent = 'Introduce el código del anfitrión';
        hostView.classList.add('hidden'); joinView.classList.remove('hidden');
        roomCodeInput.value = ''; onlineUI.classList.remove('hidden');
        peer = new Peer({ debug: 0 });
        peer.on('error', (err) => { onlineStatus.textContent = 'Error: ' + err.type; });
        joinBtn.onclick = () => {
            const code = roomCodeInput.value.trim().toUpperCase();
            if (code.length < 4) { onlineStatus.textContent = 'Código demasiado corto'; return; }
            onlineStatus.textContent = 'Conectando...'; joinBtn.disabled = true;
            conn = peer.connect(code, { reliable: true });
            conn.on('open', () => {
                onlineUI.classList.add('hidden'); joinView.classList.add('hidden');
                this.onlineConnected = true; this.startGame('online', 'guest');
            });
            conn.on('data', (raw) => {
                const data = JSON.parse(raw);
                if (data.type === 'move') this.placePiece(data.col, this.turn, false);
            });
            conn.on('close', () => this._onDisconnect());
            conn.on('error', () => { onlineStatus.textContent = 'No se pudo conectar. Verifica el código.'; joinBtn.disabled = false; });
        };
    },
    
    _onDisconnect() {
        if (this.state === 'playing' || this.state === 'gameover') {
            this.winner = '__disconnect__'; this.state = 'gameover'; this.restartCd = 2;
        }
        destroyPeer();
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
        this.hadMouse    = Input.isMousePressed();
        this.hadTouch    = Input.getTouchCount() > 0;
        
        const clickPos = mouseClick ? gm : (touchTap ? gt : null);
        
        if (this.state === 'select') {
            if (clickPos) {
                if (this._btns.ai     && hitBtn(clickPos.x, clickPos.y, this._btns.ai))     this.startGame('ai');
                if (this._btns.pvp    && hitBtn(clickPos.x, clickPos.y, this._btns.pvp))    this.startGame('pvp');
                if (this._btns.online && hitBtn(clickPos.x, clickPos.y, this._btns.online)) this._showOnlineSetup();
            }
            return;
        }
        
        if (this.state === 'online-setup') {
            if (clickPos) {
                if (this._btns.host && hitBtn(clickPos.x, clickPos.y, this._btns.host)) this._hostGame();
                if (this._btns.join && hitBtn(clickPos.x, clickPos.y, this._btns.join)) this._joinGame();
                if (this._btns.back && hitBtn(clickPos.x, clickPos.y, this._btns.back)) this._cancelOnline();
            }
            return;
        }
        
        // Drop animation — blocks all input
        if (this.dropAnim) {
            const a     = this.dropAnim;
            const speed = (a.targetY - (this.boardY - this.cellSize)) * 8;
            a.y += speed * dt;
            if (a.y >= a.targetY) {
                a.y = a.targetY;
                this.resolvePlace(a.col, a.row, a.piece);
                this.dropAnim = null;
            }
            return;
        }
        
        if (this.state === 'gameover') {
            this.restartCd -= dt;
            if (this.restartCd <= 0 && clickPos) this._returnToSelect();
            return;
        }
        
        if (this.state !== 'playing') return;
        
        if (this._isMyTurn()) {
            const activePos = gt || gm;
            const newCol    = this.colFromX(activePos.x);
            if (newCol !== this.hoverCol) {
                if (newCol !== -1) Audio.play('hover');
                this.hoverCol = newCol;
            }
            if (clickPos) {
                const col = this.colFromX(clickPos.x);
                if (col !== -1) this.placePiece(col, this.turn, true);
            }
        } else {
            this.hoverCol = -1;
            if (this.mode === 'ai' && this.turn === YEL) {
                if (this._aiTimer === null) this._aiTimer = 0.4;
                this._aiTimer -= dt;
                if (this._aiTimer <= 0) {
                    this._aiTimer = null;
                    const col = this.getBestCol();
                    if (col !== undefined) this.placePiece(col, YEL, false);
                }
            }
        }
    },
    
    // ─────────────────────────────────────────────────────
    render(ctx) {
        Engine.rect(0, 0, Engine.W, Engine.H, '#0f0f1a');
        const W  = Engine.W, H = Engine.H;
        const gm = Engine.toGame(Input.getMouse().x, Input.getMouse().y);
        
        if (this.state === 'select') {
            Engine.text('Conecta 4',           W/2, 50,  '#e94560', 30);
            Engine.text('Elige modo de juego', W/2, 90,  '#808090', 14);
            const bw = 210, bh = 52, bx = W/2 - bw/2;
            const b1 = { x:bx, y:140, w:bw, h:bh };
            const b2 = { x:bx, y:210, w:bw, h:bh };
            const b3 = { x:bx, y:280, w:bw, h:bh };
            this._btns.ai = b1; this._btns.pvp = b2; this._btns.online = b3;
            drawBtn(ctx, 'vs. IA',   b1.x,b1.y,b1.w,b1.h, '#e94560', hitBtn(gm.x,gm.y,b1));
            drawBtn(ctx, '1 vs 1',  b2.x,b2.y,b2.w,b2.h, '#f5c518', hitBtn(gm.x,gm.y,b2));
            drawBtn(ctx, 'En línea',b3.x,b3.y,b3.w,b3.h, '#4ecca3', hitBtn(gm.x,gm.y,b3));
            Engine.text('Conecta 4 · Vanilla JS', W/2, H-20, '#303050', 11);
            return;
        }
        
        if (this.state === 'online-setup') {
            Engine.text('En línea',             W/2, 50, '#4ecca3', 28);
            Engine.text('¿Qué quieres hacer?', W/2, 90, '#808090', 14);
            const bw = 210, bh = 52, bx = W/2 - bw/2;
            const b1 = { x:bx, y:140, w:bw, h:bh };
            const b2 = { x:bx, y:210, w:bw, h:bh };
            const b3 = { x:bx, y:310, w:bw, h:bh };
            this._btns.host = b1; this._btns.join = b2; this._btns.back = b3;
            drawBtn(ctx, 'Crear partida', b1.x,b1.y,b1.w,b1.h, '#4ecca3', hitBtn(gm.x,gm.y,b1));
            drawBtn(ctx, 'Unirse',        b2.x,b2.y,b2.w,b2.h, '#533483', hitBtn(gm.x,gm.y,b2));
            drawBtn(ctx, '← Volver',     b3.x,b3.y,b3.w,b3.h, '#606070', hitBtn(gm.x,gm.y,b3));
            return;
        }
        
        this._renderBoard(ctx, W, H);
    },
    
    _renderBoard(ctx, W, H) {
        const cs = this.cellSize, r = this.radius;
        const bx = this.boardX,   by = this.boardY;
        
        Engine.text('Conecta 4', W/2, 22, '#e0e0e0', 19);
        const modeLabel = this.mode === 'ai' ? 'vs. IA' : this.mode === 'pvp' ? '1 vs 1' : 'En línea';
        Engine.text(modeLabel, W/2, 42, '#404060', 11);
        
        // Hover arrow
        if (this.state === 'playing' && this._isMyTurn() && this.hoverCol !== -1) {
            const hx  = bx + this.hoverCol * cs + cs / 2;
            const col = this.turn === RED ? '#e94560' : '#f5c518';
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.moveTo(hx, by - 12); ctx.lineTo(hx - 7, by - 24); ctx.lineTo(hx + 7, by - 24);
            ctx.closePath(); ctx.fill();
        }
        
        // Board
        ctx.fillStyle = '#1a2a5e';
        ctx.beginPath(); ctx.roundRect(bx-4, by-4, this.boardW+8, this.boardH+8, 10); ctx.fill();
        
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cx = bx + col*cs + cs/2;
                const cy = by + row*cs + cs/2;
                const piece = this.board[row][col];
                
                ctx.fillStyle = '#0f0f1a';
                ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
                
                if (piece !== 0) {
                    const isWin = this.winCells && this.winCells.some(([wr,wc]) => wr===row && wc===col);
                    ctx.fillStyle = piece === RED
                    ? (isWin ? '#ff2244' : '#e94560')
                    : (isWin ? '#ffe033' : '#f5c518');
                    if (isWin) { ctx.shadowColor = piece===RED ? '#ff2244' : '#ffe033'; ctx.shadowBlur = 18; }
                    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
                    ctx.shadowBlur = 0;
                }
                
                if (this.state==='playing' && this._isMyTurn() && col===this.hoverCol && piece===0) {
                    ctx.fillStyle = this.turn===RED ? 'rgba(233,69,96,0.15)' : 'rgba(245,197,24,0.15)';
                    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
                }
            }
        }
        
        if (this.dropAnim) {
            const a = this.dropAnim;
            ctx.fillStyle = a.piece===RED ? '#e94560' : '#f5c518';
            ctx.beginPath(); ctx.arc(bx + a.col*cs + cs/2, a.y, r, 0, Math.PI*2); ctx.fill();
        }
        
        const redLabel = this._redLabel(), yelLabel = this._yelLabel();
        
        if (this.state === 'gameover') {
            let msg, color;
            if (this.winner === '__disconnect__') { msg = 'Rival desconectado'; color = '#e94560'; }
            else if (this.winner === 0)           { msg = '¡Empate!';           color = '#f5c518'; }
            else if (this.mode === 'online') {
                const iWon = this.winner === this.myPiece;
                msg = iWon ? '¡Ganaste! 🎉' : '¡Perdiste!'; color = iWon ? '#4ecca3' : '#e94560';
            } else if (this.mode === 'pvp') {
                msg = `Gana ${this.winner===RED ? redLabel : yelLabel}`;
                color = this.winner===RED ? '#e94560' : '#f5c518';
            } else {
                const iWon = this.winner===RED;
                msg = iWon ? '¡Ganaste! 🎉' : '¡Ganó la IA!'; color = iWon ? '#4ecca3' : '#e94560';
            }
            Engine.text(msg,                   W/2, by+this.boardH+30, color,     22);
            Engine.text('Toca para continuar', W/2, by+this.boardH+54, '#606080', 13);
        } else {
            let turnMsg;
            if      (this.mode==='online') turnMsg = this._isMyTurn() ? 'Tu turno' : 'Turno del rival';
            else if (this.mode==='pvp')    turnMsg = `${this.turn===RED?'🔴':'🟡'} Turno de ${this.turn===RED?redLabel:yelLabel}`;
            else                           turnMsg = this.turn===RED ? '🔴 Tu turno' : '🟡 IA pensando…';
            Engine.text(turnMsg, W/2, by+this.boardH+28, '#a0a0b0', 14);
        }
        
        Engine.text(
            `${redLabel}: ${this.scores.red}   ${yelLabel}: ${this.scores.yel}   Empates: ${this.scores.draws}`,
            W/2, by+this.boardH+56, '#404060', 12
        );
    },
    
    _redLabel() {
        if (this.mode==='ai')     return 'Tú 🔴';
        if (this.mode==='pvp')    return 'J1 🔴';
        if (this.mode==='online') return this.myPiece===RED ? 'Tú 🔴' : 'Rival 🔴';
        return '🔴';
    },
    _yelLabel() {
        if (this.mode==='ai')     return 'IA 🟡';
        if (this.mode==='pvp')    return 'J2 🟡';
        if (this.mode==='online') return this.myPiece===YEL ? 'Tú 🟡' : 'Rival 🟡';
        return '🟡';
    }
};

// ── HTML button wiring ────────────────────────────────────
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(roomCodeDisp.textContent).then(() => {
        copyBtn.textContent = '¡Copiado!';
        setTimeout(() => { copyBtn.textContent = 'Copiar código'; }, 1800);
    });
});
onlineBackBtn.addEventListener('click', () => { game._cancelOnline(); });

// ── Boot ──────────────────────────────────────────────────
Engine.init('game', { width: 480, height: 580, bg: '#0f0f1a' }).start(game);