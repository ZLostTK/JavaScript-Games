/* ═══════════════════════════════════════════════════════════════
OTHELLO / REVERSI  -  Full game for the shared-canvas engine
Modes: Solo (vs CPU), Versus Local, Multiplayer Online (P2P)
═══════════════════════════════════════════════════════════════ */

// ── Constants ────────────────────────────────────────────────────
const W = 480, H = 640;
const BOARD_SIZE  = 8;
const EMPTY = 0, BLACK = 1, WHITE = 2;

// Visual layout (all in logical px)
const BOARD_MARGIN_TOP  = 148;
const BOARD_SIDE_PAD    = 18;
const CELL_SIZE         = Math.floor((W - BOARD_SIDE_PAD * 2) / BOARD_SIZE); // 55
const BOARD_W           = CELL_SIZE * BOARD_SIZE;
const BOARD_X           = Math.floor((W - BOARD_W) / 2);
const BOARD_Y           = BOARD_MARGIN_TOP;

// Colours (canvas palette)
const C = {
    bg:           '#0b0f1a',
    surface:      '#131929',
    board:        '#0f3d2e',
    boardLine:    '#1a5c42',
    boardDark:    '#0a2e20',
    black:        '#1a1a2e',
    blackShine:   '#3a3a5e',
    white:        '#e8eaf0',
    whiteShine:   '#ffffff',
    accent:       '#34d399',   // emerald
    accent2:      '#6096f5',   // blue
    danger:       '#f87171',
    muted:        '#4b5563',
    mutedLight:   '#9ca3af',
    hint:         'rgba(52,211,153,0.28)',
    hintBorder:   'rgba(52,211,153,0.7)',
    overlay:      'rgba(11,15,26,0.82)',
    text:         '#e8eaf0',
    gold:         '#fbbf24',
};

// ── Helpers ──────────────────────────────────────────────────────
function cloneBoard(b) { return b.map(r => [...r]); }

function emptyBoard() {
    const b = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
    const c = BOARD_SIZE / 2;
    b[c-1][c-1] = WHITE; b[c-1][c] = BLACK;
    b[c][c-1]   = BLACK;  b[c][c]   = WHITE;
    return b;
}

const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

function opponent(p) { return p === BLACK ? WHITE : BLACK; }

function getFlips(board, row, col, player) {
    if (board[row][col] !== EMPTY) return [];
    const opp = opponent(player);
    const flips = [];
    for (const [dr, dc] of DIRS) {
        const line = [];
        let r = row + dr, c = col + dc;
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === opp) {
            line.push([r, c]);
            r += dr; c += dc;
        }
        if (line.length > 0 && r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
            flips.push(...line);
        }
    }
    return flips;
}

function isValid(board, row, col, player) {
    return board[row][col] === EMPTY && getFlips(board, row, col, player).length > 0;
}

function getValidMoves(board, player) {
    const moves = [];
    for (let r = 0; r < BOARD_SIZE; r++)
        for (let c = 0; c < BOARD_SIZE; c++)
            if (isValid(board, r, c, player)) moves.push([r, c]);
    return moves;
}

function applyMove(board, row, col, player) {
    const b = cloneBoard(board);
    const flips = getFlips(b, row, col, player);
    if (flips.length === 0) return null;
    b[row][col] = player;
    for (const [r, c] of flips) b[r][c] = player;
    return b;
}

function countPieces(board) {
    let b = 0, w = 0;
    for (const row of board) for (const cell of row) {
        if (cell === BLACK) b++;
        else if (cell === WHITE) w++;
    }
    return { black: b, white: w };
}

// ── Simple AI (greedy + corner preference) ───────────────────────
const WEIGHTS = [
    [100,-20,10, 5, 5,10,-20,100],
    [-20,-50,-2,-2,-2,-2,-50,-20],
    [ 10, -2, 5, 1, 1, 5, -2, 10],
    [  5, -2, 1, 0, 0, 1, -2,  5],
    [  5, -2, 1, 0, 0, 1, -2,  5],
    [ 10, -2, 5, 1, 1, 5, -2, 10],
    [-20,-50,-2,-2,-2,-2,-50,-20],
    [100,-20,10, 5, 5,10,-20,100],
];

