// ─── Constantes ───────────────────────────────────────────────────────────────
const W = 960, H = 540;
const GROUND_Y = H - 80;
const GRAVITY  = 1800;
const JUMP_VY  = -620;
const SPEED    = 220;
const SCALE    = 2;

const manager = new SpriteManager();

const game = {
    sprite: null,
    x: W / 2,
    y: GROUND_Y,
    vy: 0,
    onGround: true,
    facingRight: true,
    crouching: false,
    currentAnim: '',

    async init() {
        Input.init(null);
        window.spriteManager = manager;

        const spriteData = [
            { name: 'idle', x: 384, y: 0, width: 128, height: 129 },
            { name: 'walk_1', x: 0, y: 129, width: 128, height: 129 },
            { name: 'walk_2', x: 128, y: 129, width: 128, height: 129 },
            { name: 'jump_1', x: 256, y: 129, width: 128, height: 129 },
            { name: 'attack', x: 0, y: 256, width: 128, height: 129 },
            { name: 'special', x: 0, y: 0, width: 128, height: 129 },
        ];
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 7; col++) {
                spriteData.push({
                    name: `char_${row}_${col}`,
                    x: col * 128,
                    y: row * 129,
                    width: 128,
                    height: 129,
                });
            }
        }

        await manager.load('spritesheet-characters-default.png', spriteData, {
            name: 'characters',
            scale: SCALE,
            animations: {
                idle: { frames: ['idle'], speed: 1, loop: true },
                walk: { frames: 'walk_{1-2}', speed: 4, loop: true },
                jump: { frames: 'char_3_{0-6}', speed: 10, loop: false },
                crouch: { frames: 'char_4_{0-6}', speed: 8, loop: false },
            },
        });

        // Suelo
        const ground = new PIXI.Graphics();
        ground.rect(0, GROUND_Y, W, H - GROUND_Y).fill({ color: 0x0a0a14 });
        ground.rect(0, GROUND_Y, W, 2).fill({ color: 0x4ecca3 });
        PIXIEngine.addChild(ground);

        // Sprite inicial
        this._buildSprite('idle');

        // Debug D
        window.addEventListener('keydown', e => {
            if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                SpriteProcessor.toggleDebugGrid(manager);
                // Forzar render de thumbnails vacías después de que el DOM se construya
                setTimeout(() => this._patchThumbnails(), 120);
            }
        });
    },

    _buildSprite(anim) {
        if (this.sprite) {
            PIXIEngine.removeChild(this.sprite);
            this.sprite.destroy();
        }
        const loop = (anim === 'idle' || anim === 'walk');
        this.sprite = manager.createAnimationAs('characters', anim, { loop });
        this.sprite.anchor.set(0.5, 1.0);
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        this.sprite.scale.x = this.facingRight ? 1 : -1;
        PIXIEngine.addChild(this.sprite);
        this.sprite.play();
        this.currentAnim = anim;
    },

    // ── Parche thumbnails del debug grid ─────────────────────────────────────
    // El SpriteProcessor dibuja los canvas de thumbnail solo al hacer hover/click.
    // Aquí disparamos el evento correcto en cada item para que se dibujen solos.
    _patchThumbnails() {
        // Intentar con distintos selectores que el processor podría usar
        const candidates = [
            '.sprite-item', '.sprite-cell', '.sprite-thumb',
            '.grid-item', '[data-sprite]', '.debug-item',
        ];
        let items = [];
        for (const sel of candidates) {
            items = [...document.querySelectorAll(sel)];
            if (items.length > 0) break;
        }
        // Fallback: buscar cualquier canvas pequeño dentro de un overlay/modal
        if (items.length === 0) {
            const overlay = document.querySelector(
                '.debug-overlay, .sprite-debug, [id*="debug"], [class*="debug"]'
            );
            if (overlay) {
                items = [...overlay.querySelectorAll('div')].filter(d => d.querySelector('canvas'));
            }
        }
        items.forEach((item, i) => {
            setTimeout(() => {
                item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
                item.dispatchEvent(new MouseEvent('mouseover',  { bubbles: true }));
            }, i * 2); // escalonado para no bloquear el hilo
        });
    },

    update(dt) {
        const left  = Input.isDown('ArrowLeft')  || Input.isDown('a') || Input.isDown('A');
        const right = Input.isDown('ArrowRight') || Input.isDown('d') || Input.isDown('D');
        const jump  = Input.isPressed('ArrowUp');
        const down  = Input.isDown('ArrowDown')  || Input.isDown('s') || Input.isDown('S');

        // Horizontal
        if (!this.crouching) {
            if (right) { this.x += SPEED * dt; this.facingRight = true;  }
            if (left)  { this.x -= SPEED * dt; this.facingRight = false; }
        }
        this.x = Math.max(40, Math.min(W - 40, this.x));

        // Salto
        if (jump && this.onGround && !this.crouching) {
            this.vy = JUMP_VY;
            this.onGround = false;
        }

        // Gravedad
        if (!this.onGround) {
            this.vy += GRAVITY * dt;
            this.y  += this.vy * dt;
            if (this.y >= GROUND_Y) {
                this.y = GROUND_Y;
                this.vy = 0;
                this.onGround = true;
            }
        }

        // Agachar
        this.crouching = down && this.onGround;

        // Elegir animación
        let anim;
        if (this.crouching)      anim = 'crouch';
        else if (!this.onGround) anim = 'jump';
        else if (left || right)  anim = 'walk';
        else                     anim = 'idle';

        if (anim !== this.currentAnim) this._buildSprite(anim);

        // Posición y flip
        this.sprite.x = this.x;
        this.sprite.y = this.y;
        this.sprite.scale.x = this.facingRight ? 1 : -1;
    },
};

GameBoot.startPIXI(game, { width: 640, height: 480 });