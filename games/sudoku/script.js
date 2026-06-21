// ─── Sudoku – ZLostTK Games ──────────────────────────────────────────────────
// Modos: Solo / Versus Local / Online 1v1 (PeerJS)
// Resolución lógica: 480×760 — Sin assets externos. Mouse + Touch + Teclado.

Engine.init('gameCanvas', { width: 480, height: 760, bg: '#0f0f1a' });

// ═══════════════════════════════════════════════════════════════════════════════
// PALETA
// ═══════════════════════════════════════════════════════════════════════════════
const C = {
    bg:          '#0f0f1a',
    surface:     '#16213e',
    border:      '#2a2a4a',
    borderBold:  '#4ecca3',
    cellRelated: '#131a30',
    cellError:   '#3d1422',
    cellSame:    '#1a2d1a',
    cellSel:     '#0d3352',
    cellSelP2:   '#2a0d4a',
    cellSameP2:  '#1a122a',
    numGiven:    '#e0e0f0',
    numUser:     '#4ecca3',
    numUserP2:   '#a78bfa',
    numError:    '#ff6b8a',
    numNote:     '#6b7fa8',
    accent:      '#4ecca3',
    accentP2:    '#a78bfa',
    accentDim:   '#2a6b56',
    textPrimary: '#e0e0f0',
    textMuted:   '#6b7fa8',
    btnBg:       '#1a2540',
};

// ═══════════════════════════════════════════════════════════════════════════════
// GENERADOR DE SUDOKU
// ═══════════════════════════════════════════════════════════════════════════════
function generateSudoku(difficulty) {
    const board = Array.from({ length: 9 }, () => Array(9).fill(0));
    solveFill(board);
    const solution = board.map(r => [...r]);
    const given = { easy: 38, medium: 30, hard: 24 }[difficulty] || 30;
    const puzzle = board.map(r => [...r]);
    let removed = 0;
    const target = 81 - given;
    const positions = shuffle([...Array(81).keys()]);
    for (const pos of positions) {
        if (removed >= target) break;
        const r = Math.floor(pos / 9), c = pos % 9;
        const backup = puzzle[r][c];
        puzzle[r][c] = 0;
        if (countSolutions(puzzle.map(row => [...row])) === 1) {
            removed++;
        } else {
            puzzle[r][c] = backup;
        }
    }
    return { puzzle, solution };
}

