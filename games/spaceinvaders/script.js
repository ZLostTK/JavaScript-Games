// ─── Space Invaders ───────────────────────────────────────────────────────────
// Logical resolution: 480 × 640

const W = 480, H = 640;

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
    bg:       '#05050f',
    grid:     'rgba(255,255,255,0.03)',
    player:   '#00e5ff',
    playerG:  '#007a8a',
    bullet:   '#00e5ff',
    alien0:   '#ff4081',   // row 0 – top (worth most)
    alien1:   '#ff9800',   // row 1-2
    alien2:   '#76ff03',   // row 3-4
    shield:   '#00bcd4',
    ufo:      '#e040fb',
    ufoBomb:  '#ff1744',
    star:     '#ffffff',
    hud:      '#e0e0e0',
    accent:   '#00e5ff',
    dim:      'rgba(0,0,0,0.55)',
};

// ── Alien sprite data (11×8 pixel grid per alien, 3 types × 2 frames) ───────
const SPRITES = {
    0: [
        [0b00100000100, 0b01100011000, 0b11111111110, 0b10111010101, 0b11111111110, 0b00100000100, 0b01000000010, 0b00100000100],
        [0b00100000100, 0b00100000100, 0b11111111110, 0b10111010101, 0b11111111110, 0b01100011000, 0b10000000001, 0b01000000010],
    ],
    1: [
        [0b00100000100, 0b00100000100, 0b01111111110, 0b11011010110, 0b11111111111, 0b01110111010, 0b10000000001, 0b01000000010],
        [0b00100000100, 0b10100000101, 0b01111111110, 0b11011010110, 0b11111111111, 0b01110111010, 0b01010001010, 0b10000000001],
    ],
    2: [
        [0b00111100000, 0b01111111100, 0b11011011010, 0b11111111110, 0b01001001010, 0b10111111101, 0b10100000101, 0b01011101010],
        [0b00111100000, 0b01111111100, 0b11011011010, 0b11111111110, 0b01001001010, 0b10111111101, 0b10100000101, 0b01000000010],
    ],
};

const ALIEN_SCORES = [30, 20, 10];
const ALIEN_COLORS = [C.alien0, C.alien1, C.alien2];

// ── Button helpers ────────────────────────────────────────────────────────────
function drawBtn(ctx, label, x, y, w, h, accent, hover) {
    ctx.save();
    const r = 8;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
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

// ── Stars background ──────────────────────────────────────────────────────────
function makeStars(n) {
    const s = [];
    for (let i = 0; i < n; i++) {
        s.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + 0.3, spd: Math.random() * 8 + 4 });
    }
    return s;
}

// ── Draw alien sprite ─────────────────────────────────────────────────────────
function drawAlien(ctx, type, frame, x, y, size, color) {
    const rows = SPRITES[type][frame];
    const px = size / 11;
    ctx.fillStyle = color;
    for (let row = 0; row < rows.length; row++) {
        const bits = rows[row];
        for (let col = 0; col < 11; col++) {
            if (bits & (1 << (10 - col))) {
                ctx.fillRect(
                    x + col * px,
                    y + row * px,
                    Math.ceil(px),
                    Math.ceil(px)
                );
            }
        }
    }
}

// ── Shield blocks ─────────────────────────────────────────────────────────────
function makeShield(cx, y) {
    const blocks = [];
    const cols = 6, rows = 4, bsz = 8;
    const ox = cx - (cols * bsz) / 2;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if ((r === 0 && (c === 0 || c === cols - 1))) continue;
            blocks.push({ x: ox + c * bsz, y: y + r * bsz, sz: bsz, hp: 3 });
        }
    }
    return blocks;
}

