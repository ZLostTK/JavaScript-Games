// ─── Space Invaders ───────────────────────────────────────────────────────────
// Logical resolution : 480 × 640
// Modes              : Solo | Versus Local 1v1 | Online 1v1 | Online Co-op
// Online engine      : engine/online.js  (PeerJS P2P, no backend)

const W = 480, H = 640;

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
    bg:       '#05050f',
    grid:     'rgba(255,255,255,0.03)',
    player:   '#00e5ff',
    playerG:  '#007a8a',
    p2:       '#ff9800',
    bullet:   '#00e5ff',
    p2bullet: '#ffa726',
    alien0:   '#ff4081',
    alien1:   '#ff9800',
    alien2:   '#76ff03',
    alienP2:  '#e040fb',   // alien-player skin 4 (última vida)
    shield:   '#00bcd4',
    ufo:      '#e040fb',
    ufoBomb:  '#ff1744',
    star:     '#ffffff',
    hud:      '#e0e0e0',
    accent:   '#00e5ff',
    dim:      'rgba(0,0,0,0.55)',
};

// ── Alien sprite data (11×8 px bitmask, 3 tipos × 2 frames) ──────────────────
const SPRITES = {
    0: [
        [0b00100000100,0b01100011000,0b11111111110,0b10111010101,0b11111111110,0b00100000100,0b01000000010,0b00100000100],
        [0b00100000100,0b00100000100,0b11111111110,0b10111010101,0b11111111110,0b01100011000,0b10000000001,0b01000000010],
    ],
    1: [
        [0b00100000100,0b00100000100,0b01111111110,0b11011010110,0b11111111111,0b01110111010,0b10000000001,0b01000000010],
        [0b00100000100,0b10100000101,0b01111111110,0b11011010110,0b11111111111,0b01110111010,0b01010001010,0b10000000001],
    ],
    2: [
        [0b00111100000,0b01111111100,0b11011011010,0b11111111110,0b01001001010,0b10111111101,0b10100000101,0b01011101010],
        [0b00111100000,0b01111111100,0b11011011010,0b11111111110,0b01001001010,0b10111111101,0b10100000101,0b01000000010],
    ],
};

// Skin del alien-jugador según vidas restantes: 4→tipo2, 3→tipo1, 2→tipo0, 1→special(ufo-like)
const ALIEN_P2_SKIN = (lives) => {
    if (lives >= 4) return 2;
    if (lives === 3) return 1;
    if (lives === 2) return 0;
    return -1; // skin especial (UFO) para última vida
};

const ALIEN_SCORES = [30, 20, 10];
const ALIEN_COLORS = [C.alien0, C.alien1, C.alien2];

// ── Button helpers ────────────────────────────────────────────────────────────
function drawBtn(ctx, label, x, y, w, h, accent, hover) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fillStyle = hover ? `${accent}33` : 'rgba(0,0,0,0.5)';
    ctx.fill();
    ctx.strokeStyle = hover ? accent : `${accent}88`;
    ctx.lineWidth = hover ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = hover ? '#ffffff' : C.hud;
    ctx.font = "bold 18px 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.restore();
}