function solveFill(board) { return _fill(board, shuffle([1,2,3,4,5,6,7,8,9])); }

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

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIO
// ═══════════════════════════════════════════════════════════════════════════════
function initSounds() {
    Audio.synth('place',   'sine',   880, 0.07, 0.18);
    Audio.synth('error',   'square', 150, 0.12, 0.12);
    Audio.synth('erase',   'sine',   440, 0.06, 0.10);
    Audio.synth('win',     'sine',   660, 0.50, 0.20, 1320);
    Audio.synth('select',  'sine',   520, 0.05, 0.12);
    Audio.synth('note',    'sine',   660, 0.05, 0.10);
    Audio.synth('connect', 'sine',   780, 0.10, 0.25, 980);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT (coordenadas lógicas 480×760)
// ═══════════════════════════════════════════════════════════════════════════════
const GRID_X    = 16;
const GRID_Y    = 108;
const GRID_W    = 480 - 32;
const CELL      = Math.floor(GRID_W / 9);   // 49
const GRID_H    = CELL * 9;

const PAD_Y     = GRID_Y + GRID_H + 22;
const PAD_BTN   = 46;
const PAD_GAP   = 4;
const PAD_ROW_W = 9 * (PAD_BTN + PAD_GAP) - PAD_GAP;
const PAD_X     = (480 - PAD_ROW_W) / 2;

const ACT_Y     = PAD_Y + PAD_BTN + 14;
const ACT_W     = 140;
const ACT_H     = 42;

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════
const SCENE = { MENU: 'menu', GAME: 'game', WIN: 'win' };

const state = {
    scene:         SCENE.MENU,
    mode:          'solo',    // 'solo' | 'local' | 'online'
    role:          null,      // 'host' | 'guest' | null
    difficulty:    'easy',

    // ── Modelo compartido (coordenadas lógicas 0–8)
    puzzle:        null,
    solution:      null,
    given:         null,
    userBoard:     null,
    notes:         null,
    // Matriz de celdas que ya sumaron punto (evita farming)
    scored:        null,

    // ── Multi-jugador
    // P0 = host (verde), P1 = guest (violeta)
    activePlayer:  0,
    players: [
        { errors: 0, score: 0, color: C.accent,   selColor: C.cellSel,   sameColor: C.cellSame,   numColor: C.numUser   },
        { errors: 0, score: 0, color: C.accentP2, selColor: C.cellSelP2, sameColor: C.cellSameP2, numColor: C.numUserP2 },
    ],
    maxErrors:     3,

    // ── Timing
    time:          0,
    complete:      false,
    winAnim:       0,
    winnerIdx:     -1,

    // ── UI canvas
    selected:      null,
    noteMode:      false,
    numPad:        [],
    actionBtns:    [],
    passTurnBtn:   null,

    // ── Online
    online: {
        connected:            false,
        opponentDisconnected: false,
        disconnectTimer:      0,
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// OVERLAY UI — controla las pantallas HTML
// ═══════════════════════════════════════════════════════════════════════════════
const OverlayUI = (() => {
    const overlay  = document.getElementById('overlay');
    const screens  = document.querySelectorAll('.screen');
    const diffBtns = document.querySelectorAll('.diff-btn');

    function show(screenId) {
        overlay.classList.add('visible');
        screens.forEach(s => s.classList.remove('active'));
        const target = document.getElementById(screenId);
        if (target) target.classList.add('active');
    }
    function hide() {
        overlay.classList.remove('visible');
        screens.forEach(s => s.classList.remove('active'));
    }
    function setStatus(elId, msg, cls = '') {
        const el = document.getElementById(elId);
        if (!el) return;
        el.textContent = msg;
        el.className = 'lobby-status ' + cls;
    }
    function setCode(elId, code) {
        const el = document.getElementById(elId);
        if (el) el.textContent = code;
    }
    function setSpinner(elId, visible) {
        const el = document.getElementById(elId);
        if (!el) return;
        el.classList.toggle('hidden', !visible);
    }

    // ── Dificultad
    diffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            diffBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.difficulty = btn.dataset.d;
        });
    });

    // ── Modos
    document.getElementById('btn-solo').addEventListener('click', () => {
        state.mode = 'solo'; state.role = null;
        GameModel.start(); hide();
    });
    document.getElementById('btn-local').addEventListener('click', () => {
        state.mode = 'local'; state.role = null;
        GameModel.start(); hide();
    });
    document.getElementById('btn-online').addEventListener('click', () => {
        show('screen-online-choice');
    });

    // ── Elección online
    document.getElementById('btn-be-host').addEventListener('click', () => {
        state.mode = 'online'; state.role = 'host';
        show('screen-host');
        OnlineLayer.startHost();
    });
    document.getElementById('btn-be-guest').addEventListener('click', () => {
        state.mode = 'online'; state.role = 'guest';
        show('screen-join');
        setStatus('join-status', '');
        setSpinner('join-spinner', false);
        document.getElementById('join-input').value = '';
    });
    document.getElementById('btn-online-choice-cancel').addEventListener('click', () => {
        show('screen-main');
    });

    // ── Lobby host
    document.getElementById('btn-host-cancel').addEventListener('click', () => {
        OnlineLayer.cancel(); show('screen-main');
    });

    // ── Botón copiar código ── (NEW)
    document.getElementById('btn-copy-code').addEventListener('click', () => {
        const code = document.getElementById('host-code').textContent.trim();
        if (!code || code === '––––––') return;
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById('btn-copy-code');
            const orig = btn.textContent;
            btn.textContent = '✓ Copiado';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1800);
        }).catch(() => {
            // fallback para entornos sin permiso de portapapeles
            const ta = document.createElement('textarea');
            ta.value = code;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        });
    });

    // ── Lobby guest
    document.getElementById('btn-join-go').addEventListener('click', () => {
        const code = document.getElementById('join-input').value.trim().toUpperCase();
        if (code.length < 4) { setStatus('join-status', 'Código inválido', 'error'); return; }
        setStatus('join-status', 'Conectando…');
        setSpinner('join-spinner', true);
        OnlineLayer.joinAs(code);
    });
    document.getElementById('btn-join-cancel').addEventListener('click', () => {
        OnlineLayer.cancel(); show('screen-main');
    });
    document.getElementById('join-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('btn-join-go').click();
    });

    return { show, hide, setStatus, setCode, setSpinner };
})();

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORIAL (undo)
// ═══════════════════════════════════════════════════════════════════════════════
const history = [];

function pushHistory() {
    history.push({
        board:        state.userBoard.map(r => [...r]),
        notes:        state.notes.map(r => r.map(s => new Set(s))),
        scored:       state.scored.map(r => [...r]),
        activePlayer: state.activePlayer,
        players:      state.players.map(p => ({ ...p })),
    });
    if (history.length > 80) history.shift();
}

