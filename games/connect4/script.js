const COLS = 7;
const ROWS = 6;
const HUMAN = 1;
const AI    = 2;

const game = {
    init() {
        // Board: 0=empty, 1=human, 2=AI
        this.board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        this.turn = HUMAN;
        this.gameOver = false;
        this.winner = null;
        this.winCells = null;
        this.hoverCol = -1;
        this.scores = { human: 0, ai: 0, draws: 0 };
        this.dropAnim = null;   // { col, row, piece, y, targetY }
        this.restartCd = 0;
        this.hadMouse = false;
        this.hadTouch = false;
        this._aiTimer = null;
        
        // Layout
        const pad   = 24;
        const maxW  = Engine.W - pad * 2;
        const maxH  = Engine.H - 110;
        this.cellSize = Math.floor(Math.min(maxW / COLS, maxH / ROWS));
        this.boardW = this.cellSize * COLS;
        this.boardH = this.cellSize * ROWS;
        this.boardX = Math.floor((Engine.W - this.boardW) / 2);
        this.boardY = Math.floor((Engine.H - this.boardH) / 2) + 20;
        this.radius = Math.floor(this.cellSize * 0.38);
        
        // Audio
        Audio.synth('drop',  'sine',   420, 0.12, 0.18);
        Audio.synth('win',   'square', 520, 0.35, 0.15);
        Audio.synth('lose',  'saw',    160, 0.30, 0.15);
        Audio.synth('draw',  'sine',   260, 0.25, 0.12);
        Audio.synth('hover', 'sine',   700, 0.04, 0.08);
    },
    
    // ── Helpers ──────────────────────────────────────────────
    
    colFromX(x) {
        const col = Math.floor((x - this.boardX) / this.cellSize);
        return (col >= 0 && col < COLS) ? col : -1;
    },
    
    dropRow(board, col) {
        for (let r = ROWS - 1; r >= 0; r--)
            if (board[r][col] === 0) return r;
        return -1;
    },
    
    applyMove(board, col, piece) {
        const row = this.dropRow(board, col);
        if (row === -1) return null;
        const nb = board.map(r => [...r]);
        nb[row][col] = piece;
        return nb;
    },
    
    checkWin(board, piece) {
        const dirs = [[0,1],[1,0],[1,1],[1,-1]];
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (board[r][c] !== piece) continue;
                for (const [dr, dc] of dirs) {
                    const cells = [[r, c]];
                    for (let i = 1; i < 4; i++) {
                        const nr = r + dr * i, nc = c + dc * i;
                        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || board[nr][nc] !== piece) break;
                        cells.push([nr, nc]);
                    }
                    if (cells.length === 4) return cells;
                }
            }
        }
        return null;
    },
    
    isFull(board) {
        return board[0].every(c => c !== 0);
    },
    
    validCols(board) {
        return Array.from({ length: COLS }, (_, i) => i).filter(c => board[0][c] === 0);
    },
    
    // ── AI (minimax + alpha-beta, depth 6) ───────────────────
    
    scoreWindow(window, piece) {
        const opp = piece === AI ? HUMAN : AI;
        let score = 0;
        const pc = window.filter(c => c === piece).length;
        const ec = window.filter(c => c === 0).length;
        const oc = window.filter(c => c === opp).length;
        if (pc === 4) score += 100;
        else if (pc === 3 && ec === 1) score += 5;
        else if (pc === 2 && ec === 2) score += 2;
        if (oc === 3 && ec === 1) score -= 4;
        return score;
    },
    
    scoreBoard(board, piece) {
        let score = 0;
        // Center column preference
        const centerCol = board.map(r => r[Math.floor(COLS / 2)]);
        score += centerCol.filter(c => c === piece).length * 3;
        // Horizontal
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c <= COLS - 4; c++)
                score += this.scoreWindow(board[r].slice(c, c + 4), piece);
        // Vertical
        for (let c = 0; c < COLS; c++)
            for (let r = 0; r <= ROWS - 4; r++)
                score += this.scoreWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]], piece);
        // Diagonal /
        for (let r = 0; r <= ROWS - 4; r++)
            for (let c = 0; c <= COLS - 4; c++)
                score += this.scoreWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]], piece);
        // Diagonal \
        for (let r = 3; r < ROWS; r++)
            for (let c = 0; c <= COLS - 4; c++)
                score += this.scoreWindow([board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]], piece);
        return score;
    },
    
    minimax(board, depth, alpha, beta, maximizing) {
        const aiWin  = this.checkWin(board, AI);
        const humWin = this.checkWin(board, HUMAN);
        if (aiWin)  return { score:  100000 + depth };
        if (humWin) return { score: -100000 - depth };
        if (this.isFull(board) || depth === 0)
            return { score: this.scoreBoard(board, AI) };
        
        const cols = this.validCols(board);
        let bestCol = cols[Math.floor(cols.length / 2)];
        
        if (maximizing) {
            let best = -Infinity;
            for (const c of cols) {
                const nb = this.applyMove(board, c, AI);
                const { score } = this.minimax(nb, depth - 1, alpha, beta, false);
                if (score > best) { best = score; bestCol = c; }
                alpha = Math.max(alpha, score);
                if (alpha >= beta) break;
            }
            return { score: best, col: bestCol };
        } else {
            let best = Infinity;
            for (const c of cols) {
                const nb = this.applyMove(board, c, HUMAN);
                const { score } = this.minimax(nb, depth - 1, alpha, beta, true);
                if (score < best) { best = score; bestCol = c; }
                beta = Math.min(beta, score);
                if (alpha >= beta) break;
            }
            return { score: best, col: bestCol };
        }
    },
    
    getBestCol() {
        const { col } = this.minimax(this.board, 6, -Infinity, Infinity, true);
        return col;
    },
    
    // ── Drop & Resolve ────────────────────────────────────────
    
    placePiece(col, piece) {
        const row = this.dropRow(this.board, col);
        if (row === -1) return false;
        
        // Animate drop
        const targetY = this.boardY + row * this.cellSize + this.cellSize / 2;
        const startY  = this.boardY - this.cellSize;
        this.dropAnim = { col, row, piece, y: startY, targetY };
        return true;
    },
    
    resolvePlace(col, row, piece) {
        this.board[row][col] = piece;
        Audio.play('drop');
        
        const winCells = this.checkWin(this.board, piece);
        if (winCells) {
            this.gameOver = true;
            this.winner   = piece;
            this.winCells = winCells;
            this.restartCd = 1.2;
            if (piece === HUMAN) { this.scores.human++; Audio.play('win'); }
            else                  { this.scores.ai++;    Audio.play('lose'); }
            return;
        }
        if (this.isFull(this.board)) {
            this.gameOver = true;
            this.winner   = 0;
            this.winCells = null;
            this.scores.draws++;
            this.restartCd = 1.2;
            Audio.play('draw');
            return;
        }
        this.turn = piece === HUMAN ? AI : HUMAN;
    },
    
    // ── Update / Render ───────────────────────────────────────
    
    update(dt) {
        // Animate drop
        if (this.dropAnim) {
            const a = this.dropAnim;
            const speed = (a.targetY - this.boardY + this.cellSize) * 8;
            a.y += speed * dt;
            if (a.y >= a.targetY) {
                a.y = a.targetY;
                this.resolvePlace(a.col, a.row, a.piece);
                this.dropAnim = null;
            }
            return;
        }
        
        // Restart
        if (this.gameOver) {
            this.restartCd -= dt;
            if (this.restartCd <= 0) {
                const hasTouch = Input.getTouchCount() > 0;
                if (
                    Input.isPressed('Space') ||
                    Input.isPressed('Enter') ||
                    (Input.isMousePressed() && !this.hadMouse) ||
                    (hasTouch && !this.hadTouch)
                ) {
                    const s = this.scores;
                    this.init();
                    this.scores = s;
                    return;
                }
                this.hadTouch = Input.getTouchCount() > 0;
                this.hadMouse = Input.isMousePressed();
            }
            return;
        }
        
        // AI turn
        if (this.turn === AI) {
            if (this._aiTimer === null) this._aiTimer = 0.4;
            this._aiTimer -= dt;
            if (this._aiTimer <= 0) {
                this._aiTimer = null;
                const col = this.getBestCol();
                if (col !== undefined) this.placePiece(col, AI);
            }
            return;
        }
        
        // Human turn — track hover
        const mouse   = Input.getMouse();
        const gm      = Engine.toGame(mouse.x, mouse.y);
        const touch   = Input.getTouch();
        const gt      = touch ? Engine.toGame(touch.x, touch.y) : null;
        
        const mouseClick = Input.isMousePressed() && !this.hadMouse;
        const touchTap   = Input.getTouchCount() > 0 && !this.hadTouch;
        this.hadMouse = Input.isMousePressed();
        this.hadTouch = Input.getTouchCount() > 0;
        
        // Use touch position for hover on mobile, mouse on desktop
        const activePos = gt || gm;
        const newCol    = this.colFromX(activePos.x);
        
        if (newCol !== this.hoverCol) {
            if (newCol !== -1) Audio.play('hover');
            this.hoverCol = newCol;
        }
        
        if (mouseClick || touchTap) {
            const clickPos = mouseClick ? gm : gt;
            const col = this.colFromX(clickPos.x);
            if (col !== -1) this.placePiece(col, HUMAN);
        }
    },
    
    render(ctx) {
        // Background
        Engine.rect(0, 0, Engine.W, Engine.H, '#0f0f1a');
        
        const cs = this.cellSize;
        const r  = this.radius;
        const bx = this.boardX;
        const by = this.boardY;
        
        // Title & score
        Engine.text('Conecta 4', Engine.W / 2, 22, '#e0e0e0', 20);
        Engine.text(
            `Tú ${this.scores.human}  –  ${this.scores.ai} IA   Empates: ${this.scores.draws}`,
            Engine.W / 2, 44, '#a0a0b0', 13
        );
        
        // Hover indicator (arrow + column highlight)
        if (!this.gameOver && this.turn === HUMAN && this.hoverCol !== -1 && !this.dropAnim) {
            const hx = bx + this.hoverCol * cs + cs / 2;
            ctx.fillStyle = '#e94560';
            ctx.beginPath();
            ctx.moveTo(hx, by - 14);
            ctx.lineTo(hx - 7, by - 26);
            ctx.lineTo(hx + 7, by - 26);
            ctx.closePath();
            ctx.fill();
        }
        
        // Board background
        ctx.fillStyle = '#1a2a5e';
        ctx.beginPath();
        ctx.roundRect(bx - 4, by - 4, this.boardW + 8, this.boardH + 8, 10);
        ctx.fill();
        
        // Cells
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const cx = bx + col * cs + cs / 2;
                const cy = by + row * cs + cs / 2;
                const piece = this.board[row][col];
                
                // Hole
                ctx.fillStyle = '#0f0f1a';
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
                
                // Piece
                if (piece !== 0) {
                    const isWin = this.winCells && this.winCells.some(([wr, wc]) => wr === row && wc === col);
                    ctx.fillStyle = piece === HUMAN
                    ? (isWin ? '#ff2244' : '#e94560')
                    : (isWin ? '#ffe033' : '#f5c518');
                    if (isWin) {
                        ctx.shadowColor = piece === HUMAN ? '#ff2244' : '#ffe033';
                        ctx.shadowBlur  = 18;
                    }
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
                
                // Hover tint
                if (
                    !this.gameOver && this.turn === HUMAN &&
                    col === this.hoverCol && piece === 0 && !this.dropAnim
                ) {
                    ctx.fillStyle = 'rgba(233,69,96,0.15)';
                    ctx.beginPath();
                    ctx.arc(cx, cy, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        
        // Drop animation
        if (this.dropAnim) {
            const a = this.dropAnim;
            const cx = bx + a.col * cs + cs / 2;
            ctx.fillStyle = a.piece === HUMAN ? '#e94560' : '#f5c518';
            ctx.beginPath();
            ctx.arc(cx, a.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Turn indicator
        if (!this.gameOver && !this.dropAnim) {
            const label = this.turn === HUMAN ? '🔴 Tu turno' : '🟡 IA pensando…';
            Engine.text(label, Engine.W / 2, by + this.boardH + 28, '#a0a0b0', 15);
        }
        
        // Game-over overlay
        if (this.gameOver && this.restartCd <= 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, 0, Engine.W, Engine.H);
            
            let msg, color;
            if (this.winner === HUMAN)       { msg = '¡Ganaste! 🎉'; color = '#4ecca3'; }
            else if (this.winner === AI)     { msg = '¡Ganó la IA!'; color = '#e94560'; }
            else                             { msg = '¡Empate!';      color = '#f5c518'; }
            
            Engine.text(msg,                  Engine.W / 2, Engine.H / 2 - 20, color,     30);
            Engine.text('Toca o pulsa Space', Engine.W / 2, Engine.H / 2 + 20, '#a0a0b0', 15);
        }
    }
};

Engine.init('game', { width: 480, height: 520, bg: '#0f0f1a' }).start(game);