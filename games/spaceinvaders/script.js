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
// Each row: bitmask of 11 bits, top to bottom
const SPRITES = {
    // type 0 – squid (top row, 30 pts)
    0: [
        [0b00100000100, 0b01100011000, 0b11111111110, 0b10111010101, 0b11111111110, 0b00100000100, 0b01000000010, 0b00100000100],
        [0b00100000100, 0b00100000100, 0b11111111110, 0b10111010101, 0b11111111110, 0b01100011000, 0b10000000001, 0b01000000010],
    ],
    // type 1 – crab (mid rows, 20 pts)
    1: [
        [0b00100000100, 0b00100000100, 0b01111111110, 0b11011010110, 0b11111111111, 0b01110111010, 0b10000000001, 0b01000000010],
        [0b00100000100, 0b10100000101, 0b01111111110, 0b11011010110, 0b11111111111, 0b01110111010, 0b01010001010, 0b10000000001],
    ],
    // type 2 – octopus (bottom rows, 10 pts)
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
    // 4×3 grid of 6×6 blocks, with corners cut
    const blocks = [];
    const cols = 6, rows = 4, bsz = 8;
    const ox = cx - (cols * bsz) / 2;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if ((r === 0 && (c === 0 || c === cols - 1))) continue; // cut corners
            blocks.push({ x: ox + c * bsz, y: y + r * bsz, sz: bsz, hp: 3 });
        }
    }
    return blocks;
}

