// ─── Space Invaders ───────────────────────────────────────────────────────────
// Logical resolution : 480 × 640
// Modes              : Solo | Versus Local (1v1) | Online 1v1 | Online Co-op
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
    alien0:   '#ff4081',   // row 0 – top (worth most)
    alien1:   '#ff9800',   // rows 1-2
    alien2:   '#76ff03',   // rows 3-4
    shield:   '#00bcd4',
    ufo:      '#e040fb',
    ufoBomb:  '#ff1744',
    star:     '#ffffff',
    hud:      '#e0e0e0',
    accent:   '#00e5ff',
    dim:      'rgba(0,0,0,0.55)',
};

// ── Alien sprite data (11×8 px bitmask, 3 types × 2 frames) ─────────────────
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
// States:  'menu' | 'online-setup' | 'lobby' |
//          'playing' | 'playing-local' | 'playing-online' |
//          'gameover' | 'win'
// Modes:   'solo' | 'local' | 'online-1v1' | 'online-coop'
// ─────────────────────────────────────────────────────────────────────────────
const game = {
    state:          'menu',
    mode:           'solo',      // 'solo'|'local'|'online-1v1'|'online-coop'
    onlineRole:     null,        // 'host'|'guest'
    _onlineSubMode: '1v1',       // selected in online-setup: '1v1'|'coop'

    stars: [],

    // ── P1 ───────────────────────────────────────────────────────────────────
    score: 0, hi: 0, lives: 3, level: 1,
    px: W/2, py: H-50, pspd: 220,
    pbullets: [], pCooldown: 0, pW: 36, pH: 18,

    // ── P2 (local / online ghost) ─────────────────────────────────────────────
    p2score: 0, p2lives: 3,
    p2x: 3*W/4, p2y: H-50,
    p2bullets: [], p2Cooldown: 0,

    // ── Online rival display ──────────────────────────────────────────────────
    rivalScore: 0, rivalLives: 3,

    // ── Aliens ───────────────────────────────────────────────────────────────
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

    // ── Touch ────────────────────────────────────────────────────────────────
    _touchLeft: false, _touchRight: false, _touchFire: false, _touchFirePressed: false,
    _touchBtnLayout: null,

    // ── Online sync ───────────────────────────────────────────────────────────
    _onlineSyncTimer: 0,

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
        Audio.synth('shoot',   'square', 880,  0.08, 0.15);
        Audio.synth('hit',     'noise',  200,  0.12, 0.3);
        Audio.synth('explode', 'noise',  80,   0.35, 0.5);
        Audio.synth('ufo',     'square', 440,  0.5,  0.2, 220);
        Audio.synth('die',     'saw',    200,  0.4,  0.4, 50);
        Audio.synth('levelup', 'sine',   660,  0.4,  0.3, 1320);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // BUTTON MAPS
    // ─────────────────────────────────────────────────────────────────────────
    _buildMenuBtns() {
        const bw = 244, bh = 54, cx = W/2 - bw/2;
        this._btns = {
            solo:    { x: cx, y: 395, w: bw, h: bh, label: '▶  SOLO' },
            local:   { x: cx, y: 460, w: bw, h: bh, label: '⚔  VERSUS LOCAL' },
            online:  { x: cx, y: 525, w: bw, h: bh, label: '🌐  MULTIJUGADOR' },
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
        // ← Cancelar (inside #online-ui) → go back to online-setup
        document.getElementById('online-back-btn')?.addEventListener('click', () => {
            Online.destroy();
            this._hideOnlineUI();
            this._buildOnlineSetupBtns();
            this.state = 'online-setup';
        });

        // Copy room code to clipboard
        document.getElementById('copy-btn')?.addEventListener('click', () => {
            const code = document.getElementById('room-code-display').textContent;
            navigator.clipboard?.writeText(code).catch(() => {});
            const btn = document.getElementById('copy-btn');
            btn.textContent = '¡Copiado!';
            setTimeout(() => { btn.textContent = 'Copiar código'; }, 1500);
        });

        // Join with code
        document.getElementById('join-btn')?.addEventListener('click', () => {
            const raw = document.getElementById('room-code-input').value.trim().toUpperCase();
            if (raw.length < 4) return;
            document.getElementById('online-status').textContent = 'Conectando...';
            Online.join(raw);
        });

        // Allow Enter on the code input
        document.getElementById('room-code-input')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') document.getElementById('join-btn')?.click();
        });
    },

    _showOnlineUI(view) {
        // view: 'host' | 'join' | null
        document.getElementById('online-ui')?.classList.remove('hidden');
        document.getElementById('host-view')?.classList.add('hidden');
        document.getElementById('join-view')?.classList.add('hidden');
        if (view) document.getElementById(`${view}-view`)?.classList.remove('hidden');
    },

    _hideOnlineUI() {
        document.getElementById('online-ui')?.classList.add('hidden');
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ONLINE CALLBACKS  (registered right before host/join is called)
    // ─────────────────────────────────────────────────────────────────────────
    _setupOnlineCallbacks() {
        // Host: peer server assigned a room code
        Online.on('onHostReady', (code) => {
            document.getElementById('room-code-display').textContent = code;
            document.getElementById('online-status').textContent = 'Esperando rival...';
        });

        // Both: connection established
        Online.on('onConnected', (role) => {
            this.onlineRole = role;
            document.getElementById('online-status').textContent = '¡Conectado! Iniciando...';

            setTimeout(() => {
                this._hideOnlineUI();
                if (role === 'host') {
                    // Host sends game configuration and starts first
                    Online.send({ type: 'game_init', mode: this._onlineSubMode });
                    this._startOnlineGame(role, this._onlineSubMode);
                }
                // Guest waits for the 'game_init' message (handled in onData)
            }, 600);
        });

        // Incoming data from peer
        Online.on('onData', (data) => this._handleOnlineData(data));

        // Peer disconnected
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

        // PeerJS error
        Online.on('onError', (err) => {
            const el = document.getElementById('online-status');
            if (el) el.textContent = `Error: ${err.type || String(err)}`;
        });
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ONLINE DATA HANDLER
    // All coordinates in logical units (never screen pixels)
    // ─────────────────────────────────────────────────────────────────────────
    _handleOnlineData(data) {
        // Game init – received by the guest only
        if (data.type === 'game_init') {
            this._onlineSubMode = data.mode;
            this._hideOnlineUI();
            this._startOnlineGame('guest', data.mode);
            return;
        }

        if (this.state !== 'playing-online') return;

        switch (data.type) {
            // Periodic status sync (score + lives)
            case 'status':
                this.rivalScore = data.score;
                this.rivalLives = data.lives;
                break;

            // Co-op kill: rival destroyed an alien at logical index `idx`
            case 'kill': {
                if (this.mode !== 'online-coop') break;
                const a = this.aliens[data.idx];
                if (a && a.alive) {
                    a.alive = false;
                    this._spawnParticles(a.x + a.w/2, a.y + a.h/2, ALIEN_COLORS[a.type]);
                    // Rival gets the points on their screen; we just remove the alien
                }
                break;
            }

            // Rival is done (died or aliens reached bottom)
            case 'gameover':
                this.rivalLives = 0;
                if (this.mode === 'online-1v1') this._flash('¡RIVAL ELIMINADO!');
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

    _startLocal() {
        this.mode = 'local';
        this.score = 0; this.p2score = 0;
        this.lives = 3; this.p2lives = 3;
        this.level = 1;
        this._btns.restart = null; this._hover = {};
        this._initLevel();
        // P1 left quarter, P2 right quarter
        this.px  = W / 4;     this.py  = H - 50;
        this.p2x = 3 * W / 4; this.p2y = H - 50;
        this.state = 'playing-local';
    },

    _startOnlineGame(role, subMode) {
        this.mode = subMode === 'coop' ? 'online-coop' : 'online-1v1';
        this.onlineRole = role;
        this.score = 0; this.lives = 3; this.level = 1;
        this.rivalScore = 0; this.rivalLives = 3;
        this._btns.restart = null; this._hover = {};
        this._initLevel();
        this.px = W / 2; this.py = H - 50;
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

    // ─────────────────────────────────────────────────────────────────────────
    // UPDATE DISPATCHER
    // ─────────────────────────────────────────────────────────────────────────
    update(dt) {
        // Stars scroll every frame regardless of state
        for (const s of this.stars) {
            s.y += s.spd * dt;
            if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        }

        switch (this.state) {
            case 'menu':           this._updateMenu(dt);         break;
            case 'online-setup':   this._updateOnlineSetup(dt);  break;
            case 'lobby':          /* #online-ui handles input */ break;
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

    // ── Gameover / Win update ─────────────────────────────────────────────────
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

    // ── Playing updates ───────────────────────────────────────────────────────
    _updatePlaying(dt) {
        this._updatePlayerSolo(dt);
        this._updateAliens(dt);
        this._updateBullets(dt, 'solo');
        this._updateUFO(dt);
        this._updateCollisionsSolo();
        this._checkWinLose();
        if (this.flashTimer > 0) this.flashTimer -= dt;
    },

    _updatePlayingLocal(dt) {
        this._updatePlayerLocal(dt);
        this._updateAliens(dt);
        this._updateBullets(dt, 'local');
        this._updateUFO(dt);
        this._updateCollisionsLocal();
        this._checkWinLoseLocal();
        if (this.flashTimer > 0) this.flashTimer -= dt;
    },

    _updatePlayingOnline(dt) {
        this._updatePlayerOnline(dt);
        this._updateAliens(dt);
        this._updateBullets(dt, 'solo');
        this._updateUFO(dt);
        this._updateCollisionsOnline();
        this._checkWinLoseOnline();
        // Periodic status sync
        this._onlineSyncTimer -= dt;
        if (this._onlineSyncTimer <= 0) {
            this._onlineSyncTimer = 2;
            Online.send({ type: 'status', score: this.score, lives: this.lives });
        }
        if (this.flashTimer > 0) this.flashTimer -= dt;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PLAYER UPDATES
    // ─────────────────────────────────────────────────────────────────────────
    _updatePlayerSolo(dt) {
        // Solo / online share same WASD + Arrow key mapping
        const left  = Input.isDown('ArrowLeft')  || Input.isDown('KeyA');
        const right = Input.isDown('ArrowRight') || Input.isDown('KeyD');
        const fire  = Input.isPressed('Space')   || Input.isPressed('ArrowUp') || Input.isPressed('KeyW');
        const tLeft = this._touchLeft, tRight = this._touchRight;
        const tFire = this._touchFirePressed; this._touchFirePressed = false;

        if (left  || tLeft)  this.px = Math.max(this.pW/2,       this.px - this.pspd*dt);
        if (right || tRight) this.px = Math.min(W - this.pW/2,   this.px + this.pspd*dt);

        this.pCooldown -= dt;
        if ((fire || tFire) && this.pCooldown <= 0) {
            this.pbullets.push({ x: this.px, y: this.py - this.pH/2 - 4 });
            this.pCooldown = 0.25;
            Audio.play('shoot');
        }
    },

    _updatePlayerLocal(dt) {
        // P1: Arrow keys + Space
        const l1 = Input.isDown('ArrowLeft'),  r1 = Input.isDown('ArrowRight');
        const f1 = Input.isPressed('Space') || Input.isPressed('ArrowUp');
        if (l1) this.px = Math.max(this.pW/2,     this.px - this.pspd*dt);
        if (r1) this.px = Math.min(W - this.pW/2, this.px + this.pspd*dt);
        this.pCooldown -= dt;
        if (f1 && this.pCooldown <= 0) {
            this.pbullets.push({ x: this.px, y: this.py - this.pH/2 - 4 });
            this.pCooldown = 0.25; Audio.play('shoot');
        }

        // P2: WASD
        const l2 = Input.isDown('KeyA'), r2 = Input.isDown('KeyD');
        const f2 = Input.isPressed('KeyW');
        if (l2) this.p2x = Math.max(this.pW/2,     this.p2x - this.pspd*dt);
        if (r2) this.p2x = Math.min(W - this.pW/2, this.p2x + this.pspd*dt);
        this.p2Cooldown -= dt;
        if (f2 && this.p2Cooldown <= 0) {
            this.p2bullets.push({ x: this.p2x, y: this.p2y - this.pH/2 - 4 });
            this.p2Cooldown = 0.25; Audio.play('shoot');
        }
    },

    _updatePlayerOnline(dt) {
        // Same as solo but also sends shoot actions to peer (logical x coordinate)
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
            // Send logical position (not screen pixels) so rival can mirror visually
            Online.send({ type: 'shoot', x: this.px });
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ALIENS, BULLETS, UFO
    // ─────────────────────────────────────────────────────────────────────────
    _updateAliens(dt) {
        this.aFrameTimer += dt;
        if (this.aFrameTimer >= this.aFrameInterval) {
            this.aFrameTimer = 0; this.aFrame = 1 - this.aFrame;
        }

        const alive = this.aliens.filter(a => a.alive);
        if (alive.length === 0) return;

        const speedMult = 1 + (1 - alive.length / 55) * 1.8;
        const dx = this.aDir * this.aSpeedX * speedMult * dt;

        let minX = Infinity, maxX = -Infinity;
        for (const a of alive) {
            if (a.x < minX) minX = a.x;
            if (a.x + a.w > maxX) maxX = a.x + a.w;
        }

        let drop = false;
        if (maxX + dx > W - 8) { drop = true; this.aDir = -1; }
        if (minX + dx < 8)     { drop = true; this.aDir =  1; }

        for (const a of alive) {
            if (drop) a.y += this.aDropAmt;
            else      a.x += dx;
        }

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
        for (const b of this.pbullets) b.y -= pspd * dt;
        if (who === 'local') for (const b of this.p2bullets) b.y -= pspd * dt;
        for (const b of this.aBullets) b.y += aspd * dt;

        this.pbullets  = this.pbullets.filter(b => b.y > -10);
        if (who === 'local') this.p2bullets = this.p2bullets.filter(b => b.y > -10);
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

    // ── Solo collisions ───────────────────────────────────────────────────────
    _updateCollisionsSolo() {
        const checkBulletAliens = (bullets, scorer) => {
            for (const b of bullets) {
                for (const a of this.aliens) {
                    if (!a.alive) continue;
                    if (b.x > a.x && b.x < a.x+a.w && b.y > a.y && b.y < a.y+a.h) {
                        a.alive = false; b.y = -9999;
                        scorer += ALIEN_SCORES[a.type];
                        Audio.play('hit');
                        this._spawnParticles(a.x+a.w/2, a.y+a.h/2, ALIEN_COLORS[a.type]);
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
                    if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz)
                        { sh.hp--; b.y = -9999; }
                }
            }
            return scorer;
        };

        this.score = checkBulletAliens(this.pbullets, this.score);

        for (const b of this.aBullets) {
            if (Math.abs(b.x-this.px) < this.pW/2 && b.y > this.py-this.pH && b.y < this.py+4)
                { b.y = 9999; this._playerHit(1); }
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz)
                    { sh.hp--; b.y = 9999; }
            }
        }

        for (const a of this.aliens) {
            if (a.alive && a.y+a.h >= H-70) {
                if (this.score > this.hi) this.hi = this.score;
                this.state = 'gameover'; Audio.play('explode'); return;
            }
        }
    },

    // ── Local collisions (two players, shared horde) ──────────────────────────
    _updateCollisionsLocal() {
        const shoot = (bullets, addToP1) => {
            for (const b of bullets) {
                for (let i = 0; i < this.aliens.length; i++) {
                    const a = this.aliens[i];
                    if (!a.alive) continue;
                    if (b.x > a.x && b.x < a.x+a.w && b.y > a.y && b.y < a.y+a.h) {
                        a.alive = false; b.y = -9999;
                        if (addToP1) this.score   += ALIEN_SCORES[a.type];
                        else         this.p2score += ALIEN_SCORES[a.type];
                        Audio.play('hit');
                        this._spawnParticles(a.x+a.w/2, a.y+a.h/2, ALIEN_COLORS[a.type]);
                    }
                }
                if (this.ufo) {
                    const u = this.ufo;
                    if (b.x > u.x-20 && b.x < u.x+20 && b.y > u.y-8 && b.y < u.y+8) {
                        const bonus = (Math.floor(Math.random()*6)+1)*50;
                        if (addToP1) { this.score   += bonus; this._flash(`P1 +${bonus}!`); }
                        else         { this.p2score += bonus; this._flash(`P2 +${bonus}!`); }
                        this.ufo = null; b.y = -9999; Audio.play('explode');
                    }
                }
                for (const sh of this.shields) {
                    if (sh.hp <= 0) continue;
                    if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz)
                        { sh.hp--; b.y = -9999; }
                }
            }
        };

        shoot(this.pbullets, true);
        shoot(this.p2bullets, false);

        for (const b of this.aBullets) {
            if (this.lives > 0 && Math.abs(b.x-this.px) < this.pW/2 && b.y > this.py-this.pH && b.y < this.py+4)
                { b.y = 9999; this._playerHit(1); }
            if (this.p2lives > 0 && Math.abs(b.x-this.p2x) < this.pW/2 && b.y > this.p2y-this.pH && b.y < this.p2y+4)
                { b.y = 9999; this._playerHit(2); }
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz)
                    { sh.hp--; b.y = 9999; }
            }
        }

        for (const a of this.aliens) {
            if (a.alive && a.y+a.h >= H-70) {
                const ms = Math.max(this.score, this.p2score);
                if (ms > this.hi) this.hi = ms;
                this.state = 'gameover'; Audio.play('explode'); return;
            }
        }
    },

    // ── Online collisions ─────────────────────────────────────────────────────
    // 1v1: independent hordes → same as solo, no kill sync needed
    // Co-op: shared horde → send kill index to peer so both remove the same alien
    _updateCollisionsOnline() {
        for (const b of this.pbullets) {
            for (let i = 0; i < this.aliens.length; i++) {
                const a = this.aliens[i];
                if (!a.alive) continue;
                if (b.x > a.x && b.x < a.x+a.w && b.y > a.y && b.y < a.y+a.h) {
                    a.alive = false; b.y = -9999;
                    this.score += ALIEN_SCORES[a.type];
                    Audio.play('hit');
                    this._spawnParticles(a.x+a.w/2, a.y+a.h/2, ALIEN_COLORS[a.type]);
                    // Co-op: sync kill to peer using logical alien index
                    if (this.mode === 'online-coop') Online.send({ type: 'kill', idx: i });
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
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz)
                    { sh.hp--; b.y = -9999; }
            }
        }

        for (const b of this.aBullets) {
            if (Math.abs(b.x-this.px) < this.pW/2 && b.y > this.py-this.pH && b.y < this.py+4)
                { b.y = 9999; this._playerHit(1); }
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x+sh.sz && b.y > sh.y && b.y < sh.y+sh.sz)
                    { sh.hp--; b.y = 9999; }
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
        } else {
            this.p2lives--;
            Audio.play('die');
            this._spawnParticles(this.p2x, this.p2y, C.p2, 20);
            if (this.p2lives <= 0) {
                const best = Math.max(this.score, this.p2score);
                if (best > this.hi) this.hi = best;
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

    _checkWinLoseLocal() {
        if (this.aliens.every(a => !a.alive)) {
            this.level++;
            const ms = Math.max(this.score, this.p2score);
            if (ms > this.hi) this.hi = ms;
            Audio.play('levelup'); this._initLevel();
            this.px = W/4; this.p2x = 3*W/4;
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
        for (const p of this._particles) {
            p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt; p.life -= dt;
        }
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

        // Scoreboard / alien preview
        const demoY = [250, 288, 326, 364];
        ctx.save();
        ctx.shadowColor = C.ufo; ctx.shadowBlur = 10; ctx.fillStyle = C.ufo;
        const ufoX = W/2-54, ufoY = demoY[0]+12;
        ctx.beginPath(); ctx.ellipse(ufoX, ufoY+4, 16, 6, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ufoX, ufoY-2, 9, 5, 0, Math.PI, 0);    ctx.fill();
        ctx.restore();
        Engine.text('= ? MYSTERY', W/2-20, ufoY, C.hud, 15, 'left');

        for (let t = 0; t < 3; t++) {
            ctx.save();
            ctx.shadowColor = ALIEN_COLORS[t]; ctx.shadowBlur = 6;
            drawAlien(ctx, t, this.aFrame, W/2-70, demoY[t+1], 32, ALIEN_COLORS[t]);
            ctx.restore();
        }
        const pts = ['= 30 PTS', '= 20 PTS', '= 10 PTS'];
        for (let t = 0; t < 3; t++) Engine.text(pts[t], W/2-20, demoY[t+1]+12, C.hud, 15, 'left');

        // Mode buttons
        drawBtn(ctx, this._btns.solo.label,   this._btns.solo.x,   this._btns.solo.y,   this._btns.solo.w,   this._btns.solo.h,   C.accent, this._hover.solo);
        drawBtn(ctx, this._btns.local.label,  this._btns.local.x,  this._btns.local.y,  this._btns.local.w,  this._btns.local.h,  C.p2,     this._hover.local);
        drawBtn(ctx, this._btns.online.label, this._btns.online.x, this._btns.online.y, this._btns.online.w, this._btns.online.h, C.ufo,    this._hover.online);

        if (this.hi > 0) Engine.text(`MEJOR: ${this.hi}`, W/2, 598, '#555', 13);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ONLINE SETUP RENDER (canvas sub-screen)
    // ─────────────────────────────────────────────────────────────────────────
    _renderOnlineSetup(ctx) {
        ctx.save();
        ctx.shadowColor = C.ufo; ctx.shadowBlur = 14;
        Engine.text('MULTIJUGADOR', W/2, 125, C.ufo,     42);
        Engine.text('ONLINE',       W/2, 182, '#ffffff', 30);
        ctx.restore();

        Engine.text('Modo de juego:', W/2, 274, '#777', 13);

        const is1v1 = this._onlineSubMode === '1v1';

        // 1v1 toggle (highlighted when selected)
        drawBtn(ctx,
            this._btns.mode1v1.label,
            this._btns.mode1v1.x, this._btns.mode1v1.y,
            this._btns.mode1v1.w, this._btns.mode1v1.h,
            C.accent,
            is1v1 || this._hover.mode1v1
        );
        // Coop toggle
        drawBtn(ctx,
            this._btns.modeCoop.label,
            this._btns.modeCoop.x, this._btns.modeCoop.y,
            this._btns.modeCoop.w, this._btns.modeCoop.h,
            C.p2,
            !is1v1 || this._hover.modeCoop
        );

        // Mode description
        const desc = is1v1
            ? '¿Quién sobrevive más?  Hordas independientes'
            : 'Cooperación · misma horda compartida';
        Engine.text(desc, W/2, 360, '#555', 12);

        drawBtn(ctx, this._btns.hostRoom.label,   this._btns.hostRoom.x,   this._btns.hostRoom.y,   this._btns.hostRoom.w,   this._btns.hostRoom.h,   C.accent, this._hover.hostRoom);
        drawBtn(ctx, this._btns.joinRoom.label,   this._btns.joinRoom.x,   this._btns.joinRoom.y,   this._btns.joinRoom.w,   this._btns.joinRoom.h,   C.p2,     this._hover.joinRoom);
        drawBtn(ctx, this._btns.onlineBack.label, this._btns.onlineBack.x, this._btns.onlineBack.y, this._btns.onlineBack.w, this._btns.onlineBack.h, '#666',   this._hover.onlineBack);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // LOBBY RENDER  (canvas backdrop while #online-ui is shown)
    // ─────────────────────────────────────────────────────────────────────────
    _renderLobby(ctx) {
        ctx.save();
        ctx.shadowColor = C.ufo; ctx.shadowBlur = 10;
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
        this._renderParticles(ctx);
        this._updateParticles(1/60);
        if (this.flashTimer > 0) this._renderFlash(ctx);
        this._renderTouchButtons(ctx);
    },

    _renderPlayingLocal(ctx) {
        this._renderHUDLocal(ctx);
        this._renderShields(ctx);
        this._renderAliens(ctx);
        this._renderUFO(ctx);
        this._renderShip(ctx, this.px,  this.py,  C.player);
        this._renderShip(ctx, this.p2x, this.p2y, C.p2);
        this._renderBullets(ctx, 'local');
        this._renderParticles(ctx);
        this._updateParticles(1/60);
        if (this.flashTimer > 0) this._renderFlash(ctx);
    },

    _renderPlayingOnline(ctx) {
        this._renderHUDOnline(ctx);
        this._renderShields(ctx);
        this._renderAliens(ctx);
        this._renderUFO(ctx);
        this._renderShip(ctx, this.px, this.py, C.player);
        this._renderBullets(ctx, 'solo');
        this._renderParticles(ctx);
        this._updateParticles(1/60);
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
        Engine.text(`P1: ${this.score}`,   8,   18, C.player, 14, 'left');
        Engine.text(`NIVEL ${this.level}`, W/2, 18, C.accent, 14);
        Engine.text(`P2: ${this.p2score}`, W-8, 18, C.p2,     14, 'right');
        // P1 ships (left)
        for (let i = 0; i < this.lives;   i++) this._drawShip(ctx, 10+i*24,   H-22, 18, 10, C.player, 0.7);
        // P2 ships (right, drawn from right edge inward)
        for (let i = 0; i < this.p2lives; i++) this._drawShip(ctx, W-28-i*24, H-22, 18, 10, C.p2,    0.7);
        if (!navigator.maxTouchPoints)
            Engine.text('P1: ← → Espacio  ·  P2: A D W', W/2, H-22, '#444', 11);
    },

    _renderHUDOnline(ctx) {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0,0,W,36); ctx.restore();
        const tag = this.mode === 'online-coop' ? 'CO-OP' : '1v1';
        Engine.text(`${tag} · TÚ: ${this.score}`, 8,   18, C.player, 13, 'left');
        Engine.text(`NV ${this.level}`,            W/2, 18, C.accent, 13);
        Engine.text(`RIVAL: ${this.rivalScore}`,   W-8, 18, C.p2,     13, 'right');
        for (let i = 0; i < this.lives; i++) this._drawShip(ctx, 10+i*28, H-22, 20, 12, C.player, 0.7);
        // Rival lives indicator (dots, right side bottom)
        for (let i = 0; i < this.rivalLives; i++) {
            ctx.save(); ctx.fillStyle = C.p2; ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(W-12-i*16, H-16, 5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
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
        ctx.globalAlpha = alpha;
        ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.fillStyle = color;
        ctx.fillRect(x + w*0.25, y + h*0.3,  w*0.5,  h*0.7);
        ctx.fillRect(x,          y + h*0.55, w,       h*0.45);
        ctx.fillRect(x + w*0.43, y,          w*0.14,  h*0.35);
        ctx.restore();
    },

    _renderAliens(ctx) {
        for (const a of this.aliens) {
            if (!a.alive) continue;
            ctx.save();
            ctx.shadowColor = ALIEN_COLORS[a.type]; ctx.shadowBlur = 6;
            drawAlien(ctx, a.type, this.aFrame, a.x, a.y, a.w, ALIEN_COLORS[a.type]);
            ctx.restore();
        }
    },

    _renderUFO(ctx) {
        if (!this.ufo) return;
        const u = this.ufo;
        ctx.save();
        ctx.shadowColor = C.ufo; ctx.shadowBlur = 12; ctx.fillStyle = C.ufo;
        ctx.beginPath(); ctx.ellipse(u.x, u.y+4, 22, 8, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(u.x, u.y-2, 12, 7, 0, Math.PI, 0);   ctx.fill();
        ctx.restore();
        Engine.text('?', u.x, u.y+3, '#fff', 10);
    },

    _renderBullets(ctx, who) {
        ctx.save();
        ctx.shadowColor = C.bullet; ctx.shadowBlur = 6; ctx.fillStyle = C.bullet;
        for (const b of this.pbullets) ctx.fillRect(b.x-2, b.y-8, 4, 12);
        if (who === 'local') {
            ctx.shadowColor = C.p2; ctx.shadowBlur = 6; ctx.fillStyle = C.p2bullet;
            for (const b of this.p2bullets) ctx.fillRect(b.x-2, b.y-8, 4, 12);
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
            ctx.save();
            ctx.globalAlpha = sh.hp / 3;
            ctx.fillStyle = C.shield; ctx.shadowColor = C.shield; ctx.shadowBlur = 4;
            ctx.fillRect(sh.x, sh.y, sh.sz, sh.sz);
            ctx.restore();
        }
    },

    _renderParticles(ctx) {
        for (const p of this._particles) {
            ctx.save(); ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.fill();
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
            const iWon = this.score > this.rivalScore || this.rivalLives <= 0;
            title = iWon ? '¡VICTORIA!' : 'DERROTA';
            color = iWon ? '#76ff03' : '#ff4081';
        } else if (this.mode === 'local') {
            if      (this.lives > 0 && this.p2lives <= 0) { title = '¡P1 GANA!';  color = C.player; }
            else if (this.p2lives > 0 && this.lives <= 0) { title = '¡P2 GANA!';  color = C.p2; }
            else if (this.score > this.p2score)           { title = '¡P1 GANA!';  color = C.player; }
            else if (this.p2score > this.score)           { title = '¡P2 GANA!';  color = C.p2; }
            else                                           { title = '¡EMPATE!';   color = C.hud; }
        } else {
            title = win ? '¡VICTORIA!' : 'GAME OVER';
            color = win ? '#76ff03' : '#ff4081';
        }

        ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 20;
        Engine.text(title, W/2, H/2-70, color, 46);
        ctx.restore();

        if (this.mode === 'local') {
            Engine.text(`P1: ${this.score}   P2: ${this.p2score}`, W/2, H/2-10, C.hud, 20);
        } else if (this.mode === 'online-1v1') {
            Engine.text(`TÚ: ${this.score}   RIVAL: ${this.rivalScore}`, W/2, H/2-10, C.hud, 20);
        } else if (this.mode === 'online-coop') {
            Engine.text(`PUNTUACIÓN: ${this.score}`, W/2, H/2-10, C.hud, 22);
            Engine.text(`MEJOR: ${this.hi}`,         W/2, H/2+25, '#888', 16);
        } else {
            Engine.text(`PUNTUACIÓN: ${this.score}`, W/2, H/2-10, C.hud, 22);
            Engine.text(`MEJOR: ${this.hi}`,         W/2, H/2+25, '#888', 16);
        }

        if (!this._btns.restart) {
            const bw = 220, bh = 50;
            this._btns.restart = { x: W/2-bw/2, y: H/2+60, w: bw, h: bh, label: '▶  MENÚ' };
        }
        drawBtn(ctx, this._btns.restart.label,
            this._btns.restart.x, this._btns.restart.y,
            this._btns.restart.w, this._btns.restart.h,
            C.accent, this._hover.restart);

        Engine.text('ESPACIO · ENTER para continuar', W/2, H/2+140, '#444', 13);
    },

    // ─────────────────────────────────────────────────────────────────────────
    // TOUCH BUTTONS  (Solo + Online only; local uses keyboard)
    // ─────────────────────────────────────────────────────────────────────────
    _getTouchBtnLayout() {
        if (!this._touchBtnLayout) {
            const bh = 80, by = H-bh-4, bw = 130;
            this._touchBtnLayout = {
                left:  { x: 4,       y: by, w: bw,  h: bh },
                fire:  { x: W/2-70,  y: by, w: 140, h: bh },
                right: { x: W-bw-4,  y: by, w: bw,  h: bh },
            };
        }
        return this._touchBtnLayout;
    },

    _renderTouchButtons(ctx) {
        if (!navigator.maxTouchPoints) return;
        const L = this._getTouchBtnLayout();
        const drawTB = (btn, label, active) => {
            ctx.save();
            ctx.globalAlpha = active ? 0.45 : 0.18;
            ctx.fillStyle = active ? C.accent : '#ffffff';
            ctx.beginPath(); ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10); ctx.fill();
            ctx.globalAlpha = active ? 1 : 0.55;
            ctx.fillStyle = active ? C.bg : '#ffffff';
            ctx.font = "bold 28px 'Courier New', monospace";
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(label, btn.x+btn.w/2, btn.y+btn.h/2);
            ctx.restore();
        };
        drawTB(L.left,  '◀', this._touchLeft);
        drawTB(L.fire,  '●', this._touchFire);
        drawTB(L.right, '▶', this._touchRight);
    },

    setupTouchButtons(canvas) {
        const self = this;
        self._touchLeft = false; self._touchRight = false;
        self._touchFire = false; self._touchFirePressed = false;
        const active = {};

        const getBtn = (gx, gy) => {
            const playingStates = ['playing', 'playing-online'];
            if (!playingStates.includes(self.state)) return null;
            const L = self._getTouchBtnLayout();
            if (hitBtn(gx, gy, L.left))  return 'left';
            if (hitBtn(gx, gy, L.right)) return 'right';
            if (hitBtn(gx, gy, L.fire))  return 'fire';
            return null;
        };

        canvas.addEventListener('touchstart', (e) => {
            for (const t of e.changedTouches) {
                const r = canvas.getBoundingClientRect(), s = Engine._scale || 1;
                const gx = (t.clientX - r.left) / s, gy = (t.clientY - r.top) / s;
                const btn = getBtn(gx, gy);
                if (btn) {
                    active[t.identifier] = btn;
                    if (btn === 'left')  self._touchLeft  = true;
                    if (btn === 'right') self._touchRight = true;
                    if (btn === 'fire') { self._touchFire = true; self._touchFirePressed = true; }
                }
            }
        }, { passive: true });

        canvas.addEventListener('touchend', (e) => {
            for (const t of e.changedTouches) {
                const btn = active[t.identifier];
                if (btn) {
                    delete active[t.identifier];
                    const still = Object.values(active);
                    if (btn === 'left'  && !still.includes('left'))  self._touchLeft  = false;
                    if (btn === 'right' && !still.includes('right')) self._touchRight = false;
                    if (btn === 'fire'  && !still.includes('fire'))  self._touchFire  = false;
                }
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            for (const t of e.changedTouches) {
                const r = canvas.getBoundingClientRect(), s = Engine._scale || 1;
                const gx = (t.clientX - r.left) / s, gy = (t.clientY - r.top) / s;
                const oldBtn = active[t.identifier], newBtn = getBtn(gx, gy);
                if (oldBtn !== newBtn) {
                    if (oldBtn) {
                        delete active[t.identifier];
                        const still = Object.values(active);
                        if (oldBtn === 'left'  && !still.includes('left'))  self._touchLeft  = false;
                        if (oldBtn === 'right' && !still.includes('right')) self._touchRight = false;
                        if (oldBtn === 'fire'  && !still.includes('fire'))  self._touchFire  = false;
                    }
                    if (newBtn) {
                        active[t.identifier] = newBtn;
                        if (newBtn === 'left')  self._touchLeft  = true;
                        if (newBtn === 'right') self._touchRight = true;
                        if (newBtn === 'fire') { self._touchFire = true; self._touchFirePressed = true; }
                    }
                }
            }
        }, { passive: true });
    },
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
Engine.init('gameCanvas', { width: W, height: H, bg: '#05050f' });
game.setupTouchButtons(Engine.canvas);
Engine.start(game);