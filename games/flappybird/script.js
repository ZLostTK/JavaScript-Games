/* ─────────────────────────────────────────────────────────
   Flappy Bird — script.js
   Modos: Solo | Online 1v1 (PeerJS P2P) | vs Sombra (bot AI)
   
   Online: Pájaro amarillo = Host (tú), Pájaro azul = Guest (rival)
   Sombra: Pájaro amarillo = tú, Pájaro azul semitransparente = bot IA
   ───────────────────────────────────────────────────────── */

// ── Constantes de juego ───────────────────────────────────
const GW         = 360;
const GH         = 640;
const GROUND_Y   = GH - 70;
const PIPE_W     = 58;
const PIPE_GAP   = 160;
const PIPE_SPEED = 148;   // px/s
const GRAVITY    = 880;   // px/s²
const JUMP_VEL   = -275;  // px/s
const PIPE_EVERY = 1.85;  // segundos entre tuberías
const BIRD_X     = GW / 3;

// ── PRNG determinista (mulberry32) ────────────────────────
// Permite que ambos jugadores / el bot usen el mismo mapa aleatorio
function makePRNG(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// ── Canvas button helpers ─────────────────────────────────
function drawBtn(ctx, label, x, y, w, h, accent, hover, disabled = false) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fillStyle = disabled ? 'rgba(40,40,60,0.4)' : (hover ? accent + 'cc' : accent + '33');
    ctx.fill();
    ctx.strokeStyle = disabled ? 'rgba(80,80,100,0.35)' : accent + 'aa';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = disabled ? '#383858' : (hover ? '#fff' : accent);
    ctx.font = "bold 16px 'Courier New', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
    ctx.restore();
}

function hitBtn(gx, gy, btn) {
    return btn && gx >= btn.x && gx <= btn.x + btn.w
               && gy >= btn.y && gy <= btn.y + btn.h;
}

