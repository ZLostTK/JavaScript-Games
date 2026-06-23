// ─────────────────────────────────────────────
//  PAC-MAN  |  games/pacman/script.js
// ─────────────────────────────────────────────

// ── Valores de celda ──────────────────────────
// 0 = pasillo libre
// 1 = muro
// 2 = punto normal
// 3 = power pellet
// 4 = interior del corral (fantasmas pueden pasar, Pac NO)
// 5 = puerta del corral  (solo fantasmas en modo ojos pueden pasar)

// ── Mapa base nivel 1 ────────────────────────
const BASE_MAP = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
    [1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,3,1],
    [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
    [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
    [1,1,1,1,2,1,1,1,2,2,2,2,2,1,1,1,2,1,1,1,1],
    [1,1,1,1,2,1,2,2,2,2,2,2,2,2,2,1,2,1,1,1,1],
    [1,1,1,1,2,1,2,1,1,5,5,5,1,1,2,1,2,1,1,1,1],
    [0,0,0,0,2,2,2,1,4,4,4,4,4,1,2,4,2,0,0,0,0],
    [1,1,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,1,1],
    [1,1,1,1,2,1,2,2,2,2,2,2,2,2,2,1,2,1,1,1,1],
    [1,1,1,1,2,1,2,1,1,1,1,1,1,1,4,1,2,1,1,1,1],
    [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
    [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
    [1,3,2,1,2,2,2,2,2,2,0,2,2,2,2,2,2,1,2,3,1],
    [1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,1],
    [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
    [1,2,1,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,1],
    [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const ROWS = BASE_MAP.length;    // 22
const COLS = BASE_MAP[0].length; // 21

// Filas de túnel horizontal (donde col 0 y col 20 no son muros)
const TUNNEL_ROWS = [10];

// Posición de inicio de Pac-Man
const PAC_START_R = 16, PAC_START_C = 10;
// Posición de salida del corral
const GHOST_EXIT_R = 7, GHOST_EXIT_C = 10;
// Posición interna por defecto (dentro del corral)
const GHOST_HOME_R = 9, GHOST_HOME_C = 10;

// ── Resolución lógica ────────────────────────
const LW   = 462;  // 21 * 22
const LH   = 580;  // 22*22 + UI
const CELL = 22;
const MAP_Y = 60;

// ── Colores ──────────────────────────────────
const C_BG       = '#0d0d1a';
const C_WALL     = '#1a4fff';
const C_WALLEDGE = '#4a7fff';
const C_DOOR     = '#ffb8ff';  // puerta del corral (valor 5)
const C_DOT      = '#ffdd99';
const C_POWER    = '#ffaa00';
const C_PAC      = '#ffe000';
const C_TEXT     = '#ffffff';
const C_SCORE    = '#ffdd99';
const C_GHOST    = ['#ff4444','#ffb8ff','#00b8ff','#ffb852'];
const C_FRIGHTEN = '#2222cc';

// ── Direcciones ──────────────────────────────
const DIR = {
    UP:    { dx:  0, dy: -1 },
    DOWN:  { dx:  0, dy:  1 },
    LEFT:  { dx: -1, dy:  0 },
    RIGHT: { dx:  1, dy:  0 },
};
const DIR_KEYS = ['UP','DOWN','LEFT','RIGHT'];

// ── Fases scatter / chase ────────────────────
const PHASE_TIMES = [7, 20, 7, 20, 5, 20, 5, 99999];

// ── Utilidades ───────────────────────────────
function cellX(col) { return col * CELL + CELL / 2; }
function cellY(row) { return MAP_Y + row * CELL + CELL / 2; }

/**
* Normaliza columna para túneles: wrappea 0↔COLS-1 en filas de túnel.
* Devuelve la columna ya dentro de [0, COLS-1].
*/
function wrapCol(c) { return ((c % COLS) + COLS) % COLS; }

/**
* ¿Es un muro para Pac-Man?
* Pac NO puede pisar: 1 (muro), 4 (interior corral), 5 (puerta corral).
* Puede pisar: 0, 2, 3.
* Fuera de límites de fila → muro. Fuera de columna → túnel (no muro).
*/
function isWallPac(map, r, c) {
    if (r < 0 || r >= ROWS) return true;
    // Túnel horizontal: columnas fuera de rango son pasables en filas de túnel
    if (c < 0 || c >= COLS) return !TUNNEL_ROWS.includes(r);
    const v = map[r][c];
    return v === 1 || v === 4 || v === 5;
}

/**
* ¿Es un muro para un fantasma normal (no en modo ojos)?
* Fantasma NO puede pisar: 1 (muro), 5 (puerta — solo entra al corral en modo ojos).
* Puede pisar: 0, 2, 3, 4.
*/
function isWallGhost(map, r, c) {
    if (r < 0 || r >= ROWS) return true;
    if (c < 0 || c >= COLS) return !TUNNEL_ROWS.includes(r);
    const v = map[r][c];
    return v === 1 || v === 5;
}

/**
* ¿Es un muro para fantasma en modo OJOS (volviendo al corral)?
* Solo bloquea muros sólidos (1). Puede pasar puertas (5) y corral (4).
*/
function isWallEyes(map, r, c) {
    if (r < 0 || r >= ROWS) return true;
    if (c < 0 || c >= COLS) return !TUNNEL_ROWS.includes(r);
    return map[r][c] === 1;
}

// ── Botones de menú ──────────────────────────
function drawBtn(ctx, label, x, y, w, h, accent, hover) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 8);
    ctx.fillStyle = hover ? accent + 'cc' : accent + '44';
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = C_TEXT;
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
    ctx.restore();
}

function hitBtn(gx, gy, btn) {
    return gx >= btn.x - btn.w / 2 && gx <= btn.x + btn.w / 2 &&
    gy >= btn.y - btn.h / 2 && gy <= btn.y + btn.h / 2;
}

// ── Generador procedural de niveles ──────────
/**
* Genera un nuevo mapa basándose en el nivel actual.
* Estrategia: empezar con el mapa base y agregar variantes
* estructurales que mantienen simetría izquierda-derecha.
*
* Para nivel 1 devuelve el mapa base.
* Para niveles superiores añade bloques de muro extra,
* reduce power pellets y cambia la disposición de las paredes internas.
*/
function generateMap(level) {
    // Siempre clonar profundo el mapa base
    const map = BASE_MAP.map(r => [...r]);
    
    if (level === 1) return map;
    
    // Semilla determinista por nivel para reproducibilidad
    let seed = level * 1337;
    function rand() {
        seed = (seed * 16807 + 0) % 2147483647;
        return (seed - 1) / 2147483646;
    }
    function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
    
    // ── Zonas editables: solo filas 1-6 y 14-20, cols 1-9 (se espeja a 11-19) ──
    // No tocar: fila 0, 21 (bordes), filas 7-13 (zona corral), col 0, 20 (bordes)
    const EDIT_ROWS_TOP    = [1, 2, 3, 4, 5, 6];
    const EDIT_ROWS_BOTTOM = [14, 15, 16, 17, 18, 19, 20];
    const EDIT_COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // se espeja en 11..19
    
    // Candidatos para nuevos muros (solo pasillo 2 puede convertirse en muro)
    // Añadir entre 2 y (level-1)*2 bloques extra, máx 8
    const extraWalls = Math.min((level - 1) * 2, 8);
    
    let attempts = 0;
    let placed = 0;
    while (placed < extraWalls && attempts < 200) {
        attempts++;
        // Elegir una celda aleatoria en zona editable
        const rowPool = rand() < 0.5 ? EDIT_ROWS_TOP : EDIT_ROWS_BOTTOM;
        const r = rowPool[randInt(0, rowPool.length - 1)];
        const c = EDIT_COLS[randInt(0, EDIT_COLS.length - 1)];
        const cm = COLS - 1 - c; // columna espejada
        
        // Solo convertir pasillos (2) en muros — no tocar power pellets (3) ni ya-muros
        if (map[r][c] !== 2) continue;
        if (c === cm) continue; // columna central, no espejar
        
        // Verificar que el corredor no quede totalmente bloqueado
        // Si la celda izquierda Y la derecha también son muros, no poner
        const neighbors = [
            [r-1,c],[r+1,c],[r,c-1],[r,c+1],
        ];
        const freeNeighbors = neighbors.filter(([nr,nc]) =>
            nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS &&
        map[nr][nc] !== 1
    ).length;
    if (freeNeighbors < 2) continue; // deja mínimo 2 vecinos libres
    
    map[r][c]  = 1;
    map[r][cm] = 1;
    placed++;
}

// ── Para niveles altos quitar algunas power pellets (mínimo 2) ──
if (level >= 4) {
    // Ubicaciones de power pellets en el mapa base
    const powerPositions = [];
    for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
            if (map[r][c] === 3) powerPositions.push([r, c]);
    
    // Quitar 1 power pellet cada 2 niveles, máximo dejar 2
    const toRemove = Math.min(Math.floor((level - 3) / 2), powerPositions.length - 2);
    for (let i = 0; i < toRemove; i++) {
        const idx = randInt(0, powerPositions.length - 1);
        const [pr, pc] = powerPositions.splice(idx, 1)[0];
        map[pr][pc] = 2; // se convierte en punto normal
    }
}

return map;
}

// ── Clase Fantasma ────────────────────────────
class Ghost {
    constructor(startR, startC, colorIdx, scatterTarget) {
        this.startR = startR;
        this.startC = startC;
        this.colorIdx = colorIdx;
        this.scatterTarget = scatterTarget; // [row, col] esquina de scatter
        this.baseSpeed = 5;
        this.reset();
    }
    
    reset() {
        this.r = this.startR;
        this.c = this.startC;
        this.dir = DIR.LEFT;
        this.frightened  = false;
        this.frightenTimer = 0;
        this.blinkPhase  = false;
        this.eaten       = false;   // modo ojos
        this.px = cellX(this.c);
        this.py = cellY(this.r);
        this._targetPx = this.px;
        this._targetPy = this.py;
        this._moving    = false;
        this.releaseDelay = 0;
        this.released   = false;
        this._houseAnim = 0;
    }
    
    get speed() {
        if (this.eaten)     return this.baseSpeed * 2.0;
        if (this.frightened) return this.baseSpeed * 0.5;
        return this.baseSpeed;
    }
    
    frighten(dur) {
        // No afecta a fantasmas que aún no salieron del corral ni a los que están en modo ojos
        if (!this.released || this.eaten) return;
        this.frightened    = true;
        this.frightenTimer = dur;
        this.blinkPhase    = false;
    }
    
    update(dt, map, pacR, pacC, pacDir, blinky, scatterMode, level) {
        // ── Dentro del corral esperando ──
        if (!this.released) {
            this.releaseDelay -= dt;
            this._houseAnim   += dt;
            if (this.releaseDelay <= 0) {
                this.released = true;
                // Teletransportar al punto de salida del corral
                this.r = GHOST_EXIT_R;
                this.c = GHOST_EXIT_C;
                this.px = cellX(this.c);
                this.py = cellY(this.r);
                this._targetPx = this.px;
                this._targetPy = this.py;
                this._moving = false;
                this.dir = DIR.LEFT;
            }
            return;
        }
        
        // ── Gestión del timer de miedo ──
        if (this.frightened) {
            this.frightenTimer -= dt;
            this.blinkPhase = this.frightenTimer < 2 && Math.floor(this.frightenTimer * 4) % 2 === 0;
            if (this.frightenTimer <= 0) {
                this.frightened = false;
                this.blinkPhase = false;
            }
        }
        
        // ── Movimiento celda a celda ──
        if (!this._moving) {
            this._chooseDir(map, pacR, pacC, pacDir, blinky, scatterMode, level);
            
            const nr = this.r + this.dir.dy;
            const nc = wrapCol(this.c + this.dir.dx);
            
            const wallFn = this.eaten ? isWallEyes : isWallGhost;
            if (!wallFn(map, nr, nc)) {
                this.r = nr;
                this.c = nc;
                this._targetPx = cellX(this.c);
                this._targetPy = cellY(this.r);
                this._moving = true;
                
                // Si llegó al corral en modo ojos → resetear dentro del corral
                if (this.eaten && this.r === this.startR && this.c === this.startC) {
                    this.eaten = false;
                    this.released = false;
                    this.releaseDelay = 2;
                    this._moving = false;
                    this.px = cellX(this.c);
                    this.py = cellY(this.r);
                }
            }
        }
        
        // ── Interpolación suave en píxeles ──
        if (this._moving) {
            const sp = this.speed * CELL * dt;
            const dx = this._targetPx - this.px;
            const dy = this._targetPy - this.py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= sp) {
                this.px = this._targetPx;
                this.py = this._targetPy;
                this._moving = false;
            } else {
                this.px += (dx / dist) * sp;
                this.py += (dy / dist) * sp;
            }
        }
        
        // ── FIX TÚNEL: teletransportar px cuando la celda lógica wrapeó ──
        // Si la columna lógica es 0 pero el px está cerca del lado derecho (o viceversa)
        // significa que se hizo wrap → snapear px al nuevo lado
        if (TUNNEL_ROWS.includes(this.r)) {
            const expectedX = cellX(this.c);
            if (Math.abs(this.px - expectedX) > CELL * 5) {
                this.px = expectedX;
                this._targetPx = expectedX;
            }
        }
    }
    
    _chooseDir(map, pacR, pacC, pacDir, blinky, scatterMode, level) {
        const wallFn = this.eaten ? isWallEyes : isWallGhost;
        
        // ── Modo ojos: ir al corral ──
        if (this.eaten) {
            this._moveTowards(map, this.startR, this.startC, wallFn);
            return;
        }
        
        // ── Modo miedo ──
        if (this.frightened) {
            // Blinky huye directo a su esquina (sup-der) en vez de aleatorio
            if (this.colorIdx === 0) {
                this._moveTowards(map, this.scatterTarget[0], this.scatterTarget[1], wallFn);
                return;
            }
            // Resto: aleatorio sin reversa (salvo dead-end)
            let opts = DIR_KEYS.filter(k => {
                const d = DIR[k];
                if (d.dx === -this.dir.dx && d.dy === -this.dir.dy) return false;
                return !wallFn(map, this.r + d.dy, wrapCol(this.c + d.dx));
            });
            if (opts.length === 0) {
                opts = DIR_KEYS.filter(k => {
                    const d = DIR[k];
                    return !wallFn(map, this.r + d.dy, wrapCol(this.c + d.dx));
                });
            }
            if (opts.length > 0) this.dir = DIR[opts[Math.floor(Math.random() * opts.length)]];
            return;
        }
        
        // ── Modo scatter: ir a esquina ──
        if (scatterMode) {
            this._moveTowards(map, this.scatterTarget[0], this.scatterTarget[1], wallFn);
            return;
        }
        
        // ── Modo chase: lógica individual ──
        let tr, tc;
        switch (this.colorIdx) {
            case 0: // Blinky: directo a Pac
            tr = pacR; tc = pacC;
            break;
            case 1: // Pinky: 4 casillas adelante de Pac
            tr = pacR + pacDir.dy * 4;
            tc = pacC + pacDir.dx * 4;
            // En niveles altos el cálculo se vuelve impredecible por cambios del mapa
            if (level >= 5) {
                const jitter = Math.min(Math.floor(level / 2), 4);
                tr += Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
                tc += Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
            }
            break;
            case 2: { // Inky: vector Blinky→pivote duplicado
                const pivR = pacR + pacDir.dy * 2;
                const pivC = pacC + pacDir.dx * 2;
                tr = pivR + (pivR - blinky.r);
                tc = pivC + (pivC - blinky.c);
                break;
            }
            case 3: // Clyde: persigue si lejos, scatter si cerca
            if (Math.hypot(this.r - pacR, this.c - pacC) > 8) { tr = pacR; tc = pacC; }
            else { tr = this.scatterTarget[0]; tc = this.scatterTarget[1]; }
            break;
            default:
            tr = pacR; tc = pacC;
        }
        
        this._moveTowards(map, tr, tc, wallFn);
    }
    
    /** Elige la dirección que minimiza distancia euclidiana a (tr,tc). Sin reversa, salvo dead-end. */
    _moveTowards(map, tr, tc, wallFn) {
        let best = null, bestDist = Infinity;
        for (const k of DIR_KEYS) {
            const d = DIR[k];
            if (d.dx === -this.dir.dx && d.dy === -this.dir.dy) continue;
            const nr = this.r + d.dy;
            const nc = wrapCol(this.c + d.dx);
            if (wallFn(map, nr, nc)) continue;
            const dist = (nr - tr) ** 2 + (nc - tc) ** 2;
            if (dist < bestDist) { bestDist = dist; best = d; }
        }
        // Si no encontró dirección (callejón sin salida), permitir reversa
        if (!best) {
            for (const k of DIR_KEYS) {
                const d = DIR[k];
                const nr = this.r + d.dy;
                const nc = wrapCol(this.c + d.dx);
                if (wallFn(map, nr, nc)) continue;
                const dist = (nr - tr) ** 2 + (nc - tc) ** 2;
                if (dist < bestDist) { bestDist = dist; best = d; }
            }
        }
        if (best) this.dir = best;
    }
    
    draw(ctx) {
        if (!this.released) {
            const bx = cellX(this.startC);
            const by = cellY(this.startR) + Math.sin(this._houseAnim * 3) * 3;
            this._drawBody(ctx, bx, by, C_GHOST[this.colorIdx], false);
            return;
        }
        if (this.eaten) {
            this._drawEyes(ctx, this.px, this.py);
            return;
        }
        const color = this.frightened
        ? (this.blinkPhase ? '#ddddff' : C_FRIGHTEN)
        : C_GHOST[this.colorIdx];
        this._drawBody(ctx, this.px, this.py, color, this.frightened);
    }
    
    _drawBody(ctx, bx, by, color, frightened) {
        const r = CELL * 0.46;
        ctx.save();
        
        // Cuerpo con faldones curvos
        ctx.beginPath();
        ctx.arc(bx, by - r * 0.05, r, Math.PI, 0, false);
        const baseY = by + r * 0.75;
        const left  = bx - r, right = bx + r;
        const w3    = (right - left) / 3;
        ctx.lineTo(right, baseY);
        ctx.quadraticCurveTo(right - w3 * 0.5, baseY + r * 0.35, right - w3,     baseY);
        ctx.quadraticCurveTo(right - w3 * 1.5, baseY + r * 0.35, right - w3 * 2, baseY);
        ctx.quadraticCurveTo(right - w3 * 2.5, baseY + r * 0.35, left,           baseY);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        
        if (!frightened) {
            this._drawEyes(ctx, bx, by);
        } else {
            // Cara asustada
            ctx.fillStyle = '#aaaaff';
            ctx.beginPath(); ctx.arc(bx - r * 0.3, by - r * 0.1, r * 0.15, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(bx + r * 0.3, by - r * 0.1, r * 0.15, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#aaaaff';
            ctx.lineWidth = 1.5;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            const mx0 = bx - r * 0.38, my0 = by + r * 0.22;
            ctx.moveTo(mx0, my0);
            for (let i = 1; i <= 5; i++) {
                ctx.lineTo(mx0 + (r * 0.76 / 5) * i, my0 + (i % 2 === 0 ? 0 : r * 0.18));
            }
            ctx.stroke();
        }
        ctx.restore();
    }
    
    _drawEyes(ctx, bx, by) {
        const r = CELL * 0.46;
        const eyeR   = r * 0.26;
        const pupilR = r * 0.13;
        const offX   = r * 0.3;
        const eyeY   = by - r * 0.15;
        const pdx    = this.dir.dx * pupilR * 0.7;
        const pdy    = this.dir.dy * pupilR * 0.7;
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(bx - offX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + offX, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
        
        ctx.fillStyle = '#0055ff';
        ctx.beginPath(); ctx.arc(bx - offX + pdx, eyeY + pdy, pupilR, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(bx + offX + pdx, eyeY + pdy, pupilR, 0, Math.PI * 2); ctx.fill();
    }
}

// ── Juego principal ───────────────────────────
const game = {
    state: 'menu',
    map: null,
    score: 0,
    hiScore: 0,
    lives: 3,
    level: 1,
    dotsLeft: 0,
    
    pac: {
        r: PAC_START_R, c: PAC_START_C,
        px: 0, py: 0,
        dir: DIR.LEFT, nextDir: DIR.LEFT,
        speed: 7,
        _moving: false, _targetPx: 0, _targetPy: 0,
        mouthAngle: 0, mouthOpen: true, mouthSpeed: 8,
        dead: false, deadTimer: 0, deadAnim: 0,
    },
    
    ghosts: [],
    powerTimer: 0,
    POWER_DUR: 8,
    ghostEatCombo: 0,
    phaseIdx: 0,
    phaseTimer: PHASE_TIMES[0],
    scatterMode: true,
    
    _btns: {},
    _hover: '',
    _touchStart: null,
    
    // ── Init ──
    init() {
        this.hiScore = parseInt(localStorage.getItem('pacman_hi') || '0');
        Audio.synth('dot',   'square', 440, 0.05, 0.15);
        Audio.synth('power', 'square', 220, 0.4,  0.25);
        Audio.synth('eat',   'square', 600, 0.12, 0.3);
        Audio.synth('dead',  'sine',   180, 0.6,  0.3, 80);
        Audio.synth('start', 'square', 330, 0.3,  0.2);
        Audio.synth('win',   'square', 660, 0.3,  0.2);
        this._setupBtns();
    },
    
    _setupBtns() {
        const cx = LW / 2;
        this._btns = {
            play: { x: cx, y: 340, w: 200, h: 48, label: '▶  JUGAR', accent: '#ffe000' },
        };
    },
    
    // ── Iniciar partida ──
    _startGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this._loadLevel();
        this.state = 'playing';
        Audio.play('start');
    },
    
    _loadLevel() {
        // Generar mapa para este nivel
        this.map = generateMap(this.level);
        
        // Contar puntos
        this.dotsLeft = 0;
        for (let r = 0; r < ROWS; r++)
            for (let c = 0; c < COLS; c++)
                if (this.map[r][c] === 2 || this.map[r][c] === 3) this.dotsLeft++;
        
        // Pac-Man
        const p = this.pac;
        p.r = PAC_START_R; p.c = PAC_START_C;
        p.px = cellX(p.c); p.py = cellY(p.r);
        p._targetPx = p.px; p._targetPy = p.py;
        p._moving = false;
        p.dir = DIR.LEFT; p.nextDir = DIR.LEFT;
        p.dead = false; p.deadTimer = 0; p.deadAnim = 0;
        p.speed = 7 + (this.level - 1) * 0.4;
        
        // Fantasmas — posiciones internas del corral
        // Blinky empieza fuera (ya liberado), los demás dentro
        this.ghosts = [
            new Ghost(GHOST_HOME_R, GHOST_HOME_C,     0, [0,      COLS-1]),  // Blinky  sup-der
            new Ghost(GHOST_HOME_R, GHOST_HOME_C - 1, 1, [0,      0     ]),  // Pinky   sup-izq
            new Ghost(GHOST_HOME_R, GHOST_HOME_C,     2, [ROWS-1, 0     ]),  // Inky    inf-izq
            new Ghost(GHOST_HOME_R, GHOST_HOME_C + 1, 3, [ROWS-1, COLS-1]), // Clyde   inf-der
        ];
        // Blinky sale inmediatamente fuera del corral
        this.ghosts[0].released = true;
        this.ghosts[0].r = GHOST_EXIT_R;
        this.ghosts[0].c = GHOST_EXIT_C;
        this.ghosts[0].px = cellX(GHOST_EXIT_C);
        this.ghosts[0].py = cellY(GHOST_EXIT_R);
        // Delays del resto
        this.ghosts[1].releaseDelay = 3;
        this.ghosts[2].releaseDelay = 6;
        this.ghosts[3].releaseDelay = 9;
        
        // Velocidad base por nivel
        const gs = 4.5 + (this.level - 1) * 0.35;
        this.ghosts.forEach(g => { g.baseSpeed = gs; });
        
        // Fases
        this.phaseIdx   = 0;
        this.phaseTimer = PHASE_TIMES[0];
        this.scatterMode = true;
        this.powerTimer  = 0;
        this.ghostEatCombo = 0;
    },
    
    _respawn() {
        const p = this.pac;
        p.r = PAC_START_R; p.c = PAC_START_C;
        p.px = cellX(p.c); p.py = cellY(p.r);
        p._targetPx = p.px; p._targetPy = p.py;
        p._moving = false;
        p.dir = DIR.LEFT; p.nextDir = DIR.LEFT;
        p.dead = false; p.deadTimer = 0; p.deadAnim = 0;
        
        this.ghosts.forEach(g => g.reset());
        this.ghosts[0].released = true;
        this.ghosts[0].r = GHOST_EXIT_R; this.ghosts[0].c = GHOST_EXIT_C;
        this.ghosts[0].px = cellX(GHOST_EXIT_C); this.ghosts[0].py = cellY(GHOST_EXIT_R);
        this.ghosts[1].releaseDelay = 3;
        this.ghosts[2].releaseDelay = 6;
        this.ghosts[3].releaseDelay = 9;
        const gs = 4.5 + (this.level - 1) * 0.35;
        this.ghosts.forEach(g => { g.baseSpeed = gs; });
        this.powerTimer = 0;
        this.ghostEatCombo = 0;
        this.phaseIdx   = 0;
        this.phaseTimer = PHASE_TIMES[0];
        this.scatterMode = true;
    },
    
    // ── Update ──
    update(dt) {
        const m  = Input.getMouse();
        const gm = Engine.toGame(m.x, m.y);
        const touch = Input.getTouch(0);
        const gt = touch ? Engine.toGame(touch.x, touch.y) : null;
        
        const gx = gt ? gt.x : gm.x;
        const gy = gt ? gt.y : gm.y;
        const clicked = Input.isMousePressed() || Input.isTouchStarted();
        
        // ── Estados de menú ──
        if (this.state === 'menu') {
            this._hover = '';
            for (const [key, btn] of Object.entries(this._btns)) {
                if (hitBtn(gx, gy, btn)) this._hover = key;
            }
            if (clicked && hitBtn(gx, gy, this._btns.play)) this._startGame();
            return;
        }
        if (this.state === 'gameover' || this.state === 'win') {
            if (clicked) { this.state = 'menu'; this._setupBtns(); }
            return;
        }
        if (this.state !== 'playing') return;
        
        const p = this.pac;
        
        // ── Animación de muerte ──
        if (p.dead) {
            p.deadTimer -= dt;
            p.deadAnim  += dt * 3;
            if (p.deadTimer <= 0) {
                this.lives--;
                if (this.lives <= 0) {
                    this.state = 'gameover';
                    if (this.score > this.hiScore) {
                        this.hiScore = this.score;
                        localStorage.setItem('pacman_hi', this.hiScore);
                    }
                } else {
                    this._respawn();
                }
            }
            return;
        }
        
        // ── Input teclado ──
        if (Input.isDown('ArrowUp')    || Input.isDown('KeyW')) p.nextDir = DIR.UP;
        if (Input.isDown('ArrowDown')  || Input.isDown('KeyS')) p.nextDir = DIR.DOWN;
        if (Input.isDown('ArrowLeft')  || Input.isDown('KeyA')) p.nextDir = DIR.LEFT;
        if (Input.isDown('ArrowRight') || Input.isDown('KeyD')) p.nextDir = DIR.RIGHT;
        
        // ── Input táctil (swipe) ──
        if (Input.isTouchStarted()) this._touchStart = gt;
        if (touch && this._touchStart) {
            const sdx = (gt?.x || 0) - this._touchStart.x;
            const sdy = (gt?.y || 0) - this._touchStart.y;
            if (Math.abs(sdx) > 20 || Math.abs(sdy) > 20) {
                p.nextDir = Math.abs(sdx) > Math.abs(sdy)
                ? (sdx > 0 ? DIR.RIGHT : DIR.LEFT)
                : (sdy > 0 ? DIR.DOWN  : DIR.UP);
                this._touchStart = null;
            }
        }
        if (!touch) this._touchStart = null;
        
        // ── Movimiento Pac-Man ──
        if (!p._moving) {
            // Intentar girar
            const nd = p.nextDir;
            const tnr = p.r + nd.dy;
            const tnc = wrapCol(p.c + nd.dx);
            if (!isWallPac(this.map, tnr, tnc)) p.dir = nd;
            
            // Avanzar en dirección actual
            const cr = p.r + p.dir.dy;
            const cc = wrapCol(p.c + p.dir.dx);
            if (!isWallPac(this.map, cr, cc)) {
                const oldC = p.c;
                p.r = cr; p.c = cc;
                p._targetPx = cellX(p.c);
                p._targetPy = cellY(p.r);
                p._moving = true;
                
                // ── FIX TÚNEL Pac-Man: si la columna wrapeó, teletransportar px ──
                if (TUNNEL_ROWS.includes(p.r) && Math.abs(p.c - oldC) > 1) {
                    p.px = cellX(p.c);
                    p.py = cellY(p.r);
                }
            }
        }
        
        if (p._moving) {
            const sp = p.speed * CELL * dt;
            const dx = p._targetPx - p.px;
            const dy = p._targetPy - p.py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= sp) {
                p.px = p._targetPx;
                p.py = p._targetPy;
                p._moving = false;
                this._eatCell();
            } else {
                p.px += (dx / dist) * sp;
                p.py += (dy / dist) * sp;
            }
        }
        
        // Animar boca
        p.mouthAngle += dt * p.mouthSpeed * (p.mouthOpen ? 1 : -1);
        if (p.mouthAngle > 0.9) { p.mouthOpen = false; p.mouthAngle = 0.9; }
        if (p.mouthAngle < 0.0) { p.mouthOpen = true;  p.mouthAngle = 0.0; }
        
        // ── Power timer ──
        if (this.powerTimer > 0) {
            this.powerTimer -= dt;
            if (this.powerTimer <= 0) {
                this.powerTimer = 0;
                this.ghostEatCombo = 0;
                this.ghosts.forEach(g => { g.frightened = false; g.blinkPhase = false; });
            }
        }
        
        // ── Fases scatter / chase (pausa durante powerup) ──
        if (this.powerTimer <= 0) {
            this.phaseTimer -= dt;
            if (this.phaseTimer <= 0) {
                this.phaseIdx = Math.min(this.phaseIdx + 1, PHASE_TIMES.length - 1);
                this.scatterMode = (this.phaseIdx % 2 === 0);
                this.phaseTimer  = PHASE_TIMES[this.phaseIdx] ?? 99999;
            }
        }
        
        // ── Actualizar fantasmas ──
        const blinky = this.ghosts[0];
        this.ghosts.forEach(g =>
            g.update(dt, this.map, p.r, p.c, p.dir, blinky, this.scatterMode, this.level)
        );
        
        // ── Colisiones Pac vs fantasmas ──
        for (const g of this.ghosts) {
            if (!g.released || g.eaten) continue;
            if (Math.hypot(p.px - g.px, p.py - g.py) < CELL * 0.72) {
                if (g.frightened) {
                    this.ghostEatCombo++;
                    const pts = [200, 400, 800, 1600][Math.min(this.ghostEatCombo - 1, 3)];
                    this.score += pts;
                    g.frightened  = false;
                    g.blinkPhase  = false;
                    g.eaten       = true;
                    g._moving     = false;
                    Audio.play('eat');
                } else {
                    p.dead = true;
                    p.deadTimer = 1.8;
                    Audio.play('dead');
                    break;
                }
            }
        }
        
        // ── Siguiente nivel ──
        if (this.dotsLeft <= 0) {
            this.level++;
            Audio.play('win');
            this._loadLevel();
        }
    },
    
    _eatCell() {
        const p = this.pac;
        const cell = this.map[p.r][p.c];
        if (cell === 2) {
            this.map[p.r][p.c] = 0;
            this.score += 10;
            this.dotsLeft--;
            Audio.play('dot');
        } else if (cell === 3) {
            this.map[p.r][p.c] = 0;
            this.score += 50;
            this.dotsLeft--;
            this.powerTimer    = this.POWER_DUR;
            this.ghostEatCombo = 0;
            // Activar modo miedo en todos los fantasmas liberados
            this.ghosts.forEach(g => g.frighten(this.POWER_DUR));
            Audio.play('power');
        }
        if (this.score > this.hiScore) {
            this.hiScore = this.score;
            localStorage.setItem('pacman_hi', this.hiScore);
        }
    },
    
    // ── Render ──
    render(ctx) {
        ctx.fillStyle = C_BG;
        ctx.fillRect(0, 0, LW, LH);
        
        if (this.state === 'menu') {
            this._renderMenu(ctx);
        } else {
            this._renderGame(ctx);
            if (this.state === 'gameover') this._renderOverlay(ctx, 'GAME OVER', '#ff4444');
            else if (this.state === 'win')  this._renderOverlay(ctx, '¡GANASTE!', '#ffe000');
        }
    },
    
    _renderMenu(ctx) {
        const cx = LW / 2;
        
        ctx.save();
        ctx.font = "bold 52px 'Courier New', monospace";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffaa00'; ctx.fillText('PAC-MAN', cx + 2, 152);
        ctx.fillStyle = C_PAC;    ctx.fillText('PAC-MAN', cx, 150);
        ctx.restore();
        
        // Pac-Man animado
        ctx.save();
        const t  = performance.now() / 1000;
        const mA = Math.abs(Math.sin(t * 4)) * 0.8;
        ctx.fillStyle = C_PAC;
        ctx.beginPath();
        ctx.moveTo(cx, 240);
        ctx.arc(cx, 240, 28, mA, Math.PI * 2 - mA);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        
        Engine.text(`HI-SCORE: ${this.hiScore}`, cx, 290, '#ffaa00', 16);
        
        const btn = this._btns.play;
        drawBtn(ctx, btn.label, btn.x, btn.y, btn.w, btn.h, btn.accent, this._hover === 'play');
        
        ctx.save();
        ctx.font = "13px 'Courier New', monospace";
        ctx.fillStyle = '#888'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('WASD / ← ↑ ↓ → / Swipe', cx, 400);
        ctx.fillText('Come todos los puntos', cx, 422);
        ctx.fillText('Power-up → ¡come fantasmas!', cx, 444);
        ctx.restore();
        
        // Fantasmas decorativos
        for (let i = 0; i < 4; i++) {
            const gx = 80 + i * 90, gy = 510;
            ctx.save();
            ctx.fillStyle = C_GHOST[i];
            ctx.beginPath();
            ctx.arc(gx, gy - 10, 18, Math.PI, 0);
            ctx.lineTo(gx + 18, gy + 10);
            ctx.quadraticCurveTo(gx + 12, gy + 5, gx + 6,  gy + 10);
            ctx.quadraticCurveTo(gx,      gy + 5, gx,       gy + 10);
            ctx.quadraticCurveTo(gx - 6,  gy + 5, gx - 12, gy + 10);
            ctx.lineTo(gx - 18, gy + 10);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(gx - 6, gy - 12, 6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(gx + 6, gy - 12, 6, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
        
        Engine.text('© ZLostTK Games', cx, 560, '#444', 12);
    },
    
    _renderGame(ctx) {
        // UI superior
        ctx.save();
        ctx.font = "bold 15px 'Courier New', monospace";
        ctx.textAlign = 'left';   ctx.textBaseline = 'middle';
        ctx.fillStyle = C_SCORE;  ctx.fillText(`SCORE: ${this.score}`, 10, 18);
        ctx.textAlign = 'center'; ctx.fillStyle = '#ffaa00';
        ctx.fillText(`HI: ${this.hiScore}`, LW / 2, 18);
        ctx.textAlign = 'right';  ctx.fillStyle = '#fff';
        ctx.fillText(`NIV ${this.level}`, LW - 10, 18);
        
        // Vidas
        for (let i = 0; i < this.lives; i++) {
            const lx = 14 + i * 22, ly = 44;
            ctx.fillStyle = C_PAC;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.arc(lx, ly, 9, 0.3, Math.PI * 2 - 0.3);
            ctx.closePath(); ctx.fill();
        }
        
        // Barra power
        if (this.powerTimer > 0) {
            ctx.fillStyle = C_POWER;
            ctx.fillRect(LW / 2 - 50, 38, (this.powerTimer / this.POWER_DUR) * 100, 6);
            ctx.strokeStyle = '#ffaa0088'; ctx.lineWidth = 1;
            ctx.strokeRect(LW / 2 - 50, 38, 100, 6);
        }
        ctx.restore();
        
        this._renderMap(ctx);
        
        const p = this.pac;
        if (!p.dead) this._renderPac(ctx, p);
        else         this._renderPacDead(ctx, p);
        
        this.ghosts.forEach(g => g.draw(ctx));
    },
    
    _renderMap(ctx) {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = this.map[r][c];
                const x = c * CELL, y = MAP_Y + r * CELL;
                
                if (cell === 1) {
                    ctx.fillStyle = C_WALL;
                    ctx.fillRect(x, y, CELL, CELL);
                    ctx.strokeStyle = C_WALLEDGE; ctx.lineWidth = 1.5;
                    ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
                } else if (cell === 5) {
                    // Puerta del corral: línea rosada
                    ctx.fillStyle = C_BG;
                    ctx.fillRect(x, y, CELL, CELL);
                    ctx.strokeStyle = C_DOOR; ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(x, y + CELL / 2);
                    ctx.lineTo(x + CELL, y + CELL / 2);
                    ctx.stroke();
                } else if (cell === 2) {
                    Engine.circle(x + CELL / 2, y + CELL / 2, 2.5, C_DOT);
                } else if (cell === 3) {
                    const pulse = 0.8 + 0.2 * Math.sin(performance.now() / 250);
                    ctx.save();
                    ctx.globalAlpha = pulse;
                    Engine.circle(x + CELL / 2, y + CELL / 2, 6, C_POWER);
                    ctx.globalAlpha = 0.4 * pulse;
                    Engine.circle(x + CELL / 2, y + CELL / 2, 9, C_POWER);
                    ctx.restore();
                }
            }
        }
    },
    
    _renderPac(ctx, p) {
        ctx.save();
        ctx.translate(p.px, p.py);
        let angle = 0;
        if      (p.dir === DIR.DOWN)  angle =  Math.PI / 2;
        else if (p.dir === DIR.LEFT)  angle =  Math.PI;
        else if (p.dir === DIR.UP)    angle = -Math.PI / 2;
        ctx.rotate(angle);
        const mouthA = p.mouthAngle * Math.PI * 0.35;
        ctx.fillStyle = C_PAC;
        ctx.shadowColor = '#ffee00'; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, CELL * 0.44, mouthA, Math.PI * 2 - mouthA);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    },
    
    _renderPacDead(ctx, p) {
        const prog = Math.min(p.deadAnim / 1.5, 1);
        ctx.save();
        ctx.translate(p.px, p.py);
        ctx.fillStyle = C_PAC;
        ctx.globalAlpha = 1 - prog * 0.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, CELL * 0.44 * (1 - prog * 0.5),
        Math.PI * prog * 0.9, Math.PI * 2 - Math.PI * prog * 0.9);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    },
    
    _renderOverlay(ctx, text, color) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, LW, LH);
        ctx.font = "bold 44px 'Courier New', monospace";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 20;
        ctx.fillText(text, LW / 2, LH / 2 - 30);
        ctx.shadowBlur = 0;
        ctx.font = "20px 'Courier New', monospace";
        ctx.fillStyle = '#fff';
        ctx.fillText(`Puntuación: ${this.score}`, LW / 2, LH / 2 + 20);
        if (this.state === 'win') {
            ctx.font = "16px 'Courier New', monospace";
            ctx.fillStyle = '#ffaa00';
            ctx.fillText(`Nivel ${this.level - 1} completado`, LW / 2, LH / 2 + 50);
        }
        ctx.font = "14px 'Courier New', monospace";
        ctx.fillStyle = '#888';
        ctx.fillText('Toca o haz clic para continuar', LW / 2, LH / 2 + 80);
        ctx.restore();
    },
};

// ── Arranque ──────────────────────────────────
Engine.init('gameCanvas', { width: LW, height: LH, bg: C_BG });
Engine.start(game);
