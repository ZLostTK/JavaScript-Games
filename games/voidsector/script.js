// =============================================================================
//  VOID SECTOR — Space Shooter
//  Responsive, mobile controls, Online 1v1 & Co-op
// =============================================================================

const W = 480, H = 640;
const TAU = Math.PI * 2;

// ── Math utils ────────────────────────────────────────────────────────────────
const rnd    = (a, b) => a + Math.random() * (b - a);
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
const wrap   = (v, m) => ((v % m) + m) % m;
const dist   = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp   = (a, b, t) => a + (b - a) * t;

// ── Mobile UI helpers ─────────────────────────────────────────────────────────
const mobileSkills = document.getElementById('mobile-skills');
const joyZone = document.getElementById('mobile-joystick-zone');
const joyKnob = document.getElementById('mobile-joystick-knob');

let _mobileFirePressed   = false;
let _mobileBombPressed   = false;
let _joyActive           = false;
let _joyVec              = {x:0, y:0};

// Detect touch device
const _isTouchDevice = () => ('ontouchstart' in window || navigator.maxTouchPoints > 0);

function _initMobileButtons() {
    if (!_isTouchDevice()) return;
    mobileSkills.classList.remove('hidden');
    joyZone.classList.remove('hidden');

    const fireBtn   = document.getElementById('btn-fire');
    const bombBtn   = document.getElementById('btn-bomb');
    const shieldBtn = document.getElementById('btn-shield');

    fireBtn.addEventListener('touchstart',  (e) => { _mobileFirePressed = !_mobileFirePressed; fireBtn.classList.toggle('toggled-on'); e.preventDefault(); }, { passive: false });

    bombBtn.addEventListener('touchstart', (e) => { _mobileBombPressed = true;  e.preventDefault(); }, { passive: false });
    bombBtn.addEventListener('touchend',   (e) => { _mobileBombPressed = false; e.preventDefault(); }, { passive: false });

    shieldBtn.addEventListener('touchstart', (e) => { e.preventDefault(); }, { passive: false });

    // Joystick
    const _updateJoy = (touch) => {
        const rect = joyZone.getBoundingClientRect();
        const cx = rect.left + rect.width/2;
        const cy = rect.top + rect.height/2;
        let dx = touch.clientX - cx;
        let dy = touch.clientY - cy;
        const maxR = rect.width/2 - 20;
        const dist = Math.hypot(dx, dy);
        if (dist > maxR) {
            dx = (dx/dist) * maxR;
            dy = (dy/dist) * maxR;
        }
        _joyVec.x = dx / maxR;
        _joyVec.y = dy / maxR;
        if (joyKnob) joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
    };

    joyZone.addEventListener('touchstart', (e) => {
        e.preventDefault(); _joyActive = true;
        _updateJoy(e.changedTouches[0]);
    }, {passive: false});

    joyZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (_joyActive) _updateJoy(e.changedTouches[0]);
    }, {passive: false});

    const endJoy = (e) => {
        e.preventDefault(); _joyActive = false;
        _joyVec.x = 0; _joyVec.y = 0;
        if (joyKnob) joyKnob.style.transform = `translate(0px, 0px)`;
    };
    joyZone.addEventListener('touchend', endJoy);
    joyZone.addEventListener('touchcancel', endJoy);
}

function _updateMobileSkillUI(powers) {
    if (!_isTouchDevice()) return;
    const fireBtn   = document.getElementById('btn-fire');
    const bombBtn   = document.getElementById('btn-bomb');
    const shieldBtn = document.getElementById('btn-shield');
    if (!fireBtn) return;

    const hasLaser  = powers.laser  > 0;
    const hasSpread = powers.spread > 0;
    const hasBomb   = powers.bomb   > 0;
    const hasShield = powers.shield > 0;

    fireBtn.innerHTML = (hasLaser ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>' : hasSpread ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>') + '<span class="skill-label">FUEGO</span>';
    fireBtn.style.setProperty('--skill-color', hasLaser ? '#ff0' : hasSpread ? '#0ff' : '#0ff');
    fireBtn.className = 'skill-btn active';

    bombBtn.className   = 'skill-btn ' + (hasBomb   ? 'active' : 'inactive');
    shieldBtn.className = 'skill-btn ' + (hasShield ? 'active' : 'inactive');
}

function _showMobileControls(show) {
    if (!_isTouchDevice()) return;
    if (show) {
        mobileSkills.classList.remove('hidden');
        joyZone.classList.remove('hidden');
    } else {
        mobileSkills.classList.add('hidden');
        joyZone.classList.add('hidden');
    }
}

// ── Particle pool ─────────────────────────────────────────────────────────────
const _parts = [];
function spawnParts(x, y, n, opts = {}) {
    for (let i = 0; i < n; i++) {
        const a   = opts.angle !== undefined
        ? opts.angle + rnd(-(opts.spread || TAU), opts.spread || TAU)
        : rnd(0, TAU);
        const spd = rnd(opts.minSpd || 20, opts.maxSpd || 120);
        _parts.push({
            x, y, px: x, py: y,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            life: 1,
            decay:  rnd(opts.minDecay || 0.8, opts.maxDecay || 2.5),
            r:      rnd(opts.minR || 1, opts.maxR || 4),
            color:  opts.color || '#fff',
            glow:   opts.glow  || false,
            trail:  opts.trail || false,
        });
    }
}
function updateParts(dt) {
    for (let i = _parts.length - 1; i >= 0; i--) {
        const p = _parts[i];
        p.px = p.x; p.py = p.y;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.97; p.vy *= 0.97;
        p.life -= p.decay * dt;
        if (p.life <= 0) _parts.splice(i, 1);
    }
}
function renderParts(ctx) {
    for (const p of _parts) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        if (p.glow) { ctx.shadowBlur = 8; ctx.shadowColor = p.color; }
        const r = p.r * p.life;
        if (p.trail) {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = Math.max(0.5, r);
            ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
        } else {
            ctx.fillStyle = p.color;
            ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, r), 0, TAU); ctx.fill();
        }
        ctx.restore();
    }
}