function hitBtn(gx, gy, btn) {
    return gx >= btn.x && gx <= btn.x + btn.w && gy >= btn.y && gy <= btn.y + btn.h;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeStars(n) {
    const s = [];
    for (let i = 0; i < n; i++)
        s.push({ x: Math.random()*W, y: Math.random()*H, r: Math.random()*1.2+0.3, spd: Math.random()*8+4 });
    return s;
}

function drawAlien(ctx, type, frame, x, y, size, color) {
    const rows = SPRITES[type][frame];
    const px = size / 11;
    ctx.fillStyle = color;
    for (let row = 0; row < rows.length; row++) {
        const bits = rows[row];
        for (let col = 0; col < 11; col++) {
            if (bits & (1 << (10 - col)))
                ctx.fillRect(x + col*px, y + row*px, Math.ceil(px), Math.ceil(px));
        }
    }
}

function makeShield(cx, y) {
    const blocks = [], cols = 6, rows = 4, bsz = 8;
    const ox = cx - (cols * bsz) / 2;
    for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
            if (r === 0 && (c === 0 || c === cols - 1)) continue;
            blocks.push({ x: ox + c*bsz, y: y + r*bsz, sz: bsz, hp: 3 });
        }
    return blocks;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME OBJECT
// States: 'menu' | 'online-setup' | 'lobby' |
//         'playing' | 'playing-local' | 'playing-online' |
//         'gameover' | 'win'
// Modes:  'solo' | 'local' | 'online-1v1' | 'online-coop'
// ─────────────────────────────────────────────────────────────────────────────
const game = {
    state:          'menu',
    mode:           'solo',
    onlineRole:     null,        // 'host'|'guest'
    onlinePlayerNum: 1,          // 1 = P1 (shooter), 2 = P2 (alien-jugador) — asignado en online 1v1
    _onlineSubMode: '1v1',

    stars: [],

    // ── P1 (shooter) ──────────────────────────────────────────────────────────
    score: 0, hi: 0, lives: 3, level: 1,
    px: W/2, py: H-50, pspd: 220,
    pbullets: [], pCooldown: 0, pW: 36, pH: 18,

    // ── P2 — alien-jugador en modo 1v1 ────────────────────────────────────────
    // En local: P2 controla un alien en zona superior
    // p2x/p2y = posición del alien-jugador
    // p2lives = 4 vidas, skin cambia con cada vida perdida
    // p2bullets = bombas del alien hacia abajo
    p2score: 0, p2lives: 4,
    p2x: W/2, p2y: 80,
    p2spd: 200,
    p2bullets: [], p2Cooldown: 0,
    p2W: 36, p2H: 26,   // tamaño del alien-jugador
    P2_ZONE_BOTTOM: 240, // límite inferior de la zona del alien

    // ── Online rival display ───────────────────────────────────────────────────
    rivalScore: 0, rivalLives: 3,

    // ── Aliens NPC ────────────────────────────────────────────────────────────
    aliens: [], aFrame: 0, aFrameTimer: 0, aFrameInterval: 0.6,
    aDir: 1, aSpeedX: 20, aDropAmt: 16,
    aBullets: [], aShootTimer: 0, aShootInterval: 1.8,

    // ── UFO ──────────────────────────────────────────────────────────────────
    ufo: null, ufoTimer: 0, ufoInterval: 18,

    // ── Shields ───────────────────────────────────────────────────────────────
    shields: [],

    // ── UI ───────────────────────────────────────────────────────────────────
    _btns: {}, _hover: {},
    flashMsg: '', flashTimer: 0,

    // ── Particles ─────────────────────────────────────────────────────────────
    _particles: [],

    // ── Touch ─────────────────────────────────────────────────────────────────
    // P1 touch (solo/online/local-p1)
    _touchLeft: false, _touchRight: false, _touchFire: false, _touchFirePressed: false,
    // P2 touch (local-p2)
    _touch2Left: false, _touch2Right: false, _touch2Up: false, _touch2Down: false,
    _touch2Fire: false, _touch2FirePressed: false,
    _touchBtnLayout: null,

    // ── Online sync ───────────────────────────────────────────────────────────
    _onlineSyncTimer: 0,

    // ── Online 1v1 alien state (para sincronizar el alien-jugador remoto) ─────
    _remoteAlienX: W/2, _remoteAlienY: 80, _remoteAlienLives: 4,
    _remoteAlienBullets: [],   // balas del alien remoto para renderizar

    // ─────────────────────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────────────────────
    init() {
        this.stars = makeStars(80);
        this._buildMenuBtns();
        this._synthSounds();
        this._setupOnlineUI();
    },

    _synthSounds() {
        Audio.synth('shoot',    'square', 880,  0.08, 0.15);
        Audio.synth('shoot2',   'saw',    330,  0.10, 0.20);  // sonido bala alien-P2
        Audio.synth('hit',      'noise',  200,  0.12, 0.3);
        Audio.synth('explode',  'noise',  80,   0.35, 0.5);
        Audio.synth('ufo',      'square', 440,  0.5,  0.2, 220);
        Audio.synth('die',      'saw',    200,  0.4,  0.4, 50);
        Audio.synth('levelup',  'sine',   660,  0.4,  0.3, 1320);
        Audio.synth('alienhit', 'sine',   220,  0.20, 0.4, 110);  // alien-P2 recibe daño
    },

    // ─────────────────────────────────────────────────────────────────────────
    // BUTTON MAPS
    // ─────────────────────────────────────────────────────────────────────────
    _buildMenuBtns() {
        const bw = 244, bh = 54, cx = W/2 - bw/2;
        this._btns = {
            solo:    { x: cx, y: 395, w: bw, h: bh, label: '▶ SOLO' },
            local:   { x: cx, y: 460, w: bw, h: bh, label: 'VERSUS LOCAL' },
            online:  { x: cx, y: 525, w: bw, h: bh, label: 'MULTIJUGADOR' },
            restart: null,
        };
        this._hover = {};
    },

    _buildOnlineSetupBtns() {
        const bw = 212, bh = 52, cx = W/2 - bw/2;
        this._btns = {
            mode1v1:    { x: W/2-150, y: 300, w: 132, h: 44, label: '🎯 1 vs 1' },
            modeCoop:   { x: W/2+18,  y: 300, w: 132, h: 44, label: '🤝 CO-OP' },
            hostRoom:   { x: cx, y: 374, w: bw, h: bh, label: 'Crear Sala' },
            joinRoom:   { x: cx, y: 438, w: bw, h: bh, label: 'Unirse a Sala' },
            onlineBack: { x: cx, y: 512, w: bw, h: 42, label: '← Volver' },
            restart:    null,
        };
        this._hover = {};
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ONLINE HTML UI
    // ─────────────────────────────────────────────────────────────────────────
    _setupOnlineUI() {
        document.getElementById('online-back-btn')?.addEventListener('click', () => {
            Online.destroy();
            this._hideOnlineUI();
            this._buildOnlineSetupBtns();
            this.state = 'online-setup';
        });

        document.getElementById('copy-btn')?.addEventListener('click', () => {
            const code = document.getElementById('room-code-display').textContent;
            navigator.clipboard?.writeText(code).catch(() => {});
            const btn = document.getElementById('copy-btn');
            btn.textContent = '¡Copiado!';
            setTimeout(() => { btn.textContent = 'Copiar código'; }, 1500);
        });

        document.getElementById('join-btn')?.addEventListener('click', () => {
            const raw = document.getElementById('room-code-input').value.trim().toUpperCase();
            if (raw.length < 4) return;
            document.getElementById('online-status').textContent = 'Conectando...';
            Online.join(raw);
        });

        const roomCodeInput = document.getElementById('room-code-input');
        if (roomCodeInput) {
            roomCodeInput.addEventListener('keydown', e => {
                e.stopPropagation();
                if (e.key === 'Enter') document.getElementById('join-btn')?.click();
            });
            roomCodeInput.addEventListener('keyup', e => {
                e.stopPropagation();
            });
        }
    },

    _showOnlineUI(view) {
        document.getElementById('online-ui')?.classList.remove('hidden');
        document.getElementById('host-view')?.classList.add('hidden');
        document.getElementById('join-view')?.classList.add('hidden');
        if (view) document.getElementById(`${view}-view`)?.classList.remove('hidden');
    },

    _hideOnlineUI() {
        document.getElementById('online-ui')?.classList.add('hidden');
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ONLINE CALLBACKS
    // ─────────────────────────────────────────────────────────────────────────
    _setupOnlineCallbacks() {
        Online.on('onHostReady', (code) => {
            document.getElementById('room-code-display').textContent = code;
            document.getElementById('online-status').textContent = 'Esperando rival...';
        });

        Online.on('onConnected', (role) => {
            this.onlineRole = role;
            document.getElementById('online-status').textContent = '¡Conectado! Iniciando...';

            setTimeout(() => {
                this._hideOnlineUI();
                if (role === 'host') {
                    // En 1v1: asignar roles aleatoriamente
                    let p1role = 'shooter', p2role = 'alien';
                    const is1v1 = (!this._onlineSubMode || this._onlineSubMode === '1v1' || this._onlineSubMode !== 'coop');
                    if (is1v1 && Math.random() < 0.5) {
                        p1role = 'alien'; p2role = 'shooter';
                    }
                    console.log(`[1v1 Online] Host role: ${p1role}, Guest role: ${p2role}`);
                    Online.send({ type: 'game_init', mode: this._onlineSubMode || '1v1', guestRole: p2role });
                    const myRole = p1role;
                    this._startOnlineGame(role, this._onlineSubMode || '1v1', myRole);
                }
                // Guest espera 'game_init'
            }, 600);
        });

        Online.on('onData', (data) => this._handleOnlineData(data));

        Online.on('onDisconnect', () => {
            if (this.state === 'playing-online') {
                this.rivalLives = 0;
                this._flash('RIVAL DESCONECTADO');
                setTimeout(() => {
                    if (this.state === 'playing-online') this.state = 'gameover';
                }, 2500);
            } else {
                this._hideOnlineUI();
                this._buildMenuBtns();
                this.state = 'menu';
            }
        });

        Online.on('onError', (err) => {
            const el = document.getElementById('online-status');
            if (el) el.textContent = `Error: ${err.type || String(err)}`;
        });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ONLINE DATA HANDLER
    // ─────────────────────────────────────────────────────────────────────────
    _handleOnlineData(data) {
        if (data.type === 'game_init') {
            const subMode = data.mode || '1v1';
            this._onlineSubMode = subMode;
            this._hideOnlineUI();
            // Guest recibe su rol (siempre P2 en coop, asignado aleatoriamente en 1v1)
            const myRole = subMode === 'coop' ? 'shooter' : data.guestRole;
            console.log(`[1v1 Online] Guest role received: ${myRole}`);
            this._startOnlineGame('guest', subMode, myRole);
            return;
        }

        if (this.state !== 'playing-online') return;

        switch (data.type) {
            // ── CO-OP: status sync ────────────────────────────────────────────
            case 'status':
                this.rivalScore = data.score;
                this.rivalLives = data.lives;
                break;

            // ── CO-OP: kill sync ──────────────────────────────────────────────
            case 'kill': {
                if (this.mode !== 'online-coop') break;
                const a = this.aliens[data.idx];
                if (a && a.alive) {
                    a.alive = false;
                    this._spawnParticles(a.x + a.w/2, a.y + a.h/2, ALIEN_COLORS[a.type]);
                }
                break;
            }

            // ── 1v1: posición del alien-jugador remoto ────────────────────────
            case 'alien_move':
                this._remoteAlienX    = data.x;
                this._remoteAlienY    = data.y;
                this._remoteAlienLives = data.lives;
                if (data.score !== undefined) this.rivalScore = data.score;
                break;

            // ── 1v1: posición del shooter remoto ──────────────────────────────
            case 'shooter_move':
                this._remoteAlienX = data.x; // Reusamos esta variable para la pos del rival (shooter)
                this.rivalScore = data.score;
                this.rivalLives = data.lives;
                break;

            // ── 1v1: bala del alien-jugador remoto ────────────────────────────
            case 'alien_shoot':
                // El alien dispara bombas hacia abajo (desde la perspectiva del shooter local)
                this._remoteAlienBullets.push({ x: data.x, y: data.y });
                break;

            // ── 1v1: bala del shooter remoto ──────────────────────────────────
            case 'shooter_shoot':
                // Si yo soy el alien, recibo las balas del shooter remoto
                if (this.onlinePlayerNum === 2) {
                    this.aBullets.push({ x: data.x, y: data.y, fromShooter: true });
                }
                break;

            // ── 1v1: Alien llegó abajo ────────────────────────────────────────
            case 'alien_reached_bottom':
                this.state = 'gameover';
                break;

            // ── Rival terminó ─────────────────────────────────────────────────
            case 'gameover':
                this.rivalLives = 0;
                if (this.mode === 'online-1v1') this._flash('¡RIVAL ELIMINADO!');
                this.state = 'gameover';
                break;
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // START MODES
    // ─────────────────────────────────────────────────────────────────────────
    _startSolo() {
        this.mode = 'solo';
        this.score = 0; this.lives = 3; this.level = 1;
        this._btns.restart = null; this._hover = {};
        this._initLevel();
        this.px = W/2; this.py = H-50;
        this.state = 'playing';
    },

    // LOCAL: P1=shooter abajo, P2=alien-jugador arriba
    _startLocal() {
        this.mode = 'local';
        this.score = 0; this.p2score = 0;
        this.lives = 3; this.p2lives = 4;
        this.level = 1;
        this._btns.restart = null; this._hover = {};
        this._initLevelLocal();
        this.px  = W / 2;   this.py  = H - 50;
        this.p2x = W / 2;   this.p2y = 80;
        this.state = 'playing-local';
    },

    _startOnlineGame(role, subMode, myGameRole) {
        this.mode = subMode === 'coop' ? 'online-coop' : 'online-1v1';
        this.onlineRole = role;
        // myGameRole: 'shooter' | 'alien'  (solo en 1v1)
        // En coop: siempre shooter. En 1v1: asignado aleatoriamente.
        // onlinePlayerNum: 1=shooter, 2=alien
        this.onlinePlayerNum = (subMode === 'coop') ? (role === 'host' ? 1 : 2) : (myGameRole === 'shooter' ? 1 : 2);
        this.score = 0; this.lives = 3; this.level = 1;
        this.p2lives = 4;
        this.p2x = W/2; this.p2y = 80;
        this.rivalScore = 0; this.rivalLives = (subMode === '1v1') ? 4 : 3;
        this._remoteAlienX = W/2; this._remoteAlienY = 80; this._remoteAlienLives = 4;
        this._remoteAlienBullets = [];
        this._btns.restart = null; this._hover = {};
        if (subMode === '1v1') {
            this._initLevelLocal(); // Sin NPC aliens en 1v1
        } else {
            this._initLevel();
        }
        this.px = W/2; this.py = H-50;
        this.state = 'playing-online';
        this._onlineSyncTimer = 0;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LEVEL INIT
    // ─────────────────────────────────────────────────────────────────────────
    _initLevel() {
        const cols = 11, rows = 5;
        const aw = 32, ah = 24, padX = 6, padY = 10;
        const totalW = cols * (aw + padX) - padX;
        const startX = (W - totalW) / 2;
        const startY = 80;

        this.aliens = [];
        for (let r = 0; r < rows; r++) {
            const type = r === 0 ? 0 : r <= 2 ? 1 : 2;
            for (let c = 0; c < cols; c++) {
                this.aliens.push({
                    x: startX + c * (aw + padX),
                    y: startY + r * (ah + padY),
                    w: aw, h: ah, type, alive: true,
                });
            }
        }

        this.aDir = 1;
        this.aSpeedX       = 20 + (this.level - 1) * 5;
        this.aShootInterval = Math.max(0.6, 1.8 - (this.level - 1) * 0.12);
        this.aFrame = 0; this.aFrameTimer = 0;
        this.aFrameInterval = Math.max(0.2, 0.6 - (this.level - 1) * 0.04);
        this.pbullets = []; this.p2bullets = []; this.aBullets = [];
        this.ufo = null; this.ufoTimer = 0; this.ufoInterval = 15;
        this.pCooldown = 0; this.p2Cooldown = 0;
        this.shields = [];
        for (const sx of [90, 185, 295, 390]) this.shields.push(...makeShield(sx, H - 130));
    },

    // Local 1v1: sin aliens NPC — sólo el alien-P2 y el shooter-P1
    _initLevelLocal() {
        this.aliens = [];       // no hay horda NPC
        this.aFrame = 0; this.aFrameTimer = 0; this.aFrameInterval = 0.4;
        this.pbullets = []; this.p2bullets = []; this.aBullets = [];
        this.ufo = null; this.ufoTimer = 0;
        this.pCooldown = 0; this.p2Cooldown = 0;
        this.shields = [];
        for (const sx of [90, 185, 295, 390]) this.shields.push(...makeShield(sx, H - 130));
    },

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE DISPATCHER
    // ─────────────────────────────────────────────────────────────────────────
    update(dt) {
        for (const s of this.stars) {
            s.y += s.spd * dt;
            if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        }

        switch (this.state) {
            case 'menu':           this._updateMenu(dt);         break;
            case 'online-setup':   this._updateOnlineSetup(dt);  break;
            case 'lobby':          break;
            case 'playing':        this._updatePlaying(dt);      break;
            case 'playing-local':  this._updatePlayingLocal(dt); break;
            case 'playing-online': this._updatePlayingOnline(dt);break;
            case 'gameover':
            case 'win':            this._updateOver(dt);         break;
        }
    },

    // ── Menu update ───────────────────────────────────────────────────────────
    _updateMenu(dt) {
        const m  = Input.getMouse();
        const gm = Engine.toGame(m.x, m.y);
        this._hover.solo   = hitBtn(gm.x, gm.y, this._btns.solo);
        this._hover.local  = hitBtn(gm.x, gm.y, this._btns.local);
        this._hover.online = hitBtn(gm.x, gm.y, this._btns.online);

        const check = (gx, gy) => {
            if (hitBtn(gx, gy, this._btns.solo))   { this._startSolo(); return; }
            if (hitBtn(gx, gy, this._btns.local))  { this._startLocal(); return; }
            if (hitBtn(gx, gy, this._btns.online)) {
                this._buildOnlineSetupBtns();
                this.state = 'online-setup';
            }
        };

        if (Input.isMousePressed()) check(gm.x, gm.y);
        if (Input.isTouchStarted()) {
            const t = Input.getTouch(0);
            if (t) { const gt = Engine.toGame(t.x, t.y); check(gt.x, gt.y); }
        }
    },

    // ── Online-setup update ───────────────────────────────────────────────────
    _updateOnlineSetup(dt) {
        const m  = Input.getMouse();
        const gm = Engine.toGame(m.x, m.y);
        for (const k of ['mode1v1','modeCoop','hostRoom','joinRoom','onlineBack'])
            if (this._btns[k]) this._hover[k] = hitBtn(gm.x, gm.y, this._btns[k]);

        const check = (gx, gy) => {
            if (this._btns.mode1v1   && hitBtn(gx, gy, this._btns.mode1v1))   { this._onlineSubMode = '1v1';  return; }
            if (this._btns.modeCoop  && hitBtn(gx, gy, this._btns.modeCoop))  { this._onlineSubMode = 'coop'; return; }
            if (this._btns.onlineBack && hitBtn(gx, gy, this._btns.onlineBack)) {
                this._buildMenuBtns(); this.state = 'menu'; return;
            }
            if (this._btns.hostRoom && hitBtn(gx, gy, this._btns.hostRoom)) {
                this._setupOnlineCallbacks();
                this._showOnlineUI('host');
                document.getElementById('online-status').textContent = 'Iniciando servidor...';
                Online.host(code => {
                    document.getElementById('room-code-display').textContent = code;
                    document.getElementById('online-status').textContent = 'Esperando rival...';
                });
                this.state = 'lobby';
                return;
            }
            if (this._btns.joinRoom && hitBtn(gx, gy, this._btns.joinRoom)) {
                this._setupOnlineCallbacks();
                this._showOnlineUI('join');
                document.getElementById('online-status').textContent = 'Introduce el código de sala';
                document.getElementById('room-code-input').value = '';
                setTimeout(() => document.getElementById('room-code-input')?.focus(), 80);
                this.state = 'lobby';
                return;
            }
        };

        if (Input.isMousePressed()) check(gm.x, gm.y);
        if (Input.isTouchStarted()) {
            const t = Input.getTouch(0);
            if (t) { const gt = Engine.toGame(t.x, t.y); check(gt.x, gt.y); }
        }
    },

    // ── Gameover update ───────────────────────────────────────────────────────
    _updateOver(dt) {
        if (!this._btns.restart) {
            const bw = 220, bh = 50;
            this._btns.restart = { x: W/2-bw/2, y: H/2+60, w: bw, h: bh, label: '▶  MENÚ' };
        }
        const m  = Input.getMouse();
        const gm = Engine.toGame(m.x, m.y);
        this._hover.restart = hitBtn(gm.x, gm.y, this._btns.restart);

        const doMenu = () => {
            Online.destroy();
            this._btns.restart = null;
            this._buildMenuBtns();
            this.state = 'menu';
        };

        if (Input.isMousePressed() && this._hover.restart) doMenu();
        if (Input.isTouchStarted()) {
            const t = Input.getTouch(0);
            if (t) {
                const gt = Engine.toGame(t.x, t.y);
                if (this._btns.restart && hitBtn(gt.x, gt.y, this._btns.restart)) doMenu();
            }
        }
        if (Input.isPressed('Space') || Input.isPressed('Enter')) doMenu();
    },

    // ── Playing: Solo ─────────────────────────────────────────────────────────
    _updatePlaying(dt) {
        this._updatePlayerSolo(dt);
        this._updateAliens(dt);
        this._updateBullets(dt, 'solo');
        this._updateUFO(dt);
        this._updateCollisionsSolo();
        this._checkWinLose();
        if (this.flashTimer > 0) this.flashTimer -= dt;
    },

    // ── Playing: Local 1v1 ────────────────────────────────────────────────────
    _updatePlayingLocal(dt) {
        this._updatePlayerP1Local(dt);
        this._updateAlienP2Local(dt);
        this._updateBullets(dt, 'local');
        this._updateCollisionsLocal1v1();
        this.aFrameTimer += dt;
        if (this.aFrameTimer >= this.aFrameInterval) { this.aFrameTimer = 0; this.aFrame = 1 - this.aFrame; }
        if (this.flashTimer > 0) this.flashTimer -= dt;
    },

    // ── Playing: Online ───────────────────────────────────────────────────────
    _updatePlayingOnline(dt) {
        if (this.mode === 'online-coop') {
            this._updatePlayerSolo(dt);
            this._updateAliens(dt);
            this._updateBullets(dt, 'solo');
            this._updateUFO(dt);
            this._updateCollisionsOnline();
            this._checkWinLoseOnline();
        } else {
            // 1v1 online
            this._updateOnline1v1(dt);
        }

        this._onlineSyncTimer -= dt;
        if (this._onlineSyncTimer <= 0) {
            this._onlineSyncTimer = 0.1; // sync frecuente en 1v1
            if (this.mode === 'online-coop') {
                Online.send({ type: 'status', score: this.score, lives: this.lives });
            } else {
                // Enviar posición del alien o del shooter
                if (this.onlinePlayerNum === 2) {
                    Online.send({ type: 'alien_move', x: this.p2x, y: this.p2y, lives: this.p2lives, score: this.p2score });
                } else {
                    Online.send({ type: 'shooter_move', x: this.px, score: this.score, lives: this.lives });
                }
            }
        }
        if (this.flashTimer > 0) this.flashTimer -= dt;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ONLINE 1v1 UPDATE
    // ─────────────────────────────────────────────────────────────────────────
    _updateOnline1v1(dt) {
        this.aFrameTimer += dt;
        if (this.aFrameTimer >= this.aFrameInterval) { this.aFrameTimer = 0; this.aFrame = 1 - this.aFrame; }

        if (this.onlinePlayerNum === 1) {
            // Soy el SHOOTER
            const oldBullets = this.pbullets.length;
            this._updatePlayerSolo(dt);
            if (this.pbullets.length > oldBullets) {
                // A new bullet was fired!
                const b = this.pbullets[this.pbullets.length - 1];
                Online.send({ type: 'shooter_shoot', x: b.x, y: b.y });
            }

            // Muevo balas P1 hacia arriba
            for (const b of this.pbullets) b.y -= 420 * dt;
            this.pbullets = this.pbullets.filter(b => b.y > -10);
            // Balas remotas del alien (vienen desde arriba, bajan)
            for (const b of this._remoteAlienBullets) b.y += 200 * dt;
            this._remoteAlienBullets = this._remoteAlienBullets.filter(b => b.y < H + 10);
            // Colisiones: mis balas vs alien remoto
            for (const b of this.pbullets) {
                const ax = this._remoteAlienX, ay = this._remoteAlienY;
                if (b.x > ax - this.p2W/2 && b.x < ax + this.p2W/2 &&
                    b.y > ay && b.y < ay + this.p2H) {
                    b.y = -9999;
                    this.score += 50;
                    Audio.play('alienhit');
                }
            }
            // Balas remotas del alien vs yo
            for (const b of this._remoteAlienBullets) {
                if (Math.abs(b.x - this.px) < this.pW/2 && b.y > this.py - this.pH && b.y < this.py + 4) {
                    b.y = 9999;
                    this._playerHit(1);
                }
            }
        } else {
            // Soy el ALIEN-JUGADOR
            this._updateAlienP2Online(dt);
            // Balas del alien (van hacia abajo desde la perspectiva del shooter)
            for (const b of this.p2bullets) b.y += 200 * dt;
            this.p2bullets = this.p2bullets.filter(b => b.y < H + 10);
            // Balas remotas del shooter (suben desde abajo)
            for (const b of this.aBullets) {
                if (b.fromShooter) b.y -= 420 * dt;
            }
            this.aBullets = this.aBullets.filter(b => b.fromShooter ? b.y > -10 : b.y < H + 10);
            
            // Mis balas vs shooter remoto (evalúo impacto local para sumar puntos)
            for (const b of this.p2bullets) {
                if (Math.abs(b.x - this._remoteAlienX) < this.pW/2 && b.y > H - 50 - this.pH && b.y < H - 50 + 4) {
                    b.y = 9999;
                    this.p2score += 30; // Yo, alien, anoto puntos
                }
            }
            
            // Balas del shooter remoto vs yo (alien)
            for (const b of this.aBullets) {
                if (!b.fromShooter) continue;
                if (b.x > this.p2x - this.p2W/2 && b.x < this.p2x + this.p2W/2 &&
                    b.y > this.p2y && b.y < this.p2y + this.p2H) {
                    b.y = -9999;
                    this.p2lives--;
                    Audio.play('alienhit');
                    this._spawnParticles(this.p2x, this.p2y, C.alienP2, 8);
                    if (this.p2lives <= 0) {
                        Online.send({ type: 'gameover' });
                        this.state = 'gameover';
                    }
                }
            }
        }

        // Shields (para AMBOS jugadores)
        this._updateShieldCollisions1v1(dt);

        // Check si el alien llegó abajo (alien gana)
        if (this.onlinePlayerNum === 1 && this._remoteAlienY + this.p2H >= H - 70) {
            this.state = 'gameover';
        }
        if (this.onlinePlayerNum === 2 && this.p2y + this.p2H >= H - 70) {
            Online.send({ type: 'alien_reached_bottom' });
            this.state = 'gameover'; // alien ganó
        }
    },

    _updateShieldCollisions1v1(dt) {
        const upBullets   = this.onlinePlayerNum === 1 ? this.pbullets : this.aBullets;
        const downBullets = this.onlinePlayerNum === 1 ? this._remoteAlienBullets : this.p2bullets;

        for (const b of upBullets) {
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz)
                    { sh.hp--; b.y = -9999; }
            }
        }
        for (const b of downBullets) {
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz)
                    { sh.hp--; b.y = 9999; }
            }
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PLAYER UPDATES
    // ─────────────────────────────────────────────────────────────────────────
    _updatePlayerSolo(dt) {
        const left  = Input.isDown('ArrowLeft')  || Input.isDown('KeyA');
        const right = Input.isDown('ArrowRight') || Input.isDown('KeyD');
        const fire  = Input.isPressed('Space')   || Input.isPressed('ArrowUp') || Input.isPressed('KeyW');
        const tLeft = this._touchLeft, tRight = this._touchRight;
        const tFire = this._touchFirePressed; this._touchFirePressed = false;

        if (left  || tLeft)  this.px = Math.max(this.pW/2,     this.px - this.pspd*dt);
        if (right || tRight) this.px = Math.min(W - this.pW/2, this.px + this.pspd*dt);

        this.pCooldown -= dt;
        if ((fire || tFire) && this.pCooldown <= 0) {
            this.pbullets.push({ x: this.px, y: this.py - this.pH/2 - 4 });
            this.pCooldown = 0.25;
            Audio.play('shoot');
        }
    },

    // P1 en Local 1v1: Arrow keys + Space
    _updatePlayerP1Local(dt) {
        const l1 = Input.isDown('ArrowLeft')  || this._touchLeft;
        const r1 = Input.isDown('ArrowRight') || this._touchRight;
        const f1 = (Input.isPressed('Space') || Input.isPressed('ArrowUp') || this._touchFirePressed);
        this._touchFirePressed = false;

        if (l1) this.px = Math.max(this.pW/2,     this.px - this.pspd*dt);
        if (r1) this.px = Math.min(W - this.pW/2, this.px + this.pspd*dt);
        this.pCooldown -= dt;
        if (f1 && this.pCooldown <= 0) {
            this.pbullets.push({ x: this.px, y: this.py - this.pH/2 - 4 });
            this.pCooldown = 0.25; Audio.play('shoot');
        }
    },

    // P2 alien-jugador en Local 1v1: WASD + movimiento vertical + E/Tab para disparar
    _updateAlienP2Local(dt) {
        const l2  = Input.isDown('KeyA')   || this._touch2Left;
        const r2  = Input.isDown('KeyD')   || this._touch2Right;
        const u2  = Input.isDown('KeyW')   || this._touch2Up;
        const d2  = Input.isDown('KeyS')   || this._touch2Down;
        const f2  = (Input.isPressed('KeyE') || Input.isPressed('Tab') || this._touch2FirePressed);
        this._touch2FirePressed = false;

        if (l2) this.p2x = Math.max(this.p2W/2,         this.p2x - this.p2spd*dt);
        if (r2) this.p2x = Math.min(W - this.p2W/2,     this.p2x + this.p2spd*dt);
        if (u2) this.p2y = Math.max(40,                  this.p2y - this.p2spd*dt);
        if (d2) this.p2y = Math.min(this.P2_ZONE_BOTTOM, this.p2y + this.p2spd*dt);

        this.p2Cooldown -= dt;
        if (f2 && this.p2Cooldown <= 0) {
            // El alien dispara hacia ABAJO
            this.p2bullets.push({ x: this.p2x, y: this.p2y + this.p2H/2 + 4 });
            this.p2Cooldown = 0.4; Audio.play('shoot2');
        }
    },

    // Alien-jugador online
    _updateAlienP2Online(dt) {
        const l2  = Input.isDown('ArrowLeft')  || Input.isDown('KeyA')  || this._touchLeft;
        const r2  = Input.isDown('ArrowRight') || Input.isDown('KeyD')  || this._touchRight;
        const u2  = Input.isDown('ArrowUp')    || Input.isDown('KeyW')  || this._touch2Up;
        const d2  = Input.isDown('ArrowDown')  || Input.isDown('KeyS')  || this._touch2Down;
        const f2  = Input.isPressed('Space')   || this._touchFirePressed || this._touch2FirePressed;
        this._touchFirePressed = false; this._touch2FirePressed = false;

        if (l2) this.p2x = Math.max(this.p2W/2,         this.p2x - this.p2spd*dt);
        if (r2) this.p2x = Math.min(W - this.p2W/2,     this.p2x + this.p2spd*dt);
        if (u2) this.p2y = Math.max(40,       this.p2y - this.p2spd*dt);
        if (d2) this.p2y = Math.min(H/2 - this.p2H, this.p2y + this.p2spd*dt); // No puede pasar la mitad

        this.p2Cooldown -= dt;
        if (f2 && this.p2Cooldown <= 0) {
            const bx = this.p2x, by = this.p2y + this.p2H/2 + 4;
            this.p2bullets.push({ x: bx, y: by });
            this.p2Cooldown = 0.4; Audio.play('shoot2');
            // Notificar al shooter
            Online.send({ type: 'alien_shoot', x: bx, y: by });
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ALIENS NPC, BULLETS, UFO  (solo en solo/coop)
    // ─────────────────────────────────────────────────────────────────────────
    _updateAliens(dt) {
        this.aFrameTimer += dt;
        if (this.aFrameTimer >= this.aFrameInterval) { this.aFrameTimer = 0; this.aFrame = 1 - this.aFrame; }

        const alive = this.aliens.filter(a => a.alive);
        if (alive.length === 0) return;

        const speedMult = 1 + (1 - alive.length / 55) * 1.8;
        const dx = this.aDir * this.aSpeedX * speedMult * dt;

        let minX = Infinity, maxX = -Infinity;
        for (const a of alive) { if (a.x < minX) minX = a.x; if (a.x + a.w > maxX) maxX = a.x + a.w; }

        let drop = false;
        if (maxX + dx > W - 8) { drop = true; this.aDir = -1; }
        if (minX + dx < 8)     { drop = true; this.aDir =  1; }

        for (const a of alive) { if (drop) a.y += this.aDropAmt; else a.x += dx; }

        this.aShootTimer -= dt;
        if (this.aShootTimer <= 0) {
            this.aShootTimer = this.aShootInterval * (0.7 + Math.random() * 0.6);
            const cols = {};
            for (const a of alive) {
                const col = Math.round(a.x);
                if (!cols[col] || a.y > cols[col].y) cols[col] = a;
            }
            const shooters = Object.values(cols);
            const shooter  = shooters[Math.floor(Math.random() * shooters.length)];
            if (shooter) this.aBullets.push({ x: shooter.x + shooter.w/2, y: shooter.y + shooter.h });
        }
    },

    _updateBullets(dt, who) {
        const pspd = 420, aspd = 200;
        if (who !== 'local-p2only') for (const b of this.pbullets) b.y -= pspd * dt;
        if (who === 'local') {
            // p2bullets van hacia abajo (bombas del alien)
            for (const b of this.p2bullets) b.y += aspd * dt;
        }
        for (const b of this.aBullets) b.y += aspd * dt;

        this.pbullets  = this.pbullets.filter(b => b.y > -10);
        if (who === 'local') this.p2bullets = this.p2bullets.filter(b => b.y < H + 10);
        this.aBullets  = this.aBullets.filter(b => b.y < H + 10);
    },

    _updateUFO(dt) {
        this.ufoTimer -= dt;
        if (this.ufoTimer <= 0 && !this.ufo) {
            this.ufoTimer = this.ufoInterval + Math.random() * 10;
            const dir = Math.random() < 0.5 ? 1 : -1;
            this.ufo = { x: dir === 1 ? -40 : W + 40, y: 38, dir, spd: 110 };
            Audio.play('ufo');
        }
        if (this.ufo) {
            this.ufo.x += this.ufo.dir * this.ufo.spd * dt;
            if (this.ufo.x < -60 || this.ufo.x > W + 60) this.ufo = null;
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // COLLISIONS
    // ─────────────────────────────────────────────────────────────────────────
    _updateCollisionsSolo() {
        for (const b of this.pbullets) {
            for (const a of this.aliens) {
                if (!a.alive) continue;
                if (b.x > a.x && b.x < a.x+a.w && b.y > a.y && b.y < a.y+a.h) {
                    a.alive = false; b.y = -9999;
                    this.score += ALIEN_SCORES[a.type];
                    Audio.play('hit'); this._spawnParticles(a.x+a.w/2, a.y+a.h/2, ALIEN_COLORS[a.type]);
                }
            }
            if (this.ufo) {
                const u = this.ufo;
                if (b.x > u.x-20 && b.x < u.x+20 && b.y > u.y-8 && b.y < u.y+8) {
                    const bonus = (Math.floor(Math.random()*6)+1)*50;
                    this.score += bonus; this._flash(`+${bonus}!`);
                    this.ufo = null; b.y = -9999; Audio.play('explode');
                }
            }
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz) { sh.hp--; b.y = -9999; }
            }
        }
        for (const b of this.aBullets) {
            if (Math.abs(b.x-this.px) < this.pW/2 && b.y > this.py-this.pH && b.y < this.py+4)
                { b.y = 9999; this._playerHit(1); }
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz) { sh.hp--; b.y = 9999; }
            }
        }
        for (const a of this.aliens) {
            if (a.alive && a.y+a.h >= H-70) {
                if (this.score > this.hi) this.hi = this.score;
                this.state = 'gameover'; Audio.play('explode'); return;
            }
        }
    },

    // Local 1v1: P1 (shooter) vs P2 (alien-jugador)
    _updateCollisionsLocal1v1() {
        // Balas de P1 (suben) vs alien-P2
        for (const b of this.pbullets) {
            // Colisión con alien-P2
            if (b.x > this.p2x - this.p2W/2 && b.x < this.p2x + this.p2W/2 &&
                b.y > this.p2y && b.y < this.p2y + this.p2H) {
                b.y = -9999;
                this.p2lives--;
                this.score += 50; // P1 anota puntos por golpe
                Audio.play('alienhit');
                this._spawnParticles(this.p2x, this.p2y + this.p2H/2, C.alienP2, 10);
                if (this.p2lives <= 0) {
                    const best = Math.max(this.score, this.p2score);
                    if (best > this.hi) this.hi = best;
                    this.state = 'gameover'; Audio.play('explode'); return;
                }
            }
            // Shields
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz) { sh.hp--; b.y = -9999; }
            }
        }

        // Balas de P2-alien (bajan) vs P1-shooter
        for (const b of this.p2bullets) {
            if (Math.abs(b.x - this.px) < this.pW/2 && b.y > this.py - this.pH && b.y < this.py + 4) {
                b.y = 9999;
                this.p2score += 30; // P2 anota puntos por golpe
                this._playerHit(1);
            }
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz) { sh.hp--; b.y = 9999; }
            }
        }

        // Si el alien-P2 llega abajo, P2 gana
        if (this.p2y + this.p2H >= H - 70) {
            const best = Math.max(this.score, this.p2score);
            if (best > this.hi) this.hi = best;
            this.p2score += 200; // bonus por llegar
            this.state = 'gameover'; Audio.play('explode'); return;
        }
    },

    // Online CO-OP
    _updateCollisionsOnline() {
        for (const b of this.pbullets) {
            for (let i = 0; i < this.aliens.length; i++) {
                const a = this.aliens[i];
                if (!a.alive) continue;
                if (b.x > a.x && b.x < a.x+a.w && b.y > a.y && b.y < a.y+a.h) {
                    a.alive = false; b.y = -9999;
                    this.score += ALIEN_SCORES[a.type];
                    Audio.play('hit'); this._spawnParticles(a.x+a.w/2, a.y+a.h/2, ALIEN_COLORS[a.type]);
                    Online.send({ type: 'kill', idx: i });
                }
            }
            if (this.ufo) {
                const u = this.ufo;
                if (b.x > u.x-20 && b.x < u.x+20 && b.y > u.y-8 && b.y < u.y+8) {
                    const bonus = (Math.floor(Math.random()*6)+1)*50;
                    this.score += bonus; this._flash(`+${bonus}!`);
                    this.ufo = null; b.y = -9999; Audio.play('explode');
                }
            }
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz) { sh.hp--; b.y = -9999; }
            }
        }
        for (const b of this.aBullets) {
            if (Math.abs(b.x-this.px) < this.pW/2 && b.y > this.py-this.pH && b.y < this.py+4)
                { b.y = 9999; this._playerHit(1); }
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz) { sh.hp--; b.y = 9999; }
            }
        }
        for (const a of this.aliens) {
            if (a.alive && a.y+a.h >= H-70) {
                if (this.score > this.hi) this.hi = this.score;
                Online.send({ type: 'gameover' });
                this.state = 'gameover'; Audio.play('explode'); return;
            }
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PLAYER HIT
    // ─────────────────────────────────────────────────────────────────────────
    _playerHit(player) {
        if (player === 1) {
            this.lives--;
            Audio.play('die');
            this._spawnParticles(this.px, this.py, C.player, 20);
            if (this.lives <= 0) {
                const best = this.mode === 'local' ? Math.max(this.score, this.p2score) : this.score;
                if (best > this.hi) this.hi = best;
                if (this.state === 'playing-online') Online.send({ type: 'gameover' });
                this.state = 'gameover';
            }
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // WIN CHECK
    // ─────────────────────────────────────────────────────────────────────────
    _checkWinLose() {
        if (this.aliens.every(a => !a.alive)) {
            this.level++;
            if (this.score > this.hi) this.hi = this.score;
            Audio.play('levelup'); this._initLevel(); this.px = W/2;
            this._flash(`NIVEL ${this.level}`);
        }
    },

    _checkWinLoseOnline() {
        if (this.aliens.every(a => !a.alive)) {
            this.level++;
            if (this.score > this.hi) this.hi = this.score;
            Audio.play('levelup'); this._initLevel(); this.px = W/2;
            this._flash(`NIVEL ${this.level}`);
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PARTICLES & FLASH
    // ─────────────────────────────────────────────────────────────────────────
    _spawnParticles(x, y, color, n = 12) {
        for (let i = 0; i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd   = 30 + Math.random() * 100;
            const p = { x, y, color, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, life: 0.6+Math.random()*0.4 };
            p.maxLife = p.life;
            this._particles.push(p);
        }
    },
    _updateParticles(dt) {
        for (const p of this._particles) { p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 80*dt; p.life -= dt; }
        this._particles = this._particles.filter(p => p.life > 0);
    },
    _flash(msg) { this.flashMsg = msg; this.flashTimer = 1.4; },

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER DISPATCHER
    // ─────────────────────────────────────────────────────────────────────────
    render(ctx) {
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = C.grid;
        for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
        this._renderStars(ctx);

        switch (this.state) {
            case 'menu':           this._renderMenu(ctx);          break;
            case 'online-setup':   this._renderOnlineSetup(ctx);   break;
            case 'lobby':          this._renderLobby(ctx);         break;
            case 'playing':        this._renderPlaying(ctx);       break;
            case 'playing-local':  this._renderPlayingLocal(ctx);  break;
            case 'playing-online': this._renderPlayingOnline(ctx); break;
            case 'gameover':       this._renderOver(ctx, false);   break;
            case 'win':            this._renderOver(ctx, true);    break;
        }
    },

    _renderStars(ctx) {
        for (const s of this.stars) {
            ctx.globalAlpha = 0.5 + Math.random() * 0.5;
            ctx.fillStyle = C.star;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MENU RENDER
    // ─────────────────────────────────────────────────────────────────────────
    _renderMenu(ctx) {
        ctx.save();
        ctx.shadowColor = C.accent; ctx.shadowBlur = 18;
        Engine.text('SPACE',    W/2, 130, C.accent,   62);
        Engine.text('INVADERS', W/2, 200, '#ffffff', 44);
        ctx.restore();

        const demoY = [250, 288, 326, 364];
        ctx.save();
        ctx.shadowColor = C.ufo; ctx.shadowBlur = 10; ctx.fillStyle = C.ufo;
        const ufoX = W/2-54, ufoY = demoY[0]+12;
        ctx.beginPath(); ctx.ellipse(ufoX, ufoY+4, 16, 6, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ufoX, ufoY-2, 9, 5, 0, Math.PI, 0); ctx.fill();
        ctx.restore();
        Engine.text('= ? MYSTERY', W/2-20, ufoY, C.hud, 15, 'left');

        for (let t = 0; t < 3; t++) {
            ctx.save(); ctx.shadowColor = ALIEN_COLORS[t]; ctx.shadowBlur = 6;
            drawAlien(ctx, t, this.aFrame, W/2-70, demoY[t+1], 32, ALIEN_COLORS[t]);
            ctx.restore();
        }
        const pts = ['= 30 PTS', '= 20 PTS', '= 10 PTS'];
        for (let t = 0; t < 3; t++) Engine.text(pts[t], W/2-20, demoY[t+1]+12, C.hud, 15, 'left');

        drawBtn(ctx, this._btns.solo.label,   this._btns.solo.x,   this._btns.solo.y,   this._btns.solo.w,   this._btns.solo.h,   C.accent, this._hover.solo);
        drawBtn(ctx, this._btns.local.label,  this._btns.local.x,  this._btns.local.y,  this._btns.local.w,  this._btns.local.h,  C.p2,     this._hover.local);
        drawBtn(ctx, this._btns.online.label, this._btns.online.x, this._btns.online.y, this._btns.online.w, this._btns.online.h, C.ufo,    this._hover.online);

        if (this.hi > 0) Engine.text(`MEJOR: ${this.hi}`, W/2, 598, '#555', 13);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ONLINE SETUP RENDER
    // ─────────────────────────────────────────────────────────────────────────
    _renderOnlineSetup(ctx) {
        ctx.save();
        ctx.shadowColor = C.ufo; ctx.shadowBlur = 14;
        Engine.text('MULTIJUGADOR', W/2, 125, C.ufo,     42);
        Engine.text('ONLINE',       W/2, 182, '#ffffff', 30);
        ctx.restore();
        Engine.text('Modo de juego:', W/2, 274, '#777', 13);

        const is1v1 = this._onlineSubMode === '1v1';
        drawBtn(ctx, this._btns.mode1v1.label,  this._btns.mode1v1.x,  this._btns.mode1v1.y,  this._btns.mode1v1.w,  this._btns.mode1v1.h,  C.accent, is1v1  || this._hover.mode1v1);
        drawBtn(ctx, this._btns.modeCoop.label, this._btns.modeCoop.x, this._btns.modeCoop.y, this._btns.modeCoop.w, this._btns.modeCoop.h, C.p2,    !is1v1 || this._hover.modeCoop);

        const desc = is1v1 ? 'Un jugador es el alien · el otro el shooter' : 'Cooperación · misma horda compartida';
        Engine.text(desc, W/2, 360, '#555', 12);

        drawBtn(ctx, this._btns.hostRoom.label,   this._btns.hostRoom.x,   this._btns.hostRoom.y,   this._btns.hostRoom.w,   this._btns.hostRoom.h,   C.accent, this._hover.hostRoom);
        drawBtn(ctx, this._btns.joinRoom.label,   this._btns.joinRoom.x,   this._btns.joinRoom.y,   this._btns.joinRoom.w,   this._btns.joinRoom.h,   C.p2,     this._hover.joinRoom);
        drawBtn(ctx, this._btns.onlineBack.label, this._btns.onlineBack.x, this._btns.onlineBack.y, this._btns.onlineBack.w, this._btns.onlineBack.h, '#666',   this._hover.onlineBack);
    },

    _renderLobby(ctx) {
        ctx.save(); ctx.shadowColor = C.ufo; ctx.shadowBlur = 10;
        Engine.text('CONECTANDO...', W/2, H/2, C.ufo, 28);
        ctx.restore();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // GAME RENDERS
    // ─────────────────────────────────────────────────────────────────────────
    _renderPlaying(ctx) {
        this._renderHUD(ctx);
        this._renderShields(ctx);
        this._renderAliens(ctx);
        this._renderUFO(ctx);
        this._renderShip(ctx, this.px, this.py, C.player);
        this._renderBullets(ctx, 'solo');
        this._renderParticles(ctx); this._updateParticles(1/60);
        if (this.flashTimer > 0) this._renderFlash(ctx);
        this._renderTouchButtons(ctx);
    },

    _renderPlayingLocal(ctx) {
        this._renderHUDLocal(ctx);
        this._renderShields(ctx);
        // Línea divisoria de zona del alien
        ctx.save();
        ctx.strokeStyle = 'rgba(224,64,251,0.15)';
        ctx.setLineDash([6,6]);
        ctx.beginPath(); ctx.moveTo(0, this.P2_ZONE_BOTTOM); ctx.lineTo(W, this.P2_ZONE_BOTTOM); ctx.stroke();
        ctx.restore();
        // Alien-P2 (jugador)
        this._renderAlienPlayer(ctx, this.p2x, this.p2y, this.p2lives);
        // Shooter P1
        this._renderShip(ctx, this.px, this.py, C.player);
        this._renderBullets(ctx, 'local');
        this._renderParticles(ctx); this._updateParticles(1/60);
        if (this.flashTimer > 0) this._renderFlash(ctx);
        this._renderTouchButtonsLocal(ctx);
    },

    _renderPlayingOnline(ctx) {
        if (this.mode === 'online-coop') {
            this._renderHUDOnlineCoop(ctx);
            this._renderShields(ctx);
            this._renderAliens(ctx);
            this._renderUFO(ctx);
            this._renderShip(ctx, this.px, this.py, C.player);
            this._renderBullets(ctx, 'solo');
        } else {
            // 1v1 online
            this._renderHUDOnline1v1(ctx);
            this._renderShields(ctx);
            if (this.onlinePlayerNum === 1) {
                // Soy shooter: veo al alien remoto arriba
                this._renderAlienPlayer(ctx, this._remoteAlienX, this._remoteAlienY, this._remoteAlienLives);
                this._renderShip(ctx, this.px, this.py, C.player);
                // Balas P1 (suben)
                ctx.save(); ctx.shadowColor = C.bullet; ctx.shadowBlur = 6; ctx.fillStyle = C.bullet;
                for (const b of this.pbullets) ctx.fillRect(b.x-2, b.y-8, 4, 12);
                // Balas del alien remoto (bajan)
                ctx.shadowColor = C.alienP2; ctx.fillStyle = C.alienP2;
                for (const b of this._remoteAlienBullets) { ctx.fillRect(b.x-2, b.y, 4, 10); ctx.fillRect(b.x+2, b.y+3, 4, 4); }
                ctx.restore();
            } else {
                // Soy alien: veo al shooter remoto abajo (invertido visualmente)
                this._renderAlienPlayer(ctx, this.p2x, this.p2y, this.p2lives);
                // Shooter remoto (gris, abajo)
                this._drawShip(ctx, this._remoteAlienX - this.pW/2, H - 50 - this.pH, this.pW, this.pH, C.p2, 0.6);
                // Mis balas (bajan)
                ctx.save(); ctx.shadowColor = C.alienP2; ctx.shadowBlur = 6; ctx.fillStyle = C.alienP2;
                for (const b of this.p2bullets) { ctx.fillRect(b.x-2, b.y, 4, 10); ctx.fillRect(b.x+2, b.y+3, 4, 4); }
                // Balas del shooter remoto (suben)
                ctx.shadowColor = C.p2; ctx.fillStyle = C.p2;
                for (const b of this.aBullets) if (b.fromShooter) ctx.fillRect(b.x-2, b.y-8, 4, 12);
                ctx.restore();
            }
        }
        this._renderParticles(ctx); this._updateParticles(1/60);
        if (this.flashTimer > 0) this._renderFlash(ctx);
        this._renderTouchButtons(ctx);
    },

    _renderFlash(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, this.flashTimer);
        Engine.text(this.flashMsg, W/2, H/2-20, C.accent, 36);
        ctx.restore();
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ALIEN-JUGADOR RENDER
    // Skin cambia según vidas: 4→tipo2(verde), 3→tipo1(naranja), 2→tipo0(rojo), 1→UFO(morado)
    // ─────────────────────────────────────────────────────────────────────────
    _renderAlienPlayer(ctx, x, y, lives) {
        const skin = ALIEN_P2_SKIN(lives);
        const livesCapped = Math.max(1, lives);
        const skinColor = lives >= 4 ? C.alien2 : lives === 3 ? C.alien1 : lives === 2 ? C.alien0 : C.alienP2;

        ctx.save();
        ctx.shadowColor = skinColor; ctx.shadowBlur = 12;

        if (skin === -1) {
            // Última vida: skin UFO
            ctx.fillStyle = skinColor;
            ctx.beginPath(); ctx.ellipse(x, y + this.p2H*0.6, this.p2W*0.6, this.p2H*0.35, 0, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(x, y + this.p2H*0.3, this.p2W*0.35, this.p2H*0.4, 0, Math.PI, 0); ctx.fill();
            Engine.text('!', x, y + this.p2H*0.5, '#fff', 12);
        } else {
            drawAlien(ctx, skin, this.aFrame, x - this.p2W/2, y, this.p2W, skinColor);
        }
        ctx.restore();

        // Barra de vidas
        const barW = this.p2W + 4, barH = 5;
        const barX = x - barW/2, barY = y - 12;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = skinColor;
        ctx.fillRect(barX, barY, barW * (livesCapped / 4), barH);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // HUD VARIANTS
    // ─────────────────────────────────────────────────────────────────────────
    _renderHUD(ctx) {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0,0,W,36); ctx.restore();
        Engine.text(`PUNTOS: ${this.score}`, 8,   18, C.hud,    14, 'left');
        Engine.text(`MEJOR: ${this.hi}`,     W/2, 18, '#666',   14);
        Engine.text(`NIVEL ${this.level}`,   W-8, 18, C.accent, 14, 'right');
        for (let i = 0; i < this.lives; i++) this._drawShip(ctx, 10+i*28, H-22, 20, 12, C.player, 0.7);
    },

    _renderHUDLocal(ctx) {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0,0,W,36); ctx.restore();
        Engine.text(`P1 SHOOTER: ${this.score}`, 8,   18, C.player,  14, 'left');
        Engine.text(`NIVEL ${this.level}`,        W/2, 18, C.accent,  14);
        Engine.text(`ALIEN P2: ${this.p2score}`,  W-8, 18, C.alienP2, 14, 'right');
        // Vidas P1 (shooters)
        for (let i = 0; i < this.lives;   i++) this._drawShip(ctx, 10+i*24,   H-22, 18, 10, C.player, 0.7);
        // Vidas P2 alien (corazones)
        for (let i = 0; i < this.p2lives; i++) {
            const skinColor = this.p2lives >= 4 ? C.alien2 : this.p2lives === 3 ? C.alien1 : this.p2lives === 2 ? C.alien0 : C.alienP2;
            ctx.save(); ctx.fillStyle = skinColor; ctx.globalAlpha = 0.8;
            ctx.beginPath(); ctx.arc(W-14-i*22, H-16, 6, 0, Math.PI*2); ctx.fill(); ctx.restore();
        }
        if (!navigator.maxTouchPoints) {
            Engine.text('P1: ← → Espacio  ·  P2: WASD+E mover/disparar', W/2, H-22, '#444', 11);
        }
    },

    _renderHUDOnlineCoop(ctx) {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0,0,W,36); ctx.restore();
        const myLabel = this.onlinePlayerNum === 1 ? 'P1' : 'P2';
        Engine.text(`${myLabel}: ${this.score}`,        8,   18, C.player, 13, 'left');
        Engine.text(`NV ${this.level}`,                 W/2, 18, C.accent, 13);
        Engine.text(`RIVAL: ${this.rivalScore}`,        W-8, 18, C.p2,     13, 'right');
        for (let i = 0; i < this.lives; i++) this._drawShip(ctx, 10+i*28, H-22, 20, 12, C.player, 0.7);
        for (let i = 0; i < this.rivalLives; i++) {
            ctx.save(); ctx.fillStyle = C.p2; ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(W-12-i*16, H-16, 5, 0, Math.PI*2); ctx.fill(); ctx.restore();
        }
    },

    _renderHUDOnline1v1(ctx) {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0,0,W,36); ctx.restore();
        const myRole = this.onlinePlayerNum === 1 ? 'SHOOTER' : 'ALIEN';
        Engine.text(`${myRole}: ${this.onlinePlayerNum === 1 ? this.score : this.p2score}`, 8, 18, C.player, 13, 'left');
        Engine.text('1v1', W/2, 18, C.accent, 13);
        Engine.text(`RIVAL: ${this.rivalScore}`, W-8, 18, C.p2, 13, 'right');
        // Vidas propias
        if (this.onlinePlayerNum === 1) {
            for (let i = 0; i < this.lives; i++) this._drawShip(ctx, 10+i*28, H-22, 20, 12, C.player, 0.7);
        } else {
            const sc = ALIEN_P2_SKIN(this.p2lives) >= 0 ? (this.p2lives >= 4 ? C.alien2 : this.p2lives === 3 ? C.alien1 : C.alien0) : C.alienP2;
            for (let i = 0; i < this.p2lives; i++) {
                ctx.save(); ctx.fillStyle = sc; ctx.globalAlpha = 0.8;
                ctx.beginPath(); ctx.arc(10+i*22, H-16, 6, 0, Math.PI*2); ctx.fill(); ctx.restore();
            }
        }
        // Vidas del rival
        for (let i = 0; i < this.rivalLives; i++) {
            ctx.save(); ctx.fillStyle = C.p2; ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(W-12-i*18, H-16, 6, 0, Math.PI*2); ctx.fill(); ctx.restore();
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DRAW HELPERS
    // ─────────────────────────────────────────────────────────────────────────
    _renderShip(ctx, px, py, color) {
        this._drawShip(ctx, px - this.pW/2, py - this.pH, this.pW, this.pH, color, 1);
    },

    _drawShip(ctx, x, y, w, h, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha; ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.fillStyle = color;
        ctx.fillRect(x + w*0.25, y + h*0.3,  w*0.5,  h*0.7);
        ctx.fillRect(x,          y + h*0.55, w,       h*0.45);
        ctx.fillRect(x + w*0.43, y,          w*0.14,  h*0.35);
        ctx.restore();
    },

    _renderAliens(ctx) {
        for (const a of this.aliens) {
            if (!a.alive) continue;
            ctx.save(); ctx.shadowColor = ALIEN_COLORS[a.type]; ctx.shadowBlur = 6;
            drawAlien(ctx, a.type, this.aFrame, a.x, a.y, a.w, ALIEN_COLORS[a.type]);
            ctx.restore();
        }
    },

    _renderUFO(ctx) {
        if (!this.ufo) return;
        const u = this.ufo;
        ctx.save(); ctx.shadowColor = C.ufo; ctx.shadowBlur = 12; ctx.fillStyle = C.ufo;
        ctx.beginPath(); ctx.ellipse(u.x, u.y+4, 22, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(u.x, u.y-2, 12, 7, 0, Math.PI, 0); ctx.fill();
        ctx.restore();
        Engine.text('?', u.x, u.y+3, '#fff', 10);
    },

    _renderBullets(ctx, who) {
        ctx.save();
        ctx.shadowColor = C.bullet; ctx.shadowBlur = 6; ctx.fillStyle = C.bullet;
        for (const b of this.pbullets) ctx.fillRect(b.x-2, b.y-8, 4, 12);
        if (who === 'local') {
            // Bombas del alien-P2 (bajan)
            ctx.shadowColor = C.alienP2; ctx.shadowBlur = 6; ctx.fillStyle = C.alienP2;
            for (const b of this.p2bullets) { ctx.fillRect(b.x-2, b.y, 4, 10); ctx.fillRect(b.x+2, b.y+3, 4, 4); }
        }
        ctx.shadowColor = C.ufoBomb; ctx.shadowBlur = 6; ctx.fillStyle = C.ufoBomb;
        for (const b of this.aBullets) {
            ctx.fillRect(b.x-2, b.y,   4, 10);
            ctx.fillRect(b.x+2, b.y+3, 4,  4);
            ctx.fillRect(b.x-4, b.y+6, 4,  4);
        }
        ctx.restore();
    },

    _renderShields(ctx) {
        for (const sh of this.shields) {
            if (sh.hp <= 0) continue;
            ctx.save(); ctx.globalAlpha = sh.hp / 3;
            ctx.fillStyle = C.shield; ctx.shadowColor = C.shield; ctx.shadowBlur = 4;
            ctx.fillRect(sh.x, sh.y, sh.sz, sh.sz);
            ctx.restore();
        }
    },

    _renderParticles(ctx) {
        for (const p of this._particles) {
            ctx.save(); ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // GAME OVER RENDER
    // ─────────────────────────────────────────────────────────────────────────
    _renderOver(ctx, win) {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H); ctx.restore();

        let title, color;
        if (this.mode === 'online-1v1') {
            const myScore = this.onlinePlayerNum === 1 ? this.score : this.p2score;
            const iWon = myScore > this.rivalScore || this.rivalLives <= 0;
            title = iWon ? '¡VICTORIA!' : 'DERROTA';
            color = iWon ? '#76ff03' : '#ff4081';
        } else if (this.mode === 'local') {
            // P1 gana si: eliminó al alien (p2lives=0) o tiene más puntos
            // P2 gana si: llegó abajo o el shooter tiene 0 vidas o más puntos
            if (this.lives > 0 && this.p2lives <= 0)    { title = '¡P1 GANA!';  color = C.player; }
            else if (this.p2lives > 0 && this.lives <= 0) { title = '¡ALIEN P2!'; color = C.alienP2; }
            else if (this.score > this.p2score)          { title = '¡P1 GANA!';  color = C.player; }
            else if (this.p2score > this.score)          { title = '¡ALIEN P2!'; color = C.alienP2; }
            else                                          { title = '¡EMPATE!';   color = C.hud; }
        } else if (this.mode === 'online-coop') {
            // CO-OP: gana quien más puntos tiene
            const iWon = this.score >= this.rivalScore;
            title = iWon ? '¡VICTORIA!' : 'DERROTA';
            color = iWon ? '#76ff03' : '#ff4081';
        } else {
            title = win ? '¡VICTORIA!' : 'GAME OVER';
            color = win ? '#76ff03' : '#ff4081';
        }

        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 20;
        Engine.text(title, W/2, H/2-70, color, 46);
        ctx.restore();

        if (this.mode === 'local') {
            Engine.text(`SHOOTER P1: ${this.score}   ALIEN P2: ${this.p2score}`, W/2, H/2-10, C.hud, 18);
        } else if (this.mode === 'online-1v1') {
            const myScore = this.onlinePlayerNum === 1 ? this.score : this.p2score;
            Engine.text(`TÚ: ${myScore}   RIVAL: ${this.rivalScore}`, W/2, H/2-10, C.hud, 20);
        } else if (this.mode === 'online-coop') {
            Engine.text(`TÚ: ${this.score}   RIVAL: ${this.rivalScore}`, W/2, H/2-10, C.hud, 18);
            Engine.text(this.score >= this.rivalScore ? 'Más kills que tu compañero' : 'Tu compañero anotó más', W/2, H/2+20, '#666', 13);
            Engine.text(`MEJOR: ${this.hi}`, W/2, H/2+40, '#888', 15);
        } else {
            Engine.text(`PUNTUACIÓN: ${this.score}`, W/2, H/2-10, C.hud, 22);
            Engine.text(`MEJOR: ${this.hi}`,         W/2, H/2+25, '#888', 16);
        }

        if (!this._btns.restart) {
            const bw = 220, bh = 50;
            this._btns.restart = { x: W/2-bw/2, y: H/2+60, w: bw, h: bh, label: '▶  MENÚ' };
        }
        drawBtn(ctx, this._btns.restart.label, this._btns.restart.x, this._btns.restart.y,
            this._btns.restart.w, this._btns.restart.h, C.accent, this._hover.restart);
        Engine.text('ESPACIO · ENTER para continuar', W/2, H/2+140, '#444', 13);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // TOUCH BUTTONS
    // ─────────────────────────────────────────────────────────────────────────
    _getTouchBtnLayout() {
        if (!this._touchBtnLayout) {
            const bh = 75, by = H-bh-4, bw = 120;
            // P1 (solo/online/local-p1): izquierda, centro, derecha en franja inferior
            // P2 local: franja superior (invertida para face-to-face)
            this._touchBtnLayout = {
                // P1 controls (bottom)
                left:   { x: 4,           y: by,      w: bw,  h: bh },
                fire:   { x: W/2-65,      y: by,      w: 130, h: bh },
                right:  { x: W-bw-4,      y: by,      w: bw,  h: bh },
                
                // P2 local controls (top, mirrored)
                p2left:  { x: 4,          y: 40,      w: bw,  h: bh }, // screen left = P2 right
                p2fire:  { x: W/2-65,     y: 40,      w: 130, h: bh },
                p2right: { x: W-bw-4,     y: 40,      w: bw,  h: bh }, // screen right = P2 left
                p2down:  { x: W/2-65,     y: 40+bh+4, w: 65,  h: bh }, // screen down = P2 up
                p2up:    { x: W/2,        y: 40+bh+4, w: 65,  h: bh }, // screen up = P2 down
            };
        }
        return this._touchBtnLayout;
    },

    // Solo / Online: botones P1 (shooter) o P2 (alien) según el rol online
    _renderTouchButtons(ctx) {
        if (!navigator.maxTouchPoints) return;
        const L = this._getTouchBtnLayout();
        const drawTB = (btn, label, active, color = C.accent) => {
            if (!btn) return;
            ctx.save();
            ctx.globalAlpha = active ? 0.45 : 0.18;
            ctx.fillStyle = active ? color : '#ffffff';
            ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();
            ctx.globalAlpha = active ? 1 : 0.55;
            ctx.fillStyle = active ? C.bg : '#ffffff';
            ctx.font = "bold 26px 'Courier New', monospace";
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(label, btn.x+btn.w/2, btn.y+btn.h/2);
            ctx.restore();
        };

        // Si soy el alien en online 1v1, mostrar controles direccionales + disparo
        if (this.mode === 'online-1v1' && this.onlinePlayerNum === 2) {
            drawTB(L.left,    '◀', this._touchLeft,  C.alienP2);
            drawTB(L.right,   '▶', this._touchRight, C.alienP2);
            drawTB(L.p2up,    '▲', this._touch2Up,   C.alienP2);
            drawTB(L.p2down,  '▼', this._touch2Down, C.alienP2);
            drawTB(L.fire,    '●', this._touchFire,  C.alienP2);
        } else {
            drawTB(L.left,  '◀', this._touchLeft);
            drawTB(L.fire,  '●', this._touchFire);
            drawTB(L.right, '▶', this._touchRight);
        }
    },

    // Local 1v1: franja P1 abajo + franja P2 arriba
    _renderTouchButtonsLocal(ctx) {
        if (!navigator.maxTouchPoints) return;
        const L = this._getTouchBtnLayout();
        const drawTB = (btn, label, active, color, rotate = false) => {
            if (!btn) return;
            ctx.save();
            ctx.globalAlpha = active ? 0.45 : 0.18;
            ctx.fillStyle = active ? color : '#ffffff';
            ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();
            ctx.globalAlpha = active ? 1 : 0.55;
            ctx.fillStyle = active ? C.bg : '#ffffff';
            ctx.font = "bold 26px 'Courier New', monospace";
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            if (rotate) {
                ctx.translate(btn.x + btn.w/2, btn.y + btn.h/2);
                ctx.rotate(Math.PI);
                ctx.fillText(label, 0, 0);
            } else {
                ctx.fillText(label, btn.x+btn.w/2, btn.y+btn.h/2);
            }
            ctx.restore();
        };

        // P1 (shooter) — cyan — franja inferior
        drawTB(L.left,  '◀', this._touchLeft,  C.player);
        drawTB(L.fire,  '●', this._touchFire,  C.player);
        drawTB(L.right, '▶', this._touchRight, C.player);

        // P2 (alien) — morado — franja superior (rotada 180 para face-to-face)
        drawTB(L.p2left,  '▶', this._touch2Left,  C.alienP2, true);
        drawTB(L.p2right, '◀', this._touch2Right, C.alienP2, true);
        drawTB(L.p2up,    '▼', this._touch2Up,    C.alienP2, true);
        drawTB(L.p2down,  '▲', this._touch2Down,  C.alienP2, true);
        drawTB(L.p2fire,  '●', this._touch2Fire,  C.alienP2, true);

        // Labels
        ctx.save(); ctx.globalAlpha = 0.4;
        Engine.text('P1', L.fire.x + L.fire.w/2, L.fire.y - 10, C.player, 11);
        
        ctx.translate(W/2, L.p2up.y + L.p2up.h + 14);
        ctx.rotate(Math.PI);
        Engine.text('P2', 0, 0, C.alienP2, 11);
        ctx.restore();
    },

    setupTouchButtons(canvas) {
        const self = this;
        const resetAll = () => {
            self._touchLeft = false; self._touchRight = false;
            self._touchFire = false; self._touchFirePressed = false;
            self._touch2Left = false; self._touch2Right = false;
            self._touch2Up = false; self._touch2Down = false;
            self._touch2Fire = false; self._touch2FirePressed = false;
        };
        resetAll();
        const active = {};

        const getBtn = (gx, gy) => {
            const playingStates = ['playing', 'playing-online', 'playing-local'];
            if (!playingStates.includes(self.state)) return null;
            const L = self._getTouchBtnLayout();
            // P1 buttons (siempre disponibles)
            if (hitBtn(gx, gy, L.left))  return 'left';
            if (hitBtn(gx, gy, L.right)) return 'right';
            if (hitBtn(gx, gy, L.fire))  return 'fire';
            // P2 buttons (en local, o en online si soy el alien)
            if (self.state === 'playing-local') {
                if (hitBtn(gx, gy, L.p2left))  return 'p2left';
                if (hitBtn(gx, gy, L.p2right)) return 'p2right';
                if (hitBtn(gx, gy, L.p2up))    return 'p2up';
                if (hitBtn(gx, gy, L.p2down))  return 'p2down';
                if (hitBtn(gx, gy, L.p2fire))  return 'p2fire';
            }
            // En online 1v1 como alien: arriba/abajo usan p2up/p2down del layout
            if (self.state === 'playing-online' && self.mode === 'online-1v1' && self.onlinePlayerNum === 2) {
                if (hitBtn(gx, gy, L.p2up))   return 'p2up';
                if (hitBtn(gx, gy, L.p2down)) return 'p2down';
            }
            return null;
        };

        const press = (btn) => {
            if (btn === 'left')    self._touchLeft  = true;
            if (btn === 'right')   self._touchRight = true;
            if (btn === 'fire')  { self._touchFire  = true; self._touchFirePressed = true; }
            if (btn === 'p2left')  self._touch2Left  = true;
            if (btn === 'p2right') self._touch2Right = true;
            if (btn === 'p2up')    self._touch2Up    = true;
            if (btn === 'p2down')  self._touch2Down  = true;
            if (btn === 'p2fire') { self._touch2Fire = true; self._touch2FirePressed = true; }
        };

        const release = (btn, remaining) => {
            if (btn === 'left'    && !remaining.includes('left'))    self._touchLeft  = false;
            if (btn === 'right'   && !remaining.includes('right'))   self._touchRight = false;
            if (btn === 'fire'    && !remaining.includes('fire'))    self._touchFire  = false;
            if (btn === 'p2left'  && !remaining.includes('p2left'))  self._touch2Left  = false;
            if (btn === 'p2right' && !remaining.includes('p2right')) self._touch2Right = false;
            if (btn === 'p2up'    && !remaining.includes('p2up'))    self._touch2Up    = false;
            if (btn === 'p2down'  && !remaining.includes('p2down'))  self._touch2Down  = false;
            if (btn === 'p2fire'  && !remaining.includes('p2fire'))  self._touch2Fire  = false;
        };

        canvas.addEventListener('touchstart', (e) => {
            for (const t of e.changedTouches) {
                const r = canvas.getBoundingClientRect(), s = Engine._scale || 1;
                const gx = (t.clientX - r.left) / s, gy = (t.clientY - r.top) / s;
                const btn = getBtn(gx, gy);
                if (btn) { active[t.identifier] = btn; press(btn); }
            }
        }, { passive: true });

        canvas.addEventListener('touchend', (e) => {
            for (const t of e.changedTouches) {
                const btn = active[t.identifier];
                if (btn) { delete active[t.identifier]; release(btn, Object.values(active)); }
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            for (const t of e.changedTouches) {
                const r = canvas.getBoundingClientRect(), s = Engine._scale || 1;
                const gx = (t.clientX - r.left) / s, gy = (t.clientY - r.top) / s;
                const oldBtn = active[t.identifier], newBtn = getBtn(gx, gy);
                if (oldBtn !== newBtn) {
                    if (oldBtn) { delete active[t.identifier]; release(oldBtn, Object.values(active)); }
                    if (newBtn) { active[t.identifier] = newBtn; press(newBtn); }
                }
            }
        }, { passive: true });
    },
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
Engine.init('gameCanvas', { width: W, height: H, bg: '#05050f' });
game.setupTouchButtons(Engine.canvas);
Engine.start(game);
