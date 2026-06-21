// ─── Sudoku – ZLostTK Games ──────────────────────────────────────────────────
// Resolución lógica: 480×760
// Sin assets externos. Soporta mouse y touch.

Engine.init('gameCanvas', { width: 480, height: 760, bg: '#0f0f1a' });

// ─── Paleta ──────────────────────────────────────────────────────────────────
const C = {
    bg:          '#0f0f1a',
    surface:     '#16213e',
    surfaceAlt:  '#1a1a2e',
    border:      '#2a2a4a',
    borderBold:  '#4ecca3',
    cellHover:   '#1e2d40',
    cellSel:     '#0d3352',
    cellRelated: '#131a30',
    cellError:   '#3d1422',
    cellSame:    '#1a2d1a',
    numGiven:    '#e0e0f0',
    numUser:     '#4ecca3',
    numError:    '#ff6b8a',
    numNote:     '#6b7fa8',
    accent:      '#4ecca3',
    accentDim:   '#2a6b56',
    textPrimary: '#e0e0f0',
    textMuted:   '#6b7fa8',
    btnBg:       '#1a2540',
    btnHover:    '#223060',
    btnActive:   '#1a3a5c',
};

// ─── Generador de Sudoku ─────────────────────────────────────────────────────
function generateSudoku(difficulty) {
    // Genera un tablero completo válido
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    solveFill(board);
    
    // Crea la solución
    const solution = board.map(r => [...r]);
    
    // Determina cuántas celdas dejar visibles
    const given = { easy: 38, medium: 30, hard: 24 }[difficulty] || 30;
    const puzzle = board.map(r => [...r]);
    
    // Elimina celdas aleatoriamente garantizando solución única
    let removed = 0;
    const target = 81 - given;
    const positions = shuffle([...Array(81).keys()]);
    
    for (const pos of positions) {
        if (removed >= target) break;
        const r = Math.floor(pos / 9), c = pos % 9;
        const backup = puzzle[r][c];
        puzzle[r][c] = 0;
        // Verificación rápida de unicidad (conteo de soluciones ≤ 1)
        if (countSolutions(puzzle.map(row => [...row])) === 1) {
            removed++;
        } else {
            puzzle[r][c] = backup;
        }
    }
    
    return { puzzle, solution };
}

function solveFill(board) {
    const nums = shuffle([1,2,3,4,5,6,7,8,9]);
    return _fill(board, nums);
}