// ── Game object ───────────────────────────────────────────────────────────────
const game = {
    state: 'menu',
    stars: [],

    score: 0,
    hi: 0,
    lives: 3,
    level: 1,

    // player
    px: W / 2, py: H - 50,
    pspd: 220,
    pbullets: [],
    pCooldown: 0,
    pW: 36, pH: 18,

    // aliens
    aliens: [],
    aFrame: 0,
    aFrameTimer: 0,
    aFrameInterval: 0.6,
    aDir: 1,
    aSpeedX: 20,          // FIX #2: reduced from 28 for more comfortable level 1
    aDropAmt: 16,
    aBullets: [],
    aShootTimer: 0,
    aShootInterval: 1.8,  // FIX #2: increased from 1.2 to give more reaction time

    // ufo
    ufo: null,
    ufoTimer: 0,
    ufoInterval: 18,

    // shields
    shields: [],

    // ui
    _btns: {},
    _hover: {},
    flashMsg: '',
    flashTimer: 0,

    // ── init ───────────────────────────────────────────────────────────────────
    init() {
        this.stars = makeStars(80);
        this._buildMenu();
        this._synthSounds();
    },

    _synthSounds() {
        Audio.synth('shoot',    'square', 880,  0.08, 0.15);
        Audio.synth('hit',      'noise',  200,  0.12, 0.3);
        Audio.synth('explode',  'noise',  80,   0.35, 0.5);
        Audio.synth('ufo',      'square', 440,  0.5,  0.2, 220);
        Audio.synth('die',      'saw',    200,  0.4,  0.4, 50);
        Audio.synth('levelup',  'sine',   660,  0.4,  0.3, 1320);
    },

    // FIX #1: _buildMenu resets restart button so it doesn't bleed across states
    _buildMenu() {
        const bw = 220, bh = 50, cx = W / 2 - bw / 2;
        this._btns.play    = { x: cx, y: 420, w: bw, h: bh, label: '▶  JUGAR' };
        this._btns.restart = null; // reset so gameover btn doesn't persist in menu
        this._hover        = {};
    },

    // ── start / reset level ───────────────────────────────────────────────────
    _startGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this._btns.restart = null; // FIX #1: always clear restart btn on new game
        this._hover = {};
        this._initLevel();
        this.state = 'playing';
    },

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
                    w: aw, h: ah,
                    type,
                    alive: true,
                });
            }
        }

        this.aDir = 1;
        // FIX #2: gentler base speed + scaling so level 1 is survivable
        this.aSpeedX = 20 + (this.level - 1) * 5;
        this.aShootInterval = Math.max(0.6, 1.8 - (this.level - 1) * 0.12);
        this.aFrame = 0;
        this.aFrameTimer = 0;
        this.aFrameInterval = Math.max(0.2, 0.6 - (this.level - 1) * 0.04);

        this.pbullets = [];
        this.aBullets = [];
        this.ufo = null;
        this.ufoTimer = 0;
        this.ufoInterval = 15;
        this.pCooldown = 0;

        this.px = W / 2;
        this.py = H - 50;

        this.shields = [];
        const sPositions = [90, 185, 295, 390];
        for (const sx of sPositions) {
            this.shields.push(...makeShield(sx, H - 130));
        }
    },

    // ── update ─────────────────────────────────────────────────────────────────
    update(dt) {
        for (const s of this.stars) {
            s.y += s.spd * dt;
            if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
        }

        if (this.state === 'menu')     { this._updateMenu(dt); return; }
        if (this.state === 'gameover') { this._updateOver(dt); return; }
        if (this.state === 'win')      { this._updateOver(dt); return; }

        this._updatePlayer(dt);
        this._updateAliens(dt);
        this._updateBullets(dt);
        this._updateUFO(dt);
        this._updateCollisions();
        this._checkWinLose();

        if (this.flashTimer > 0) this.flashTimer -= dt;
    },

    _updateMenu(dt) {
        const m = Input.getMouse();
        const gm = Engine.toGame(m.x, m.y);
        // FIX #1: only check play button, not restart (which may linger from prev game)
        this._hover.play = hitBtn(gm.x, gm.y, this._btns.play);

        if (Input.isMousePressed()) {
            if (this._hover.play) this._startGame();
        }
        if (Input.isTouchStarted()) {
            const t = Input.getTouch(0);
            if (t) {
                const gt = Engine.toGame(t.x, t.y);
                if (hitBtn(gt.x, gt.y, this._btns.play)) this._startGame();
            }
        }
    },

    _updateOver(dt) {
        if (!this._btns.restart) {
            const bw = 220, bh = 50;
            this._btns.restart = { x: W/2 - bw/2, y: H/2 + 60, w: bw, h: bh, label: '▶  REINICIAR' };
        }
        const m = Input.getMouse();
        const gm = Engine.toGame(m.x, m.y);
        this._hover.restart = hitBtn(gm.x, gm.y, this._btns.restart);

        if (Input.isMousePressed() && this._hover.restart) { this._btns.restart = null; this._startGame(); }
        if (Input.isTouchStarted()) {
            const t = Input.getTouch(0);
            if (t) {
                const gt = Engine.toGame(t.x, t.y);
                if (this._btns.restart && hitBtn(gt.x, gt.y, this._btns.restart)) { this._btns.restart = null; this._startGame(); }
            }
        }
        if (Input.isPressed('Space') || Input.isPressed('Enter')) { this._btns.restart = null; this._startGame(); }
    },

    _updatePlayer(dt) {
        const left  = Input.isDown('ArrowLeft')  || Input.isDown('KeyA');
        const right = Input.isDown('ArrowRight') || Input.isDown('KeyD');
        const fire  = Input.isPressed('Space')   || Input.isPressed('ArrowUp') || Input.isPressed('KeyW');

        // FIX #4: dedicated touch buttons (left / right / fire) tracked in game state
        const tLeft  = this._touchLeft;
        const tRight = this._touchRight;
        const tFire  = this._touchFirePressed;
        this._touchFirePressed = false; // consume single press

        if (left || tLeft)   this.px = Math.max(this.pW / 2, this.px - this.pspd * dt);
        if (right || tRight) this.px = Math.min(W - this.pW / 2, this.px + this.pspd * dt);

        this.pCooldown -= dt;
        if ((fire || tFire) && this.pCooldown <= 0) {
            this.pbullets.push({ x: this.px, y: this.py - this.pH / 2 - 4 });
            this.pCooldown = 0.25;
            Audio.play('shoot');
        }
    },

    _updateAliens(dt) {
        this.aFrameTimer += dt;
        if (this.aFrameTimer >= this.aFrameInterval) {
            this.aFrameTimer = 0;
            this.aFrame = 1 - this.aFrame;
        }

        const alive = this.aliens.filter(a => a.alive);
        if (alive.length === 0) return;

        // FIX #2: speed multiplier starts gentler (cap at 2x instead of 3.5x)
        const speedMult = 1 + (1 - alive.length / 55) * 1.8;
        const dx = this.aDir * this.aSpeedX * speedMult * dt;

        let minX = Infinity, maxX = -Infinity;
        for (const a of alive) {
            if (a.x < minX) minX = a.x;
            if (a.x + a.w > maxX) maxX = a.x + a.w;
        }

        let drop = false;
        if (maxX + dx > W - 8) { drop = true; this.aDir = -1; }
        if (minX + dx < 8)     { drop = true; this.aDir = 1; }

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
            const shooter = shooters[Math.floor(Math.random() * shooters.length)];
            if (shooter) {
                this.aBullets.push({ x: shooter.x + shooter.w / 2, y: shooter.y + shooter.h });
            }
        }
    },

    _updateBullets(dt) {
        const pspd = 420, aspd = 200;

        for (const b of this.pbullets) b.y -= pspd * dt;
        for (const b of this.aBullets) b.y += aspd * dt;

        this.pbullets = this.pbullets.filter(b => b.y > -10);
        this.aBullets = this.aBullets.filter(b => b.y < H + 10);
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

    _updateCollisions() {
        // player bullets vs aliens
        for (const b of this.pbullets) {
            for (const a of this.aliens) {
                if (!a.alive) continue;
                if (b.x > a.x && b.x < a.x + a.w && b.y > a.y && b.y < a.y + a.h) {
                    a.alive = false;
                    b.y = -9999;
                    this.score += ALIEN_SCORES[a.type];
                    Audio.play('hit');
                    this._spawnParticles(a.x + a.w / 2, a.y + a.h / 2, ALIEN_COLORS[a.type]);
                }
            }

            // player bullets vs UFO
            if (this.ufo) {
                const u = this.ufo;
                if (b.x > u.x - 20 && b.x < u.x + 20 && b.y > u.y - 8 && b.y < u.y + 8) {
                    const bonus = (Math.floor(Math.random() * 6) + 1) * 50;
                    this.score += bonus;
                    this._flash(`+${bonus}!`);
                    this.ufo = null;
                    b.y = -9999;
                    Audio.play('explode');
                }
            }

            // player bullets vs shields
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x + sh.sz && b.y > sh.y && b.y < sh.y + sh.sz) {
                    sh.hp--;
                    b.y = -9999;
                }
            }
        }

        // alien bullets vs player
        for (const b of this.aBullets) {
            if (Math.abs(b.x - this.px) < this.pW / 2 && b.y > this.py - this.pH && b.y < this.py + 4) {
                b.y = 9999;
                this._playerHit();
            }

            // alien bullets vs shields
            for (const sh of this.shields) {
                if (sh.hp <= 0) continue;
                if (b.x > sh.x && b.x < sh.x + sh.sz && b.y > sh.y && b.y < sh.y + sh.sz) {
                    sh.hp--;
                    b.y = 9999;
                }
            }
        }

        // FIX #3: aliens reaching bottom now correctly triggers game over
        for (const a of this.aliens) {
            if (a.alive && a.y + a.h >= H - 70) {
                // Call _playerHit repeatedly until lives = 0, or just set state directly
                if (this.score > this.hi) this.hi = this.score;
                this.state = 'gameover';
                Audio.play('explode');
                return; // stop checking
            }
        }
    },

    _playerHit() {
        this.lives--;
        Audio.play('die');
        this._spawnParticles(this.px, this.py, C.player, 20);
        if (this.lives <= 0) {
            this.state = 'gameover';
            if (this.score > this.hi) this.hi = this.score;
        }
    },

    _checkWinLose() {
        const alive = this.aliens.filter(a => a.alive);
        if (alive.length === 0) {
            this.level++;
            if (this.score > this.hi) this.hi = this.score;
            Audio.play('levelup');
            this._initLevel();
            this._flash(`NIVEL ${this.level}`);
        }
    },

    // ── particles ─────────────────────────────────────────────────────────────
    _particles: [],
    _spawnParticles(x, y, color, n = 12) {
        for (let i = 0; i < n; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 30 + Math.random() * 100;
            this._particles.push({
                x, y, color,
                vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
                life: 0.6 + Math.random() * 0.4,
                maxLife: 0,
            });
            this._particles[this._particles.length - 1].maxLife = this._particles[this._particles.length - 1].life;
        }
    },
    _updateParticles(dt) {
        for (const p of this._particles) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 80 * dt;
            p.life -= dt;
        }
        this._particles = this._particles.filter(p => p.life > 0);
    },

    _flash(msg) {
        this.flashMsg = msg;
        this.flashTimer = 1.4;
    },

    // ── render ─────────────────────────────────────────────────────────────────
    render(ctx) {
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = C.grid;
        for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);

        this._renderStars(ctx);

        if (this.state === 'menu')     { this._renderMenu(ctx); return; }
        if (this.state === 'gameover') { this._renderOver(ctx, false); return; }
        if (this.state === 'win')      { this._renderOver(ctx, true); return; }

        this._renderHUD(ctx);
        this._renderShields(ctx);
        this._renderAliens(ctx);
        this._renderUFO(ctx);
        this._renderPlayer(ctx);
        this._renderBullets(ctx);
        this._renderParticles(ctx);
        this._updateParticles(1/60);

        if (this.flashTimer > 0) {
            const alpha = Math.min(1, this.flashTimer);
            ctx.save();
            ctx.globalAlpha = alpha;
            Engine.text(this.flashMsg, W / 2, H / 2 - 20, C.accent, 36);
            ctx.restore();
        }

        // FIX #4: render proper touch control buttons
        this._renderTouchButtons(ctx);
    },

    _renderStars(ctx) {
        for (const s of this.stars) {
            ctx.globalAlpha = 0.5 + Math.random() * 0.5;
            ctx.fillStyle = C.star;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    },

    _renderMenu(ctx) {
        ctx.save();
        ctx.shadowColor = C.accent;
        ctx.shadowBlur = 18;
        Engine.text('SPACE', W / 2, 130, C.accent, 62);
        Engine.text('INVADERS', W / 2, 200, '#ffffff', 44);
        ctx.restore();

        // Points table / Scoreboard
        const demoY = [250, 288, 326, 364];
        
        // 1. UFO Row
        ctx.save();
        ctx.shadowColor = C.ufo;
        ctx.shadowBlur = 10;
        ctx.fillStyle = C.ufo;
        const ufoX = W / 2 - 54;
        const ufoY = demoY[0] + 12;
        ctx.beginPath();
        ctx.ellipse(ufoX, ufoY + 4, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(ufoX, ufoY - 2, 9, 5, 0, Math.PI, 0);
        ctx.fill();
        ctx.restore();
        Engine.text('= ? MYSTERY', W / 2 - 20, ufoY, C.hud, 15, 'left');

        // 2. Alien Rows
        const types = [0, 1, 2];
        for (let t = 0; t < 3; t++) {
            ctx.save();
            ctx.shadowColor = ALIEN_COLORS[t];
            ctx.shadowBlur = 6;
            drawAlien(ctx, types[t], this.aFrame, W / 2 - 70, demoY[t + 1], 32, ALIEN_COLORS[t]);
            ctx.restore();
        }

        const pts = ['= 30 PTS', '= 20 PTS', '= 10 PTS'];
        for (let t = 0; t < 3; t++) {
            Engine.text(pts[t], W / 2 - 20, demoY[t + 1] + 12, C.hud, 15, 'left');
        }

        drawBtn(ctx, this._btns.play.label, this._btns.play.x, this._btns.play.y, this._btns.play.w, this._btns.play.h, C.accent, this._hover.play);

        if (this.hi > 0) Engine.text(`MEJOR: ${this.hi}`, W / 2, 500, C.dim.replace('0.55', '0.8'), 16);

        Engine.text('← → Mover   Espacio Disparar', W / 2, H - 30, '#555', 13);
    },

    _renderHUD(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(0, 0, W, 36);
        ctx.restore();

        Engine.text(`PUNTOS: ${this.score}`, 8, 18, C.hud, 14, 'left');
        Engine.text(`MEJOR: ${this.hi}`, W / 2, 18, '#666', 14);
        Engine.text(`NIVEL ${this.level}`, W - 8, 18, C.accent, 14, 'right');

        for (let i = 0; i < this.lives; i++) {
            this._drawShip(ctx, 10 + i * 28, H - 22, 20, 12, C.player, 0.7);
        }
    },

    _renderPlayer(ctx) {
        this._drawShip(ctx, this.px - this.pW / 2, this.py - this.pH, this.pW, this.pH, C.player, 1);
    },

    _drawShip(ctx, x, y, w, h, color, alpha) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.fillRect(x + w * 0.25, y + h * 0.3, w * 0.5, h * 0.7);
        ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
        ctx.fillRect(x + w * 0.43, y, w * 0.14, h * 0.35);
        ctx.restore();
    },

    _renderAliens(ctx) {
        for (const a of this.aliens) {
            if (!a.alive) continue;
            ctx.save();
            ctx.shadowColor = ALIEN_COLORS[a.type];
            ctx.shadowBlur = 6;
            drawAlien(ctx, a.type, this.aFrame, a.x, a.y, a.w, ALIEN_COLORS[a.type]);
            ctx.restore();
        }
    },

    _renderUFO(ctx) {
        if (!this.ufo) return;
        const u = this.ufo;
        ctx.save();
        ctx.shadowColor = C.ufo;
        ctx.shadowBlur = 12;
        ctx.fillStyle = C.ufo;
        ctx.beginPath();
        ctx.ellipse(u.x, u.y + 4, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(u.x, u.y - 2, 12, 7, 0, Math.PI, 0);
        ctx.fill();
        ctx.restore();
        Engine.text('?', u.x, u.y + 3, '#fff', 10);
    },

    _renderBullets(ctx) {
        ctx.save();
        ctx.shadowColor = C.bullet;
        ctx.shadowBlur = 6;
        ctx.fillStyle = C.bullet;
        for (const b of this.pbullets) {
            ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
        }
        ctx.shadowColor = C.ufoBomb;
        ctx.shadowBlur = 6;
        ctx.fillStyle = C.ufoBomb;
        for (const b of this.aBullets) {
            ctx.fillRect(b.x - 2, b.y, 4, 10);
            ctx.fillRect(b.x + 2, b.y + 3, 4, 4);
            ctx.fillRect(b.x - 4, b.y + 6, 4, 4);
        }
        ctx.restore();
    },

    _renderShields(ctx) {
        for (const sh of this.shields) {
            if (sh.hp <= 0) continue;
            const alpha = sh.hp / 3;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = C.shield;
            ctx.shadowColor = C.shield;
            ctx.shadowBlur = 4;
            ctx.fillRect(sh.x, sh.y, sh.sz, sh.sz);
            ctx.restore();
        }
    },

    _renderParticles(ctx) {
        for (const p of this._particles) {
            const alpha = p.life / p.maxLife;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    },

    // FIX #4: proper touch button zones with visual feedback
    // Buttons: [LEFT] [FIRE] [RIGHT] at the bottom bar
    // These are rendered on the canvas; actual touch tracking is via HTML overlay
    _touchBtnLayout: null,
    _getTouchBtnLayout() {
        if (!this._touchBtnLayout) {
            const bh = 80, by = H - bh - 4;
            const bw = 130;
            this._touchBtnLayout = {
                left:  { x: 4,           y: by, w: bw, h: bh },
                fire:  { x: W/2 - 70,    y: by, w: 140, h: bh },
                right: { x: W - bw - 4,  y: by, w: bw, h: bh },
            };
        }
        return this._touchBtnLayout;
    },

    _renderTouchButtons(ctx) {
        if (!navigator.maxTouchPoints) return;
        const L = this._getTouchBtnLayout();

        const drawTouchBtn = (btn, label, active) => {
            ctx.save();
            ctx.globalAlpha = active ? 0.45 : 0.18;
            ctx.fillStyle = active ? C.accent : '#ffffff';
            ctx.beginPath();
            ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
            ctx.fill();
            ctx.globalAlpha = active ? 1 : 0.55;
            ctx.fillStyle = active ? C.bg : '#ffffff';
            ctx.font = "bold 28px 'Courier New', monospace";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, btn.x + btn.w / 2, btn.y + btn.h / 2);
            ctx.restore();
        };

        drawTouchBtn(L.left,  '◀', this._touchLeft);
        drawTouchBtn(L.fire,  '●', this._touchFire);
        drawTouchBtn(L.right, '▶', this._touchRight);
    },

    _renderOver(ctx, win) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();

        const title = win ? '¡VICTORIA!' : 'GAME OVER';
        const color = win ? '#76ff03' : '#ff4081';
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        Engine.text(title, W / 2, H / 2 - 70, color, 46);
        ctx.restore();

        Engine.text(`PUNTUACIÓN: ${this.score}`, W / 2, H / 2 - 10, C.hud, 22);
        Engine.text(`MEJOR: ${this.hi}`,        W / 2, H / 2 + 25, '#888',  16);

        if (!this._btns.restart) {
            const bw = 220, bh = 50;
            this._btns.restart = { x: W/2 - bw/2, y: H/2 + 60, w: bw, h: bh, label: '▶  REINICIAR' };
        }
        drawBtn(ctx, this._btns.restart.label, this._btns.restart.x, this._btns.restart.y, this._btns.restart.w, this._btns.restart.h, C.accent, this._hover.restart);

        Engine.text('ESPACIO · ENTER para reiniciar', W / 2, H / 2 + 140, '#444', 13);
    },

    // ── Touch button setup (called from HTML after Engine.init) ───────────────
    // FIX #4: sets up persistent touch tracking for the 3-button layout
    setupTouchButtons(canvas) {
        const self = this;
        self._touchLeft  = false;
        self._touchRight = false;
        self._touchFire  = false;
        self._touchFirePressed = false;

        const activeTouches = {}; // id -> which button

        const getBtn = (gx, gy) => {
            if (self.state !== 'playing') return null;
            const L = self._getTouchBtnLayout();
            if (hitBtn(gx, gy, L.left))  return 'left';
            if (hitBtn(gx, gy, L.right)) return 'right';
            if (hitBtn(gx, gy, L.fire))  return 'fire';
            return null;
        };

        canvas.addEventListener('touchstart', (e) => {
            for (const t of e.changedTouches) {
                const r = canvas.getBoundingClientRect();
                const s = Engine._scale || 1;
                const gx = (t.clientX - r.left) / s;
                const gy = (t.clientY - r.top) / s;
                const btn = getBtn(gx, gy);
                if (btn) {
                    activeTouches[t.identifier] = btn;
                    if (btn === 'left')  self._touchLeft  = true;
                    if (btn === 'right') self._touchRight = true;
                    if (btn === 'fire') { self._touchFire = true; self._touchFirePressed = true; }
                }
            }
        }, { passive: true });

        canvas.addEventListener('touchend', (e) => {
            for (const t of e.changedTouches) {
                const btn = activeTouches[t.identifier];
                if (btn) {
                    delete activeTouches[t.identifier];
                    // only release if no other touch holds same button
                    const still = Object.values(activeTouches);
                    if (btn === 'left'  && !still.includes('left'))  self._touchLeft  = false;
                    if (btn === 'right' && !still.includes('right')) self._touchRight = false;
                    if (btn === 'fire'  && !still.includes('fire'))  self._touchFire  = false;
                }
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            for (const t of e.changedTouches) {
                const r = canvas.getBoundingClientRect();
                const s = Engine._scale || 1;
                const gx = (t.clientX - r.left) / s;
                const gy = (t.clientY - r.top) / s;
                const oldBtn = activeTouches[t.identifier];
                const newBtn = getBtn(gx, gy);
                if (oldBtn !== newBtn) {
                    // release old
                    if (oldBtn) {
                        delete activeTouches[t.identifier];
                        const still = Object.values(activeTouches);
                        if (oldBtn === 'left'  && !still.includes('left'))  self._touchLeft  = false;
                        if (oldBtn === 'right' && !still.includes('right')) self._touchRight = false;
                        if (oldBtn === 'fire'  && !still.includes('fire'))  self._touchFire  = false;
                    }
                    // press new
                    if (newBtn) {
                        activeTouches[t.identifier] = newBtn;
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
// FIX #4: set up dedicated touch buttons after engine init
game.setupTouchButtons(Engine.canvas);
Engine.start(game);