// ── Starfield ─────────────────────────────────────────────────────────────────
const _stars = Array.from({ length: 90 }, () => ({
    x: rnd(0, W), y: rnd(0, H),
    r: rnd(0.4, 2), b: rnd(0.2, 0.9), phase: rnd(0, TAU),
}));
function renderStars(ctx) {
    for (const s of _stars) {
        ctx.globalAlpha = s.b * (0.5 + 0.5 * Math.sin(Date.now() * 0.001 + s.phase));
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ── UI helpers ─────────────────────────────────────────────────────────────────
// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
    constructor(x, y, angle, spd = 520, owner = 'player', dmg = 1, color = '#0ff', laser = false) {
        this.x = x; this.y = y;
        this.vx = Math.cos(angle) * spd;
        this.vy = Math.sin(angle) * spd;
        this.owner = owner; this.dmg = dmg; this.color = color;
        this.laser = laser;
        this.life = laser ? 0.1 : 1.6;
        this.dead = false;
        this.px = x; this.py = y;
        this.r = laser ? 4 : 3;
    }
    update(dt) {
        this.px = this.x; this.py = this.y;
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.life -= dt;
        if (this.x < -10 || this.x > W + 10 || this.y < -10 || this.y > H + 10 || this.life <= 0)
            this.dead = true;
    }
    render(ctx) {
        ctx.save();
        ctx.shadowBlur = 10; ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.laser ? 3.5 : 2;
        ctx.beginPath();
        ctx.moveTo(this.px, this.py);
        ctx.lineTo(this.x + this.vx * 0.018, this.y + this.vy * 0.018);
        ctx.stroke();
        ctx.restore();
    }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
class Asteroid {
    constructor(x, y, size = 3, vx, vy) {
        this.x = x; this.y = y; this.size = size;
        this.r = [0, 14, 24, 38][size];
        this.vx = vx ?? rnd(-55, 55);
        this.vy = vy ?? rnd(-55, 55);
        this.rot = 0; this.rotSpd = rnd(-1.4, 1.4);
        this.dead = false; this.hp = size * 2;
        const n = rndInt(7, 12);
        this.shape = Array.from({ length: n }, (_, i) => {
            const a = (i / n) * TAU;
            const l = this.r * rnd(0.6, 1.35);
            return { x: Math.cos(a) * l, y: Math.sin(a) * l };
        });
        this.color = ['#889', '#aab', '#778', '#99a'][rndInt(0, 3)];
        this.score = [0, 100, 50, 20][size];
    }
    update(dt) {
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.rot += this.rotSpd * dt;
    }
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.beginPath();
        ctx.moveTo(this.shape[0].x, this.shape[0].y);
        for (const p of this.shape) ctx.lineTo(p.x, p.y);
        ctx.closePath();
        ctx.strokeStyle = this.color; ctx.lineWidth = 2;
        ctx.shadowBlur = 4; ctx.shadowColor = '#aaf';
        ctx.stroke();
        ctx.restore();
    }
}

// ── Enemy ─────────────────────────────────────────────────────────────────────
class Enemy {
    constructor(x, y, type = 'scout') {
        this.x = x; this.y = y; this.type = type;
        this.vx = 0; this.vy = 0; this.rot = 0;
        this.dead = false; this.fireTimer = rnd(1, 3);
        this.state = 'patrol'; this.stateTimer = 0;
        this.patrolAngle = rnd(0, TAU);
        switch (type) {
            case 'scout':  this.hp = 2; this.r = 14; this.spd = 90;  this.score = 150; this.color = '#f80'; break;
            case 'hunter': this.hp = 5; this.r = 20; this.spd = 65;  this.score = 300; this.color = '#f0f'; break;
            case 'bomber': this.hp = 8; this.r = 26; this.spd = 40;  this.score = 500; this.color = '#f44'; break;
        }
        this.maxHp = this.hp;
    }
    update(dt, target, bullets) {
        const d = dist(this, target);
        this.stateTimer -= dt;
        const ta = Math.atan2(target.y - this.y, target.x - this.x);
        
        if (this.type === 'scout') {
            if (d < 260) this.state = 'chase';
            else if (this.stateTimer < 0) {
                this.state = 'patrol'; this.patrolAngle += rnd(-0.8, 0.8);
                this.stateTimer = rnd(1.5, 3);
            }
        } else if (this.type === 'hunter') {
            this.state = d < 300 ? 'strafe' : 'approach';
        } else {
            this.state = d < 360 ? 'kamikaze' : 'circle';
        }
        
        const lrp = (t) => { this.vx = lerp(this.vx, Math.cos(t) * this.spd, dt * 3); this.vy = lerp(this.vy, Math.sin(t) * this.spd, dt * 3); };
        if      (this.state === 'chase')    lrp(ta);
        else if (this.state === 'patrol')   { this.vx = lerp(this.vx, Math.cos(this.patrolAngle)*this.spd*0.5, dt*2); this.vy = lerp(this.vy, Math.sin(this.patrolAngle)*this.spd*0.5, dt*2); }
        else if (this.state === 'strafe')   lrp(ta + Math.PI / 2);
        else if (this.state === 'approach') { this.vx = lerp(this.vx, Math.cos(ta)*this.spd*0.7, dt*2); this.vy = lerp(this.vy, Math.sin(ta)*this.spd*0.7, dt*2); }
        else if (this.state === 'kamikaze') { this.vx = lerp(this.vx, Math.cos(ta)*this.spd*1.8, dt*4); this.vy = lerp(this.vy, Math.sin(ta)*this.spd*1.8, dt*4); }
        else if (this.state === 'circle')   lrp(ta + Math.PI / 2 + 0.5);
        
        this.x = wrap(this.x + this.vx * dt, W);
        this.y = wrap(this.y + this.vy * dt, H);
        this.rot = Math.atan2(this.vy, this.vx);
        
        this.fireTimer -= dt;
        if (this.fireTimer <= 0 && d < 380) {
            const inac = this.type === 'bomber' ? 0.28 : this.type === 'scout' ? 0.14 : 0.05;
            bullets.push(new Bullet(this.x, this.y, ta + rnd(-inac, inac), 260, 'enemy', 1, '#f84'));
            Audio.play('enemy-shoot', 0.2);
            this.fireTimer = this.type === 'hunter' ? rnd(0.9, 1.6) : rnd(1.6, 3);
        }
    }
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.shadowBlur = 12; ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color; ctx.lineWidth = 2;
        if (this.type === 'scout') {
            ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(-10,-9); ctx.lineTo(-6,0); ctx.lineTo(-10,9); ctx.closePath(); ctx.stroke();
        } else if (this.type === 'hunter') {
            ctx.beginPath(); ctx.moveTo(20,0); ctx.lineTo(0,-13); ctx.lineTo(-14,0); ctx.lineTo(0,13); ctx.closePath(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(7,-6); ctx.lineTo(-7,0); ctx.lineTo(7,6); ctx.stroke();
        } else {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i/6)*TAU, nx = Math.cos(a)*24, ny = Math.sin(a)*24;
                i === 0 ? ctx.moveTo(nx,ny) : ctx.lineTo(nx,ny);
            }
            ctx.closePath(); ctx.stroke();
            ctx.beginPath(); ctx.arc(0,0,9,0,TAU); ctx.stroke();
        }
        ctx.restore();
        if (this.hp < this.maxHp) {
            const bw = this.r * 2;
            ctx.fillStyle = '#300'; ctx.fillRect(this.x - bw/2, this.y - this.r - 9, bw, 4);
            ctx.fillStyle = '#f40'; ctx.fillRect(this.x - bw/2, this.y - this.r - 9, bw*(this.hp/this.maxHp), 4);
        }
    }
}