function aiMove(board, player) {
    const moves = getValidMoves(board, player);
    if (moves.length === 0) return null;
    let best = null, bestScore = -Infinity;
    for (const [r, c] of moves) {
        const nb = applyMove(board, r, c, player);
        const cnt = countPieces(nb);
        const flips = getFlips(board, r, c, player).length;
        let score = WEIGHTS[r][c] + flips * 2;
        // Mobility bonus
        const oppMoves = getValidMoves(nb, opponent(player)).length;
        score -= oppMoves * 3;
        if (score > bestScore) { bestScore = score; best = [r, c]; }
    }
    return best;
}

// ── Cell ↔ pixel conversions ─────────────────────────────────────
function cellToPixel(row, col) {
    return {
        x: BOARD_X + col * CELL_SIZE + CELL_SIZE / 2,
        y: BOARD_Y + row * CELL_SIZE + CELL_SIZE / 2,
    };
}

function pixelToCell(px, py) {
    const col = Math.floor((px - BOARD_X) / CELL_SIZE);
    const row = Math.floor((py - BOARD_Y) / CELL_SIZE);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
    return { row, col };
}

// ── Flip animation queue ─────────────────────────────────────────
class FlipAnim {
    constructor(cells, fromPlayer) {
        this.cells    = cells;
        this.from     = fromPlayer;
        this.progress = 0;       // 0→1
        this.speed    = 2.8;     // secs⁻¹
        this.done     = false;
    }
    update(dt) {
        this.progress = Math.min(1, this.progress + dt * this.speed);
        if (this.progress >= 1) this.done = true;
    }
}

// ── Sound synthesis ──────────────────────────────────────────────
function initSounds() {
    Audio.synth('place', 'sine',  440, 0.09, 0.18);
    Audio.synth('flip',  'square',260, 0.07, 0.12);
    Audio.synth('win',   'sine',  523, 0.55, 0.22, 880);
    Audio.synth('lose',  'square',220, 0.45, 0.15, 110);
    Audio.synth('click', 'sine',  660, 0.06, 0.14);
    Audio.synth('error', 'saw',   180, 0.08, 0.12);
}

// ═══════════════════════════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════════════════════════
const STATE = {
    MENU:           'menu',
    PLAYING:        'playing',
    GAME_OVER:      'game_over',
};

// ── Button helper ────────────────────────────────────────────────
function makeBtn(label, x, y, w, h, style = 'primary') {
    return { label, x, y, w, h, style, hovered: false };
}

function btnHit(btn, px, py) {
    return px >= btn.x - btn.w/2 && px <= btn.x + btn.w/2 &&
    py >= btn.y - btn.h/2 && py <= btn.y + btn.h/2;
}

// ── Draw rounded rect ────────────────────────────────────────────
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