function _fill(board, nums) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                for (const n of nums) {
                    if (isValid(board, r, c, n)) {
                        board[r][c] = n;
                        if (_fill(board, nums)) return true;
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function countSolutions(board, limit = 2) {
    let count = 0;
    function solve() {
        for (let r = 0; r < 9; r++) {
            for (let c = 0; c < 9; c++) {
                if (board[r][c] === 0) {
                    for (let n = 1; n <= 9; n++) {
                        if (isValid(board, r, c, n)) {
                            board[r][c] = n;
                            solve();
                            board[r][c] = 0;
                            if (count >= limit) return;
                        }
                    }
                    return;
                }
            }
        }
        count++;
    }
    solve();
    return count;
}

function isValid(board, r, c, n) {
    for (let i = 0; i < 9; i++) {
        if (board[r][i] === n || board[i][c] === n) return false;
    }
    const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            if (board[br+i][bc+j] === n) return false;
    return true;
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ─── Audio ───────────────────────────────────────────────────────────────────
function initSounds() {
    Audio.synth('place',   'sine',   880, 0.07, 0.18);
    Audio.synth('error',   'square', 150, 0.12, 0.12);
    Audio.synth('erase',   'sine',   440, 0.06, 0.10);
    Audio.synth('win',     'sine',   660, 0.50, 0.20, 1320);
    Audio.synth('select',  'sine',   520, 0.05, 0.12);
    Audio.synth('note',    'sine',   660, 0.05, 0.10);
}

// ─── Estado del juego ────────────────────────────────────────────────────────
const SCENE = { MENU: 'menu', GAME: 'game', WIN: 'win' };

const state = {
    scene:       SCENE.MENU,
    difficulty:  'medium',
    puzzle:      null,
    solution:    null,
    given:       null,      // máscara booleana
    userBoard:   null,      // valores ingresados
    notes:       null,      // notas[r][c] = Set de números
    selected:    null,      // { r, c } | null
    noteMode:    false,
    errors:      0,
    maxErrors:   3,
    time:        0,
    complete:    false,
    winAnim:     0,
    
    // botones menú
    menuBtns:    [],
    // botones in-game
    numPad:      [],
    actionBtns:  [],
};

// ─── Layout (coordenadas lógicas 480×760) ────────────────────────────────────
const GRID_X  = 16;
const GRID_Y  = 100;
const GRID_W  = 480 - 32;
const CELL    = Math.floor(GRID_W / 9);   // 49
const GRID_H  = CELL * 9;

// Numpad: 9 números + Borrar
const PAD_Y   = GRID_Y + GRID_H + 24;
const PAD_BTN = 46;
const PAD_GAP = 4;
const PAD_ROW_W = 9 * (PAD_BTN + PAD_GAP) - PAD_GAP;
const PAD_X   = (480 - PAD_ROW_W) / 2;

// Botones acción: Notas | Deshacer | Nueva
const ACT_Y   = PAD_Y + PAD_BTN + 16;
const ACT_W   = 140;
const ACT_H   = 42;

function buildLayout() {
    // Números 1-9
    state.numPad = [];
    for (let i = 0; i < 9; i++) {
        state.numPad.push({
            n:    i + 1,
            x:    PAD_X + i * (PAD_BTN + PAD_GAP),
            y:    PAD_Y,
            w:    PAD_BTN,
            h:    PAD_BTN,
        });
    }
    
    // Acción: Notas | Deshacer | Nueva
    const totalAct = 3 * ACT_W + 2 * 10;
    const actX = (480 - totalAct) / 2;
    state.actionBtns = [
        { id: 'notes',  label: '✏ Notas', x: actX,              y: ACT_Y, w: ACT_W, h: ACT_H },
        { id: 'undo',   label: '↩ Deshacer', x: actX + ACT_W + 10, y: ACT_Y, w: ACT_W, h: ACT_H },
        { id: 'new',    label: '⊕ Nueva',  x: actX + (ACT_W+10)*2, y: ACT_Y, w: ACT_W, h: ACT_H },
    ];
    
    // Menú: dificultad
    const mw = 140, mh = 50, mg = 14;
    const diffs = ['easy', 'medium', 'hard'];
    const labels = ['Fácil', 'Medio', 'Difícil'];
    const totalM = diffs.length * mw + (diffs.length - 1) * mg;
    const mx = (480 - totalM) / 2;
    state.menuBtns = diffs.map((d, i) => ({
        id: d,
        label: labels[i],
        x: mx + i * (mw + mg),
        y: 340,
        w: mw,
        h: mh,
    }));
}

// ─── Historia para deshacer ───────────────────────────────────────────────────
const history = [];

function pushHistory() {
    history.push({
        board: state.userBoard.map(r => [...r]),
        notes: state.notes.map(r => r.map(s => new Set(s))),
    });
    if (history.length > 80) history.shift();
}

function undoMove() {
    if (!history.length) return;
    const snap = history.pop();
    state.userBoard = snap.board;
    state.notes     = snap.notes;
    Audio.play('erase');
}

// ─── Lógica de juego ─────────────────────────────────────────────────────────
function startGame(difficulty) {
    state.difficulty = difficulty;
    const { puzzle, solution } = generateSudoku(difficulty);
    state.puzzle    = puzzle;
    state.solution  = solution;
    state.given     = puzzle.map(r => r.map(v => v !== 0));
    state.userBoard = puzzle.map(r => [...r]);
    state.notes     = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    state.selected  = null;
    state.noteMode  = false;
    state.errors    = 0;
    state.time      = 0;
    state.complete  = false;
    state.winAnim   = 0;
    history.length  = 0;
    state.scene     = SCENE.GAME;
}

function placeNumber(n) {
    if (!state.selected) return;
    const { r, c } = state.selected;
    if (state.given[r][c]) return;
    
    if (state.noteMode) {
        pushHistory();
        const s = state.notes[r][c];
        s.has(n) ? s.delete(n) : s.add(n);
        Audio.play('note');
        return;
    }
    
    if (state.userBoard[r][c] === n) return;
    
    pushHistory();
    state.userBoard[r][c] = n;
    state.notes[r][c].clear();
    
    if (n !== state.solution[r][c]) {
        state.errors++;
        Audio.play('error');
    } else {
        Audio.play('place');
        // Limpia notas en fila, columna y caja que contenían ese número
        for (let i = 0; i < 9; i++) {
            state.notes[r][i].delete(n);
            state.notes[i][c].delete(n);
        }
        const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++)
                state.notes[br+i][bc+j].delete(n);
    }
    
    checkWin();
}

function eraseCell() {
    if (!state.selected) return;
    const { r, c } = state.selected;
    if (state.given[r][c]) return;
    pushHistory();
    state.userBoard[r][c] = 0;
    state.notes[r][c].clear();
    Audio.play('erase');
}

function checkWin() {
    for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
            if (state.userBoard[r][c] !== state.solution[r][c]) return;
    state.complete = true;
    state.winAnim  = 0;
    Audio.play('win');
    setTimeout(() => { state.scene = SCENE.WIN; }, 1200);
}

// Cuántas veces aparece n en el tablero del usuario
function countPlaced(n) {
    let k = 0;
    for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
            if (state.userBoard[r][c] === n) k++;
    return k;
}

// ─── Hit-testing ─────────────────────────────────────────────────────────────
function hitGrid(x, y) {
    if (x < GRID_X || x > GRID_X + GRID_W || y < GRID_Y || y > GRID_Y + GRID_H) return null;
    const c = Math.floor((x - GRID_X) / CELL);
    const r = Math.floor((y - GRID_Y) / CELL);
    if (r < 0 || r > 8 || c < 0 || c > 8) return null;
    return { r, c };
}

function hitButtons(x, y, buttons) {
    return buttons.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) || null;
}

// ─── Input ───────────────────────────────────────────────────────────────────
function handleClick(rawX, rawY) {
    const { x, y } = Engine.toGame(rawX, rawY);
    
    if (state.scene === SCENE.MENU) {
        const btn = hitButtons(x, y, state.menuBtns);
        if (btn) startGame(btn.id);
        return;
    }
    
    if (state.scene === SCENE.WIN) {
        state.scene = SCENE.MENU;
        return;
    }
    
    if (state.scene !== SCENE.GAME) return;
    
    // Grid
    const cell = hitGrid(x, y);
    if (cell) {
        if (state.selected && state.selected.r === cell.r && state.selected.c === cell.c) {
            state.selected = null;
        } else {
            state.selected = cell;
            Audio.play('select');
        }
        return;
    }
    
    // Numpad
    const numBtn = hitButtons(x, y, state.numPad);
    if (numBtn) {
        placeNumber(numBtn.n);
        return;
    }
    
    // Botones acción
    const actBtn = hitButtons(x, y, state.actionBtns);
    if (actBtn) {
        if (actBtn.id === 'notes') { state.noteMode = !state.noteMode; }
        if (actBtn.id === 'undo')  { undoMove(); }
        if (actBtn.id === 'new')   { state.scene = SCENE.MENU; }
    }
}

// ─── Objeto Juego ─────────────────────────────────────────────────────────────
const game = {
    init() {
        buildLayout();
        initSounds();
        
        // Gestor de clicks unificado (mouse + touch)
        this._wasDown = false;
        this._lastTouchX = 0;
        this._lastTouchY = 0;
    },
    
    update(dt) {
        if (state.scene === SCENE.GAME && !state.complete) {
            state.time += dt;
        }
        if (state.scene === SCENE.WIN || state.complete) {
            state.winAnim += dt;
        }
        
        // ── Mouse click (flanco ascendente) ──
        const mouse = Input.getMouse();
        const down  = mouse.down;
        if (!down && this._wasDown) {
            handleClick(mouse.x, mouse.y);
        }
        this._wasDown = down;
        
        // ── Touch (solo touchStarted para evitar doble disparo) ──
        if (Input.isTouchStarted()) {
            const t = Input.getTouch(0);
            if (t) {
                this._lastTouchX = t.x;
                this._lastTouchY = t.y;
            }
        }
        // Dispara en touchEnd (dedo levantado) para mayor precisión
        const tcount = Input.getTouchCount();
        if (tcount === 0 && this._hadTouch) {
            handleClick(this._lastTouchX, this._lastTouchY);
        }
        this._hadTouch = tcount > 0;
        
        // Teclado
        if (state.scene === SCENE.GAME) {
            for (let n = 1; n <= 9; n++) {
                if (Input.isPressed(`Digit${n}`) || Input.isPressed(`Numpad${n}`)) placeNumber(n);
            }
            if (Input.isPressed('Backspace') || Input.isPressed('Delete') || Input.isPressed('Digit0') || Input.isPressed('Numpad0')) eraseCell();
            if (Input.isPressed('KeyN')) state.noteMode = !state.noteMode;
            if (Input.isPressed('KeyZ')) undoMove();
            
            // Flechas
            if (state.selected) {
                const { r, c } = state.selected;
                if (Input.isPressed('ArrowUp'))    state.selected = { r: Math.max(0, r-1), c };
                if (Input.isPressed('ArrowDown'))  state.selected = { r: Math.min(8, r+1), c };
                if (Input.isPressed('ArrowLeft'))  state.selected = { r, c: Math.max(0, c-1) };
                if (Input.isPressed('ArrowRight')) state.selected = { r, c: Math.min(8, c+1) };
            }
        }
    },
    
    render(ctx) {
        // Fondo
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, 480, 760);
        
        if (state.scene === SCENE.MENU) {
            renderMenu(ctx);
        } else if (state.scene === SCENE.GAME || state.scene === SCENE.WIN) {
            renderGame(ctx);
        }
    },
};

