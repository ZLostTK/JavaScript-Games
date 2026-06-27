// ─────────────────────────────────────────────────────────────────────────────
//  RUNNER — Hub Game (PIXI + SpriteManager)
//  Animaciones: idle, walk, jump, fall, crouch
//  Assets: PNGs individuales de 128×129 en assets/character/
// ─────────────────────────────────────────────────────────────────────────────

// ── Constantes de mundo ──────────────────────────────────────────────────────
const W         = 800;
const H         = 450;
const GROUND_Y  = 360;          // Y del suelo (pies del personaje)
const GRAVITY   = 1800;         // px/s²
const JUMP_VEL  = -620;         // px/s (negativo = arriba)
const CROUCH_H  = 0.55;         // factor de escala cuando agacha
const RUN_SPEED_INIT = 280;     // px/s inicial
const SPEED_INC      = 20;      // px/s por segundo de juego
const OBS_INTERVAL_MIN = 1.1;
const OBS_INTERVAL_MAX = 2.4;

// ── Colores internos (fondo generado en PIXI) ───────────────────────────────
const C = {
    sky:        0x1a1a3e,
    ground:     0x2a2a4e,
    groundLine: 0x4ecca3,
    obstacle:   0xe94560,
    obstacleTl: 0xff8fa3,
    particle:   0xffdd57,
    scoreText:  0xffffff,
    ui:         0x4ecca3,
};

// ── Estado global del juego ──────────────────────────────────────────────────
const state = {
    screen:   'menu',   // 'menu' | 'playing' | 'dead'
    score:    0,
    hiScore:  0,
    speed:    RUN_SPEED_INIT,
    timeAlive: 0,
    
    player: {
        x: 120, y: GROUND_Y,
        vy: 0,
        onGround: true,
        crouching: false,
        anim: 'walk',    // animación activa
        scaleY: 1,
    },
    
    obstacles: [],     // { x, w, h, type }
    particles: [],     // { x, y, vx, vy, life, maxLife, color }
    bgLayers:  [],     // parallax (generadas con Graphics)
    nextObsTimer: 0,
    nextObsInterval: 1.5,
};

// ── Contenedores PIXI ────────────────────────────────────────────────────────
let bgContainer, worldContainer, uiContainer;

// ── Sprite del personaje (PIXI.AnimatedSprite via SpriteManager) ─────────────
let manager;
let playerSprite = null;   // PIXI.AnimatedSprite activo
let currentAnim  = '';

// ── Gráficos reutilizables ───────────────────────────────────────────────────
let groundGfx, obsPool = [], particleGfx;
let scoreText, hiText, msgText;

// ── Parallax layers data ─────────────────────────────────────────────────────
const BG_LAYERS = [
    { color: 0x16163a, speed: 0.0, rects: [] },  // cielo estático
    { color: 0x1e1e52, speed: 0.15, rects: generateBgRects(0.15, 8, 2, 80, 200, 60, 120) },
    { color: 0x28285a, speed: 0.35, rects: generateBgRects(0.35, 12, 80, 160, 30, 80) },
];

function generateBgRects(speed, count, yMin, yMax, wMin, wMax, hMin = 20, hMax = 50) {
    return Array.from({ length: count }, () => ({
        x:  Math.random() * W,
        y:  yMin + Math.random() * (yMax - yMin),
        w:  wMin + Math.random() * (wMax - wMin),
        h:  hMin + Math.random() * (hMax - hMin),
        ox: 0,   // offset de scroll
    }));
}