// ── Power-up ──────────────────────────────────────────────────────────────────
const PU_TYPES  = ['spread','laser','shield','bomb','speed'];
const PU_COLORS = { spread:'#0ff', laser:'#ff0', shield:'#0f0', bomb:'#f44', speed:'#f80' };
const PU_EMOJI  = { spread:'+', laser:'/', shield:'O', bomb:'*', speed:'^' };
class PowerUp {
    constructor(x, y) {
        this.x = x; this.y = y; this.r = 11;
        this.type = PU_TYPES[rndInt(0, PU_TYPES.length - 1)];
        this.dead = false; this.life = 8; this.rot = 0;
    }
    update(dt) { this.life -= dt; this.rot += dt * 2; if (this.life <= 0) this.dead = true; }
    render(ctx) {
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() * 0.005);
        ctx.save();
        ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.strokeStyle = PU_COLORS[this.type]; ctx.lineWidth = 1.5;
        ctx.shadowBlur = 14 * pulse; ctx.shadowColor = PU_COLORS[this.type];
        ctx.beginPath(); ctx.arc(0, 0, this.r * pulse, 0, TAU); ctx.stroke();
        ctx.restore();
        ctx.font = '13px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(PU_EMOJI[this.type], this.x, this.y);
    }
}

// ── Player ────────────────────────────────────────────────────────────────────
class Player {
    constructor(startX, startY, color = '#0ff', isRemote = false) {
        this.x = startX ?? W/2; this.y = startY ?? H/2;
        this.vx = 0; this.vy = 0;
        this.rot = -Math.PI/2; this.r = 13;
        this.thrust = 290; this.drag = 0.97; this.rotSpd = 3;
        this.fireTimer = 0; this.fireRate = 0.18;
        this.hp = 100; this.maxHp = 100;
        this.energy = 100; this.maxEnergy = 100;
        this.invincible = 0; this.lives = 3;
        this.powers = { spread:0, laser:0, shield:0, bomb:0, speed:0 };
        this._nova = false;
        this.color = color;    // '#0ff' for P1, '#f80' for P2 in co-op
        this.isRemote = isRemote; // true = driven by network
    }

    // Called for local player only
    update(dt, bullets, overrides = {}) {
        // overrides: { rotLeft, rotRight, thrust, fire, bomb } from online/mobile
        const rotLeft  = overrides.rotLeft  ?? (Input.isDown('ArrowLeft')  || Input.isDown('KeyA'));
        const rotRight = overrides.rotRight ?? (Input.isDown('ArrowRight') || Input.isDown('KeyD'));

        if (rotLeft)  this.rot -= this.rotSpd * dt;
        if (rotRight) this.rot += this.rotSpd * dt;

        let thrustTouch = false;
        if (_joyActive) {
            const joyAngle = Math.atan2(_joyVec.y, _joyVec.x);
            let da = joyAngle - this.rot;
            while (da >  Math.PI) da -= TAU;
            while (da < -Math.PI) da += TAU;
            this.rot += Math.sign(da) * Math.min(Math.abs(da), this.rotSpd * dt * 5);
            thrustTouch = Math.hypot(_joyVec.x, _joyVec.y) > 0.3;
        } else {
            const touch = Input.getTouch(0);
            if (touch) {
                const tg = Engine.toGame(touch.x, touch.y);
                if (tg.x < W * 0.6) {
                    let da = Math.atan2(tg.y - this.y, tg.x - this.x) - this.rot;
                    while (da >  Math.PI) da -= TAU;
                    while (da < -Math.PI) da += TAU;
                    this.rot += Math.sign(da) * Math.min(Math.abs(da), this.rotSpd * dt * 3);
                    thrustTouch = dist({ x:tg.x, y:tg.y }, this) > 30;
                }
            }
        }

        const spdMul   = this.powers.speed > 0 ? 1.7 : 1;
        const thrusting = overrides.thrust ?? (Input.isDown('ArrowUp') || Input.isDown('KeyW') || thrustTouch);
        if (thrusting) {
            this.vx += Math.cos(this.rot) * this.thrust * spdMul * dt;
            this.vy += Math.sin(this.rot) * this.thrust * spdMul * dt;
            if (Math.random() < 0.45)
                spawnParts(
                    this.x - Math.cos(this.rot)*15, this.y - Math.sin(this.rot)*15, 1,
                    { color: Math.random()<0.5?'#f80':'#ff0', minSpd:30, maxSpd:70,
                      angle: this.rot+Math.PI, spread: 0.45,
                      minDecay:4, maxDecay:7, minR:1.5, maxR:4, glow:true }
                );
        }

        const maxSpd = 340 * spdMul;
        const spd = Math.hypot(this.vx, this.vy);
        if (spd > maxSpd) { this.vx = this.vx/spd*maxSpd; this.vy = this.vy/spd*maxSpd; }
        this.vx *= Math.pow(this.drag, dt*60); this.vy *= Math.pow(this.drag, dt*60);
        this.x = wrap(this.x + this.vx*dt, W);
        this.y = wrap(this.y + this.vy*dt, H);

        // Fire: space, Z, mobile fire btn
        const shooting = overrides.fire ?? (Input.isDown('Space') || Input.isDown('KeyZ') || _mobileFirePressed || Input.getTouchCount() >= 2);
        this.fireTimer -= dt;
        if (shooting && this.fireTimer <= 0 && this.energy > 0) {
            this.fireTimer = this.powers.laser > 0 ? 0.055 : this.fireRate;
            const bx = this.x + Math.cos(this.rot)*16, by = this.y + Math.sin(this.rot)*16;
            if (this.powers.laser > 0) {
                bullets.push(new Bullet(bx, by, this.rot, 860, 'player', 3, '#ff0', true));
                if (game.onlineMode === '1v1') Online.send({ type:'bulletSpawn', x:bx, y:by, angle:this.rot, spd:860, dmg:3, laser:true });
                this.energy = Math.max(0, this.energy - 12*dt*60);
                Audio.play('laser', 0.14);
            } else if (this.powers.spread > 0) {
                for (const da of [-0.27, 0, 0.27]) {
                    bullets.push(new Bullet(bx, by, this.rot+da, 500, 'player', 1, this.color));
                    if (game.onlineMode === '1v1') Online.send({ type:'bulletSpawn', x:bx, y:by, angle:this.rot+da, spd:500, dmg:1, laser:false });
                }
                this.energy = Math.max(0, this.energy - 3);
                Audio.play('shoot', 0.3);
            } else {
                bullets.push(new Bullet(bx, by, this.rot, 500, 'player', 1, this.color));
                if (game.onlineMode === '1v1') Online.send({ type:'bulletSpawn', x:bx, y:by, angle:this.rot, spd:500, dmg:1, laser:false });
                this.energy = Math.max(0, this.energy - 2);
                Audio.play('shoot', 0.28);
            }
        }

        // Nova bomb — X key or mobile bomb btn
        this._nova = false;
        const bombPressed = overrides.bomb ?? (Input.isPressed('KeyX') || _mobileBombPressed);
        if (bombPressed && this.powers.bomb > 0 && this.energy >= 30) {
            this.powers.bomb = 0; this.energy -= 30; this._nova = true;
            spawnParts(this.x, this.y, 70, { color:'#f80', minSpd:80, maxSpd:380,
                minR:2, maxR:7, glow:true, minDecay:0.5, maxDecay:1.4 });
            Audio.play('explosion', 0.55);
        }

        if (this.energy <= 0 && _mobileFirePressed) {
            _mobileFirePressed = false;
            const fb = document.getElementById('btn-fire');
            if (fb) fb.classList.remove('toggled-on');
        }
        if (!shooting) this.energy = Math.min(this.maxEnergy, this.energy + 14*dt);
        for (const k in this.powers) if (this.powers[k] > 0) this.powers[k] -= dt;
        if (this.invincible > 0) this.invincible -= dt;
    }