// ─── Renderizado: Menú ───────────────────────────────────────────────────────
function renderMenu(ctx) {
    ctx.save();
    
    // Título
    ctx.fillStyle = C.accent;
    ctx.font = "bold 52px 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SUDOKU', 240, 140);
    
    // Decoración: mini grid de 3×3
    const mg = 20, ms = 22;
    const mx = 240 - (3 * ms + 2 * mg) / 2 + ms / 2;
    const my = 220;
    ctx.strokeStyle = C.accentDim;
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const cx = mx + j * (ms + mg);
            const cy = my + i * (ms + mg);
            ctx.strokeRect(cx - ms/2, cy - ms/2, ms, ms);
            // Rellena algunos con acento
            if ((i + j) % 2 === 0) {
                ctx.fillStyle = C.accentDim + '55';
                ctx.fillRect(cx - ms/2 + 1, cy - ms/2 + 1, ms - 2, ms - 2);
            }
        }
    }
    
    ctx.fillStyle = C.textMuted;
    ctx.font = "16px 'Courier New', monospace";
    ctx.fillText('Selecciona dificultad', 240, 310);
    
    // Botones dificultad
    for (const btn of state.menuBtns) {
        const hover = false; // solo se ilumina en hover con mouse, no crítico aquí
        ctx.save();
        // Sombra suave
        ctx.shadowColor = C.accent + '40';
        ctx.shadowBlur  = btn.id === state.difficulty ? 12 : 0;
        
        // Fondo botón
        const grad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
        grad.addColorStop(0, btn.id === state.difficulty ? '#1a3a5c' : C.btnBg);
        grad.addColorStop(1, btn.id === state.difficulty ? '#0d2540' : '#111928');
        ctx.fillStyle = grad;
        roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
        ctx.fill();
        
        // Borde
        ctx.strokeStyle = btn.id === state.difficulty ? C.accent : C.border;
        ctx.lineWidth   = btn.id === state.difficulty ? 2 : 1;
        roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
        ctx.stroke();
        
        // Texto
        ctx.fillStyle   = btn.id === state.difficulty ? C.accent : C.textPrimary;
        ctx.font        = "bold 18px 'Courier New', monospace";
        ctx.textAlign   = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur  = 0;
        ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
        ctx.restore();
    }
    
    // Subtítulo
    ctx.fillStyle = C.textMuted;
    ctx.font = "13px 'Courier New', monospace";
    ctx.fillText('Rellena la cuadrícula con números del 1 al 9', 240, 430);
    ctx.fillText('sin repetir en fila, columna ni caja 3×3', 240, 450);
    
    ctx.restore();
}

