/* ─────────────────────────────────────────────────────────
   Minesweeper — script.js
   Modes: P1  |  2P (Hotseat)  |  Online (PeerJS)
   ───────────────────────────────────────────────────────── */

const COLS  = 10;
const ROWS  = 10;
const MINES = 15;

const RED = 1;
const YEL = 2;

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

// ── PeerJS state handled by Online class ────────────────────
// Online abstraction used here

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
    return gx >= btn.x && gx <= btn.x + btn.w && gy >= btn.y && gy <= btn.y + btn.h;
}

// ── Main game object ──────────────────────────────────────
const game = {
    state: 'select',      // 'select'|'online-setup'|'playing'|'gameover'
    mode: null,           // 'p1'|'p2'|'online'
    onlineRole: null,     // 'host'|'guest'
    myPiece: null,        // RED|YEL (online)
    onlineConnected: false,

    board: null,          // 0: nothing, 1: bomb
    viewState: null,      // 0: hidden, 1: revealed, 2: flag
    playerColors: null,   // Qué jugador reveló cada celda

    minesPlaced: false,
    turn: RED,
    gameOver: false,
    winner: null,         // RED|YEL|0|'__disconnect__'

    hoverCol: -1,
    hoverRow: -1,
    restartCd: 0,

    // Touch handling
    touchTimer: 0,
    touchCol: -1,
    touchRow: -1,
    touchStartPos: null,
    touchTriggered: false,
    _touchSuppressMs: 0,   // ms restantes para ignorar mouse sintético post-touch

    hadMouse: false,
    hadTouch: false,

    cellSize: 0, boardW: 0, boardH: 0, boardX: 0, boardY: 0,
    _btns: {},

    init() {
        this.state = 'select'; this.mode = null; this.onlineRole = null;
        this.myPiece = null; this.onlineConnected = false;

        Audio.synth('reveal',  'sine',   600, 0.05, 0.1);
        Audio.synth('flag',    'square', 800, 0.1,  0.1);
        Audio.synth('win',     'square', 520, 0.35, 0.15);
        Audio.synth('lose',    'saw',    160, 0.30, 0.15);

        Engine.canvas.addEventListener('contextmenu', e => {
            e.preventDefault();
            if (!onlineUI.classList.contains('hidden') || game.state !== 'playing') return;

            const rect = Engine.canvas.getBoundingClientRect();
            const s = Engine._scale || 1;
            const x = (e.clientX - rect.left) / s;
            const y = (e.clientY - rect.top) / s;
            const c = Math.floor((x - game.boardX) / game.cellSize);
            const r = Math.floor((y - game.boardY) / game.cellSize);

            if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
                game.handleInput(r, c, true, true);
            }
        });
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
    },

    startGame(mode, role) {
        this.mode = mode; this.onlineRole = role || null;
        this.myPiece = (mode === 'online' && role === 'guest') ? YEL : RED;

        this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.viewState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.playerColors = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

        this.minesPlaced = false;
        this.turn = RED; this.gameOver = false; this.winner = null;

        this.hoverCol = -1; this.hoverRow = -1;
        this.restartCd = 0;

        this.touchTimer = 0; this.touchTriggered = false;
        this._touchSuppressMs = 0;

        this.hadMouse = Input.isMousePressed();
        this.hadTouch = Input.getTouchCount() > 0;

        this.state = 'playing';
    },

    placeMines(firstR, firstC) {
        // Construir conjunto de celdas protegidas (primera celda + sus 8 vecinas)
        const safe = new Set();
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = firstR + dr;
                const nc = firstC + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    safe.add(nr * COLS + nc);
                }
            }
        }
    
        let placed = 0;
        while (placed < MINES) {
            const r = Math.floor(Math.random() * ROWS);
            const c = Math.floor(Math.random() * COLS);
            if (this.board[r][c] === 0 && !safe.has(r * COLS + c)) {
                this.board[r][c] = 1;
                placed++;
            }
        }
        this.minesPlaced = true;
    },

    countNeighbors(r, c) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    if (this.board[nr][nc] === 1) count++;
                }
            }
        }
        return count;
    },

    _isMyTurn() {
        if (this.gameOver) return false;
        if (this.mode === 'p1' || this.mode === 'p2') return true;
        if (this.mode === 'online') return this.turn === this.myPiece;
        return false;
    },

    handleInput(r, c, isFlag, isLocal) {
        if (isLocal && !this._isMyTurn()) return;
        if (this.gameOver) return;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

        if (isFlag) {
            if (this.viewState[r][c] === 0) {
                this.viewState[r][c] = 2;
                Audio.play('flag');
            } else if (this.viewState[r][c] === 2) {
                this.viewState[r][c] = 0;
                Audio.play('flag');
            } else {
                return; // celda ya revelada, no hacer nada
            }
            // Enviar flag al rival
            if (isLocal && this.mode === 'online') {
                Online.send({ type: 'move', r, c, isFlag: true });
            }
        } else {
            if (this.viewState[r][c] !== 0) return;

            if (!this.minesPlaced) {
                this.placeMines(r, c);
                // HOST: sincronizar el tablero de minas al guest
                if (this.mode === 'online' && this.onlineRole === 'host') {
                    Online.send({ type: 'init', board: this.board });
                }
            }

            // Enviar movimiento al rival
            if (isLocal && this.mode === 'online') {
                Online.send({ type: 'move', r, c, isFlag: false });
            }

            if (this.board[r][c] === 1) {
                this.gameOver = true;
                this.viewState[r][c] = 1;
                this.playerColors[r][c] = this.turn;
                Audio.play('lose');
                if (this.mode === 'p1') {
                    this.winner = YEL;
                } else {
                    this.winner = this.turn === RED ? YEL : RED;
                }
                this.restartCd = 1.5;
                this.revealAll();
            } else {
                this.floodFill(r, c);
                Audio.play('reveal');
                this.checkWinCondition();
                if (!this.gameOver && this.mode !== 'p1') {
                    this.turn = this.turn === RED ? YEL : RED;
                }
            }
        }
    },

    floodFill(r, c) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
        if (this.viewState[r][c] !== 0) return;

        this.viewState[r][c] = 1;
        this.playerColors[r][c] = this.turn;

        if (this.countNeighbors(r, c) === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr !== 0 || dc !== 0) {
                        this.floodFill(r + dr, c + dc);
                    }
                }
            }
        }
    },

    checkWinCondition() {
        let hiddenSafe = 0;
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.board[r][c] === 0 && this.viewState[r][c] !== 1) {
                    hiddenSafe++;
                }
            }
        }
        if (hiddenSafe === 0) {
            this.gameOver = true;
            this.winner = this.mode === 'p1' ? RED : this.turn;
            Audio.play('win');
            this.restartCd = 1.5;
            this.revealAll();
        }
    },

    revealAll() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (this.board[r][c] === 1 && this.viewState[r][c] === 0) {
                    this.viewState[r][c] = 1;
                }
            }
        }
        this.state = 'gameover';
    },

    _onDisconnect() {
        if (this.state === 'playing' || this.state === 'gameover') {
            this.winner = '__disconnect__';
            this.state  = 'gameover';
            this.restartCd = 2;
        }
        Online.destroy();
    },

    _returnToSelect() {
        Online.destroy();
        onlineUI.classList.add('hidden');
        this.state = 'select';
        this.mode = null;
        this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.viewState = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.playerColors = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.turn = RED;
        this.gameOver = false;
        this.winner = null;
        this.hoverCol = -1;
        this.hoverRow = -1;
        this.touchTriggered = false;
        this._touchSuppressMs = 0;
        this.hadMouse = Input.isMousePressed();
        this.hadTouch = Input.getTouchCount() > 0;
    },

    update(dt) {
        // Si el overlay online está visible, no procesar clicks del canvas
        const overlayVisible = !onlineUI.classList.contains('hidden');

        const mouseRaw = Input.getMouse();
        const gm = Engine.toGame(mouseRaw.x, mouseRaw.y);
        const touch = Input.getTouch ? Input.getTouch() : null;
        const gt = touch ? Engine.toGame(touch.x, touch.y) : null;

        const prevHadTouch = this.hadTouch;
        const nowHasTouch  = Input.getTouchCount() > 0;
        const touchTap     = nowHasTouch && !prevHadTouch;

        // Si el toque acaba de terminar, activar supresión de mouse sintético (350ms)
        if (prevHadTouch && !nowHasTouch) {
            this._touchSuppressMs = 350;
        }
        if (this._touchSuppressMs > 0) {
            this._touchSuppressMs -= dt * 1000;
        }

        const rawMouseClick = Input.isMousePressed() && !this.hadMouse;
        // Ignorar clicks de ratón mientras estemos dentro de la ventana de supresión post-touch
        const mouseClick = rawMouseClick && this._touchSuppressMs <= 0;

        this.hadMouse = Input.isMousePressed();
        this.hadTouch = nowHasTouch;

        const clickPos = (!overlayVisible && mouseClick) ? gm
                       : (!overlayVisible && touchTap)   ? gt
                       : null;

        if (this.state === 'select') {
            if (clickPos) {
                if (this._btns.p1     && hitBtn(clickPos.x, clickPos.y, this._btns.p1))     this.startGame('p1');
                if (this._btns.p2     && hitBtn(clickPos.x, clickPos.y, this._btns.p2))     this.startGame('p2');
                if (this._btns.online && hitBtn(clickPos.x, clickPos.y, this._btns.online)) this.state = 'online-setup';
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

        if (this.state === 'gameover') {
            if (this.restartCd > 0) this.restartCd -= dt;
            if (this.restartCd <= 0 && clickPos) this._returnToSelect();
            return;
        }

        if (this.state === 'playing') {
            this._computeLayout();
            const mx = gm.x;
            const my = gm.y;
            const hc = Math.floor((mx - this.boardX) / this.cellSize);
            const hr = Math.floor((my - this.boardY) / this.cellSize);

            if (hc >= 0 && hc < COLS && hr >= 0 && hr < ROWS) {
                this.hoverCol = hc;
                this.hoverRow = hr;
            } else {
                this.hoverCol = -1;
                this.hoverRow = -1;
            }

            // Touch + mouse input — long-press para banderas en móvil
            const touchRaw = Input.getTouchCount() > 0 ? Input.getTouch(0) : null;
            const gtRaw    = touchRaw ? Engine.toGame(touchRaw.x, touchRaw.y) : null;

            if (Input.getTouchCount() > 0 && gtRaw) {
                const tc = Math.floor((gtRaw.x - this.boardX) / this.cellSize);
                const tr = Math.floor((gtRaw.y - this.boardY) / this.cellSize);

                if (!prevHadTouch) {
                    // Primer frame del toque
                    this.touchCol       = tc;
                    this.touchRow       = tr;
                    this.touchStartPos  = { x: gtRaw.x, y: gtRaw.y };
                    this.touchTimer     = 0;
                    this.touchTriggered = false;
                } else if (!this.touchTriggered && this.touchCol !== -1) {
                    const dx = gtRaw.x - this.touchStartPos.x;
                    const dy = gtRaw.y - this.touchStartPos.y;
                    if (Math.sqrt(dx*dx + dy*dy) > 40) {
                        this.touchCol = -1; // arrastró el dedo, cancelar
                    } else {
                        this.touchTimer += dt;
                        if (this.touchTimer > 0.45) { // 450ms → bandera
                            this.handleInput(this.touchRow, this.touchCol, true, true);
                            this.touchTriggered = true;
                        }
                    }
                }
            } else {
                // Dedo levantado
                if (prevHadTouch && !this.touchTriggered && this.touchCol !== -1) {
                    this.handleInput(this.touchRow, this.touchCol, false, true);
                }
                this.touchCol = -1;
            }

            // Click de ratón (PC) — ignorado si venimos de un toque reciente
            if (mouseClick && !Input.getTouchCount() && this._touchSuppressMs <= 0) {
                const c = Math.floor((gm.x - this.boardX) / this.cellSize);
                const r = Math.floor((gm.y - this.boardY) / this.cellSize);
                if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
                    this.handleInput(r, c, false, true);
                }
            }
        }
    },

    render(ctx) {
        if (this.state === 'select' || this.state === 'online-setup') {
            this.renderMenu(ctx);
            return;
        }

        this._computeLayout();

        // Draw board background
        Engine.rect(this.boardX - 4, this.boardY - 4, this.boardW + 8, this.boardH + 8, '#2a2a3a');

        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const x = this.boardX + c * this.cellSize;
                const y = this.boardY + r * this.cellSize;

                const s = this.viewState[r][c];

                if (s === 0 || s === 2) {
                    // Hidden or Flagged
                    Engine.rect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2, '#4ecca3');
                    if (s === 2) {
                        Engine.text('🚩', x + this.cellSize/2, y + this.cellSize/2, '#e94560', this.cellSize * 0.6);
                    }
                } else if (s === 1) {
                    // Revealed — color según quién lo reveló
                    const playerColor = this.playerColors[r][c];
                    let bgColor = '#1a1a2e';

                    if (this.mode === 'p2' || this.mode === 'online') {
                        if (playerColor === RED) {
                            bgColor = '#3a1020'; // rojo oscuro intenso
                        } else if (playerColor === YEL) {
                            bgColor = '#0f2a3a'; // azul/teal oscuro intenso
                        }
                    }

                    Engine.rect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2, bgColor);

                    // Borde de color sutil para reforzar la identidad del jugador
                    if ((this.mode === 'p2' || this.mode === 'online') && this.board[r][c] !== 1) {
                        ctx.save();
                        ctx.strokeStyle = playerColor === RED ? 'rgba(233,69,96,0.35)' : 'rgba(78,204,163,0.35)';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
                        ctx.restore();
                    }

                    if (this.board[r][c] === 1) {
                        Engine.text('💣', x + this.cellSize/2, y + this.cellSize/2, '#e94560', this.cellSize * 0.6);
                    } else {
                        const n = this.countNeighbors(r, c);
                        if (n > 0) {
                            const colors = ['#fff', '#4ecca3', '#5b78d7ff', '#f4a261', '#e76f51', '#e94560', '#9d4edd', '#ff99c8', '#ffffff'];
                            Engine.text(n.toString(), x + this.cellSize/2, y + this.cellSize/2, colors[n], this.cellSize * 0.6);
                        }
                    }
                }

                // Hover highlight
                if (this.state === 'playing' && this._isMyTurn() && r === this.hoverRow && c === this.hoverCol && s === 0) {
                    Engine.rect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2, 'rgba(255,255,255,0.2)');
                }
            }
        }

        // UI overlay — turn indicator
        if (this.mode === 'online') {
            const isMyTurn = this._isMyTurn();
            const turnMsg  = isMyTurn ? 'Tu turno' : 'Turno del rival';
            const turnCol  = isMyTurn ? (this.myPiece === RED ? '#e94560' : '#4ecca3') : '#808090';
            Engine.text(turnMsg, Engine.W / 2, 30, turnCol, 18);
        } else if (this.mode === 'p2') {
            const turnColor = this.turn === RED ? '#e94560' : '#4ecca3';
            const turnLabel = this.turn === RED ? '🔴 Jugador 1' : '🟢 Jugador 2';
            Engine.text(`Turno: ${turnLabel}`, Engine.W / 2, 30, turnColor, 18);
        } else {
            Engine.text('🔴 1 Jugador', Engine.W / 2, 30, '#4ecca3', 18);
        }

        // Modo label
        const modeLabels = { 'p1': '1 Jugador', 'p2': '2 Jugadores', 'online': 'En línea' };
        Engine.text(modeLabels[this.mode] || '', Engine.W / 2, 50, '#404060', 12);

        if (this.state === 'gameover') {
            Engine.rect(0, 0, Engine.W, Engine.H, 'rgba(0,0,0,0.75)');
            let msg = 'GAME OVER';
            if (this.mode === 'online') {
                if (this.winner === '__disconnect__') {
                    msg = 'Rival desconectado';
                } else {
                    msg = this.winner === this.myPiece ? '🏆 ¡Ganaste!' : '💀 ¡Perdiste!';
                }
            } else {
                if (this.winner === RED) msg = '🏆 Gana Jugador 1!';
                if (this.winner === YEL) msg = this.mode === 'p1' ? '💀 ¡Pisaste una mina!' : '🏆 Gana Jugador 2!';
            }
            Engine.text(msg, Engine.W / 2, Engine.H / 2 - 20, '#fff', 28);
            if (this.restartCd <= 0) {
                Engine.text('Toca para continuar', Engine.W / 2, Engine.H / 2 + 30, '#aaa', 16);
            }
        }
    },

    renderMenu(ctx) {
        const W = Engine.W, H = Engine.H;
        const mRaw = Input.getMouse();
        const mPt = Engine.toGame(mRaw.x, mRaw.y);
        const mx = mPt.x, my = mPt.y;

        if (this.state === 'select') {
            Engine.text('💣 Buscaminas',       W/2, 50,  '#4ecca3', 30);
            Engine.text('Elige modo de juego', W/2, 90,  '#808090', 14);
            const bw = 210, bh = 52, bx = W/2 - bw/2;
            this._btns = {
                p1:     { x: bx, y: 140, w: bw, h: bh },
                p2:     { x: bx, y: 210, w: bw, h: bh },
                online: { x: bx, y: 280, w: bw, h: bh }
            };
            drawBtn(ctx, '1 Jugador',   bx, 140, bw, bh, '#4ecca3', hitBtn(mx, my, this._btns.p1));
            drawBtn(ctx, '2 Jugadores', bx, 210, bw, bh, '#f5c518', hitBtn(mx, my, this._btns.p2));
            drawBtn(ctx, 'En línea',    bx, 280, bw, bh, '#e94560', hitBtn(mx, my, this._btns.online));
            Engine.text('Buscaminas · Vanilla JS', W/2, H-20, '#303050', 11);
        } else if (this.state === 'online-setup') {
            Engine.text('🌐 En línea',           W/2, 50, '#e94560', 28);
            Engine.text('¿Qué quieres hacer?',  W/2, 90, '#808090', 14);
            const bw = 210, bh = 52, bx = W/2 - bw/2;
            this._btns = {
                host: { x: bx, y: 140, w: bw, h: bh },
                join: { x: bx, y: 210, w: bw, h: bh },
                back: { x: bx, y: 310, w: bw, h: bh }
            };
            drawBtn(ctx, 'Crear partida', bx, 140, bw, bh, '#e94560', hitBtn(mx, my, this._btns.host));
            drawBtn(ctx, 'Unirse',        bx, 210, bw, bh, '#533483', hitBtn(mx, my, this._btns.join));
            drawBtn(ctx, '← Volver',     bx, 310, bw, bh, '#606070', hitBtn(mx, my, this._btns.back));
        }
    },

    // ── PeerJS Host ───────────────────────────────────────
    _hostGame() {
        Online.on('onHostReady', () => { onlineStatus.textContent = 'Esperando conexión...'; });
        Online.on('onConnected', () => {
            onlineUI.classList.add('hidden'); hostView.classList.add('hidden');
            this.onlineConnected = true; this.startGame('online', 'host');
        });
        Online.on('onData', (data) => {
            this._handleNetData(data);
        });
        Online.on('onDisconnect', () => this._onDisconnect());
        Online.on('onError', (err) => {
            onlineStatus.textContent = 'Error: ' + err.type;
            if (err.type === 'unavailable-id') {
                onlineStatus.textContent = 'ID ocupado, generando nuevo...';
                setTimeout(() => this._hostGame(), 500);
            }
        });

        Online.host((code) => {
            onlineTitle.textContent = 'Crear partida';
            onlineStatus.textContent = 'Creando sala...';
            hostView.classList.remove('hidden'); joinView.classList.add('hidden');
            roomCodeDisp.textContent = code; onlineUI.classList.remove('hidden');
        });
    },

    // ── PeerJS Join ───────────────────────────────────────
    _joinGame() {
        Online.destroy();
        onlineTitle.textContent  = 'Unirse a partida';
        onlineStatus.textContent = 'Introduce el código del anfitrión';
        hostView.classList.add('hidden');
        joinView.classList.remove('hidden');
        roomCodeInput.value = '';
        onlineUI.classList.remove('hidden');

        Online.on('onError', (err) => {
            onlineStatus.textContent = 'Error: ' + err.type;
            joinBtn.disabled = false;
        });

        Online.on('onConnected', () => {
            onlineUI.classList.add('hidden');
            joinView.classList.add('hidden');
            this.onlineConnected = true;
            this.startGame('online', 'guest');
        });

        Online.on('onData', (data) => {
            this._handleNetData(data);
        });

        Online.on('onDisconnect', () => this._onDisconnect());

        joinBtn.onclick = () => {
            const code = roomCodeInput.value.trim().toUpperCase();
            if (code.length < 4) { onlineStatus.textContent = 'Código demasiado corto'; return; }
            onlineStatus.textContent = 'Conectando a ' + code + '...';
            joinBtn.disabled = true;
            Online.join(code);
        };
    },

    // ── Manejo de datos de red ────────────────────────────
    _handleNetData(data) {
        if (data.type === 'init') {
            // El host envía el tablero de minas al primer movimiento
            this.board = data.board;
            this.minesPlaced = true;
        } else if (data.type === 'move') {
            game.handleInput(data.r, data.c, data.isFlag, false);
        } else if (data.type === 'restart') {
            game.startGame('online', game.onlineRole);
        }
    },

    _cancelOnline() {
        Online.destroy();
        onlineUI.classList.add('hidden');
        this.state = 'select';
    }
};

// ── HTML button wiring ────────────────────────────────────
copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(roomCodeDisp.textContent).then(() => {
        copyBtn.textContent = '¡Copiado!';
        setTimeout(() => { copyBtn.textContent = 'Copiar código'; }, 1800);
    });
});

onlineBackBtn.addEventListener('click', () => {
    game._cancelOnline();
});

// Evitar que el engine capture los inputs de teclado y bloquee la escritura
roomCodeInput.addEventListener('keydown', e => e.stopPropagation());
roomCodeInput.addEventListener('keyup', e => e.stopPropagation());

// ── Boot ──────────────────────────────────────────────────
window.onload = () => {
    Engine.init('game', { width: 480, height: 580, bg: '#0f0f1a' });
    Engine.start(game);
};
//Test update