// ═════════════════════════════════════════════════════════════════════════════
const game = {
    
    // ── init ──────────────────────────────────────────────────────────────────
    async init() {
        Input.init(null);
        Audio.init();
        
        // Contenedores de escena
        bgContainer    = new PIXI.Container();
        worldContainer = new PIXI.Container();
        uiContainer    = new PIXI.Container();
        PIXIEngine.addChild(bgContainer);
        PIXIEngine.addChild(worldContainer);
        PIXIEngine.addChild(uiContainer);
        
        // Fondo
        this._buildBackground();
        
        // Suelo
        groundGfx = new PIXI.Graphics();
        worldContainer.addChild(groundGfx);
        
        // Partículas
        particleGfx = new PIXI.Graphics();
        worldContainer.addChild(particleGfx);
        
        // UI textos
        const style = { fontFamily: 'Segoe UI', fontSize: 20, fill: C.scoreText };
        scoreText = new PIXI.Text('Puntos: 0', style);
        hiText    = new PIXI.Text('Mejor: 0',  { ...style, fontSize: 14, fill: 0x4ecca3 });
        msgText   = new PIXI.Text('',          { ...style, fontSize: 28, fill: 0xe94560,
            fontWeight: 'bold' });
            scoreText.position.set(W - 160, 14);
            hiText.position.set(W - 160, 40);
            msgText.anchor.set(0.5);
            msgText.position.set(W / 2, H / 2 - 20);
            uiContainer.addChild(scoreText, hiText, msgText);
            
            // Cargar sprites del personaje
            await this._loadCharacter();
            
            // Input lobby online
            const inp = document.getElementById('room-code-input');
            inp.addEventListener('keydown', e => e.stopPropagation());
            inp.addEventListener('keyup',   e => e.stopPropagation());
            
            this._showMenu();
        },
        
        // ── update ────────────────────────────────────────────────────────────────
        update(dt) {
            const s = state;
            
            if (s.screen === 'menu') {
                this._updateMenu(dt);
                return;
            }
            if (s.screen === 'dead') {
                this._updateDead(dt);
                return;
            }
            
            // ── Playing ──
            Audio.resume();
            
            s.timeAlive += dt;
            s.speed      = RUN_SPEED_INIT + s.timeAlive * SPEED_INC;
            s.score      = Math.floor(s.timeAlive * 10);
            if (s.score > s.hiScore) s.hiScore = s.score;
            
            this._updatePlayer(dt);
            this._updateObstacles(dt);
            this._updateParticles(dt);
            this._checkCollision();
        },
        
        // ── render ────────────────────────────────────────────────────────────────
        render() {
            this._renderBackground();
            this._renderGround();
            this._renderObstacles();
            this._renderParticles();
            this._renderPlayer();
            this._renderUI();
        },
        
        // ═══════ CARGA DE SPRITES ═════════════════════════════════════════════════
        
        async _loadCharacter() {
            const FW = 128;
            const FH = 129;
            
            // ── Lista de archivos PNG individuales (128×129 c/u) ─────────────────
            // Agrega aquí los nuevos sprites que quieras cargar.
            const SPRITE_FILES = [
                'idle.png',
                'walk_0.png', 'walk_1.png',
                'jump_0.png', 'jump_1.png',
                'fall_0.png',
                'crouch_0.png',
            ];
            
            // ── Animaciones (definidas manualmente por nombre de sprite) ─────────
            // Edita los arrays para cambiar qué frames entran en cada animación.
            // speed = fps (fotogramas por segundo)
            const ANIMATIONS = {
                idle:   { frames: ['idle'],                     speed: 2 },
                walk:   { frames: ['walk_0', 'walk_1'],         speed: 4 },
                jump:   { frames: ['jump_0', 'jump_1'],         speed: 4 },
                fall:   { frames: ['fall_0'],                   speed: 2 },
                crouch: { frames: ['crouch_0'],                 speed: 2 },
            };
            
            // Cargar cada PNG individual
            const loaded = {};
            for (const file of SPRITE_FILES) {
                const name = file.replace(/\.\w+$/, '');
                const img  = await SpriteProcessor._loadImage(`assets/character/${file}`);
                const canvas = document.createElement('canvas');
                canvas.width  = FW;
                canvas.height = FH;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                loaded[name] = { texture: canvas, name, width: FW, height: FH };
            }
            
            // Almacenar en el SpriteManager
            manager = new SpriteManager(PIXIEngine, 'pixi');
            manager.sprites['hero'] = loaded;
            
            // Registrar animaciones con su velocidad (fps)
            for (const [animName, def] of Object.entries(ANIMATIONS)) {
                manager.createAnimation('hero', animName, def.frames, { speed: def.speed ?? 10 });
            }
            
            // Debug grid con tecla D
            window.spriteManager = manager;
            
            this._setAnim('walk');
        },
        
        // ── Cambia la animación activa del personaje ──────────────────────────────
        _setAnim(name) {
            if (currentAnim === name) return;
            currentAnim = name;
            
            if (playerSprite) {
                worldContainer.removeChild(playerSprite);
            }
            
            playerSprite = manager.createAnimationAs('hero', name);
            playerSprite.loop   = (name !== 'jump');
            playerSprite.anchor.set(0.5, 1);   // pivote en pies
            worldContainer.addChild(playerSprite);
            playerSprite.play();
        },
        
        // ═══════ LÓGICA DE JUGADOR ════════════════════════════════════════════════
        
        _updatePlayer(dt) {
            const p = state.player;
            
            // Input
            const jump   = Input.isPressed('Space') || Input.isPressed('ArrowUp') || Input.isPressed('KeyW');
            const crouch = Input.isDown('ArrowDown') || Input.isDown('KeyS');
            
            // Crouch (solo en suelo)
            p.crouching = p.onGround && crouch;
            
            // Salto
            if (jump && p.onGround) {
                p.vy        = JUMP_VEL;
                p.onGround  = false;
                Audio.synth({ type: 'sine', freq: 520, duration: 0.12, volume: 0.25 });
            }
            
            // Gravedad
            if (!p.onGround) {
                p.vy += GRAVITY * dt;
            }
            
            // Mover Y
            p.y += p.vy * dt;
            
            // Aterrizar
            if (p.y >= GROUND_Y) {
                p.y        = GROUND_Y;
                p.vy       = 0;
                p.onGround = true;
            }
            
            // ── Decidir animación ──
            const newAnim = !p.onGround
            ? (p.vy < 0 ? 'jump' : 'fall')
            : p.crouching
            ? 'crouch'
            : 'walk';
            
            this._setAnim(newAnim);
            
            p.scaleY = 1;
        },
        
        // ═══════ OBSTÁCULOS ═══════════════════════════════════════════════════════
        
        _updateObstacles(dt) {
            const s = state;
            
            // Timer para spawnear
            s.nextObsTimer -= dt;
            if (s.nextObsTimer <= 0) {
                this._spawnObstacle();
                s.nextObsTimer = OBS_INTERVAL_MIN +
                Math.random() * (OBS_INTERVAL_MAX - OBS_INTERVAL_MIN);
            }
            
            // Mover y limpiar
            for (const obs of s.obstacles) {
                obs.x -= s.speed * dt;
            }
            state.obstacles = s.obstacles.filter(o => o.x + o.w > -20);
        },
        
        _spawnObstacle() {
            // type 0 = cactus alto (saltar), type 1 = barrera baja (agacharse)
            const type = Math.random() < 0.5 ? 0 : 1;
            const w = 30 + Math.random() * 20;
            const h = type === 0
            ? 50 + Math.random() * 40    // cactus: 50–90px
            : 28 + Math.random() * 14;   // barrera: 28–42px (pasar agachado)
            
            state.obstacles.push({ x: W + 20, w, h, type });
        },
        
        // ═══════ COLISIÓN ════════════════════════════════════════════════════════
        
        _checkCollision() {
            const p   = state.player;
            const pw  = 32;
            const ph  = p.scaleY * 56;    // altura efectiva del personaje
            const px1 = p.x - pw * 0.4;
            const px2 = p.x + pw * 0.4;
            const py1 = p.y - ph;
            const py2 = p.y;
            
            for (const obs of state.obstacles) {
                const ox1 = obs.x + 4;
                const ox2 = obs.x + obs.w - 4;
                const oy1 = GROUND_Y - obs.h;
                const oy2 = GROUND_Y;
                
                const hit = px1 < ox2 && px2 > ox1 && py1 < oy2 && py2 > oy1;
                if (hit) {
                    this._die();
                    return;
                }
            }
        },
        
        _die() {
            state.screen = 'dead';
            this._setAnim('idle');
            Audio.synth({ type: 'noise', freq: 80, duration: 0.35, volume: 0.4 });
            
            // Explotar partículas
            for (let i = 0; i < 18; i++) {
                const angle = Math.random() * Math.PI * 2;
                const spd   = 80 + Math.random() * 220;
                state.particles.push({
                    x: state.player.x, y: state.player.y - 28,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd - 100,
                    life: 0.6 + Math.random() * 0.4,
                    maxLife: 1,
                    color: Math.random() < 0.5 ? C.obstacle : C.particle,
                });
            }
        },
        
        // ═══════ PARTÍCULAS ═══════════════════════════════════════════════════════
        
        _updateParticles(dt) {
            for (const p of state.particles) {
                p.x    += p.vx * dt;
                p.y    += p.vy * dt;
                p.vy   += 400 * dt;
                p.life -= dt;
            }
            state.particles = state.particles.filter(p => p.life > 0);
        },
        
        // ═══════ MENÚ / DEAD SCREEN ═══════════════════════════════════════════════
        
        _showMenu() {
            state.screen = 'menu';
            msgText.text = 'RUNNER\n\nEspacio / ↑ para saltar\n↓ para agacharse\n\n[Enter] para jugar';
            msgText.style.fontSize = 18;
            this._setAnim('idle');
        },
        
        _updateMenu(dt) {
            if (Input.isPressed('Enter') || Input.isPressed('Space')) {
                this._startGame();
            }
        },
        
        _updateDead(dt) {
            this._updateParticles(dt);
            if (Input.isPressed('Enter') || Input.isPressed('Space')) {
                this._startGame();
            }
        },
        
        _startGame() {
            Audio.resume();
            Object.assign(state, {
                screen:    'playing',
                score:     0,
                speed:     RUN_SPEED_INIT,
                timeAlive: 0,
                obstacles: [],
                particles: [],
                nextObsTimer:    1.5,
                nextObsInterval: 1.5,
                player: {
                    x: 120, y: GROUND_Y,
                    vy: 0,
                    onGround: true,
                    crouching: false,
                    anim: 'walk',
                    scaleY: 1,
                },
            });
            msgText.text = '';
            this._setAnim('walk');
        },
        
        // ═══════ FONDO PARALLAX ═══════════════════════════════════════════════════
        
        _buildBackground() {
            for (const layer of BG_LAYERS) {
                const gfx = new PIXI.Graphics();
                layer.gfx = gfx;
                bgContainer.addChild(gfx);
            }
        },
        
        _renderBackground() {
            const spd = state.screen === 'playing' ? state.speed : 0;
            
            for (const layer of BG_LAYERS) {
                const gfx = layer.gfx;
                gfx.clear();
                
                // Fondo sólido solo en primera capa
                if (layer.speed === 0) {
                    gfx.beginFill(layer.color);
                    gfx.drawRect(0, 0, W, H);
                    gfx.endFill();
                    continue;
                }
                
                // Mover rects
                for (const r of layer.rects) {
                    r.ox -= spd * layer.speed * (1 / 60);
                    if (r.ox + r.x < -r.w) r.ox += W + r.w;
                    
                    gfx.beginFill(layer.color);
                    gfx.drawRect(r.x + r.ox, r.y, r.w, r.h);
                    gfx.endFill();
                }
            }
        },
        
        // ═══════ SUELO ════════════════════════════════════════════════════════════
        
        _renderGround() {
            groundGfx.clear();
            groundGfx.beginFill(C.ground);
            groundGfx.drawRect(0, GROUND_Y + 2, W, H - GROUND_Y);
            groundGfx.endFill();
            groundGfx.lineStyle(2, C.groundLine, 0.8);
            groundGfx.moveTo(0, GROUND_Y + 2);
            groundGfx.lineTo(W, GROUND_Y + 2);
        },
        
        // ═══════ OBSTÁCULOS (Graphics) ════════════════════════════════════════════
        
        _renderObstacles() {
            // Reutilizar un Graphics por frame
            if (!this._obsGfx) {
                this._obsGfx = new PIXI.Graphics();
                worldContainer.addChild(this._obsGfx);
            }
            const g = this._obsGfx;
            g.clear();
            
            for (const obs of state.obstacles) {
                const y = GROUND_Y - obs.h;
                if (obs.type === 0) {
                    // Cactus: cuerpo principal
                    g.beginFill(C.obstacle);
                    g.drawRoundedRect(obs.x, y, obs.w, obs.h, 4);
                    g.endFill();
                    // Brillo
                    g.beginFill(C.obstacleTl, 0.4);
                    g.drawRoundedRect(obs.x + 4, y + 4, obs.w * 0.3, obs.h * 0.5, 3);
                    g.endFill();
                } else {
                    // Barrera baja
                    g.beginFill(C.obstacle);
                    g.drawRoundedRect(obs.x, y, obs.w, obs.h, 3);
                    g.endFill();
                    g.beginFill(C.obstacleTl, 0.35);
                    g.drawRoundedRect(obs.x + 3, y + 3, obs.w - 6, 6, 2);
                    g.endFill();
                }
            }
        },
        
        // ═══════ PARTÍCULAS (Graphics) ════════════════════════════════════════════
        
        _renderParticles() {
            particleGfx.clear();
            for (const p of state.particles) {
                const alpha = Math.max(0, p.life / p.maxLife);
                particleGfx.beginFill(p.color, alpha);
                const r = 3 + 4 * alpha;
                particleGfx.drawCircle(p.x, p.y, r);
                particleGfx.endFill();
            }
        },
        
        // ═══════ JUGADOR (AnimatedSprite PIXI) ════════════════════════════════════
        
        _renderPlayer() {
            if (!playerSprite) return;
            const p = state.player;
            playerSprite.x      = p.x;
            playerSprite.y = p.y;
            // La escala X puede fliparse si el personaje va hacia atrás (no aplica en runner)
            playerSprite.scale.x = 1;
        },
        
        // ═══════ UI ═══════════════════════════════════════════════════════════════
        
        _renderUI() {
            scoreText.text = `Puntos: ${state.score}`;
            hiText.text    = `Mejor: ${state.hiScore}`;
            
            if (state.screen === 'dead' && msgText.text === '') {
                msgText.style.fontSize = 22;
                msgText.text = `GAME OVER\n\nPuntos: ${state.score}\n\n[Enter] para reintentar`;
            }
            if (state.screen === 'playing') {
                msgText.text = '';
            }
        },
        
        // ═══════ FONDO (alias para claridad) ══════════════════════════════════════
        _buildBgLayer(layer) { /* ya hecho en _buildBackground */ },
    };
    
    // ── Arranque ─────────────────────────────────────────────────────────────────
    window.onload = () => {
        PIXIEngine.init('game-container', { width: W, height: H, bg: 0x0f0f1a });
        PIXIEngine.start(game);
    };