// ─── Renderizado: Juego ───────────────────────────────────────────────────────
function renderGame(ctx) {
    ctx.save();
    
    const sel  = state.selected;
    const selN = sel ? state.userBoard[sel.r][sel.c] : 0;
    
    // ── Header: errores + tiempo ──
    renderHeader(ctx);
    
    // ── Celdas ──
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cx = GRID_X + c * CELL;
            const cy = GRID_Y + r * CELL;
            const val  = state.userBoard[r][c];
            const given = state.given[r][c];
            const isErr = !given && val !== 0 && val !== state.solution[r][c];
            
            // Color de fondo
            let bg = C.surface;
            if (sel) {
                if (sel.r === r && sel.c === c) {
                    bg = C.cellSel;
                } else if (sel.r === r || sel.c === c ||
                    (Math.floor(sel.r/3) === Math.floor(r/3) && Math.floor(sel.c/3) === Math.floor(c/3))) {
                        bg = C.cellRelated;
                    } else if (selN !== 0 && val === selN) {
                        bg = C.cellSame;
                    }
                }
                if (isErr) bg = C.cellError;
                
                ctx.fillStyle = bg;
                ctx.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);
                
                // Número o notas
                if (val !== 0) {
                    ctx.font = given
                    ? `bold 24px 'Courier New', monospace`
                    : `22px 'Courier New', monospace`;
                    ctx.textAlign    = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle    = isErr ? C.numError : given ? C.numGiven : C.numUser;
                    
                    // Brillo en número resaltado
                    if (!isErr && !given && sel && val === selN && !(sel.r === r && sel.c === c)) {
                        ctx.save();
                        ctx.shadowColor = C.accent + '99';
                        ctx.shadowBlur  = 8;
                        ctx.fillText(val, cx + CELL/2, cy + CELL/2);
                        ctx.restore();
                    } else {
                        ctx.fillText(val, cx + CELL/2, cy + CELL/2);
                    }
                } else {
                    // Notas
                    const ns = state.notes[r][c];
                    if (ns.size > 0) {
                        ctx.font = `10px 'Courier New', monospace`;
                        ctx.textAlign    = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle    = C.numNote;
                        for (let n = 1; n <= 9; n++) {
                            if (ns.has(n)) {
                                const nr = Math.floor((n-1) / 3);
                                const nc = (n-1) % 3;
                                const nx = cx + nc * (CELL/3) + CELL/6;
                                const ny = cy + nr * (CELL/3) + CELL/6;
                                ctx.fillText(n, nx, ny);
                            }
                        }
                    }
                }
            }
        }
        
        // ── Líneas de cuadrícula ──
        renderGrid(ctx);
        
        // ── Win flash ──
        if (state.complete && state.winAnim < 1.2) {
            const alpha = Math.max(0, 0.35 * Math.sin(state.winAnim * Math.PI / 0.6));
            ctx.fillStyle = `rgba(78,204,163,${alpha})`;
            ctx.fillRect(GRID_X, GRID_Y, GRID_W, GRID_H);
        }
        
        // ── Numpad ──
        renderNumPad(ctx);
        
        // ── Botones acción ──
        renderActionBtns(ctx);
        
        ctx.restore();
    }
    
    function renderHeader(ctx) {
        ctx.save();
        
        // Dificultad
        const diffLabel = { easy: 'FÁCIL', medium: 'MEDIO', hard: 'DIFÍCIL' }[state.difficulty];
        ctx.fillStyle = C.accent;
        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(diffLabel, GRID_X, 50);
        
        // Tiempo
        const secs = Math.floor(state.time);
        const mm   = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss   = String(secs % 60).padStart(2, '0');
        ctx.fillStyle = C.textMuted;
        ctx.textAlign = 'right';
        ctx.fillText(`${mm}:${ss}`, 480 - GRID_X, 50);
        
        // Errores
        ctx.textAlign = 'center';
        ctx.fillStyle = C.textMuted;
        ctx.font = "13px 'Courier New', monospace";
        ctx.fillText('Errores', 240, 38);
        for (let i = 0; i < state.maxErrors; i++) {
            const ex = 240 - (state.maxErrors * 14) / 2 + i * 14 + 7;
            ctx.fillStyle = i < state.errors ? C.numError : C.border;
            ctx.beginPath();
            ctx.arc(ex, 62, 5, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    function renderGrid(ctx) {
        ctx.save();
        
        // Líneas delgadas (celdas)
        ctx.strokeStyle = C.border;
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 9; i++) {
            if (i % 3 === 0) continue;
            ctx.beginPath();
            ctx.moveTo(GRID_X + i * CELL, GRID_Y);
            ctx.lineTo(GRID_X + i * CELL, GRID_Y + GRID_H);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(GRID_X, GRID_Y + i * CELL);
            ctx.lineTo(GRID_X + GRID_W, GRID_Y + i * CELL);
            ctx.stroke();
        }
        
        // Líneas gruesas (cajas 3×3) con acento
        ctx.strokeStyle = C.borderBold;
        ctx.lineWidth = 2;
        for (let i = 0; i <= 9; i += 3) {
            ctx.beginPath();
            ctx.moveTo(GRID_X + i * CELL, GRID_Y);
            ctx.lineTo(GRID_X + i * CELL, GRID_Y + GRID_H);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(GRID_X, GRID_Y + i * CELL);
            ctx.lineTo(GRID_X + GRID_W, GRID_Y + i * CELL);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    function renderNumPad(ctx) {
        ctx.save();
        
        const sel = state.selected;
        for (const btn of state.numPad) {
            const placed  = countPlaced(btn.n);
            const full    = placed >= 9;
            const isSelN  = sel && state.userBoard[sel.r][sel.c] === btn.n;
            
            ctx.save();
            if (isSelN) {
                ctx.shadowColor = C.accent + '80';
                ctx.shadowBlur  = 10;
            }
            
            // Fondo
            const grad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
            grad.addColorStop(0, full ? '#111' : isSelN ? '#1a3a5c' : C.btnBg);
            grad.addColorStop(1, full ? '#0a0a0a' : isSelN ? '#0d2540' : '#111928');
            ctx.fillStyle = grad;
            roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
            ctx.fill();
            
            // Borde
            ctx.strokeStyle = full ? C.border + '44' : isSelN ? C.accent : C.border;
            ctx.lineWidth   = 1;
            roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
            ctx.stroke();
            
            // Número
            ctx.fillStyle    = full ? C.textMuted + '44' : isSelN ? C.accent : C.textPrimary;
            ctx.font         = "bold 22px 'Courier New', monospace";
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur   = 0;
            ctx.fillText(btn.n, btn.x + btn.w / 2, btn.y + btn.h / 2 - 4);
            
            // Contador pequeño
            if (!full) {
                ctx.fillStyle = C.textMuted;
                ctx.font      = "9px 'Courier New', monospace";
                ctx.fillText(9 - placed, btn.x + btn.w / 2, btn.y + btn.h - 9);
            }
            
            ctx.restore();
        }
        
        ctx.restore();
    }
    
    function renderActionBtns(ctx) {
        ctx.save();
        
        for (const btn of state.actionBtns) {
            const active = btn.id === 'notes' && state.noteMode;
            
            const grad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
            grad.addColorStop(0, active ? '#1a3a5c' : C.btnBg);
            grad.addColorStop(1, active ? '#0d2540' : '#111928');
            ctx.fillStyle = grad;
            roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
            ctx.fill();
            
            ctx.strokeStyle = active ? C.accent : C.border;
            ctx.lineWidth   = active ? 2 : 1;
            roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
            ctx.stroke();
            
            ctx.fillStyle    = active ? C.accent : C.textPrimary;
            ctx.font         = "13px 'Courier New', monospace";
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
        }
        
        ctx.restore();
    }
    
    // ─── Pantalla WIN ─────────────────────────────────────────────────────────────
    // (se superpone en renderGame via flash; luego de 1.2s cambia a escena WIN)
    // La escena WIN es simplemente un overlay sobre renderGame
    const _origRender = game.render.bind(game);
    game.render = function(ctx) {
        _origRender(ctx);
        if (state.scene === SCENE.WIN) renderWinOverlay(ctx);
    };
    
    function renderWinOverlay(ctx) {
        ctx.save();
        
        // Overlay oscuro
        ctx.fillStyle = 'rgba(10,10,20,0.88)';
        ctx.fillRect(0, 0, 480, 760);
        
        // Animación pulsante
        const pulse = 1 + 0.04 * Math.sin(state.winAnim * 5);
        ctx.save();
        ctx.translate(240, 320);
        ctx.scale(pulse, pulse);
        
        ctx.fillStyle = C.accent;
        ctx.font = "bold 52px 'Courier New', monospace";
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor  = C.accent;
        ctx.shadowBlur   = 28;
        ctx.fillText('¡Completo!', 0, -40);
        ctx.restore();
        
        const secs = Math.floor(state.time);
        const mm   = String(Math.floor(secs / 60)).padStart(2, '0');
        const ss   = String(secs % 60).padStart(2, '0');
        
        ctx.fillStyle = C.textPrimary;
        ctx.font = "20px 'Courier New', monospace";
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur   = 0;
        ctx.fillText(`Tiempo: ${mm}:${ss}`, 240, 360);
        ctx.fillText(`Errores: ${state.errors} / ${state.maxErrors}`, 240, 390);
        
        // Estrellas
        const stars = state.errors === 0 ? 3 : state.errors === 1 ? 2 : 1;
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < stars ? '#f4d03f' : C.border;
            drawStar(ctx, 240 + (i - 1) * 50, 440, 16);
        }
        
        // Botón continuar
        ctx.fillStyle = C.btnBg;
        roundRect(ctx, 140, 490, 200, 50, 10);
        ctx.fill();
        ctx.strokeStyle = C.accent;
        ctx.lineWidth = 2;
        roundRect(ctx, 140, 490, 200, 50, 10);
        ctx.stroke();
        ctx.fillStyle = C.accent;
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Jugar de nuevo', 240, 515);
        
        ctx.restore();
    }
    
    function drawStar(ctx, x, y, r) {
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a1 = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const a2 = ((i * 4 + 2) * Math.PI) / 5 - Math.PI / 2;
            ctx[i === 0 ? 'moveTo' : 'lineTo'](x + r * Math.cos(a1), y + r * Math.sin(a1));
            ctx.lineTo(x + r * 0.4 * Math.cos(a2), y + r * 0.4 * Math.sin(a2));
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    // ─── Utilidades canvas ────────────────────────────────────────────────────────
    function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
    
    // ─── Start ────────────────────────────────────────────────────────────────────
    Engine.start(game);