    // Apply remote state received from network
    applyRemoteState(s) {
        this.x   = s.x;  this.y  = s.y;
        this.vx  = s.vx; this.vy = s.vy;
        this.rot = s.rot;
        this.hp  = s.hp; this.energy = s.energy;
        this.powers = s.powers ?? this.powers;
        this.invincible = s.inv ?? this.invincible;
    }

    // Serialize to send
    toState() {
        return {
            x: this.x, y: this.y, vx: this.vx, vy: this.vy,
            rot: this.rot, hp: this.hp, energy: this.energy,
            powers: { ...this.powers }, inv: this.invincible,
        };
    }

    hit(dmg) {
        if (this.invincible > 0) return false;
        if (this.powers.shield > 0) {
            this.powers.shield = 0;
            spawnParts(this.x, this.y, 18, { color:'#0f0', minSpd:50, maxSpd:140, glow:true });
            Audio.play('shield-break', 0.45);
            return false;
        }
        this.hp -= dmg; this.invincible = 0.5;
        Audio.play('hit', 0.38);
        return this.hp <= 0;
    }

    get novaRadius() { return this._nova ? 200 : 0; }

    render(ctx) {
        if (this.invincible > 0 && Math.floor(this.invincible*12)%2===0) return;
        ctx.save();
        ctx.translate(this.x, this.y); ctx.rotate(this.rot);
        ctx.shadowBlur = 16; ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(-11,-9); ctx.lineTo(-5,0); ctx.lineTo(-11,9); ctx.closePath(); ctx.stroke();
        ctx.strokeStyle = this.isRemote ? this.color + '88' : '#08f'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-5,-4); ctx.lineTo(-9,-4); ctx.moveTo(-5,4); ctx.lineTo(-9,4); ctx.stroke();
        ctx.restore();
        if (this.powers.shield > 0) {
            const p2 = 0.85 + 0.15*Math.sin(Date.now()*0.009);
            ctx.save(); ctx.strokeStyle='#0f0'; ctx.lineWidth=2; ctx.shadowBlur=12; ctx.shadowColor='#0f0';
            ctx.beginPath(); ctx.arc(this.x, this.y, 24*p2, 0, TAU); ctx.stroke(); ctx.restore();
        }
        // Name tag for co-op remote player
        if (this.isRemote) {
            ctx.save();
            ctx.font = "9px 'Orbitron', monospace";
            ctx.fillStyle = this.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText('P2', this.x, this.y - 18);
            ctx.restore();
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
//  GAME OBJECT
// ══════════════════════════════════════════════════════════════════════════════
const game = {
    // states: 'menu' | 'play' | 'dead' | 'gameover'
    state: 'menu',
    player: null,
    player2: null,       // Co-op remote or 1v1 opponent
    bullets: [], asteroids: [], enemies: [], powerups: [],
    score: 0, hiScore: +localStorage.getItem('void-sector-hi')||0,
    wave: 1, combo: 1, comboTimer: 0,
    waveMsg: '', waveMsgTimer: 0, waveTimer: 2,
    shake: 0, deathTimer: 0,

    // Online
    onlineMode: null,    // null | '1v1' | 'coop'
    onlineRole: null,    // 'host' | 'guest'
    selectedOnlineMode: '1v1', // currently selected tab

    _btns: {},
    _hover: {},

    // ──────────────────────────────────────────────────────────────────────────
    init() {
        this._buildSounds();
        this._buildBtns();
        this.state = 'menu';
        _initMobileButtons();
        _showMobileControls(false);
    },

    _buildSounds() {
        Audio.synth('shoot',        'square', 880,  0.08, 0.12, 220);
        Audio.synth('laser',        'sine',   1400, 0.05, 0.17, 900);
        Audio.synth('explosion',    'noise',  200,  0.35, 0.42);
        Audio.synth('hit',          'noise',  400,  0.12, 0.28);
        Audio.synth('enemy-shoot',  'square', 440,  0.07, 0.08, 200);
        Audio.synth('powerup',      'sine',   523,  0.25, 0.38, 1047);
        Audio.synth('shield-break', 'noise',  600,  0.2,  0.32);
        Audio.synth('wave',         'sine',   261,  0.5,  0.28, 523);
        Audio.synth('death',        'noise',  100,  0.55, 0.48);
        Audio.synth('gameover',     'saw',    220,  0.8,  0.28, 55);
    },

    _buildBtns() {
        const cx = W/2;
        // Menu buttons — centered, spaced evenly
        this._btns.play   = { x: cx-90, y: H/2 - 50,  w: 180, h: 46, label:'JUGAR',   accent:'#00ffff' };
        this._btns.online = { x: cx-90, y: H/2 + 10,  w: 180, h: 46, label:'ONLINE',  accent:'#ff00ff' };
    },

    // ──────────────────────────────────────────────────────────────────────────
    _startGame(mode, role) {
        this.state = 'play';
        this.onlineMode = mode || null;
        this.onlineRole = role || null;

        // P1 — always local
        this.player = new Player(W/2, H/2, '#0ff', false);

        // P2 — for co-op (remote), not for solo/1v1 (1v1 enemy is player2 driven remotely)
        this.player2 = null;
        if (mode === 'coop') {
            const isHost = role === 'host';
            // Host = P1 (cyan), Guest = P2 (orange). Remote player rendered separately.
            this.player  = new Player(isHost ? W*0.35 : W*0.65, H/2, isHost ? '#0ff' : '#f80', false);
            this.player2 = new Player(isHost ? W*0.65 : W*0.35, H/2, isHost ? '#f80' : '#0ff', true);
        }
        if (mode === '1v1') {
            const isHost = role === 'host';
            this.player = new Player(isHost ? 40 : W - 40, isHost ? 40 : H - 40, '#0ff', false);
            this.player2 = new Player(isHost ? W - 40 : 40, isHost ? H - 40 : 40, '#f80', true);
            this.player.rot = isHost ? Math.PI/4 : -Math.PI*3/4;
            this.player2.rot = isHost ? -Math.PI*3/4 : Math.PI/4;
        }

        this.bullets = []; this.asteroids = []; this.enemies = []; this.powerups = [];
        this.score = 0; this.wave = 1; this.combo = 1; this.comboTimer = 0;
        this.shake = 0; _parts.length = 0;

        _showMobileControls(true);
        this._setupOnlineHandlers();
        this._spawnWave(1);
    },

    _spawnWave(w) {
        this.asteroids = []; this.enemies = [];
        for (let i = 0; i < 3 + w*2; i++) {
            let x, y;
            do { x = rnd(0,W); y = rnd(0,H); } while (dist({x,y}, this.player) < 120);
            this.asteroids.push(new Asteroid(x, y, rndInt(2,3)));
        }
        if (w >= 2) for (let i=0; i<Math.min(w-1,4); i++) {
            let x,y; do { x=rnd(0,W); y=rnd(0,H); } while(dist({x,y},this.player)<180);
            this.enemies.push(new Enemy(x,y,'scout'));
        }
        if (w >= 3 && w%2===0) {
            let x,y; do { x=rnd(0,W); y=rnd(0,H); } while(dist({x,y},this.player)<220);
            this.enemies.push(new Enemy(x,y,'hunter'));
        }
        if (w >= 5 && w%3===0) {
            let x,y; do { x=rnd(0,W); y=rnd(0,H); } while(dist({x,y},this.player)<260);
            this.enemies.push(new Enemy(x,y,'bomber'));
        }
        this.waveMsg = `OLEADA ${w}`; this.waveMsgTimer = 2.2;
        Audio.play('wave', 0.45);

        // Sync wave start to guest (host authority)
        if (this.onlineMode && this.onlineRole === 'host') {
            Online.send({ type:'wave', w, asteroids: this.asteroids.map(a => ({
                x:a.x, y:a.y, size:a.size, vx:a.vx, vy:a.vy, shape:a.shape, color:a.color
            })), enemies: this.enemies.map(e => ({
                x:e.x, y:e.y, type:e.type
            })) });
        }
    },

    _addScore(base) {
        this.score += base * this.combo;
        this.combo = Math.min(8, this.combo+1);
        this.comboTimer = 3;
        if (this.score > this.hiScore) {
            this.hiScore = this.score;
            localStorage.setItem('void-sector-hi', this.hiScore);
        }
    },

    _playerDied(which = 'p1') {
        const p = which === 'p2' ? this.player2 : this.player;
        if (!p) return;
        Audio.play('death', 0.55);
        spawnParts(p.x, p.y, 35, { color: p.color, minSpd:60, maxSpd:280, glow:true, minDecay:0.4, maxDecay:1 });
        p.lives--;
        if (which === 'p1') {
            this.state = 'dead'; this.deathTimer = 2.2;
            if (p.lives <= 0) { Audio.play('gameover', 0.45); }
        }
    },

    _respawn() {
        this.state = 'play';
        const p = this.player;
        p.x = W/2; p.y = H/2; p.vx = 0; p.vy = 0;
        p.hp = p.maxHp; p.energy = p.maxEnergy;
        p.invincible = 2.5;
        for (const k in p.powers) p.powers[k] = 0;
    },

    // ── Pointer helpers ───────────────────────────────────────────────────────
    _getGamePointer() {
        const t = Input.getTouch(0);
        if (t) return Engine.toGame(t.x, t.y);
        const m = Input.getMouse();
        return Engine.toGame(m.x, m.y);
    },
    _isPointerPressed() {
        return Input.isMousePressed() || Input.isTouchStarted();
    },

    // ── Online handlers ───────────────────────────────────────────────────────
    _setupOnlineHandlers() {
        if (!this.onlineMode) return;

        const mode = this.onlineMode;
        const isHost = this.onlineRole === 'host';

        Online.on('onData', (data) => {
            if (!data || !data.type) return;

            switch (data.type) {
                case 'playerState': {
                    // Remote player state update
                    if (this.player2) this.player2.applyRemoteState(data.state);
                    break;
                }
                case 'wave': {
                    // Guest receives wave spawn data from host
                    if (!isHost) {
                        this.asteroids = data.asteroids.map(d => {
                            const a = new Asteroid(d.x, d.y, d.size, d.vx, d.vy);
                            a.shape = d.shape; a.color = d.color;
                            return a;
                        });
                        this.enemies = data.enemies.map(d => new Enemy(d.x, d.y, d.type));
                        this.waveMsg = `OLEADA ${data.w}`; this.waveMsgTimer = 2.2;
                        Audio.play('wave', 0.45);
                    }
                    break;
                }
                case 'asteroidHit': {
                    // Sync asteroid HP from guest hit
                    const a = this.asteroids[data.idx];
                    if (a) a.hp -= data.dmg;
                    break;
                }
                case 'enemyHit': {
                    const e = this.enemies[data.idx];
                    if (e) e.hp -= data.dmg;
                    break;
                }
                case 'bulletSpawn': {
                    // In 1v1: receive opponent's bullets (they're enemy bullets)
                    if (mode === '1v1') {
                        this.bullets.push(new Bullet(
                            data.x, data.y, data.angle, data.spd, 'enemy', data.dmg, '#f84', data.laser
                        ));
                    }
                    break;
                }
                case 'died': {
                    // Remote player died
                    if (this.player2) {
                        spawnParts(this.player2.x, this.player2.y, 35,
                            { color: this.player2.color, minSpd:60, maxSpd:280, glow:true });
                        Audio.play('death', 0.4);
                        if (mode === '1v1') {
                            // We won!
                            this._win1v1();
                        }
                    }
                    break;
                }
                case 'gameover': {
                    this.state = 'gameover';
                    break;
                }
                case 'restart': {
                    this._respawn();
                    break;
                }
            }
        });

        Online.on('onDisconnect', () => {
            if (this.state === 'play' || this.state === 'dead') {
                this.waveMsg = 'RIVAL DESCONECTADO';
                this.waveMsgTimer = 3;
                this.onlineMode = null;
                Online.destroy();
                setTimeout(() => { this.state = 'menu'; }, 3000);
            }
        });
    },

    _win1v1() {
        this.waveMsg = '¡VICTORIA!';
        this.waveMsgTimer = 3;
        setTimeout(() => { this.state = 'gameover'; }, 3000);
    },

    _sendPlayerState() {
        if (!this.onlineMode || !this.player) return;
        Online.send({ type: 'playerState', state: this.player.toState() });
    },

    // ──────────────────────────────────────────────────────────────────────────
    update(dt) {
        const gp = this._getGamePointer();
        for (const k in this._btns) this._hover[k] = UICanvas.hitTest(gp.x, gp.y, this._btns[k]);

        if (this.state === 'menu') {
            _showMobileControls(false);
            if (this._isPointerPressed()) {
                if (UICanvas.hitTest(gp.x, gp.y, this._btns.play))   this._startGame(null, null);
                if (UICanvas.hitTest(gp.x, gp.y, this._btns.online)) this._openOnline();
            }
            if (Input.isPressed('Space') || Input.isPressed('Enter')) this._startGame(null, null);
            return;
        }

        if (this.state === 'dead') {
            updateParts(dt);
            this.deathTimer -= dt;
            if (this.deathTimer <= 0 && this._isPointerPressed()) {
                if (this.player.lives > 0) { this._respawn(); if (this.onlineMode) Online.send({ type: 'restart' }); }
                else this.state = 'gameover';
            }
            if (this.deathTimer <= 0 && (Input.isPressed('Space')||Input.isPressed('Enter'))) {
                if (this.player.lives > 0) this._respawn();
                else this.state = 'gameover';
            }
            return;
        }

        if (this.state === 'gameover') {
            updateParts(dt);
            if (this._isPointerPressed() || Input.isPressed('Space') || Input.isPressed('Enter')) {
                Online.destroy();
                this.onlineMode = null;
                this.state = 'menu';
            }
            return;
        }

        // ── PLAY ──────────────────────────────────────────────────────────────
        const p = this.player;
        this.shake = Math.max(0, this.shake - dt*9);
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.combo = 1;
        if (this.waveMsgTimer > 0) this.waveMsgTimer -= dt;

        p.update(dt, this.bullets);
        _updateMobileSkillUI(p.powers);

        // In 1v1 online, remote player2 is an adversary
        // In coop, player2 is ally — both shoot enemies
        if (this.player2 && this.player2.isRemote) {
            // Remote player rendered at received state; in coop also fires at enemies
            // (bullets added via bulletSpawn for 1v1, or via shared asteroidHit)
        }

        // Send our state to peer every frame
        if (this.onlineMode) this._sendPlayerState();

        // Nova bomb radius
        const nr = p.novaRadius;
        if (nr > 0) {
            for (const a of this.asteroids) if (dist(p,a) < nr + a.r) a.hp = 0;
            for (const e of this.enemies)   if (dist(p,e) < nr + e.r) e.hp = 0;
        }

        // Bullets
        for (let i = this.bullets.length-1; i >= 0; i--) {
            const b = this.bullets[i];
            b.update(dt);
            if (b.dead) { this.bullets.splice(i,1); continue; }

            if (b.owner === 'player') {
                for (let ai = 0; ai < this.asteroids.length; ai++) {
                    const a = this.asteroids[ai];
                    if (!b.dead && dist(b,a) < a.r + b.r) {
                        b.dead = true; a.hp -= b.dmg;
                        spawnParts(b.x, b.y, 5, { color:'#aaf', minSpd:30, maxSpd:90, glow:true });
                        // Tell peer
                        if (this.onlineMode) Online.send({ type:'asteroidHit', idx:ai, dmg:b.dmg });
                    }
                }
                for (let ei = 0; ei < this.enemies.length; ei++) {
                    const e = this.enemies[ei];
                    if (!b.dead && dist(b,e) < e.r + b.r) {
                        b.dead = true; e.hp -= b.dmg;
                        spawnParts(b.x, b.y, 7, { color:e.color, minSpd:40, maxSpd:110, glow:true });
                        if (this.onlineMode) Online.send({ type:'enemyHit', idx:ei, dmg:b.dmg });
                    }
                }
                // 1v1: local bullets also hit remote player (adversary)
                if (this.onlineMode === '1v1' && this.player2 && !b.dead && dist(b, this.player2) < this.player2.r + b.r) {
                    b.dead = true;
                    spawnParts(b.x, b.y, 8, { color:'#f80', minSpd:40, maxSpd:130 });
                }
            } else {
                // Enemy bullets hit local player
                if (dist(b,p) < p.r + b.r) {
                    b.dead = true;
                    if (p.hit(15)) {
                        this._playerDied('p1');
                        if (this.onlineMode) Online.send({ type:'died' });
                    }
                    this.shake = 0.4;
                    spawnParts(p.x, p.y, 10, { color:'#0ff', minSpd:50, maxSpd:160 });
                }
            }
        }

        // Asteroids
        const newA = [];
        for (let i = this.asteroids.length-1; i >= 0; i--) {
            const a = this.asteroids[i];
            a.update(dt);
            if (a.hp <= 0) {
                this.asteroids.splice(i,1);
                this._addScore(a.score);
                Audio.play('explosion', 0.28);
                spawnParts(a.x, a.y, 10 + a.size*5, { color:'#889', minSpd:30, maxSpd:110 });
                if (a.size > 1) {
                    newA.push(new Asteroid(a.x, a.y, a.size-1, a.vx*1.2+rnd(-35,35), a.vy*1.2+rnd(-35,35)));
                    newA.push(new Asteroid(a.x, a.y, a.size-1, a.vx*1.2+rnd(-35,35), a.vy*1.2+rnd(-35,35)));
                }
                if (Math.random() < 0.12) this.powerups.push(new PowerUp(a.x, a.y));
                continue;
            }
            if (dist(a,p) < a.r + p.r) {
                if (p.hit(20)) { this._playerDied('p1'); if (this.onlineMode) Online.send({ type:'died' }); }
                this.shake = 0.5; a.hp--;
                spawnParts(a.x, a.y, 8, { color:'#f80', minSpd:40, maxSpd:130 });
            }
            // Coop: asteroid also collides with remote player locally? No - remote player collision is on their side.
        }
        this.asteroids.push(...newA);

        // Enemies — target nearest player (coop) or just p1
        const getTarget = () => {
            if (this.onlineMode === 'coop' && this.player2) {
                return dist(this.enemies[0] || p, p) < dist(this.enemies[0] || p, this.player2)
                    ? p : this.player2;
            }
            return p;
        };

        for (let i = this.enemies.length-1; i >= 0; i--) {
            const e = this.enemies[i];
            const target = getTarget();
            e.update(dt, target, this.bullets);
            if (e.hp <= 0) {
                this.enemies.splice(i,1);
                this._addScore(e.score);
                Audio.play('explosion', 0.38);
                spawnParts(e.x, e.y, 18, { color:e.color, minSpd:50, maxSpd:190, glow:true });
                if (Math.random() < 0.3) this.powerups.push(new PowerUp(e.x, e.y));
                continue;
            }
            if (dist(e,p) < e.r + p.r) {
                if (p.hit(25)) { this._playerDied('p1'); if (this.onlineMode) Online.send({ type:'died' }); }
                this.shake = 0.6;
            }
        }

        // Power-ups
        for (let i = this.powerups.length-1; i >= 0; i--) {
            const pu = this.powerups[i];
            pu.update(dt);
            if (pu.dead) { this.powerups.splice(i,1); continue; }
            if (dist(pu,p) < pu.r + p.r) {
                p.powers[pu.type] = pu.type === 'bomb' ? 99 : 8;
                if (pu.type === 'shield') p.powers.shield = 10;
                if (pu.type === 'speed')  p.powers.speed  = 7;
                p.hp = Math.min(p.maxHp, p.hp+10);
                Audio.play('powerup', 0.45);
                spawnParts(p.x, p.y, 14, { color:PU_COLORS[pu.type], minSpd:40, maxSpd:110, glow:true });
                this.powerups.splice(i,1);
            }
        }

        updateParts(dt);

        // Next wave (host authority or solo)
        if (this.asteroids.length === 0 && this.enemies.length === 0) {
            if (!this.onlineMode || this.onlineRole === 'host' || !this.onlineMode) {
                this.waveTimer -= dt;
                if (this.waveTimer <= 0) { this.waveTimer = 2; this.wave++; this._spawnWave(this.wave); }
            }
        }
    },

    // ──────────────────────────────────────────────────────────────────────────
    render(ctx) {
        ctx.fillStyle = '#000008'; ctx.fillRect(0, 0, W, H);
        renderStars(ctx);

        if (this.state === 'menu')     { this._renderMenu(ctx); return; }
        if (this.state === 'gameover') { this._renderGameOver(ctx); return; }

        // Screen shake
        if (this.shake > 0) {
            ctx.save();
            ctx.translate(rnd(-5,5)*this.shake, rnd(-5,5)*this.shake);
        }

        for (const a of this.asteroids) a.render(ctx);
        for (const e of this.enemies)   e.render(ctx);
        for (const pu of this.powerups) pu.render(ctx);
        for (const b of this.bullets)   b.render(ctx);
        renderParts(ctx);

        // Render players
        if (this.state === 'play' || this.state === 'dead') {
            this.player.render(ctx);
            if (this.player2) this.player2.render(ctx);
        }

        if (this.shake > 0) ctx.restore();

        this._renderHUD(ctx);

        // Wave message
        if (this.waveMsgTimer > 0) {
            const a = Math.min(1, this.waveMsgTimer) * Math.min(1, this.waveMsgTimer);
            ctx.save(); ctx.globalAlpha = a;
            ctx.font = "bold 34px 'Orbitron', monospace";
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowBlur = 18; ctx.shadowColor = '#0ff';
            ctx.fillStyle = '#0ff';
            ctx.fillText(this.waveMsg, W/2, H/2);
            ctx.restore();
        }

        // Death overlay
        if (this.state === 'dead') {
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,W,H);
            ctx.save();
            ctx.font = "bold 36px 'Orbitron', monospace";
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowBlur = 22; ctx.shadowColor = '#f44'; ctx.fillStyle = '#f84';
            ctx.fillText('NAVE DESTRUIDA', W/2, H/2 - 24); ctx.restore();
            if (this.deathTimer <= 0) {
                ctx.font = "13px 'Share Tech Mono', monospace";
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#aef';
                const msg = this.player.lives > 0 ? 'Toca para continuar' : 'Toca para ver resultado';
                ctx.fillText(msg, W/2, H/2 + 24);
            }
        }
    },

    _renderHUD(ctx) {
        const p = this.player;
        ctx.save();
        ctx.font = "bold 11px 'Orbitron', monospace";
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = '#0ff8'; ctx.fillText('SCORE', 12, 12);
        ctx.font = "bold 16px 'Orbitron', monospace"; ctx.fillStyle = '#0ff';
        ctx.shadowBlur = 6; ctx.shadowColor = '#0ff';
        ctx.fillText(String(this.score).padStart(6,'0'), 12, 24);

        ctx.textAlign = 'right';
        ctx.font = "bold 11px 'Orbitron', monospace"; ctx.fillStyle = '#0ff8'; ctx.shadowBlur = 0;
        ctx.fillText('OLEADA', W-12, 12);
        ctx.font = "bold 16px 'Orbitron', monospace"; ctx.fillStyle = '#0ff';
        ctx.shadowBlur = 6; ctx.fillText(String(this.wave).padStart(2,'0'), W-12, 24);

        // Mode badge (online)
        if (this.onlineMode) {
            ctx.textAlign = 'center';
            ctx.font = "bold 9px 'Orbitron', monospace";
            ctx.fillStyle = this.onlineMode === 'coop' ? '#f0f' : '#ff0';
            ctx.shadowBlur = 4; ctx.shadowColor = ctx.fillStyle;
            ctx.fillText(this.onlineMode === 'coop' ? '● CO-OP' : '● 1v1', W/2, 12);
        }

        ctx.textAlign = 'left'; ctx.shadowBlur = 0;
        ctx.font = "10px 'Share Tech Mono', monospace"; ctx.fillStyle = '#0ff6';
        ctx.fillText('ESCUDO', 12, 50);
        ctx.fillStyle = '#001a1a'; ctx.fillRect(12, 62, 100, 6);
        ctx.fillStyle = '#0ff';
        ctx.shadowBlur = 5; ctx.shadowColor = '#0ff';
        ctx.fillRect(12, 62, 100*(p.hp/p.maxHp), 6);

        ctx.shadowBlur = 0; ctx.fillStyle = '#ff06';
        ctx.fillText('ENERGÍA', 12, 72);
        ctx.fillStyle = '#111100'; ctx.fillRect(12, 84, 100, 6);
        ctx.fillStyle = '#ff0'; ctx.shadowBlur = 5; ctx.shadowColor = '#ff0';
        ctx.fillRect(12, 84, 100*(p.energy/p.maxEnergy), 6);

        // Lives
        ctx.shadowBlur = 0;
        for (let i=0; i<3; i++) {
            ctx.fillStyle = i < p.lives ? p.color : '#123';
            ctx.save(); ctx.translate(12+i*16, 98);
            ctx.beginPath(); ctx.moveTo(5,-9); ctx.lineTo(0,0); ctx.lineTo(-5,-9); ctx.closePath();
            ctx.fill(); ctx.restore();
        }

        // Co-op: P2 HP bar
        if (this.onlineMode === 'coop' && this.player2) {
            const p2 = this.player2;
            ctx.textAlign = 'right'; ctx.font = "10px 'Share Tech Mono', monospace";
            ctx.fillStyle = '#f806';
            ctx.fillText('P2 HP', W-12, 50);
            ctx.fillStyle = '#1a0000'; ctx.fillRect(W-112, 62, 100, 6);
            ctx.fillStyle = p2.color; ctx.shadowBlur = 5; ctx.shadowColor = p2.color;
            ctx.fillRect(W-112, 62, 100*(Math.max(0,p2.hp)/p2.maxHp), 6);
            ctx.shadowBlur = 0;
        }

        // Combo
        if (this.combo > 1) {
            ctx.textAlign = 'right'; ctx.font = "bold 15px 'Orbitron', monospace";
            ctx.fillStyle = '#ff0'; ctx.shadowBlur = 8; ctx.shadowColor = '#ff0';
            ctx.fillText(`x${this.combo}`, W-12, 48);
        }

        // Power-up icons
        const puKeys = PU_TYPES.filter(k => p.powers[k] > 0);
        for (let i=0; i<puKeys.length; i++) {
            const k = puKeys[i]; const px2 = W/2 - puKeys.length*20 + i*40;
            ctx.shadowBlur = 10; ctx.shadowColor = PU_COLORS[k];
            ctx.strokeStyle = PU_COLORS[k]; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.roundRect(px2-18, H-44, 36, 32, 5); ctx.stroke();
            ctx.font = '15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(PU_EMOJI[k], px2, H-28);
        }

        ctx.restore();
    },

    _renderMenu(ctx) {
        const t = Date.now()*0.001;
        ctx.save();
        ctx.font = "900 52px 'Orbitron', monospace";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowBlur = 28 + 8*Math.sin(t*2); ctx.shadowColor = '#0ff';
        ctx.fillStyle = '#0ff'; ctx.fillText('VOID', W/2, H/2 - 200);
        ctx.fillStyle = '#08f'; ctx.fillText('SECTOR', W/2, H/2 - 148);
        ctx.shadowBlur = 0;

        ctx.font = "12px 'Share Tech Mono', monospace"; ctx.fillStyle = '#4af';
        ctx.fillText('← → / A D  ROTAR     ↑ / W  PROPULSAR', W/2, H/2 + 80);
        ctx.fillText('ESPACIO / Z  DISPARAR     X  BOMBA NOVA', W/2, H/2 + 100);

        if (this.hiScore > 0) {
            ctx.font = "12px 'Orbitron', monospace"; ctx.fillStyle = '#aef';
            ctx.fillText(`REC  ${String(this.hiScore).padStart(6,'0')}`, W/2, H/2 + 130);
        }
        ctx.restore();

        // Buttons
        for (const k in this._btns) {
            const b = this._btns[k];
            UICanvas.drawButton(ctx, b.label, b.x, b.y, b.w, b.h, b.accent, !!this._hover[k]);
        }
    },

    _renderGameOver(ctx) {
        renderParts(ctx);
        ctx.save();
        ctx.font = "bold 44px 'Orbitron', monospace";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowBlur = 20; ctx.shadowColor = '#f44'; ctx.fillStyle = '#f84';
        ctx.fillText('GAME OVER', W/2, H/2 - 50);
        ctx.shadowBlur = 0;
        ctx.font = "18px 'Orbitron', monospace"; ctx.fillStyle = '#0ff';
        ctx.fillText(`SCORE  ${String(this.score).padStart(6,'0')}`, W/2, H/2);
        ctx.font = "13px 'Share Tech Mono', monospace"; ctx.fillStyle = '#aef';
        ctx.fillText('Toca para volver al menú', W/2, H/2 + 50);
        ctx.restore();
    },

    // ── Online panel ──────────────────────────────────────────────────────────
    _openOnline() {
        const hostB = document.getElementById('host-btn');
        const tabs  = document.getElementById('online-mode-tabs');
        const tab1v1 = document.getElementById('tab-1v1');
        const tabCoop = document.getElementById('tab-coop');

        OnlineLobby.setTitle('VOID SECTOR ONLINE');
        OnlineLobby.setStatus('Elige modo y acción');
        OnlineLobby.showJoinView();
        tabs?.classList.remove('hidden');
        hostB.disabled = false;
        OnlineLobby.enableJoin(true);
        this.selectedOnlineMode = '1v1';
        tab1v1?.classList.add('selected');
        tabCoop?.classList.remove('selected');
        OnlineLobby.setCode('------');
        OnlineLobby.show();

        const _resetHostBtn = () => {
            hostB.disabled = false;
            hostB.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"></path><path d="M2 6h4"></path><path d="M2 10h4"></path><path d="M2 14h4"></path><path d="M2 18h4"></path><rect x="14" y="2" width="8" height="8" rx="2" ry="2"></rect><path d="M18 14v4"></path><path d="M18 22v-4"></path><path d="M14 18h8"></path></svg> Crear sala';
            hostB.classList.remove('coop-style');
        };

        tab1v1.onclick = () => {
            this.selectedOnlineMode = '1v1';
            tab1v1.classList.add('selected');
            tabCoop.classList.remove('selected');
            OnlineLobby.setStatus('1v1 — enfréntate a otro jugador');
            hostB.classList.remove('coop-style');
        };
        tabCoop.onclick = () => {
            this.selectedOnlineMode = 'coop';
            tabCoop.classList.add('selected');
            tab1v1.classList.remove('selected');
            OnlineLobby.setStatus('Co-op — juega junto a otro jugador');
            hostB.classList.add('coop-style');
        };

        hostB.onclick = () => {
            const selMode = this.selectedOnlineMode;
            hostB.disabled = true;
            hostB.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Creando...';
            Online.destroy();
            Online.host((code) => {
                OnlineLobby.setCode(code);
                OnlineLobby.setStatus(`Esperando jugador... (${selMode.toUpperCase()})`);
                OnlineLobby.showHostView();
            });
            Online.on('onConnected', () => {
                OnlineLobby.setStatus('Conectado. Iniciando...');
                setTimeout(() => {
                    OnlineLobby.hide();
                    this._startGame(selMode, 'host');
                }, 700);
            });
            Online.on('onError', (e) => {
                OnlineLobby.setStatus('Error: ' + (e.type || e));
                _resetHostBtn();
                OnlineLobby.showHostView();
            });
        };

        OnlineLobby.wireDefaultJoin((code) => {
            const selMode = this.selectedOnlineMode;
            Online.destroy();
            Online.join(code);
            Online.on('onConnected', () => {
                OnlineLobby.setStatus('Conectado. Iniciando...');
                setTimeout(() => {
                    OnlineLobby.hide();
                    this._startGame(selMode, 'guest');
                    OnlineLobby.enableJoin(true);
                }, 700);
            });
            Online.on('onError', () => {
                OnlineLobby.setStatus('No se encontró la sala.');
                OnlineLobby.enableJoin(true);
            });
        });
    },
};

// ── Bootstrap ─────────────────────────────────────────────────────────────────
OnlineLobby.onCancel(() => {
    Online.destroy();
    const hostB = document.getElementById('host-btn');
    if (hostB) {
        hostB.disabled = false;
        hostB.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"></path><path d="M2 6h4"></path><path d="M2 10h4"></path><path d="M2 14h4"></path><path d="M2 18h4"></path><rect x="14" y="2" width="8" height="8" rx="2" ry="2"></rect><path d="M18 14v4"></path><path d="M18 22v-4"></path><path d="M14 18h8"></path></svg> Crear sala';
        hostB.classList.remove('coop-style');
    }
});

GameBoot.startCanvas(game, { canvasId: 'canvas', width: W, height: H, bg: '#000008' });