// ── Game object ───────────────────────────────────────────────────────────────
const game = {
    // ── state ──────────────────────────────────────────────────────────────────
    state: 'menu',  // menu | playing | gameover | win
    stars: [],
    
    score: 0,
    hi: 0,
    lives: 3,
    level: 1,
    
    // player
    px: W / 2, py: H - 50,
    pspd: 220,
    pbullets: [],       // { x, y }
    pCooldown: 0,
    pW: 36, pH: 18,
    
    // aliens
    aliens: [],
    aFrame: 0,
    aFrameTimer: 0,
    aFrameInterval: 0.6,
    aDir: 1,           // 1 = right, -1 = left
    aSpeedX: 28,
    aDropAmt: 16,
    aBullets: [],      // { x, y }
    aShootTimer: 0,
    aShootInterval: 1.2,
    
    // ufo
    ufo: null,          // { x, y, dir, hp }
    ufoTimer: 0,
    ufoInterval: 18,
    
    // shields
    shields: [],
    
    // ui
    _btns: {},
    _hover: {},
    flashMsg: '',
    flashTimer: 0,
    
    // mobile touch controls
    _touchLeft: false,
    _touchRight: false,
    _touchFire: false,
    
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
    
    _buildMenu() {
        const bw = 220, bh = 50, cx = W / 2 - bw / 2;
        this._btns.play  = { x: cx, y: 340, w: bw, h: bh, label: '▶  JUGAR' };
    },
    
    // ── start / reset level ───────────────────────────────────────────────────
    _startGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
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
        this.aSpeedX = 28 + (this.level - 1) * 6;
        this.aShootInterval = Math.max(0.5, 1.5 - (this.level - 1) * 0.12);
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
        
        // shields
        this.shields = [];
        const sPositions = [90, 185, 295, 390];
        for (const sx of sPositions) {
            this.shields.push(...makeShield(sx, H - 130));
        }
    },
    
    // ── update ─────────────────────────────────────────────────────────────────
    update(dt) {
        // stars always scroll
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
        // keyboard
        const left  = Input.isDown('ArrowLeft')  || Input.isDown('KeyA');
        const right = Input.isDown('ArrowRight') || Input.isDown('KeyD');
        const fire  = Input.isPressed('Space')   || Input.isPressed('ArrowUp') || Input.isPressed('KeyW');
        
        // touch: left half = move left, right half = move right, tap anywhere = fire
        let tLeft = false, tRight = false, tFire = false;
        const tc = Input.getTouchCount();
        if (tc > 0) {
            for (let i = 0; i < tc; i++) {
                const t = Input.getTouch(i);
                if (!t) continue;
                const gt = Engine.toGame(t.x, t.y);
                if (gt.y > H * 0.7) {
                    // bottom zone: left/right halves
                    if (gt.x < W / 2) tLeft = true; else tRight = true;
                }
            }
        }
        if (Input.isTouchStarted()) {
            const t = Input.getTouch(0);
            if (t) {
                const gt = Engine.toGame(t.x, t.y);
                if (gt.y <= H * 0.7) tFire = true; // tap upper area = fire
            }
        }
        
        if (left || tLeft)  this.px = Math.max(this.pW / 2, this.px - this.pspd * dt);
        if (right || tRight) this.px = Math.min(W - this.pW / 2, this.px + this.pspd * dt);
        
        this.pCooldown -= dt;
        if ((fire || tFire) && this.pCooldown <= 0) {
            this.pbullets.push({ x: this.px, y: this.py - this.pH / 2 - 4 });
            this.pCooldown = 0.25;
            Audio.play('shoot');
        }
    },
    
    _updateAliens(dt) {
        // animate frame
        this.aFrameTimer += dt;
        if (this.aFrameTimer >= this.aFrameInterval) {
            this.aFrameTimer = 0;
            this.aFrame = 1 - this.aFrame;
        }
        
        const alive = this.aliens.filter(a => a.alive);
        if (alive.length === 0) return;
        
        // speed scales with fewer aliens
        const speedMult = 1 + (1 - alive.length / 55) * 2.5;
        const dx = this.aDir * this.aSpeedX * speedMult * dt;
        
        // find edges
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
        
        // alien shoot
        this.aShootTimer -= dt;
        if (this.aShootTimer <= 0) {
            this.aShootTimer = this.aShootInterval * (0.7 + Math.random() * 0.6);
            // pick a random bottom-of-column alien
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
        
        // aliens reaching bottom
        for (const a of this.aliens) {
            if (a.alive && a.y + a.h >= H - 70) {
                this.lives = 0;
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
    
    // ── particles (simple) ────────────────────────────────────────────────────
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
        // bg
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, W, H);
        
        // scanline grid (subtle)
        ctx.fillStyle = C.grid;
        for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
        
        // stars
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
        this._updateParticles(1/60); // drive particle physics here
        
        if (this.flashTimer > 0) {
            const alpha = Math.min(1, this.flashTimer);
            ctx.save();
            ctx.globalAlpha = alpha;
            Engine.text(this.flashMsg, W / 2, H / 2 - 20, C.accent, 36);
            ctx.restore();
        }
        
        // mobile touch hint zones
        this._renderTouchZones(ctx);
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
        // title neon
        ctx.save();
        ctx.shadowColor = C.accent;
        ctx.shadowBlur = 18;
        Engine.text('SPACE', W / 2, 130, C.accent, 62);
        Engine.text('INVADERS', W / 2, 200, '#ffffff', 44);
        ctx.restore();
        
        // demo aliens for decoration
        const types = [0, 1, 2];
        const demoY = [265, 295, 318];
        for (let t = 0; t < 3; t++) {
            for (let i = 0; i < 5; i++) {
                drawAlien(ctx, types[t], this.aFrame, 70 + i * 70 - 16, demoY[t], 32, ALIEN_COLORS[t]);
            }
        }
        
        // score legend
        const pts = ['30 PTS', '20 PTS', '10 PTS'];
        for (let t = 0; t < 3; t++) {
            Engine.text(pts[t], W / 2 + 60, demoY[t] + 12, C.hud, 13);
        }
        
        drawBtn(ctx, this._btns.play.label, this._btns.play.x, this._btns.play.y, this._btns.play.w, this._btns.play.h, C.accent, this._hover.play);
        
        if (this.hi > 0) Engine.text(`MEJOR: ${this.hi}`, W / 2, 430, C.dim.replace('0.55', '0.8'), 16);
        
        // controls hint
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
        
        // lives (draw mini ships)
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
        // body
        ctx.fillRect(x + w * 0.25, y + h * 0.3, w * 0.5, h * 0.7);
        // wings
        ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
        // cannon
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
        // saucer body
        ctx.beginPath();
        ctx.ellipse(u.x, u.y + 4, 22, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // dome
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
            // zigzag bullet
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
    
    _renderTouchZones(ctx) {
        // subtle touch hint at bottom (only if touch device)
        if (!navigator.maxTouchPoints) return;
        ctx.save();
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, H * 0.7, W / 2, H * 0.3);
        ctx.fillRect(W / 2, H * 0.7, W / 2, H * 0.3);
        ctx.globalAlpha = 0.25;
        Engine.text('◀', W / 4, H * 0.85, '#fff', 20);
        Engine.text('▶', W * 3 / 4, H * 0.85, '#fff', 20);
        Engine.text('TAP ARRIBA = DISPARAR', W / 2, H * 0.76, '#fff', 11);
        ctx.restore();
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
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
Engine.init('gameCanvas', { width: W, height: H, bg: '#05050f' });
Engine.start(game);