function undoMove() {
    if (state.mode !== 'solo') return;
    if (!history.length) return;
    const snap = history.pop();
    state.userBoard    = snap.board;
    state.notes        = snap.notes;
    state.scored       = snap.scored;
    state.activePlayer = snap.activePlayer;
    state.players      = snap.players;
    Audio.play('erase');
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME MODEL — lógica pura, separada de la vista
// ═══════════════════════════════════════════════════════════════════════════════
const GameModel = {

    start() {
        const { puzzle, solution } = generateSudoku(state.difficulty);
        state.puzzle       = puzzle;
        state.solution     = solution;
        state.given        = puzzle.map(r => r.map(v => v !== 0));
        state.userBoard    = puzzle.map(r => [...r]);
        state.notes        = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
        state.scored       = Array.from({ length: 9 }, () => Array(9).fill(false));
        state.selected     = null;
        state.noteMode     = false;
        state.complete     = false;
        state.winAnim      = 0;
        state.winnerIdx    = -1;
        state.time         = 0;
        state.activePlayer = 0;
        state.players.forEach(p => { p.errors = 0; p.score = 0; });
        history.length     = 0;
        state.scene        = SCENE.GAME;
    },

    // ── Punto de entrada único para toda acción (local o remota).
    //    isRemote = true  → viene de la red, NO reenviar.
    //    isRemote = false → acción local, reenviar si online.
    //
    //    REGLA ANTI-FARMING:
    //      · Celda correcta por 1.ª vez → +1 al jugador
    //      · Celda correcta pero ya puntuada → 0 (bloqueado por guard)
    //      · Celda incorrecta              → -1 (mínimo 0) + error++
    //
    //    TURNOS ONLINE:
    //      Tras cualquier 'place', el turno pasa al otro jugador.
    //      Ambos clientes hacen el cálculo localmente, manteniéndose en sync.
    applyAction(action, isRemote = false) {
        const { type, r, c, n } = action;

        // Validación de coordenadas lógicas (0–8)
        if (r !== undefined && (r < 0 || r > 8 || c < 0 || c > 8)) return;

        // ── init: solo lo recibe el guest ──────────────────────────────────────
        if (type === 'init') {
            state.puzzle       = action.puzzle;
            state.solution     = action.solution;
            state.given        = action.puzzle.map(row => row.map(v => v !== 0));
            state.userBoard    = action.puzzle.map(row => [...row]);
            state.notes        = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
            state.scored       = Array.from({ length: 9 }, () => Array(9).fill(false));
            state.difficulty   = action.difficulty;
            state.selected     = null;
            state.noteMode     = false;
            state.complete     = false;
            state.winAnim      = 0;
            state.winnerIdx    = -1;
            state.time         = 0;
            state.activePlayer = 0;
            state.players.forEach(p => { p.errors = 0; p.score = 0; });
            history.length     = 0;
            state.scene        = SCENE.GAME;
            OverlayUI.hide();
            return;
        }

        // ── place ──────────────────────────────────────────────────────────────
        if (type === 'place') {
            if (state.given[r][c]) return;
            if (state.userBoard[r][c] === n) return;   // idempotente

            // ¿Quién hizo la jugada?
            // - local: activePlayer
            // - remoto en modo online: el oponente
            //   host (P0) recibe jugadas del guest (P1) y viceversa
            const playerIdx = isRemote
                ? (state.role === 'host' ? 1 : 0)
                : state.activePlayer;

            pushHistory();
            state.userBoard[r][c] = n;
            state.notes[r][c].clear();

            if (n !== state.solution[r][c]) {
                // ── INCORRECTO: error + penalización de score ──
                state.players[playerIdx].errors++;
                state.players[playerIdx].score = Math.max(0, state.players[playerIdx].score - 1);
                // Resetear "scored" de la celda si tenía un correcto previo borrado
                state.scored[r][c] = false;
                Audio.play('error');
            } else {
                // ── CORRECTO ──
                if (!state.scored[r][c]) {
                    // Primera vez que se pone el valor correcto → +1
                    state.players[playerIdx].score++;
                    state.scored[r][c] = true;
                }
                // Limpiar notas en fila, columna y caja
                for (let i = 0; i < 9; i++) {
                    state.notes[r][i].delete(n);
                    state.notes[i][c].delete(n);
                }
                const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
                for (let i = 0; i < 3; i++)
                    for (let j = 0; j < 3; j++)
                        state.notes[br+i][bc+j].delete(n);
            }

            // Pasar turno después de CUALQUIER jugada (correcta o incorrecta) en modos VS
            if (state.mode === 'local' || state.mode === 'online') {
                state.activePlayer = 1 - state.activePlayer;
            }

            if (!isRemote && state.mode === 'online') {
                Online.send({ type: 'place', r, c, n });
            }

            this.checkWin();
            return;
        }

        // ── erase ──────────────────────────────────────────────────────────────
        if (type === 'erase') {
            if (state.given[r][c]) return;
            if (state.userBoard[r][c] === 0) return;
            pushHistory();
            // Si la celda ya fue puntuada, descontar al borrarla
            if (state.scored[r][c]) {
                const playerIdx = isRemote
                    ? (state.role === 'host' ? 1 : 0)
                    : state.activePlayer;
                state.players[playerIdx].score = Math.max(0, state.players[playerIdx].score - 1);
                state.scored[r][c] = false;
            }
            state.userBoard[r][c] = 0;
            state.notes[r][c].clear();
            Audio.play('erase');
            if (!isRemote && state.mode === 'online') {
                Online.send({ type: 'erase', r, c });
            }
            return;
        }

        // ── note ───────────────────────────────────────────────────────────────
        if (type === 'note') {
            if (state.given[r][c]) return;
            pushHistory();
            const s = state.notes[r][c];
            if (action.on !== undefined) {
                action.on ? s.add(n) : s.delete(n);
            } else {
                s.has(n) ? s.delete(n) : s.add(n);
            }
            Audio.play('note');
            if (!isRemote && state.mode === 'online') {
                Online.send({ type: 'note', r, c, n, on: s.has(n) });
            }
            return;
        }

        // ── pass (solo modo local) ─────────────────────────────────────────────
        if (type === 'pass' && state.mode === 'local') {
            state.activePlayer = 1 - state.activePlayer;
            return;
        }
    },

    checkWin() {
        for (let r = 0; r < 9; r++)
            for (let c = 0; c < 9; c++)
                if (state.userBoard[r][c] !== state.solution[r][c]) return;

        state.complete = true;
        state.winAnim  = 0;

        if (state.mode === 'solo') {
            state.winnerIdx = 0;
        } else {
            const s0 = state.players[0].score, s1 = state.players[1].score;
            state.winnerIdx = s0 > s1 ? 0 : s1 > s0 ? 1 : -1;
        }

        Audio.play('win');

        if (state.mode === 'online') {
            Online.send({ type: 'win', scores: state.players.map(p => p.score) });
        }

        setTimeout(() => { state.scene = SCENE.WIN; }, 1400);
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// ONLINE LAYER
// ═══════════════════════════════════════════════════════════════════════════════
const OnlineLayer = {

    startHost() {
        Online.on('onHostReady', (code) => {
            OverlayUI.setCode('host-code', code);
            OverlayUI.setStatus('host-status', 'Esperando rival…');
            OverlayUI.setSpinner('host-spinner', true);
        });

        Online.on('onConnected', (role) => {
            if (role !== 'host') return;
            OverlayUI.setStatus('host-status', '¡Rival conectado! Generando tablero…', 'success');
            OverlayUI.setSpinner('host-spinner', false);
            Audio.play('connect');
            state.online.connected = true;

            GameModel.start();
            setTimeout(() => {
                Online.send({
                    type:       'init',
                    puzzle:     state.puzzle,
                    solution:   state.solution,
                    difficulty: state.difficulty,
                });
                OverlayUI.hide();
            }, 600);
        });

        Online.on('onDisconnect', () => this._handleDisconnect());
        Online.on('onError',      (err) => this._handleError(err));
        Online.on('onData',       (data) => this._handleData(data));

        Online.host((code) => {
            OverlayUI.setCode('host-code', code);
            OverlayUI.setStatus('host-status', 'Generando código…');
        });
    },

    joinAs(code) {
        Online.on('onConnected', (role) => {
            if (role !== 'guest') return;
            state.online.connected = true;
            OverlayUI.setStatus('join-status', 'Conectado. Esperando tablero…', 'success');
            OverlayUI.setSpinner('join-spinner', false);
            Audio.play('connect');
        });

        Online.on('onDisconnect', () => this._handleDisconnect());
        Online.on('onError',      (err) => this._handleError(err));
        Online.on('onData',       (data) => this._handleData(data));

        Online.join(code);
    },

    cancel() {
        Online.destroy();
        state.online.connected = false;
        state.online.opponentDisconnected = false;
    },

    _handleData(data) {
        if (!data || !data.type) return;
        GameModel.applyAction(data, true);
    },

    _handleDisconnect() {
        if (state.scene !== SCENE.GAME && state.scene !== SCENE.WIN) return;
        state.online.opponentDisconnected = true;
        state.online.disconnectTimer = 0;
    },

    _handleError(err) {
        const msg = err?.message || err?.type || 'Error de red';
        OverlayUI.setStatus('host-status', msg, 'error');
        OverlayUI.setStatus('join-status', msg, 'error');
        OverlayUI.setSpinner('host-spinner', false);
        OverlayUI.setSpinner('join-spinner', false);
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT BUTTONS
// ═══════════════════════════════════════════════════════════════════════════════
function buildLayout() {
    state.numPad = [];
    for (let i = 0; i < 9; i++) {
        state.numPad.push({ n: i + 1, x: PAD_X + i * (PAD_BTN + PAD_GAP), y: PAD_Y, w: PAD_BTN, h: PAD_BTN });
    }

    const totalAct = 3 * ACT_W + 2 * 10;
    const actX = (480 - totalAct) / 2;
    state.actionBtns = [
        { id: 'notes', label: '✏ Notas',    x: actX,                y: ACT_Y, w: ACT_W, h: ACT_H },
        { id: 'undo',  label: '↩ Deshacer', x: actX + ACT_W + 10,  y: ACT_Y, w: ACT_W, h: ACT_H },
        { id: 'new',   label: '⊕ Nueva',    x: actX + (ACT_W+10)*2, y: ACT_Y, w: ACT_W, h: ACT_H },
    ];
    state.passTurnBtn = {
        id: 'pass', label: '⇄ Pasar turno',
        x: (480 - 200) / 2, y: ACT_Y + ACT_H + 10, w: 200, h: 40,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIT TESTING
// ═══════════════════════════════════════════════════════════════════════════════
function hitGrid(x, y) {
    if (x < GRID_X || x > GRID_X + GRID_W || y < GRID_Y || y > GRID_Y + GRID_H) return null;
    const c = Math.floor((x - GRID_X) / CELL);
    const r = Math.floor((y - GRID_Y) / CELL);
    return (r < 0 || r > 8 || c < 0 || c > 8) ? null : { r, c };
}

function hitBtn(x, y, btn) {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
}

function hitButtons(x, y, buttons) {
    return buttons.find(b => hitBtn(x, y, b)) || null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT HANDLER
// ═══════════════════════════════════════════════════════════════════════════════
function handleClick(rawX, rawY) {
    const { x, y } = Engine.toGame(rawX, rawY);

    if (state.scene === SCENE.WIN) {
        Online.destroy();
        state.online.connected = false;
        state.online.opponentDisconnected = false;
        state.scene = SCENE.MENU;
        OverlayUI.show('screen-main');
        return;
    }
    if (state.scene !== SCENE.GAME) return;

    if (state.online.opponentDisconnected) {
        Online.destroy();
        state.online.connected = false;
        state.online.opponentDisconnected = false;
        state.scene = SCENE.MENU;
        OverlayUI.show('screen-main');
        return;
    }

    // Online: bloquear interacción si no es el turno del jugador local
    if (state.mode === 'online') {
        const myIdx = state.role === 'host' ? 0 : 1;
        if (state.activePlayer !== myIdx) return;
    }

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

    const numBtn = hitButtons(x, y, state.numPad);
    if (numBtn && state.selected) {
        const { r, c } = state.selected;
        if (state.noteMode) {
            const s = state.notes[r][c];
            GameModel.applyAction({ type: 'note', r, c, n: numBtn.n, on: !s.has(numBtn.n) });
        } else {
            GameModel.applyAction({ type: 'place', r, c, n: numBtn.n });
        }
        return;
    }

    const actBtn = hitButtons(x, y, state.actionBtns);
    if (actBtn) {
        if (actBtn.id === 'notes') { state.noteMode = !state.noteMode; }
        if (actBtn.id === 'undo')  { undoMove(); }
        if (actBtn.id === 'new')   {
            Online.destroy();
            state.online.connected = false;
            state.online.opponentDisconnected = false;
            state.scene = SCENE.MENU;
            OverlayUI.show('screen-main');
        }
        return;
    }

    if (state.mode === 'local' && state.passTurnBtn && hitBtn(x, y, state.passTurnBtn)) {
        GameModel.applyAction({ type: 'pass' });
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJETO JUEGO
// ═══════════════════════════════════════════════════════════════════════════════
const game = {
    init() {
        buildLayout();
        initSounds();
        this._wasDown    = false;
        this._hadTouch   = false;
        this._lastTouchX = 0;
        this._lastTouchY = 0;
    },

    update(dt) {
        if (state.scene === SCENE.GAME && !state.complete) state.time += dt;
        if (state.scene === SCENE.WIN || state.complete)   state.winAnim += dt;
        if (state.online.opponentDisconnected)             state.online.disconnectTimer += dt;

        const mouse = Input.getMouse();
        if (!mouse.down && this._wasDown) handleClick(mouse.x, mouse.y);
        this._wasDown = mouse.down;

        if (Input.isTouchStarted()) {
            const t = Input.getTouch(0);
            if (t) { this._lastTouchX = t.x; this._lastTouchY = t.y; }
        }
        const tcount = Input.getTouchCount();
        if (tcount === 0 && this._hadTouch) handleClick(this._lastTouchX, this._lastTouchY);
        this._hadTouch = tcount > 0;

        if (state.scene === SCENE.GAME && !state.online.opponentDisconnected) {
            const isMyTurn = state.mode !== 'online' ||
                state.activePlayer === (state.role === 'host' ? 0 : 1);

            if (isMyTurn && state.selected) {
                for (let n = 1; n <= 9; n++) {
                    if (Input.isPressed(`Digit${n}`) || Input.isPressed(`Numpad${n}`)) {
                        const { r, c } = state.selected;
                        if (state.noteMode) {
                            GameModel.applyAction({ type: 'note', r, c, n, on: !state.notes[r][c].has(n) });
                        } else {
                            GameModel.applyAction({ type: 'place', r, c, n });
                        }
                    }
                }
                if (Input.isPressed('Backspace') || Input.isPressed('Delete') ||
                    Input.isPressed('Digit0') || Input.isPressed('Numpad0')) {
                    const { r, c } = state.selected;
                    GameModel.applyAction({ type: 'erase', r, c });
                }
            }

            if (Input.isPressed('KeyN')) state.noteMode = !state.noteMode;
            if (Input.isPressed('KeyZ')) undoMove();
            if (Input.isPressed('Tab') && state.mode === 'local') GameModel.applyAction({ type: 'pass' });

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
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, 480, 760);

        if (state.scene === SCENE.GAME || state.scene === SCENE.WIN) {
            renderGame(ctx);
            if (state.scene === SCENE.WIN) renderWinOverlay(ctx);
            if (state.online.opponentDisconnected) renderDisconnectOverlay(ctx);
        }
    },
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES CANVAS
// ═══════════════════════════════════════════════════════════════════════════════
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

function countPlaced(n) {
    let k = 0;
    for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++)
            if (state.userBoard[r][c] === n) k++;
    return k;
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

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER — GAME (contenedor principal)
// ═══════════════════════════════════════════════════════════════════════════════
function renderGame(ctx) {
    ctx.save();
    const p   = state.players[state.activePlayer];
    const sel = state.selected;
    const selN = sel ? state.userBoard[sel.r][sel.c] : 0;

    renderHeader(ctx, p);
    renderCells(ctx, sel, selN);
    renderGrid(ctx);

    if (state.complete && state.winAnim < 1.4) {
        const alpha = Math.max(0, 0.35 * Math.sin(state.winAnim * Math.PI / 0.7));
        ctx.fillStyle = `rgba(78,204,163,${alpha})`;
        ctx.fillRect(GRID_X, GRID_Y, GRID_W, GRID_H);
    }

    renderNumPad(ctx, sel);
    renderActionBtns(ctx);

    if (state.mode === 'local') {
        renderTurnIndicator(ctx, p);
        renderPassTurnBtn(ctx);
    }
    if (state.mode === 'online') {
        renderOnlineIndicator(ctx);
    }

    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER — HEADER
// ═══════════════════════════════════════════════════════════════════════════════
function renderHeader(ctx, activePlayer) {
    ctx.save();

    // Etiqueta de modo
    const modeLabel = { solo: 'SOLO', local: 'LOCAL', online: 'ONLINE' }[state.mode];
    ctx.fillStyle = C.textMuted;
    ctx.font = "bold 11px 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(modeLabel, 240, 18);

    // Dificultad
    const diffLabel = { easy: 'FÁCIL', medium: 'MEDIO', hard: 'DIFÍCIL' }[state.difficulty];
    ctx.fillStyle = activePlayer.color;
    ctx.font = "bold 13px 'Courier New', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(diffLabel, GRID_X, 50);

    // Tiempo
    const secs = Math.floor(state.time);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');
    ctx.fillStyle = C.textMuted;
    ctx.textAlign = 'right';
    ctx.fillText(`${mm}:${ss}`, 480 - GRID_X, 50);

    if (state.mode === 'solo') {
        // Errores modo solo
        ctx.textAlign = 'center';
        ctx.fillStyle = C.textMuted;
        ctx.font = "12px 'Courier New', monospace";
        ctx.fillText('Errores', 240, 36);
        const errs = state.players[0].errors;
        for (let i = 0; i < state.maxErrors; i++) {
            const ex = 240 - (state.maxErrors * 14) / 2 + i * 14 + 7;
            ctx.fillStyle = i < errs ? C.numError : C.border;
            ctx.beginPath();
            ctx.arc(ex, 62, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Scoreboard multijugador
        // Las etiquetas son relativas al DISPOSITIVO: "Tú" = yo, "Rival" = el otro
        // host = P0 (verde), guest = P1 (violeta)
        // En el dispositivo del host: P0 = "Tú", P1 = "Rival"
        // En el dispositivo del guest: P0 = "Rival", P1 = "Tú"
        const p0 = state.players[0], p1 = state.players[1];
        const lx = 240 - 60, rx = 240 + 60;
        let label0, label1;
        if (state.mode === 'online') {
            label0 = state.role === 'host' ? 'Tú'    : 'Rival';
            label1 = state.role === 'host' ? 'Rival' : 'Tú';
        } else {
            label0 = 'J1'; label1 = 'J2';
        }

        // P0 (izquierda)
        ctx.fillStyle = p0.color;
        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.textAlign = 'right';
        ctx.fillText(label0, lx - 6, 40);
        ctx.fillStyle = C.textPrimary;
        ctx.font = "bold 20px 'Courier New', monospace";
        ctx.fillText(p0.score, lx - 6, 62);

        // VS
        ctx.fillStyle = C.textMuted;
        ctx.font = "11px 'Courier New', monospace";
        ctx.textAlign = 'center';
        ctx.fillText('VS', 240, 52);

        // P1 (derecha)
        ctx.fillStyle = p1.color;
        ctx.font = "bold 13px 'Courier New', monospace";
        ctx.textAlign = 'left';
        ctx.fillText(label1, rx + 6, 40);
        ctx.fillStyle = C.textPrimary;
        ctx.font = "bold 20px 'Courier New', monospace";
        ctx.fillText(p1.score, rx + 6, 62);

        // Separador vertical
        ctx.strokeStyle = C.border;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(240, 30); ctx.lineTo(240, 74);
        ctx.stroke();

        // Puntos de error por jugador
        for (let pi = 0; pi < 2; pi++) {
            const errs = state.players[pi].errors;
            const bx = pi === 0 ? 20 : 460;
            for (let i = 0; i < state.maxErrors; i++) {
                ctx.fillStyle = i < errs ? C.numError : C.border;
                ctx.beginPath();
                ctx.arc(pi === 0 ? bx + i * 12 : bx - i * 12, 78, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER — CELLS
// ═══════════════════════════════════════════════════════════════════════════════
function renderCells(ctx, sel, selN) {
    const ap = state.activePlayer;
    const p  = state.players[ap];

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cx    = GRID_X + c * CELL;
            const cy    = GRID_Y + r * CELL;
            const val   = state.userBoard[r][c];
            const given = state.given[r][c];
            const isErr = !given && val !== 0 && val !== state.solution[r][c];

            let bg = C.surface;
            if (sel) {
                if (sel.r === r && sel.c === c) {
                    bg = p.selColor;
                } else if (sel.r === r || sel.c === c ||
                    (Math.floor(sel.r/3) === Math.floor(r/3) && Math.floor(sel.c/3) === Math.floor(c/3))) {
                    bg = C.cellRelated;
                } else if (selN !== 0 && val === selN) {
                    bg = p.sameColor;
                }
            }
            if (isErr) bg = C.cellError;

            ctx.fillStyle = bg;
            ctx.fillRect(cx + 1, cy + 1, CELL - 2, CELL - 2);

            if (val !== 0) {
                let numColor;
                if (given)       numColor = C.numGiven;
                else if (isErr)  numColor = C.numError;
                else              numColor = ap === 0 ? C.numUser : C.numUserP2;

                ctx.font = given
                    ? `bold 24px 'Courier New', monospace`
                    : `22px 'Courier New', monospace`;
                ctx.textAlign    = 'center';
                ctx.textBaseline = 'middle';

                if (!isErr && !given && sel && val === selN && !(sel.r === r && sel.c === c)) {
                    ctx.save();
                    ctx.shadowColor = p.color + '99';
                    ctx.shadowBlur  = 8;
                    ctx.fillStyle   = numColor;
                    ctx.fillText(val, cx + CELL/2, cy + CELL/2);
                    ctx.restore();
                } else {
                    ctx.fillStyle = numColor;
                    ctx.fillText(val, cx + CELL/2, cy + CELL/2);
                }
            } else {
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
                            ctx.fillText(n, cx + nc * (CELL/3) + CELL/6, cy + nr * (CELL/3) + CELL/6);
                        }
                    }
                }
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER — GRID LINES
// ═══════════════════════════════════════════════════════════════════════════════
function renderGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 9; i++) {
        if (i % 3 === 0) continue;
        ctx.beginPath(); ctx.moveTo(GRID_X + i * CELL, GRID_Y); ctx.lineTo(GRID_X + i * CELL, GRID_Y + GRID_H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(GRID_X, GRID_Y + i * CELL); ctx.lineTo(GRID_X + GRID_W, GRID_Y + i * CELL); ctx.stroke();
    }
    ctx.strokeStyle = C.borderBold;
    ctx.lineWidth = 2;
    for (let i = 0; i <= 9; i += 3) {
        ctx.beginPath(); ctx.moveTo(GRID_X + i * CELL, GRID_Y); ctx.lineTo(GRID_X + i * CELL, GRID_Y + GRID_H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(GRID_X, GRID_Y + i * CELL); ctx.lineTo(GRID_X + GRID_W, GRID_Y + i * CELL); ctx.stroke();
    }
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER — NUMPAD
// ═══════════════════════════════════════════════════════════════════════════════
function renderNumPad(ctx, sel) {
    ctx.save();
    const p = state.players[state.activePlayer];
    for (const btn of state.numPad) {
        const placed = countPlaced(btn.n);
        const full   = placed >= 9;
        const isSelN = sel && state.userBoard[sel.r][sel.c] === btn.n;

        ctx.save();
        if (isSelN) { ctx.shadowColor = p.color + '80'; ctx.shadowBlur = 10; }

        const grad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
        grad.addColorStop(0, full ? '#111' : isSelN ? '#1a3a5c' : C.btnBg);
        grad.addColorStop(1, full ? '#0a0a0a' : isSelN ? '#0d2540' : '#111928');
        ctx.fillStyle = grad;
        roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();

        ctx.strokeStyle = full ? C.border + '44' : isSelN ? p.color : C.border;
        ctx.lineWidth   = 1;
        roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
        ctx.stroke();

        ctx.fillStyle    = full ? C.textMuted + '44' : isSelN ? p.color : C.textPrimary;
        ctx.font         = "bold 22px 'Courier New', monospace";
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur   = 0;
        ctx.fillText(btn.n, btn.x + btn.w / 2, btn.y + btn.h / 2 - 4);

        if (!full) {
            ctx.fillStyle = C.textMuted;
            ctx.font      = "9px 'Courier New', monospace";
            ctx.fillText(9 - placed, btn.x + btn.w / 2, btn.y + btn.h - 9);
        }
        ctx.restore();
    }
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER — ACTION BUTTONS
// ═══════════════════════════════════════════════════════════════════════════════
function renderActionBtns(ctx) {
    ctx.save();
    const p = state.players[state.activePlayer];
    for (const btn of state.actionBtns) {
        const disabled = btn.id === 'undo' && state.mode !== 'solo';
        const active = btn.id === 'notes' && state.noteMode;
        const grad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
        
        if (disabled) {
            grad.addColorStop(0, '#111');
            grad.addColorStop(1, '#0a0a0a');
        } else {
            grad.addColorStop(0, active ? '#1a3a5c' : C.btnBg);
            grad.addColorStop(1, active ? '#0d2540' : '#111928');
        }
        
        ctx.fillStyle = grad;
        roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
        ctx.fill();

        ctx.strokeStyle = disabled ? C.border + '44' : (active ? p.color : C.border);
        ctx.lineWidth   = active && !disabled ? 2 : 1;
        roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
        ctx.stroke();

        ctx.fillStyle    = disabled ? C.textMuted + '44' : (active ? p.color : C.textPrimary);
        ctx.font         = "13px 'Courier New', monospace";
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    }
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER — TURNO LOCAL
// ═══════════════════════════════════════════════════════════════════════════════
function renderTurnIndicator(ctx, p) {
    ctx.save();
    // Thin color bar resting on top of the grid
    ctx.fillStyle = p.color + '33';
    ctx.fillRect(GRID_X, GRID_Y - 5, GRID_W, 5);

    // Text above the bar
    ctx.fillStyle    = p.color;
    ctx.font         = "bold 12px 'Courier New', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Turno de ${p === state.players[0] ? 'J1' : 'J2'}`, 240, GRID_Y - 14);
    ctx.restore();
}

function renderPassTurnBtn(ctx) {
    const btn = state.passTurnBtn;
    const p   = state.players[state.activePlayer];
    ctx.save();
    const grad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
    grad.addColorStop(0, '#1a2540');
    grad.addColorStop(1, '#111928');
    ctx.fillStyle = grad;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.fill();
    ctx.strokeStyle = p.color + '88';
    ctx.lineWidth   = 1.5;
    roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
    ctx.stroke();
    ctx.fillStyle    = p.color;
    ctx.font         = "13px 'Courier New', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER — INDICADOR TURNO ONLINE
// ═══════════════════════════════════════════════════════════════════════════════
function renderOnlineIndicator(ctx) {
    const myIdx    = state.role === 'host' ? 0 : 1;
    const isMyTurn = state.activePlayer === myIdx;
    const color    = isMyTurn ? C.accent : C.accentP2;
    const label    = isMyTurn ? 'Tu turno' : 'Turno del rival';

    ctx.save();
    ctx.fillStyle = color + '33';
    ctx.fillRect(GRID_X, GRID_Y - 5, GRID_W, 5);
    ctx.fillStyle    = color;
    ctx.font         = "bold 11px 'Courier New', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const dotR = 4;
    ctx.beginPath();
    ctx.arc(GRID_X + dotR + 4, GRID_Y - 14, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText(label, 240, GRID_Y - 14);
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER — WIN OVERLAY
// ═══════════════════════════════════════════════════════════════════════════════
function renderWinOverlay(ctx) {
    ctx.save();

    ctx.fillStyle = 'rgba(10,10,20,0.88)';
    ctx.fillRect(0, 0, 480, 760);

    const pulse = 1 + 0.04 * Math.sin(state.winAnim * 5);
    ctx.save();
    ctx.translate(240, 300);
    ctx.scale(pulse, pulse);

    let winText, winColor;
    if (state.mode === 'solo') {
        winText = '¡Completo!'; winColor = C.accent;
    } else if (state.winnerIdx === -1) {
        winText = '¡Empate!'; winColor = '#f4d03f';
    } else {
        const winner = state.players[state.winnerIdx];
        if (state.mode === 'online') {
            const myIdx = state.role === 'host' ? 0 : 1;
            winText = state.winnerIdx === myIdx ? '¡Ganaste!' : '¡Perdiste!';
        } else {
            winText = `¡Gana ${state.winnerIdx === 0 ? 'J1' : 'J2'}!`;
        }
        winColor = winner.color;
    }

    ctx.fillStyle   = winColor;
    ctx.shadowColor = winColor;
    ctx.shadowBlur  = 28;
    ctx.font = "bold 52px 'Courier New', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(winText, 0, -40);
    ctx.restore();

    const secs = Math.floor(state.time);
    const mm = String(Math.floor(secs / 60)).padStart(2, '0');
    const ss = String(secs % 60).padStart(2, '0');

    ctx.fillStyle    = C.textPrimary;
    ctx.shadowBlur   = 0;
    ctx.font         = "18px 'Courier New', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Tiempo: ${mm}:${ss}`, 240, 360);

    if (state.mode !== 'solo') {
        const p0 = state.players[0], p1 = state.players[1];
        let l0, l1;
        if (state.mode === 'online') {
            l0 = state.role === 'host' ? 'Tú' : 'Rival';
            l1 = state.role === 'host' ? 'Rival' : 'Tú';
        } else {
            l0 = 'J1'; l1 = 'J2';
        }
        ctx.fillStyle = p0.color;
        ctx.fillText(`${l0}: ${p0.score} celdas`, 240, 390);
        ctx.fillStyle = p1.color;
        ctx.fillText(`${l1}: ${p1.score} celdas`, 240, 416);
    } else {
        ctx.fillText(`Errores: ${state.players[0].errors} / ${state.maxErrors}`, 240, 390);
    }

    if (state.mode === 'solo') {
        const stars = state.players[0].errors === 0 ? 3 : state.players[0].errors === 1 ? 2 : 1;
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i < stars ? '#f4d03f' : C.border;
            drawStar(ctx, 240 + (i - 1) * 50, 440, 16);
        }
    }

    const btnY = state.mode === 'solo' ? 490 : 460;
    ctx.fillStyle = C.btnBg;
    roundRect(ctx, 140, btnY, 200, 50, 10); ctx.fill();
    ctx.strokeStyle = C.accent; ctx.lineWidth = 2;
    roundRect(ctx, 140, btnY, 200, 50, 10); ctx.stroke();
    ctx.fillStyle    = C.accent;
    ctx.font         = "bold 16px 'Courier New', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Volver al menú', 240, btnY + 25);

    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER — DISCONNECT OVERLAY
// ═══════════════════════════════════════════════════════════════════════════════
function renderDisconnectOverlay(ctx) {
    ctx.save();
    const t = state.online.disconnectTimer;
    const alpha = Math.min(0.78, 0.3 + 0.48 * Math.min(1, t * 2));
    ctx.fillStyle = `rgba(10,10,20,${alpha})`;
    ctx.fillRect(0, 0, 480, 760);

    const cx = 240, cy = 380, cw = 320, ch = 200;
    ctx.save();
    ctx.shadowColor = C.numError + '66';
    ctx.shadowBlur  = 32;
    const grad = ctx.createLinearGradient(cx - cw/2, cy - ch/2, cx - cw/2, cy + ch/2);
    grad.addColorStop(0, '#2a0a18'); grad.addColorStop(1, '#1a0812');
    ctx.fillStyle = grad;
    roundRect(ctx, cx - cw/2, cy - ch/2, cw, ch, 16); ctx.fill();
    ctx.strokeStyle = C.numError + '88'; ctx.lineWidth = 1.5;
    roundRect(ctx, cx - cw/2, cy - ch/2, cw, ch, 16); ctx.stroke();
    ctx.restore();

    ctx.fillStyle    = C.numError;
    ctx.font         = "bold 18px 'Courier New', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor  = C.numError; ctx.shadowBlur = 12;
    ctx.fillText('Rival desconectado', cx, cy - 50);
    ctx.shadowBlur = 0;
    ctx.fillStyle  = C.textMuted;
    ctx.font       = "13px 'Courier New', monospace";
    ctx.fillText('La conexión se perdió.', cx, cy - 16);
    ctx.fillText('Toca para volver al menú.', cx, cy + 8);

    ctx.fillStyle = C.btnBg;
    roundRect(ctx, cx - 90, cy + 50, 180, 44, 10); ctx.fill();
    ctx.strokeStyle = C.numError + 'aa'; ctx.lineWidth = 1.5;
    roundRect(ctx, cx - 90, cy + 50, 180, 44, 10); ctx.stroke();
    ctx.fillStyle    = C.numError;
    ctx.font         = "bold 14px 'Courier New', monospace";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('← Menú principal', cx, cy + 72);
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════════════
Engine.start(game);