// ── Main game object ─────────────────────────────────────────────
const game = {
    // State
    state:         STATE.MENU,
    board:         null,
    currentPlayer: BLACK,
    mode:          null,   // 'solo' | 'local' | 'online'
    onlineRole:    null,   // 'host' | 'guest'
    myColor:       null,
    validMoves:    [],
    flipAnims:     [],
    animQueue:     [],     // pending flip groups
    aiThinkTimer:  0,
    passing:       false,  // flag when forced pass
    passTimer:     0,
    scores:        { black: 2, white: 2 },
    winner:        null,   // BLACK | WHITE | 'draw'
    roomCode:      '',
    t:             0,      // global timer for animations
    
    // Menu state
    menuSubState:  'main',  // 'main' | 'online-setup'
    menuBtns:      [],
    onlineSetupBtns: [],
    menuAnim:      0,
    
    // Game-over state
    gameOverBtns:  [],
    
    // ── Init ────────────────────────────────────────────────────
    init() {
        initSounds();
        this._buildMenu();
        this._setupOnlineCallbacks();
    },
    
    // ── Menu buttons ────────────────────────────────────────────
    _buildMenu() {
        const cx = W / 2;
        this.menuBtns = [
            makeBtn('Solo vs CPU',         cx, 330, 280, 52, 'primary'),
            makeBtn('Versus Local (1v1)',   cx, 400, 280, 52, 'secondary'),
            makeBtn('Multijugador Online',  cx, 470, 280, 52, 'accent'),
        ];
    },
    
    _buildGameOverBtns() {
        const cx = W / 2;
        this.gameOverBtns = [
            makeBtn('Jugar de nuevo',  cx, H - 110, 240, 48, 'primary'),
            makeBtn('Menú principal',  cx, H - 52,  240, 44, 'ghost'),
        ];
    },
    
    // ── Online callbacks ────────────────────────────────────────────────────────
    _setupOnlineCallbacks() {
        Online.on('onHostReady', (code) => {
            this.roomCode = code;
            OnlineLobby.setCode(code);
            OnlineLobby.setStatus('Esperando rival…');
        });

        Online.on('onConnected', (role) => {
            this.onlineRole = role;
            this.myColor    = (role === 'host') ? BLACK : WHITE;
            OnlineLobby.hide();
            this.menuSubState = 'main';
            this._startGame('online');

            if (role === 'host') {
                Online.send({ type: 'init', board: this.board, currentPlayer: this.currentPlayer });
            }
        });

        Online.on('onData', (data) => {
            this._handleNetData(data);
        });

        Online.on('onError', (err) => {
            console.warn('[Othello] online error', err);
            OnlineLobby.setStatus('Error de conexión. Intenta de nuevo.');
            OnlineLobby.enableJoin(true);
        });

        Online.on('onDisconnect', () => {
            if (this.state === STATE.PLAYING || this.state === STATE.GAME_OVER) {
                this._showDisconnect();
            }
        });
    },
    
    _handleNetData(data) {
        if (!data || !data.type) return;
        
        switch (data.type) {
            case 'init': {
                // Guest receives authoritative initial board from host
                this.board         = data.board;
                this.currentPlayer = data.currentPlayer;
                this.validMoves    = getValidMoves(this.board, this.currentPlayer);
                this.scores        = countPieces(this.board);
                break;
            }
            case 'move': {
                // Opponent placed a piece - data.row, data.col are LOGICAL board indices
                const { row, col } = data;
                this._applyLocalMove(row, col, false);
                break;
            }
            case 'pass': {
                // Opponent was forced to pass
                this._nextTurn(false);
                break;
            }
        }
    },
    
    // ── Start a game ────────────────────────────────────────────
    _startGame(mode) {
        this.mode          = mode;
        this.board         = emptyBoard();
        this.currentPlayer = BLACK;
        this.flipAnims     = [];
        this.animQueue     = [];
        this.passing       = false;
        this.passTimer     = 0;
        this.aiThinkTimer  = 0;
        this.winner        = null;
        this.scores        = countPieces(this.board);
        this.validMoves    = getValidMoves(this.board, this.currentPlayer);
        this.state         = STATE.PLAYING;
    },
    
    // ── Apply move (local logic) ────────────────────────────────
    _applyLocalMove(row, col, sendNet) {
        const flips = getFlips(this.board, row, col, this.currentPlayer);
        if (flips.length === 0) return false;
        
        const nb = applyMove(this.board, row, col, this.currentPlayer);
        if (!nb) return false;
        
        // Queue flip animation
        this.animQueue.push(new FlipAnim([[row, col], ...flips], this.currentPlayer));
        
        this.board  = nb;
        this.scores = countPieces(this.board);
        
        Audio.play('place');
        
        if (sendNet && this.mode === 'online') {
            Online.send({ type: 'move', row, col });
        }
        
        this._nextTurn(sendNet);
        return true;
    },
    
    _nextTurn(sendNet) {
        const opp = opponent(this.currentPlayer);
        const oppMoves = getValidMoves(this.board, opp);
        
        if (oppMoves.length > 0) {
            this.currentPlayer = opp;
            this.validMoves    = oppMoves;
            return;
        }
        
        // Opponent has no moves - check if current player can still move
        const myMoves = getValidMoves(this.board, this.currentPlayer);
        if (myMoves.length > 0) {
            // Force opponent pass
            this.passing   = true;
            this.passTimer = 2.0;
            this.validMoves = myMoves;
            
            if (sendNet && this.mode === 'online') {
                Online.send({ type: 'pass' });
            }
            return;
        }
        
        // No moves for anyone → game over
        this._endGame();
    },
    
    _endGame() {
        const { black, white } = countPieces(this.board);
        if (black > white)       this.winner = BLACK;
        else if (white > black)  this.winner = WHITE;
        else                     this.winner = 'draw';
        this.state = STATE.GAME_OVER;
        this._buildGameOverBtns();
        Audio.play(this._myWon() ? 'win' : 'lose');
    },
    
    _myWon() {
        if (this.mode === 'online') return this.winner === this.myColor;
        return this.winner === BLACK; // Player is always Black in solo
    },
    
    // ── Lobby overlay helpers ────────────────────────────────────
    _showLobby(section) {
        document.getElementById('lobby-overlay').classList.remove('hidden');
        ['lobby-host','lobby-join','lobby-disconnect'].forEach(id => {
            document.getElementById(id).classList.add('hidden');
        });
        document.getElementById(section).classList.remove('hidden');
    },
    _hideLobby() {
        document.getElementById('lobby-overlay').classList.add('hidden');
    },
    _showDisconnect() {
        this._showLobby('lobby-disconnect');
        this.state = STATE.GAME_OVER;
        this._buildGameOverBtns();
    },
    
    // ── Input helpers ────────────────────────────────────────────
    _getLogicalClick() {
        // Returns logical {x, y} if a tap/click just started this frame, else null
        const touch = Input.isTouchStarted() ? Input.getTouch(0) : null;
        if (touch) {
            const p = Engine.toGame(touch.x, touch.y);
            return p;
        }
        if (Input.isMousePressed()) {
            const m = Input.getMouse();
            return Engine.toGame(m.x, m.y);
        }
        return null;
    },
    
    // ── Update ──────────────────────────────────────────────────
    update(dt) {
        this.t += dt;
        
        // Process flip animation queue
        if (this.flipAnims.length > 0) {
            this.flipAnims[0].update(dt);
            if (this.flipAnims[0].done) {
                this.flipAnims.shift();
                if (this.animQueue.length > 0 && this.flipAnims.length === 0) {
                    this.flipAnims.push(this.animQueue.shift());
                }
                Audio.play('flip');
            }
        } else if (this.animQueue.length > 0) {
            this.flipAnims.push(this.animQueue.shift());
        }
        
        switch (this.state) {
            case STATE.MENU:        this._updateMenu(dt);     break;
            case STATE.PLAYING:     this._updatePlaying(dt);  break;
            case STATE.GAME_OVER:   this._updateGameOver(dt); break;
        }
    },
    
    _updateMenu(dt) {
        this.menuAnim = (this.menuAnim + dt) % (Math.PI * 2);
        const click = this._getLogicalClick();
        if (!click) return;

        if (this.menuSubState === 'online-setup') {
            for (let i = 0; i < this.onlineSetupBtns.length; i++) {
                if (btnHit(this.onlineSetupBtns[i], click.x, click.y)) {
                    Audio.play('click');
                    if (i === 0) {
                        Online.destroy();
                        OnlineLobby.showHostPanel('------');
                        Online.host((code) => {
                            OnlineLobby.setCode(code);
                            OnlineLobby.setStatus('Esperando rival…');
                        });
                    } else if (i === 1) {
                        Online.destroy();
                        OnlineLobby.showJoinPanel();
                    } else if (i === 2) {
                        this.menuSubState = 'main';
                    }
                    return;
                }
            }
            return;
        }

        for (let i = 0; i < this.menuBtns.length; i++) {
            if (btnHit(this.menuBtns[i], click.x, click.y)) {
                Audio.play('click');
                if (i === 0) { this._startGame('solo'); }
                else if (i === 1) { this._startGame('local'); }
                else if (i === 2) { this._openOnlineSetup(); }
                return;
            }
        }
    },

    _openOnlineSetup() {
        this.menuSubState = 'online-setup';
        const cx = W / 2;
        this.onlineSetupBtns = [
            makeBtn('★ Crear Sala (Host)',  cx, 300, 280, 52, 'primary'),
            makeBtn('↗ Unirse con código', cx, 375, 280, 52, 'accent'),
            makeBtn('← Cancelar',          cx, 460, 200, 44, 'ghost'),
        ];
    },
    
    _updatePlaying(dt) {
        // Pass banner countdown
        if (this.passing) {
            this.passTimer -= dt;
            if (this.passTimer <= 0) { this.passing = false; }
            return; // Don't accept input while showing pass banner
        }
        
        // AI turn (solo mode)
        if (this.mode === 'solo' && this.currentPlayer === WHITE) {
            this.aiThinkTimer += dt;
            if (this.aiThinkTimer >= 0.55) {
                this.aiThinkTimer = 0;
                const move = aiMove(this.board, WHITE);
                if (move) this._applyLocalMove(move[0], move[1], false);
                else this._nextTurn(false);
            }
            return;
        }
        
        // Online: only accept input on our turn
        if (this.mode === 'online' && this.currentPlayer !== this.myColor) return;
        
        const click = this._getLogicalClick();
        if (!click) return;
        
        const cell = pixelToCell(click.x, click.y);
        if (!cell) return;
        
        const { row, col } = cell;
        if (!isValid(this.board, row, col, this.currentPlayer)) {
            Audio.play('error');
            return;
        }
        
        this._applyLocalMove(row, col, true);
    },
    
    _updateGameOver(dt) {
        const click = this._getLogicalClick();
        if (!click) return;
        for (let i = 0; i < this.gameOverBtns.length; i++) {
            if (btnHit(this.gameOverBtns[i], click.x, click.y)) {
                Audio.play('click');
                if (i === 0) {
                    // Replay same mode
                    if (this.mode === 'online') {
                        Online.destroy();
                        this.state = STATE.MENU;
                        this._openOnlineSetup();
                    } else {
                        this._startGame(this.mode);
                    }
                } else {
                    Online.destroy();
                    this.state = STATE.MENU;
                }
                return;
            }
        }
    },
    
    // ── Render ──────────────────────────────────────────────────
    render(ctx) {
        // Background gradient
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, '#0b0f1a');
        grad.addColorStop(1, '#0f1e35');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        
        switch (this.state) {
            case STATE.MENU:          this._renderMenu(ctx);    break;
            case STATE.PLAYING:       this._renderGame(ctx);    break;
            case STATE.GAME_OVER:     this._renderGame(ctx);
            this._renderGameOver(ctx); break;
        }
    },
    
    // ── Render: Menu ─────────────────────────────────────────────
    _renderMenu(ctx) {
        this._renderMenuBg(ctx);
        const cx = W / 2;

        if (this.menuSubState === 'online-setup') {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = "bold 32px 'Courier New', monospace";
            ctx.fillStyle = C.accent;
            ctx.fillText('Multijugador Online', cx, 200);
            ctx.font = "14px 'Courier New', monospace";
            ctx.fillStyle = C.mutedLight;
            ctx.fillText('¿Qué rol tomarás?', cx, 240);
            ctx.restore();
            for (const btn of this.onlineSetupBtns) {
                this._drawMenuBtn(ctx, btn);
            }
            return;
        }
        
        // Hero disc cluster (animated)
        const t = this.t;
        const dcx = cx, dcy = 192;
        const R = 38;
        const offsets = [[-48,-8],[0,-24],[48,-8],[-24,28],[24,28]];
        const colors  = [C.black,C.white,C.black,C.white,C.black];
        offsets.forEach(([dx,dy], i) => {
            const bx = dcx + dx + Math.sin(t * 0.6 + i) * 3;
            const by = dcy + dy + Math.cos(t * 0.5 + i * 0.7) * 2;
            this._drawDisc(ctx, bx, by, R * 0.68, colors[i], false);
        });
        
        // Title
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "bold 44px 'Courier New', monospace";
        ctx.fillStyle = C.accent;
        ctx.shadowColor = C.accent;
        ctx.shadowBlur = 20;
        ctx.fillText('OTHELLO', cx, 270);
        
        ctx.shadowBlur = 0;
        ctx.font = "14px 'Courier New', monospace";
        ctx.fillStyle = C.mutedLight;
        ctx.restore();
        
        // Mode buttons
        for (const btn of this.menuBtns) {
            this._drawMenuBtn(ctx, btn);
        }
        
        // Decorative bottom rule
        ctx.save();
        ctx.strokeStyle = C.muted;
        ctx.lineWidth   = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(cx - 80, 540); ctx.lineTo(cx + 80, 540);
        ctx.stroke();
        ctx.font = "11px 'Courier New', monospace";
        ctx.fillStyle = C.muted;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.55;
        ctx.fillText('Toca una celda para colocar tu disco', cx, 560);
        ctx.restore();
    },
    
    _renderMenuBg(ctx) {
        // Subtle grid dots
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = C.accent;
        for (let x = 20; x < W; x += 30)
            for (let y = 20; y < H; y += 30)
                { ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill(); }
        ctx.restore();
    },
    
    _drawMenuBtn(ctx, btn) {
        const { label, x, y, w, h, style } = btn;
        const lx = x - w/2, ly = y - h/2;
        
        const mRaw = Input.getMouse();
        const mPt = Engine.toGame(mRaw.x, mRaw.y);
        const hover = btnHit(btn, mPt.x, mPt.y);
        
        let accent = C.accent;
        if (style === 'secondary') accent = '#f5c518'; // Yellow for Local VS
        else if (style === 'accent') accent = '#e94560'; // Red for Online
        else if (style === 'ghost') accent = C.muted;
        
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(lx, ly, w, h, 10);
        ctx.fillStyle = hover ? accent + 'cc' : accent + '33';
        ctx.fill();
        ctx.strokeStyle = accent + 'aa';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.fillStyle = hover ? '#fff' : accent;
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y);
        ctx.restore();
    },
    
    // ── Render: Game ─────────────────────────────────────────────
    _renderGame(ctx) {
        this._renderHUD(ctx);
        this._renderBoard(ctx);
        
        // Pass banner
        if (this.passing) {
            const who = this.currentPlayer === BLACK ? 'Negras' : 'Blancas';
            this._drawBanner(ctx, `${who}: sin movimientos - pasa turno`, C.danger);
        }
    },
    
    _renderHUD(ctx) {
        const { black, white } = this.scores;
        const total = black + white;
        const cx = W / 2;
        
        // Mode label
        ctx.save();
        ctx.font        = "11px 'Courier New', monospace";
        ctx.textAlign   = 'center';
        ctx.textBaseline= 'middle';
        ctx.fillStyle   = C.muted;
        const modeLabel = { solo:'vs CPU', local:'1v1 Local', online:'Online P2P' }[this.mode] || '';
        ctx.fillText(modeLabel, cx, 22);
        ctx.restore();
        
        // Player indicators
        this._drawPlayerBox(ctx, 18, 32, 100, 90, BLACK, black, this.currentPlayer === BLACK);
        this._drawPlayerBox(ctx, W - 118, 32, 100, 90, WHITE, white, this.currentPlayer === WHITE);
        
        // Score progress bar
        const barX = 128, barY = 72, barW = W - 256, barH = 10;
        ctx.save();
        roundRect(ctx, barX, barY, barW, barH, 5);
        ctx.fillStyle = '#1a2540';
        ctx.fill();
        const bFrac = total > 0 ? black / total : 0.5;
        if (bFrac > 0) {
            roundRect(ctx, barX, barY, barW * bFrac, barH, 5);
            ctx.fillStyle = C.black;
            ctx.fill();
        }
        ctx.restore();
        
        // Turn indicator
        const turnLabel = this._getTurnLabel();
        ctx.save();
        ctx.font        = "bold 13px 'Courier New', monospace";
        ctx.textAlign   = 'center';
        ctx.textBaseline= 'middle';
        ctx.fillStyle   = this.currentPlayer === BLACK ? C.mutedLight : C.accent;
        ctx.fillText(turnLabel, cx, 95);
        ctx.restore();
    },
    
    _getTurnLabel() {
        if (this.mode === 'online') {
            if (this.currentPlayer === this.myColor) return '▶ Tu turno';
            return '⏳ Turno del rival';
        }
        const who = this.currentPlayer === BLACK ? '⬤ Negras' : '○ Blancas';
        return `${who}: tu turno`;
    },
    
    _drawPlayerBox(ctx, x, y, w, h, color, score, active) {
        ctx.save();
        roundRect(ctx, x, y, w, h, 12);
        ctx.fillStyle = active ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)';
        ctx.fill();
        if (active) {
            ctx.strokeStyle = color === BLACK ? C.mutedLight : C.accent;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
        
        const cx = x + w / 2;
        const discY = y + 32;
        this._drawDisc(ctx, cx, discY, 18, color === BLACK ? C.black : C.white, color === WHITE);
        
        ctx.font        = `bold 26px 'Courier New', monospace`;
        ctx.textAlign   = 'center';
        ctx.textBaseline= 'middle';
        ctx.fillStyle   = active ? C.text : C.muted;
        ctx.fillText(score, cx, y + 62);
        
        ctx.font        = `10px 'Courier New', monospace`;
        ctx.fillStyle   = C.muted;
        ctx.fillText(color === BLACK ? 'Negras' : 'Blancas', cx, y + 82);
        ctx.restore();
    },
    
    _renderBoard(ctx) {
        // Board shadow
        ctx.save();
        ctx.shadowColor  = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur   = 24;
        ctx.shadowOffsetY= 8;
        roundRect(ctx, BOARD_X - 4, BOARD_Y - 4, BOARD_W + 8, BOARD_W + 8, 10);
        ctx.fillStyle = C.board;
        ctx.fill();
        ctx.restore();
        
        // Board background
        ctx.save();
        roundRect(ctx, BOARD_X, BOARD_Y, BOARD_W, BOARD_W, 8);
        ctx.fillStyle = C.board;
        ctx.fill();
        
        // Checkerboard tint
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                if ((r + c) % 2 === 0) {
                    ctx.fillStyle = 'rgba(0,0,0,0.07)';
                    ctx.fillRect(BOARD_X + c * CELL_SIZE, BOARD_Y + r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                }
            }
        }
        
        // Grid lines
        ctx.strokeStyle = C.boardLine;
        ctx.lineWidth   = 0.8;
        for (let i = 0; i <= BOARD_SIZE; i++) {
            const x = BOARD_X + i * CELL_SIZE;
            const y = BOARD_Y + i * CELL_SIZE;
            ctx.beginPath(); ctx.moveTo(x, BOARD_Y); ctx.lineTo(x, BOARD_Y + BOARD_W); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(BOARD_X, y); ctx.lineTo(BOARD_X + BOARD_W, y); ctx.stroke();
        }
        
        // Star points
        const dots = [[2,2],[2,6],[6,2],[6,6],[4,4]];
        ctx.fillStyle = C.boardLine;
        for (const [r,c] of dots) {
            const {x,y} = cellToPixel(r, c);
            ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
        
        // Valid move hints
        const isMyTurn = this.mode !== 'online' || this.currentPlayer === this.myColor;
        if (isMyTurn && !this.passing) {
            for (const [r, c] of this.validMoves) {
                const {x, y} = cellToPixel(r, c);
                ctx.save();
                ctx.beginPath();
                ctx.arc(x, y, CELL_SIZE * 0.22, 0, Math.PI*2);
                ctx.fillStyle   = C.hint;
                ctx.fill();
                ctx.strokeStyle = C.hintBorder;
                ctx.lineWidth   = 1.5;
                ctx.stroke();
                ctx.restore();
            }
        }
        
        // Discs (with flip animation)
        const anim = this.flipAnims[0] || null;
        const animSet = anim ? new Set(anim.cells.map(([r,c]) => `${r},${c}`)) : new Set();
        
        for (let r = 0; r < BOARD_SIZE; r++) {
            for (let c = 0; c < BOARD_SIZE; c++) {
                const cell = this.board[r][c];
                if (cell === EMPTY) continue;
                
                const {x, y} = cellToPixel(r, c);
                const key = `${r},${c}`;
                
                if (anim && animSet.has(key)) {
                    // Flip animation: squish disc from old color to new
                    const p   = anim.progress;       // 0→1
                    const scX = Math.abs(Math.cos(p * Math.PI));  // 1→0→1
                    const phase = p < 0.5 ? anim.from : cell;
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.scale(scX, 1);
                    ctx.translate(-x, -y);
                    this._drawDisc(ctx, x, y, CELL_SIZE * 0.42, phase === BLACK ? C.black : C.white, phase === WHITE);
                    ctx.restore();
                } else {
                    this._drawDisc(ctx, x, y, CELL_SIZE * 0.42, cell === BLACK ? C.black : C.white, cell === WHITE);
                }
            }
        }
    },
    
    _drawDisc(ctx, x, y, r, baseColor, isWhite) {
        ctx.save();
        
        // Shadow
        ctx.shadowColor  = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur   = 8;
        ctx.shadowOffsetY= 3;
        
        // Base fill
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
        
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        
        // Shine gradient
        const shine = ctx.createRadialGradient(x - r*0.3, y - r*0.35, r*0.05, x, y, r);
        shine.addColorStop(0, isWhite ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.22)');
        shine.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = shine;
        ctx.fill();
        
        // Edge ring
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = isWhite ? 'rgba(200,210,230,0.5)' : 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.restore();
    },
    
    _drawBanner(ctx, msg, color) {
        ctx.save();
        roundRect(ctx, W*0.08, H/2 - 28, W*0.84, 56, 12);
        ctx.fillStyle = 'rgba(11,15,26,0.92)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth   = 2;
        ctx.stroke();
        ctx.font        = "bold 15px 'Courier New', monospace";
        ctx.textAlign   = 'center';
        ctx.textBaseline= 'middle';
        ctx.fillStyle   = color;
        ctx.fillText(msg, W/2, H/2);
        ctx.restore();
    },
    
    // ── Render: Game Over ────────────────────────────────────────
    _renderGameOver(ctx) {
        // Dimming overlay
        ctx.save();
        ctx.fillStyle = C.overlay;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        
        const cx = W / 2;
        const cy = H / 2;
        
        // Result card
        ctx.save();
        roundRect(ctx, cx - 150, cy - 110, 300, 200, 18);
        ctx.fillStyle = C.surface;
        ctx.fill();
        ctx.strokeStyle = C.border;
        ctx.lineWidth   = 1;
        ctx.strokeStyle = C.accent;
        ctx.stroke();
        ctx.restore();
        
        // Winner disc
        const { black, white } = this.scores;
        const winColor = this.winner === BLACK ? C.black : (this.winner === WHITE ? C.white : null);
        if (winColor) this._drawDisc(ctx, cx, cy - 62, 28, winColor, this.winner === WHITE);
        
        // Result text
        ctx.save();
        ctx.textAlign   = 'center';
        ctx.textBaseline= 'middle';
        let headline, sub;
        if (this.winner === 'draw') {
            headline  = '¡Empate!';
            sub       = `${black} – ${white}`;
            ctx.fillStyle = C.gold;
        } else {
            const winnerName = this.winner === BLACK ? 'Negras' : 'Blancas';
            headline  = `${winnerName} ganan`;
            sub       = `${black} – ${white}`;
            ctx.fillStyle = this.winner === BLACK ? C.mutedLight : C.accent;
        }
        ctx.font = "bold 26px 'Courier New', monospace";
        ctx.fillText(headline, cx, cy - 18);
        ctx.fillStyle = C.muted;
        ctx.font = "15px 'Courier New', monospace";
        ctx.fillText(sub, cx, cy + 12);
        ctx.restore();
        
        // Buttons
        for (const btn of this.gameOverBtns) {
            this._drawMenuBtn(ctx, btn);
        }
    },
};

// ── Boot ──────────────────────────────────────────────────────────
OnlineLobby.onCancel(() => {
    Online.destroy();
    game.menuSubState = 'main';
});

OnlineLobby.wireDefaultJoin((code) => {
    OnlineLobby.setStatus('Conectando…');
    Online.join(code);
});

GameBoot.startCanvas(game, { canvasId: 'gameCanvas', width: W, height: H, bg: '#0b0f1a' });