// ── Pájaro amarillo (jugador local / host) ────────────────
function drawBird(ctx, x, y, angle, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur  = 8;
    ctx.shadowOffsetY = 3;
    // Cuerpo
    ctx.fillStyle = '#f5c518';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Ala
    ctx.fillStyle = '#d4a800';
    ctx.beginPath();
    ctx.ellipse(-3, 5, 10, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Panza
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.ellipse(2, 3, 10, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Ojo blanco
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, -5, 6, 0, Math.PI * 2);
    ctx.fill();
    // Pupila
    ctx.fillStyle = '#111122';
    ctx.beginPath();
    ctx.arc(9.5, -5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    // Brillo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10.8, -6.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    // Pico superior
    ctx.fillStyle = '#e8823a';
    ctx.beginPath();
    ctx.moveTo(13, -3);
    ctx.lineTo(22,  0);
    ctx.lineTo(13,  1);
    ctx.closePath();
    ctx.fill();
    // Pico inferior
    ctx.fillStyle = '#c06428';
    ctx.beginPath();
    ctx.moveTo(13,  1);
    ctx.lineTo(22,  0);
    ctx.lineTo(13,  4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// ── Pájaro azul (bot shadow / guest online) ───────────────
function drawBirdBlue(ctx, x, y, angle, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,100,200,0.4)';
    ctx.shadowBlur  = 10;
    ctx.shadowOffsetY = 3;
    // Cuerpo
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Ala
    ctx.fillStyle = '#0288d1';
    ctx.beginPath();
    ctx.ellipse(-3, 5, 10, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Panza
    ctx.fillStyle = '#b3e5fc';
    ctx.beginPath();
    ctx.ellipse(2, 3, 10, 8, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Ojo blanco
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, -5, 6, 0, Math.PI * 2);
    ctx.fill();
    // Pupila
    ctx.fillStyle = '#111122';
    ctx.beginPath();
    ctx.arc(9.5, -5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    // Brillo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10.8, -6.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
    // Pico superior
    ctx.fillStyle = '#e8823a';
    ctx.beginPath();
    ctx.moveTo(13, -3);
    ctx.lineTo(22,  0);
    ctx.lineTo(13,  1);
    ctx.closePath();
    ctx.fill();
    // Pico inferior
    ctx.fillStyle = '#c06428';
    ctx.beginPath();
    ctx.moveTo(13,  1);
    ctx.lineTo(22,  0);
    ctx.lineTo(13,  4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

// ── Dibujo de tuberías ────────────────────────────────────
function drawPipe(ctx, x, y, height, isTop) {
    const capH = 26;
    const capX = x - 6;
    const capW = PIPE_W + 12;
    const bodyGrad = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
    bodyGrad.addColorStop(0,    '#1a5c1a');
    bodyGrad.addColorStop(0.25, '#2d8a2d');
    bodyGrad.addColorStop(0.5,  '#3db87a');
    bodyGrad.addColorStop(0.75, '#2d8a2d');
    bodyGrad.addColorStop(1,    '#1a5c1a');
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(x, y, PIPE_W, height);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + 8, y, 10, height);
    const capY = isTop ? y + height - capH : y;
    const capGrad = ctx.createLinearGradient(capX, 0, capX + capW, 0);
    capGrad.addColorStop(0,   '#1a6b1a');
    capGrad.addColorStop(0.3,  '#3dcc7a');
    capGrad.addColorStop(0.7,  '#2daa5a');
    capGrad.addColorStop(1,   '#1a6b1a');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    if (isTop) {
        ctx.roundRect(capX, capY, capW, capH, [0, 0, 8, 8]);
    } else {
        ctx.roundRect(capX, capY, capW, capH, [8, 8, 0, 0]);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (isTop) {
        ctx.roundRect(capX, capY, capW, capH, [0, 0, 8, 8]);
    } else {
        ctx.roundRect(capX, capY, capW, capH, [8, 8, 0, 0]);
    }
    ctx.stroke();
}

// ── Dibujo del suelo ──────────────────────────────────────
function drawGround(ctx, offset) {
    const gy = GROUND_Y;
    const earthGrad = ctx.createLinearGradient(0, gy, 0, GH);
    earthGrad.addColorStop(0,   '#5c3d1e');
    earthGrad.addColorStop(0.3, '#3d2510');
    earthGrad.addColorStop(1,   '#2a1a0a');
    ctx.fillStyle = earthGrad;
    ctx.fillRect(0, gy, GW, GH - gy);
    const grassGrad = ctx.createLinearGradient(0, gy, 0, gy + 18);
    grassGrad.addColorStop(0, '#4da830');
    grassGrad.addColorStop(1, '#3a7a20');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, gy, GW, 18);
    const stripeW = 38;
    const off = offset % stripeW;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let sx = -stripeW + off; sx < GW + stripeW; sx += stripeW) {
        ctx.fillRect(sx, gy, stripeW / 2, 18);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(GW, gy);
    ctx.stroke();
}

// ── Dibujo de nubes ───────────────────────────────────────
function drawCloud(ctx, x, y, scale) {
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.arc(x,             y,             20 * scale, 0, Math.PI * 2);
    ctx.arc(x + 28*scale,  y - 10*scale,  26 * scale, 0, Math.PI * 2);
    ctx.arc(x + 56*scale,  y,             20 * scale, 0, Math.PI * 2);
    ctx.fill();
}

// ── Bot Sombra ────────────────────────────────────────────
const ShadowBot = {
    active:    false,
    y:         GH / 2,
    vy:        0,
    angle:     0,
    score:     0,
    dead:      false,
    _cooldown: 0,
    maxScore:  null,  // cuando se fija, el bot deja de saltar al alcanzarlo

    reset() {
        this.y        = GH / 2;
        this.vy       = 0;
        this.angle    = 0;
        this.score    = 0;
        this.dead     = false;
        this.active   = true;
        this._cooldown = 0;
        this.maxScore  = null;
    },

    update(dt, pipes) {
        if (!this.active || this.dead) return;

        this._cooldown = Math.max(0, this._cooldown - dt);

        // Contar puntos primero (para comparar con maxScore)
        for (const p of pipes) {
            if (!p.botPassed && p.x + PIPE_W < BIRD_X) {
                p.botPassed = true;
                this.score++;
            }
        }

        // Si el bot alcanzó el récord del jugador → deja de saltar (muere de caída)
        const botBlocked = this.maxScore !== null && this.score >= this.maxScore;

        if (!botBlocked) {
            // Encontrar la próxima tubería relevante
            const nextPipe = pipes.find(p => p.x + PIPE_W + 6 > BIRD_X - 12);

            if (nextPipe) {
                const gapCenter = nextPipe.topH + PIPE_GAP / 2;
                const DEAD_ZONE = 16; // margen para no oscilar
                if (this.y > gapCenter + DEAD_ZONE && this._cooldown <= 0) {
                    this.vy       = JUMP_VEL;
                    this.angle    = -0.45;
                    this._cooldown = 0.13;
                }
            } else {
                // Sin tuberías: mantener altura media
                if (this.y > GH / 2 + 30 && this._cooldown <= 0) {
                    this.vy       = JUMP_VEL;
                    this.angle    = -0.45;
                    this._cooldown = 0.18;
                }
            }
        }

        this.vy += GRAVITY * dt;
        this.y  += this.vy * dt;

        const targetAngle = this.vy < -100
            ? -0.42
            : Math.min(Math.PI / 2, this.vy / 350);
        this.angle += (targetAngle - this.angle) * Math.min(1, dt * 9);

        // Colisión
        if (this._collides(pipes)) {
            this.dead = true;
        }
    },

    _collides(pipes) {
        const br = 11;
        if (this.y + br >= GROUND_Y || this.y - br <= 0) return true;
        for (const p of pipes) {
            const px1 = p.x - 6, px2 = p.x + PIPE_W + 6;
            if (BIRD_X + br > px1 && BIRD_X - br < px2) {
                if (this.y - br < p.topH) return true;
                if (this.y + br > p.botY) return true;
            }
        }
        return false;
    }
};

// ── PeerJS state handled by Online class ────────────────────
// Online abstraction used here

// Wiring del HTML (botones del panel)
document.getElementById('copy-btn').addEventListener('click', () => {
    const code = document.getElementById('room-code-display').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copy-btn');
        btn.textContent = '¡Copiado!';
        setTimeout(() => { btn.textContent = 'Copiar código'; }, 1800);
    });
});
document.getElementById('online-back-btn').addEventListener('click', () => {
    Online.destroy();
    document.getElementById('online-ui').classList.add('hidden');
    game._returnToSelect();
});

// ── Objeto principal del juego ────────────────────────────
const game = {
    // Estado general
    state: 'select', // 'select' | 'idle' | 'playing' | 'gameover'
    mode:  'solo',   // 'solo' | 'shadow' | 'online'

    // Pájaro local (amarillo)
    birdY:    GH / 2,
    birdVY:   0,
    birdAngle: 0,

    // Tuberías { x, topH, botY, botH, passed, botPassed }
    pipes:     [],
    pipeTimer: 0,
    _prng:     null,  // PRNG seeded

    // Puntuación
    score: 0,
    best:  0,

    // Scroll del suelo
    groundOffset: 0,

    // Nubes { x, y, s }
    clouds: [
        { x: 50,  y: 90,  s: 1.0 },
        { x: 190, y: 130, s: 0.75 },
        { x: 310, y: 75,  s: 1.2 },
        { x: 140, y: 200, s: 0.6 },
    ],

    // Estado interno
    _time:          0,
    _gameOverTimer: 0,
    _btns:          {},
    _stars:         null,
    _flashBird:     false,

    // Shadow mode
    _shadowBotWon:  false,  // bot ganó por superar best
    _shadowPlayerExceededBest: false,

    // Online mode
    _onlineRole:    null,  // 'host' | 'guest'
    _peerBird:      null,  // {y, angle, score, dead, frozen}
    _onlineResult:  null,  // null | 'win' | 'lose' | 'disconnect'
    _gameSeed:      0,

    // ── Init ─────────────────────────────────────────────
    init() {
        this.best = parseInt(localStorage.getItem('flappy_best') || '0');
        Audio.synth('wing',  'sine',   880, 0.07, 0.10, 600);
        Audio.synth('score', 'square', 660, 0.12, 0.12);
        Audio.synth('hit',   'noise',  200, 0.15, 0.22);
        Audio.synth('die',   'saw',    110, 0.30, 0.25);
        Audio.synth('ready', 'sine',   440, 0.08, 0.15);
    },

    // ── Helpers generales ─────────────────────────────────
    _resetBird() {
        this.birdY     = GH / 2;
        this.birdVY    = 0;
        this.birdAngle = 0;
    },

    _returnToSelect() {
        Online.destroy();
        ShadowBot.active = false;
        this.state = 'select';
        this.mode  = 'solo';
        this._resetBird();
        this.pipes         = [];
        this.score         = 0;
        this._peerBird     = null;
        this._onlineResult = null;
        this._shadowBotWon = false;
        this._shadowPlayerExceededBest = false;
    },

    _startGame(mode, role, seed) {
        this.mode       = mode;
        this._resetBird();
        this.pipes         = [];
        this.pipeTimer     = PIPE_EVERY * 0.6;
        this.score         = 0;
        this.groundOffset  = 0;
        this._gameOverTimer = 0;
        this._flashBird    = false;
        this._shadowBotWon = false;
        this._shadowPlayerExceededBest = false;
        this._onlineResult = null;

        // Configurar PRNG con seed
        this._gameSeed = seed !== undefined ? seed : (Math.random() * 0xFFFFFFFF | 0);
        this._prng = makePRNG(this._gameSeed);

        if (mode === 'shadow') {
            ShadowBot.reset();
        } else if (mode === 'online') {
            if (role) this._onlineRole = role;
            this._peerBird = { y: GH / 2, angle: 0, score: 0, dead: false, frozen: false };
        }

        this.state = 'idle';
        Audio.play('ready');
    },

    _flap() {
        this.birdVY    = JUMP_VEL;
        this.birdAngle = -0.45;
        Audio.play('wing');
    },

    _spawnPipe() {
        const rnd    = this._prng ? this._prng() : Math.random();
        const minTop = 80;
        const maxTop = GROUND_Y - PIPE_GAP - 80;
        const topH   = minTop + rnd * (maxTop - minTop);
        this.pipes.push({
            x:         GW + 20,
            topH:      topH,
            botY:      topH + PIPE_GAP,
            botH:      GROUND_Y - (topH + PIPE_GAP),
            passed:    false,
            botPassed: false
        });
    },

    _checkCollision() {
        const bx = BIRD_X;
        const by = this.birdY;
        const br = 11;
        if (by + br >= GROUND_Y || by - br <= 0) return true;
        for (const p of this.pipes) {
            const px1 = p.x - 6, px2 = p.x + PIPE_W + 6;
            if (bx + br > px1 && bx - br < px2) {
                if (by - br < p.topH) return true;
                if (by + br > p.botY) return true;
            }
        }
        return false;
    },

    _moveClouds(dt) {
        for (const c of this.clouds) {
            c.x -= 30 * dt;
            if (c.x + 80 < 0) {
                c.x = GW + 60;
                c.y = 50 + Math.random() * 200;
                c.s = 0.55 + Math.random() * 0.9;
            }
        }
    },

    _getClickPos() {
        const touch = Input.getTouch();
        const m     = Input.getMouse();
        const isTap = Input.isTouchStarted();
        const isMClick = Input.isMousePressed();
        if (!isTap && !isMClick) return null;
        if (isTap && touch) return Engine.toGame(touch.x, touch.y);
        return Engine.toGame(m.x, m.y);
    },

    _playerDied() {
        Audio.play('hit');
        setTimeout(() => Audio.play('die'), 100);

        // Guardar si el jugador murió por debajo del récord (antes de actualizarlo)
        const diedBelowBest = this.mode === 'shadow' && this.score < this.best;
        const spectatingOnline = this.mode === 'online' && this._peerBird && !this._peerBird.dead;

        if (this.score > this.best) {
            this.best = this.score;
            localStorage.setItem('flappy_best', this.best);
        }

        if (this.mode === 'online') {
            Online.send({ type: 'dead', score: this.score });
            // Determinar resultado basado en puntuaciones
            const peerScore = this._peerBird ? this._peerBird.score : 0;
            if (this._peerBird && this._peerBird.dead) {
                this._onlineResult = this.score >= peerScore ? 'win' : 'lose';
            }
            // Si el rival aún vive, esperamos su dead message para determinar resultado
        }

        // Modo espectador: el jugador murió antes del récord (sombra) o el rival sigue vivo (online)
        if ((diedBelowBest && ShadowBot.active && !ShadowBot.dead) || spectatingOnline) {
            if (this.mode === 'shadow') ShadowBot.maxScore = this.best;   // bot deja de saltar al llegar aquí
            this.state          = 'spectating';
            this._gameOverTimer = 0;
            this._flashBird     = false;
            return;
        }

        this.state          = 'gameover';
        this._gameOverTimer = 0;
        this._flashBird     = false;
    },

    // ── Update ────────────────────────────────────────────
    update(dt) {
        this._time += dt;

        // ── SELECT ────────────────────────────────────────
        if (this.state === 'select') {
            this._moveClouds(dt * 0.4);
            this.birdY = GH / 2 - 30 + Math.sin(this._time * 2.8) * 10;
            const cp = this._getClickPos();
            if (cp) {
                if (hitBtn(cp.x, cp.y, this._btns.play))   this._startGame('solo');
                if (hitBtn(cp.x, cp.y, this._btns.online)) this._onClickOnline();
                if (hitBtn(cp.x, cp.y, this._btns.shadow) && this.best > 0)
                    this._startGame('shadow');
            }
            return;
        }

        const jumped = Input.isPressed('Space')
                    || Input.isPressed('ArrowUp')
                    || Input.isPressed('KeyX')
                    || Input.isTouchStarted()
                    || Input.isMousePressed();

        // ── ONLINE WAITING (guest esperando seed del host) ─
        if (this.state === 'online-waiting') {
            this._moveClouds(dt * 0.3);
            this.groundOffset += PIPE_SPEED * 0.3 * dt;
            return; // esperar mensaje 'start' del host via callback
        }

        // ── IDLE ──────────────────────────────────────────
        if (this.state === 'idle') {
            this.birdY = GH / 2 + Math.sin(this._time * 3) * 9;
            if (this.mode === 'shadow') {
                ShadowBot.y = GH / 2 + Math.sin(this._time * 3 + 0.8) * 9;
            }
            if (this.mode === 'online' && this._peerBird) {
                this._peerBird.y = GH / 2 + Math.sin(this._time * 3 + 1.2) * 9;
            }
            this._moveClouds(dt * 0.5);
            this.groundOffset += PIPE_SPEED * dt;
            if (jumped) {
                if (this.mode === 'online' && this._onlineRole === 'guest') {
                    // Guest cannot start the game, only the host can
                } else {
                    this.state = 'playing';
                    this._flap();
                    if (this.mode === 'online') {
                        Online.send({ type: 'started' });
                    }
                }
            }
            return;
        }

        // ── GAMEOVER ──────────────────────────────────────
        if (this.state === 'gameover') {
            this._gameOverTimer += dt;
            if (this.birdY < GROUND_Y + 50) {
                this.birdVY   += GRAVITY * dt;
                this.birdY    += this.birdVY * dt;
                this.birdAngle = Math.min(Math.PI / 2, this.birdAngle + 7 * dt);
            }
            this._flashBird = Math.floor(this._gameOverTimer * 12) % 2 === 0;
            if (this._gameOverTimer > 0.8 && jumped) {
                this._returnToSelect();
            }
            return;
        }

        // ── PLAYING ───────────────────────────────────────
        if (this.state === 'playing' && jumped) this._flap();

        // Física del pájaro local
        if (this.state === 'spectating') {
            if (this.birdY < GROUND_Y + 50) {
                this.birdVY   += GRAVITY * dt;
                this.birdY    += this.birdVY * dt;
                this.birdAngle = Math.min(Math.PI / 2, this.birdAngle + 7 * dt);
            }
        } else {
            this.birdVY   += GRAVITY * dt;
            this.birdY    += this.birdVY * dt;
            const targetAngle = this.birdVY < -100
                ? -0.42
                : Math.min(Math.PI / 2, (this.birdVY / 350));
            this.birdAngle += (targetAngle - this.birdAngle) * Math.min(1, dt * 9);
        }

        // Spawn de tuberías
        this.pipeTimer -= dt;
        if (this.pipeTimer <= 0) {
            this._spawnPipe();
            this.pipeTimer = PIPE_EVERY;
        }

        // Mover tuberías y contar puntos
        for (const p of this.pipes) {
            p.x -= PIPE_SPEED * dt;
            if (!p.passed && p.x + PIPE_W < BIRD_X) {
                p.passed = true;
                if (this.state === 'playing') {
                    this.score++;
                    Audio.play('score');
                }
            }
        }
        this.pipes = this.pipes.filter(p => p.x + PIPE_W + 20 > 0);

        // Scroll suelo y nubes
        this.groundOffset += PIPE_SPEED * dt;
        this._moveClouds(dt * 0.55);

        // ── Lógica de modo SHADOW ─────────────────────────
        if (this.mode === 'shadow') {
            ShadowBot.update(dt, this.pipes);

            if (this.state === 'spectating' && ShadowBot.dead) {
                this.state          = 'gameover';
                this._gameOverTimer = 0;
                this._flashBird     = false;
                return;
            }

            // Condición: bot supera best Y jugador no lo ha superado → bot gana
            if (!this._shadowPlayerExceededBest && this.score > this.best) {
                this._shadowPlayerExceededBest = true;
            }
            if (!this._shadowPlayerExceededBest && ShadowBot.score > this.best && !this._shadowBotWon) {
                this._shadowBotWon = true;
                Audio.play('hit');
                setTimeout(() => Audio.play('die'), 100);
                this.state          = 'gameover';
                this._gameOverTimer = 0;
                this._flashBird     = false;
                return;
            }
        }

        // ── Lógica de modo ONLINE ─────────────────────────
        if (this.mode === 'online') {
            // Enviar estado local al rival frecuentemente (20 fps)
            this._netTimer = (this._netTimer || 0) + dt;
            if (this._netTimer > 0.05) {
                this._netTimer = 0;
                Online.send({
                    type:  'state',
                    y:     this.birdY,
                    angle: this.birdAngle,
                    score: this.score
                });
            }
        }

        // Colisión jugador local
        if (this.state === 'playing' && this._checkCollision()) {
            this._playerDied();
        }
    },

    // ── Iniciar Online ────────────────────────────────────
    _onClickOnline() {
        // Mostrar menú intermedio inline en el canvas (state: 'online-setup')
        this.state = 'online-setup';
    },

    _hostOnline() {
        Online.on('onHostReady', () => {
            const el = document.getElementById('online-status');
            if (el) el.textContent = 'Código listo — esperando rival...';
        });
        Online.on('onConnected', () => {
            const el = document.getElementById('online-status');
            if (el) el.textContent = 'Conectado';
            document.getElementById('online-ui').classList.add('hidden');
            const seed = Math.random() * 0xFFFFFFFF | 0;
            this._startGame('online', 'host', seed);
            Online.send({ type: 'start', seed });
        });
        Online.on('onData', (data) => this._onOnlineMessage(data));
        Online.on('onDisconnect', () => this._onOnlineDisconnect());
        Online.on('onError', (err) => {
            const el = document.getElementById('online-status');
            if (el) el.textContent = 'Error: ' + err.type;
        });

        Online.host((code) => {
            document.getElementById('online-title').textContent = 'Crear partida';
            const el = document.getElementById('online-status');
            if (el) el.textContent = 'Esperando a un rival...';
            document.getElementById('host-view').classList.remove('hidden');
            document.getElementById('join-view').classList.add('hidden');
            document.getElementById('room-code-display').textContent = code;
            document.getElementById('online-ui').classList.remove('hidden');
        });
    },

    _joinOnline() {
        document.getElementById('online-title').textContent = 'Unirse a partida';
        const el = document.getElementById('online-status');
        if (el) el.textContent = 'Introduce el código del anfitrión';
        document.getElementById('host-view').classList.add('hidden');
        document.getElementById('join-view').classList.remove('hidden');
        document.getElementById('room-code-input').value = '';
        document.getElementById('online-ui').classList.remove('hidden');

        Online.on('onConnected', () => {
            if (el) el.textContent = 'Conectado';
            document.getElementById('online-ui').classList.add('hidden');
            this._onlineRole = 'guest';
            this.state = 'online-waiting';
            Online.send({ type: 'ready' });
        });
        Online.on('onData', (data) => this._onOnlineMessage(data));
        Online.on('onDisconnect', () => this._onOnlineDisconnect());
        Online.on('onError', (err) => {
            if (el) el.textContent = 'Error: ' + err.type;
            document.getElementById('join-btn').disabled = false;
        });

        const joinBtn = document.getElementById('join-btn');
        joinBtn.disabled = false;
        joinBtn.onclick = () => {
            const code = document.getElementById('room-code-input').value.trim().toUpperCase();
            if (code.length < 4) { if (el) el.textContent = 'Código demasiado corto'; return; }
            if (el) el.textContent = 'Conectando...'; joinBtn.disabled = true;
            Online.join(code);
        };
    },

    _onOnlineMessage(data) {
        if (data.type === 'ready') {
            if (this._onlineRole === 'host') {
                Online.send({ type: 'start', seed: this._gameSeed });
            }
        } else if (data.type === 'start') {
            // El host nos da el seed: comenzar la partida
            if (this.state === 'online-waiting') {
                this._startGame('online', 'guest', data.seed);
            }
        } else if (data.type === 'state') {
            if (this._peerBird) {
                this._peerBird.y     = data.y;
                this._peerBird.angle = data.angle;
                this._peerBird.score = data.score;
            }
        } else if (data.type === 'dead') {
            if (this._peerBird) {
                this._peerBird.dead  = true;
                this._peerBird.score = data.score;
                // Si ya estamos en gameover, podemos resolver resultado
                if (this.state === 'gameover' && this._onlineResult === null) {
                    this._onlineResult = this.score >= data.score ? 'win' : 'lose';
                } else if (this.state === 'spectating') {
                    // Estábamos espectando y el rival ha muerto: terminar partida
                    this._onlineResult = this.score >= data.score ? 'win' : 'lose';
                    this.state = 'gameover';
                    this._gameOverTimer = 0;
                    this._flashBird = false;
                } else if (this.state === 'playing') {
                    // El rival murió primero, pero nosotros seguimos
                    // Congelar la posición del rival
                    this._peerBird.frozen = true;
                }
            }
        } else if (data.type === 'started') {
            if (this.state === 'idle') {
                this.state = 'playing';
                this._flap();
            }
        }
    },

    _onOnlineDisconnect() {
        if (this.state === 'playing' || this.state === 'gameover' || this.state === 'idle' || this.state === 'online-waiting' || this.state === 'spectating') {
            this._onlineResult = 'disconnect';
            this.state         = 'gameover';
            this._gameOverTimer = 2;
        } else if (this.state === 'online-setup') {
            this._returnToSelect();
        }
        Online.destroy();
    },

    // ── Render ────────────────────────────────────────────
    render(ctx) {
        const W = Engine.W, H = Engine.H;

        // Fondo: cielo nocturno
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0,   '#0a1628');
        sky.addColorStop(0.6, '#0f2244');
        sky.addColorStop(1,   '#1a3a5e');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        this._drawStars(ctx);
        for (const c of this.clouds) drawCloud(ctx, c.x, c.y, c.s);

        if (this.state === 'select') {
            this._renderSelect(ctx, W, H);
            return;
        }

        if (this.state === 'online-setup') {
            this._renderOnlineSetup(ctx, W, H);
            return;
        }

        if (this.state === 'online-waiting') {
            this._renderOnlineWaiting(ctx, W, H);
            return;
        }

        // ── Tuberías ──────────────────────────────────────
        for (const p of this.pipes) {
            drawPipe(ctx, p.x, 0,      p.topH, true);
            drawPipe(ctx, p.x, p.botY, p.botH, false);
        }

        // ── Suelo ─────────────────────────────────────────
        drawGround(ctx, this.groundOffset);

        // ── Pájaro rival / bot (azul) ──────────────────────
        if (this.mode === 'shadow' && ShadowBot.active && !ShadowBot.dead) {
            drawBirdBlue(ctx, BIRD_X, ShadowBot.y, ShadowBot.angle, 0.70);
        }
        if (this.mode === 'online' && this._peerBird) {
            const pAlpha = this._peerBird.dead ? 0.30 : 0.75;
            // Host ve al guest (azul), guest ve al host (amarillo)
            if (this._onlineRole === 'host') {
                drawBirdBlue(ctx, BIRD_X, this._peerBird.y, this._peerBird.angle, pAlpha);
            } else {
                drawBird(ctx, BIRD_X, this._peerBird.y, this._peerBird.angle, pAlpha);
            }
        }

        // ── Pájaro local (amarillo para host/solo/shadow, azul para guest) ──
        const showBird = this.state !== 'gameover' || this._flashBird;
        if (showBird) {
            if (this.mode === 'online' && this._onlineRole === 'guest') {
                drawBirdBlue(ctx, BIRD_X, this.birdY, this.birdAngle);
            } else {
                drawBird(ctx, BIRD_X, this.birdY, this.birdAngle);
            }
        }

        // ── Puntuación ─────────────────────────────────────
        this._renderHUD(ctx, W, H);

        // ── Mensaje idle ───────────────────────────────────
        if (this.state === 'idle') {
            const pulse = 0.65 + 0.35 * Math.sin(this._time * 4);
            ctx.fillStyle = `rgba(255,255,255,${pulse})`;
            ctx.font      = "16px 'Courier New', monospace";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const msg = (this.mode === 'online' && this._onlineRole === 'guest') 
                ? 'Esperando al anfitrión...' 
                : 'Toca para empezar';
            ctx.fillText(msg, W / 2, H / 2 + 80);
        }

        // ── Game Over ──────────────────────────────────────
        if (this.state === 'gameover' && this._gameOverTimer > 0.35) {
            this._renderGameOver(ctx, W, H);
        }
    },

    // ── HUD de puntuación ─────────────────────────────────
    _renderHUD(ctx, W, H) {
        // Puntuación principal
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';
        ctx.font         = "bold 46px 'Courier New', monospace";
        ctx.shadowColor  = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur   = 6;
        ctx.fillStyle    = '#ffffff';
        ctx.fillText(this.score, W / 2, 16);
        ctx.restore();

        // Marcador del rival (online o bot)
        if (this.mode === 'shadow' && ShadowBot.active) {
            ctx.save();
            ctx.font      = "bold 18px 'Courier New', monospace";
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(79,195,247,0.85)';
            ctx.fillText(`${ShadowBot.score}`, W - 12, 20);
            ctx.restore();
        }
        if (this.mode === 'online' && this._peerBird) {
            ctx.save();
            ctx.font      = "bold 18px 'Courier New', monospace";
            ctx.textAlign = 'right';
            ctx.textBaseline = 'top';
            const rivalColor = this._onlineRole === 'host'
                ? 'rgba(79,195,247,0.85)'    // rival es azul
                : 'rgba(245,197,24,0.85)';   // rival es amarillo
            ctx.fillStyle = rivalColor;
            ctx.fillText(`⚔️ ${this._peerBird.score}`, W - 12, 20);
            ctx.restore();
        }
    },

    // ── Pantalla de selección ─────────────────────────────
    _renderSelect(ctx, W, H) {
        const gm = Engine.toGame(Input.getMouse().x, Input.getMouse().y);

        // Título
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = "bold 38px 'Courier New', monospace";
        ctx.fillStyle    = '#f5c518';
        ctx.shadowColor  = 'rgba(245,197,24,0.4)';
        ctx.shadowBlur   = 20;
        ctx.fillText('Flappy Bird', W / 2, 88);
        ctx.shadowBlur   = 0;
        ctx.font         = "13px 'Courier New', monospace";
        ctx.fillStyle    = '#4ecca3';
        ctx.fillText('Canvas 2D', W / 2, 118);
        ctx.restore();

        // Pájaro animado
        drawBird(ctx, W / 2, this.birdY, 0);

        // Mejor puntuación
        if (this.best > 0) {
            ctx.save();
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.font         = "15px 'Courier New', monospace";
            ctx.fillStyle    = '#4ecca3';
            ctx.fillText(`Mejor: ${this.best}`, W / 2, H / 2 + 50);
            ctx.restore();
        }

        // Botones
        const bw = 210, bh = 46, bx = W / 2 - bw / 2;
        const b1 = { x: bx, y: H / 2 + 78,  w: bw, h: bh };
        const b2 = { x: bx, y: H / 2 + 133, w: bw, h: bh };
        const b3 = { x: bx, y: H / 2 + 188, w: bw, h: bh };
        this._btns.play   = b1;
        this._btns.online = b2;
        this._btns.shadow = b3;

        drawBtn(ctx, 'Jugar',    b1.x, b1.y, b1.w, b1.h, '#f5c518', hitBtn(gm.x, gm.y, b1));
        drawBtn(ctx, 'Online',  b2.x, b2.y, b2.w, b2.h, '#4ecca3', hitBtn(gm.x, gm.y, b2));

        const shadowDisabled = this.best === 0;
        drawBtn(ctx, 'vs Sombra', b3.x, b3.y, b3.w, b3.h, '#4fc3f7',
            hitBtn(gm.x, gm.y, b3) && !shadowDisabled, shadowDisabled);

        if (shadowDisabled) {
            ctx.save();
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.font         = "11px 'Courier New', monospace";
            ctx.fillStyle    = '#303050';
            ctx.fillText('(Juega primero para desbloquear)', W / 2, H / 2 + 247);
            ctx.restore();
        }

        // Controles
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = "12px 'Courier New', monospace";
        ctx.fillStyle    = '#404060';
        ctx.fillText('Espacio / ↑ / Toca la pantalla para saltar', W / 2, H - 80);
        ctx.font         = "11px 'Courier New', monospace";
        ctx.fillStyle    = '#2a2a40';
        ctx.fillText('Flappy Bird · Vanilla JS', W / 2, H - 60);
        ctx.restore();

        drawGround(ctx, this.groundOffset || 0);
    },

    // ── Pantalla Online Setup ─────────────────────────────
    _renderOnlineSetup(ctx, W, H) {
        const gm = Engine.toGame(Input.getMouse().x, Input.getMouse().y);
        const cp = this._getClickPos();

        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = "bold 30px 'Courier New', monospace";
        ctx.fillStyle    = '#4ecca3';
        ctx.shadowColor  = 'rgba(78,204,163,0.35)';
        ctx.shadowBlur   = 16;
        ctx.fillText('En línea', W / 2, 90);
        ctx.shadowBlur   = 0;
        ctx.font         = "13px 'Courier New', monospace";
        ctx.fillStyle    = '#606080';
        ctx.fillText('¿Qué quieres hacer?', W / 2, 120);
        ctx.restore();

        const bw = 210, bh = 50, bx = W / 2 - bw / 2;
        const b1 = { x: bx, y: 155, w: bw, h: bh };
        const b2 = { x: bx, y: 218, w: bw, h: bh };
        const b3 = { x: bx, y: 320, w: bw, h: bh };
        this._btns.host = b1;
        this._btns.join = b2;
        this._btns.back = b3;

        drawBtn(ctx, 'Crear partida', b1.x, b1.y, b1.w, b1.h, '#f5c518', hitBtn(gm.x, gm.y, b1));
        drawBtn(ctx, 'Unirse',        b2.x, b2.y, b2.w, b2.h, '#4ecca3', hitBtn(gm.x, gm.y, b2));
        drawBtn(ctx, '← Volver',      b3.x, b3.y, b3.w, b3.h, '#606070', hitBtn(gm.x, gm.y, b3));

        // Etiquetas de colores
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = "12px 'Courier New', monospace";
        ctx.fillStyle = '#f5c518';
        ctx.fillText('Pájaro Amarillo · Anfitrión', W / 2, 280);
        ctx.fillStyle = '#4fc3f7';
        ctx.fillText('Pájaro Azul · Visitante', W / 2, 298);
        ctx.restore();

        if (cp) {
            if (hitBtn(cp.x, cp.y, b1)) this._hostOnline();
            if (hitBtn(cp.x, cp.y, b2)) this._joinOnline();
            if (hitBtn(cp.x, cp.y, b3)) this._returnToSelect();
        }

        drawGround(ctx, this.groundOffset || 0);
    },

    // ── Pantalla Online Waiting (guest esperando seed) ────
    _renderOnlineWaiting(ctx, W, H) {
        const dots = '.'.repeat((Math.floor(this._time * 2) % 3) + 1);
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = "bold 22px 'Courier New', monospace";
        ctx.fillStyle    = '#4ecca3';
        ctx.fillText('Conectado — esperando anfitrión' + dots, W / 2, H / 2);
        ctx.font         = "13px 'Courier New', monospace";
        ctx.fillStyle    = '#404060';
        ctx.fillText('El anfitrión iniciará la partida', W / 2, H / 2 + 35);
        ctx.restore();
        drawGround(ctx, this.groundOffset || 0);
    },

    // ── Panel de Game Over ────────────────────────────────
    _renderGameOver(ctx, W, H) {
        const panelW = 278, panelH = 220;
        const panelX = W / 2 - panelW / 2;
        const panelY = H / 2 - panelH / 2 - 20;

        // Fondo panel
        ctx.save();
        ctx.fillStyle = 'rgba(5,10,24,0.88)';
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 18);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245,197,24,0.4)';
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.roundRect(panelX, panelY, panelW, panelH, 18);
        ctx.stroke();
        ctx.restore();

        const cx = W / 2;
        const cy = panelY + panelH / 2;

        // Modo Shadow
        if (this.mode === 'shadow') {
            if (this._shadowBotWon) {
                Engine.text('¡El Bot ganó!', cx, cy - 68, '#4fc3f7', 24);
                Engine.text(`Tu puntuación: ${this.score}`, cx, cy - 32, '#ffffff', 16);
                Engine.text(`Bot superó: ${this.best}`, cx, cy - 8, '#4fc3f7', 14);
                Engine.text('El bot superó tu récord', cx, cy + 16, '#606080', 12);
            } else {
                const survived = this.score > ShadowBot.score;
                const resultColor = survived ? '#4ecca3' : '#4fc3f7';
                const resultText  = survived ? '¡Superaste al Bot! 🎉' : 'El Bot ganó';
                Engine.text(resultText, cx, cy - 68, resultColor, 22);
                Engine.text(`Tu: ${this.score}`, cx - 48, cy - 34, '#f5c518', 18);
                Engine.text(`Bot: ${ShadowBot.score}`, cx + 48, cy - 34, '#4fc3f7', 18);
            }
            const bestColor  = this.score > 0 && this.score === this.best ? '#f5c518' : '#4ecca3';
            const bestPrefix = this.score > 0 && this.score === this.best ? '🏆 ¡Nuevo récord!' : `Mejor: ${this.best}`;
            Engine.text(bestPrefix, cx, cy + 8, bestColor, 14);
        }
        // Modo Online
        else if (this.mode === 'online') {
            if (this._onlineResult === 'disconnect') {
                Engine.text('Rival desconectado', cx, cy - 68, '#e94560', 22);
            } else if (this._onlineResult === 'win') {
                Engine.text('¡Ganaste! 🎉', cx, cy - 68, '#4ecca3', 26);
            } else if (this._onlineResult === 'lose') {
                Engine.text('¡Perdiste!', cx, cy - 68, '#e94560', 26);
            } else {
                Engine.text('Esperando resultado...', cx, cy - 68, '#a0a0b0', 18);
            }
            Engine.text(`Tu puntuación: ${this.score}`, cx, cy - 30, '#ffffff', 16);
            if (this._peerBird) {
                Engine.text(`Rival: ${this._peerBird.score}`, cx, cy - 6, '#a0b0c0', 14);
            }
            const bestColor  = this.score > 0 && this.score === this.best ? '#f5c518' : '#4ecca3';
            const bestPrefix = this.score > 0 && this.score === this.best ? '🏆 ¡Nuevo récord!' : `Mejor: ${this.best}`;
            Engine.text(bestPrefix, cx, cy + 22, bestColor, 13);
        }
        // Modo Solo
        else {
            Engine.text('Game Over', cx, cy - 68, '#f5c518', 26);
            Engine.text(`Puntuación: ${this.score}`, cx, cy - 30, '#ffffff', 18);
            const bestColor  = this.score >= this.best ? '#f5c518' : '#4ecca3';
            const bestPrefix = this.score > 0 && this.score === this.best ? '🏆 ¡Nuevo récord!' : `Mejor: ${this.best}`;
            Engine.text(bestPrefix, cx, cy - 4, bestColor, 15);
        }

        // Separador
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 24, cy + 38);
        ctx.lineTo(panelX + panelW - 24, cy + 38);
        ctx.stroke();
        ctx.restore();

        if (this._gameOverTimer > 0.85) {
            const pulse = 0.6 + 0.4 * Math.sin(this._time * 5);
            ctx.save();
            ctx.globalAlpha  = pulse;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.font         = "13px 'Courier New', monospace";
            ctx.fillStyle    = '#a0a0b0';
            ctx.fillText('Toca para volver al menú', cx, cy + 66);
            ctx.restore();
        }
    },

    // ── Estrellas ─────────────────────────────────────────
    _drawStars(ctx) {
        if (!this._stars) {
            this._stars = [];
            for (let i = 0; i < 48; i++) {
                this._stars.push({
                    x:   Math.random() * GW,
                    y:   Math.random() * (GH * 0.55),
                    r:   0.4 + Math.random() * 1.6,
                    a:   0.25 + Math.random() * 0.7,
                    spd: 1.5 + Math.random() * 2.5
                });
            }
        }
        for (const s of this._stars) {
            const brightness = 0.55 + 0.45 * Math.sin(this._time * s.spd + s.x);
            ctx.fillStyle = `rgba(255,255,255,${(s.a * brightness).toFixed(2)})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

// ── Boot ──────────────────────────────────────────────────
window.onload = () => {
    Engine.init('game', { width: GW, height: GH, bg: '#0a1628' });
    Engine.start(game);
};