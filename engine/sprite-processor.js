class SpriteProcessor {
    static cache = new Map();
    static textures = new Map();
    static engineType = null;
    static _detectedEngine = null;
    
    static detectEngine() {
        if (this._detectedEngine) return this._detectedEngine;

        if (typeof RenderBridge !== 'undefined') {
            const type = RenderBridge.type();
            if (type === 'pixi' || type === 'canvas' || type === 'little') {
                this._detectedEngine = type === 'little' ? 'canvas' : type;
                this.engineType = this._detectedEngine;
                return this._detectedEngine;
            }
        }

        if (typeof PIXIEngine !== 'undefined' && PIXIEngine._running) {
            this._detectedEngine = 'pixi';
            this.engineType = 'pixi';
            return 'pixi';
        }
        if (typeof LittleEngine !== 'undefined' && LittleEngine._running) {
            this._detectedEngine = 'canvas';
            this.engineType = 'canvas';
            return 'canvas';
        }
        if (typeof Engine !== 'undefined' && Engine.canvas) {
            this._detectedEngine = 'canvas';
            this.engineType = 'canvas';
            return 'canvas';
        }
        if (typeof DOMEngine !== 'undefined' && DOMEngine.container) {
            this._detectedEngine = 'dom';
            this.engineType = 'dom';
            return 'dom';
        }
        if (typeof PIXI !== 'undefined' && PIXI.Application) {
            this._detectedEngine = 'pixi';
            this.engineType = 'pixi';
            return 'pixi';
        }
        this._detectedEngine = 'canvas';
        this.engineType = 'canvas';
        return 'canvas';
    }
    
    static setEngineType(type) {
        this.engineType = type;
        this._detectedEngine = type;
    }
    
    static getEngineType() {
        if (!this.engineType) {
            this.detectEngine();
        }
        return this.engineType;
    }
    
    static async loadSpriteSheet(imagePath, spriteData, options = {}) {
        const {
            scale = 1,
            anchorX = 0.5,
            anchorY = 0.5,
        } = options;
        
        let baseTexture;
        if (this.cache.has(imagePath)) {
            baseTexture = this.cache.get(imagePath);
        } else {
            baseTexture = await this._loadImage(imagePath);
            this.cache.set(imagePath, baseTexture);
        }
        
        const sprites = {};
        
        for (const sprite of spriteData) {
            const texture = this._extractTexture(baseTexture, sprite, scale);
            sprites[sprite.name] = {
                texture,
                name: sprite.name,
                width: sprite.width * scale,
                height: sprite.height * scale,
                originalWidth: sprite.width,
                originalHeight: sprite.height,
                anchor: { x: anchorX, y: anchorY },
            };
        }
        
        return sprites;
    }
    
    static async _loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }
    
    static _extractTexture(image, sprite, scale) {
        const canvas = document.createElement('canvas');
        canvas.width = sprite.width * scale;
        canvas.height = sprite.height * scale;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(
            image,
            sprite.x, sprite.y,
            sprite.width, sprite.height,
            0, 0,
            sprite.width * scale,
            sprite.height * scale
        );
        
        return canvas;
    }
    
    static createAnimation(sprites, frameNames, options = {}) {
        const {
            speed = 10,
            loop = true,
            onComplete = null,
        } = options;
        
        const frames = frameNames.map(name => {
            const sprite = sprites[name];
            if (!sprite) throw new Error(`Sprite "${name}" not found`);
            return sprite.texture;
        });
        
        return {
            frames,
            speed,
            loop,
            onComplete,
            currentFrame: 0,
            elapsed: 0,
            
            update(dt) {
                this.elapsed += dt;
                if (this.elapsed >= 1 / this.speed) {
                    this.elapsed = 0;
                    this.currentFrame++;
                    
                    if (this.currentFrame >= frames.length) {
                        if (loop) {
                            this.currentFrame = 0;
                        } else {
                            this.currentFrame = frames.length - 1;
                            if (onComplete) onComplete();
                        }
                    }
                }
            },
            
            getTexture() {
                return frames[this.currentFrame];
            },
            
            reset() {
                this.currentFrame = 0;
                this.elapsed = 0;
            },
            
            setFrame(index) {
                this.currentFrame = Math.max(0, Math.min(index, frames.length - 1));
            },
        };
    }
    
    static createSpriteGroup(sprites, config = {}) {
        const groups = {};
        
        for (const [name, spriteData] of Object.entries(sprites)) {
            const groupName = this._getGroupName(name, config);
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push({ name, ...spriteData });
        }
        
        return groups;
    }
    
    static _getGroupName(spriteName, config) {
        const { prefix = '', separator = '_', groupIndex = 0 } = config;
        
        if (config.customGroups) {
            for (const [group, pattern] of Object.entries(config.customGroups)) {
                if (typeof pattern === 'string' && spriteName.startsWith(pattern)) {
                    return group;
                }
                if (pattern instanceof RegExp && pattern.test(spriteName)) {
                    return group;
                }
                if (typeof pattern === 'function' && pattern(spriteName)) {
                    return group;
                }
            }
        }
        
        if (config.groupByPrefix) {
            const parts = spriteName.split(separator);
            return parts[groupIndex] || 'default';
        }
        
        return 'default';
    }
    
    static defineAnimations(sprites, animationDefs) {
        const animations = {};
        
        for (const [animName, config] of Object.entries(animationDefs)) {
            let frameList, speed, loop, onComplete;
            
            if (typeof config === 'string') {
                const resolved = this._parseFrameRange(config, animName);
                frameList = resolved.values.map(i => `${resolved.prefix}${i}`);
                speed = 10;
                loop = true;
                onComplete = null;
            } else {
                speed = config.speed ?? 10;
                loop = config.loop ?? true;
                onComplete = config.onComplete || null;
                
                if (typeof config.frames === 'string') {
                    const resolved = this._parseFrameRange(config.frames, animName);
                    frameList = resolved.values.map(i => `${resolved.prefix}${i}`);
                } else if (Array.isArray(config.frames)) {
                    frameList = config.frames;
                } else {
                    throw new Error(`Invalid animation definition for "${animName}"`);
                }
            }
            
            animations[animName] = this.createAnimation(sprites, frameList, { speed, loop, onComplete });
        }
        
        return animations;
    }
    
    static _parseFrameRange(rangeStr, defaultPrefix) {
        const trimmed = rangeStr.trim();
        
        const braceMatch = trimmed.match(/^(.+?)\{([\d,\-\s]+)\}$/);
        if (braceMatch) {
            return {
                prefix: braceMatch[1],
                values: this._expandRangeExpression(braceMatch[2])
            };
        }
        
        if (/^[\d,\-\s]+$/.test(trimmed)) {
            return {
                prefix: defaultPrefix || '',
                values: this._expandRangeExpression(trimmed)
            };
        }
        
        const legacyMatch = trimmed.match(/^(.+?)(\d+)-(\d+)$/);
        if (legacyMatch) {
            return {
                prefix: legacyMatch[1],
                values: this._range(parseInt(legacyMatch[2], 10), parseInt(legacyMatch[3], 10))
            };
        }
        
        return {
            prefix: trimmed,
            values: ['']
        };
    }
    
    static _expandRangeExpression(expr) {
        const values = [];
        const parts = expr.split(',');
        for (let part of parts) {
            part = part.trim();
            if (part === '') continue;
            if (part.includes('-')) {
                const [s, e] = part.split('-').map(n => parseInt(n.trim(), 10));
                for (let i = s; i <= e; i++) values.push(i);
            } else {
                values.push(parseInt(part, 10));
            }
        }
        return values;
    }
    
    static _range(start, end) {
        const values = [];
        for (let i = start; i <= end; i++) values.push(i);
        return values;
    }
    
    static processGrid(imagePath, options = {}) {
        const {
            spriteWidth = 32,
            spriteHeight = 32,
            columns = 1,
            rows = 1,
            scale = 1,
            offsetX = 0,
            offsetY = 0,
            spacingX = 0,
            spacingY = 0,
            nameGenerator = (col, row) => `sprite_${row}_${col}`,
        } = options;
        
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const sprites = {};
                const totalSprites = columns * rows;
                
                for (let row = 0; row < rows; row++) {
                    for (let col = 0; col < columns; col++) {
                        const x = offsetX + col * (spriteWidth + spacingX);
                        const y = offsetY + row * (spriteHeight + spacingY);
                        const name = nameGenerator(col, row);
                        
                        if (x + spriteWidth > img.width || y + spriteHeight > img.height) {
                            console.warn(`Sprite "${name}" exceeds image bounds`);
                            continue;
                        }
                        
                        const canvas = document.createElement('canvas');
                        canvas.width = spriteWidth * scale;
                        canvas.height = spriteHeight * scale;
                        const ctx = canvas.getContext('2d');
                        
                        ctx.drawImage(
                            img,
                            x, y,
                            spriteWidth, spriteHeight,
                            0, 0,
                            spriteWidth * scale,
                            spriteHeight * scale
                        );
                        
                        sprites[name] = {
                            texture: canvas,
                            name,
                            width: spriteWidth * scale,
                            height: spriteHeight * scale,
                            originalWidth: spriteWidth,
                            originalHeight: spriteHeight,
                            gridPosition: { col, row },
                        };
                    }
                }
                
                resolve(sprites);
            };
            img.onerror = reject;
            img.src = imagePath;
        });
    }
    
    static processJSON(imagePath, jsonData, options = {}) {
        return this.loadSpriteSheet(imagePath, jsonData, options);
    }
    
    static async processWithNaming(imagePath, spriteData, namingConfig) {
        const { separator = '_', nameFormat = 'original', ...loadOptions } = namingConfig;
        
        let processedData = spriteData;
        
        if (typeof spriteData === 'string') {
            const response = await fetch(spriteData);
            processedData = await response.json();
        }
        
        const sprites = await this.loadSpriteSheet(imagePath, processedData, loadOptions);
        
        const namedSprites = {};
        
        for (const [originalName, sprite] of Object.entries(sprites)) {
            let newName = originalName;
            
            if (nameFormat === 'sequential') {
                newName = `sprite_${Object.keys(namedSprites).length}`;
            } else if (nameFormat === 'indexed') {
                const idx = Object.keys(namedSprites).length;
                newName = `sprite_${String(idx).padStart(3, '0')}`;
            } else if (typeof nameFormat === 'function') {
                newName = nameFormat(originalName, sprite, namedSprites);
            }
            
            namedSprites[newName] = sprite;
        }
        
        return namedSprites;
    }
    
    static clearCache() {
        this.cache.clear();
        this.textures.clear();
    }
    
    static createDOMElement(sprite, options = {}) {
        const {
            tag = 'div',
            useImg = true,
        } = options;
        
        let element;
        
        if (useImg && sprite.texture) {
            element = document.createElement('img');
            element.src = sprite.texture.toDataURL();
        } else {
            element = document.createElement(tag);
            if (sprite.texture) {
                element.style.backgroundImage = `url(${sprite.texture.toDataURL()})`;
                element.style.backgroundSize = 'cover';
            }
        }
        
        element.style.width = `${sprite.width}px`;
        element.style.height = `${sprite.height}px`;
        
        if (sprite.anchor) {
            element.style.transformOrigin = `${sprite.anchor.x * 100}% ${sprite.anchor.y * 100}%`;
        }
        
        return element;
    }
    
    static createCanvasTexture(sprite, context) {
        if (!sprite.texture) return null;
        
        const canvas = document.createElement('canvas');
        canvas.width = sprite.width;
        canvas.height = sprite.height;
        const ctx = canvas.getContext(context || '2d');
        ctx.drawImage(sprite.texture, 0, 0);
        
        return canvas;
    }
    
    static toPIXI(sprite, options = {}) {
        const { anchorX = 0.5, anchorY = 0.5 } = options;
        
        const texture = PIXI.Texture.from(sprite.texture);
        const pixiSprite = new PIXI.Sprite(texture);
        
        pixiSprite.width = sprite.width;
        pixiSprite.height = sprite.height;
        pixiSprite.anchor.set(anchorX, anchorY);
        
        pixiSprite._originalWidth = sprite.originalWidth;
        pixiSprite._originalHeight = sprite.originalHeight;
        
        return pixiSprite;
    }
    
    static toCanvas(sprite) {
        return sprite.texture;
    }
    
    static toDOM(sprite, options = {}) {
        return this.createDOMElement(sprite, options);
    }
    
    static getFormattedSprite(sprite, options = {}) {
        const engine = this.getEngineType();
        
        switch (engine) {
            case 'pixi':
            return this.toPIXI(sprite, options);
            case 'dom':
            return this.toDOM(sprite, options);
            case 'canvas':
            default:
            return this.toCanvas(sprite);
        }
    }
    
    // ─── DEBUG: GRID DE SPRITES ──────────────────────────────────────────────
    // Abre un overlay mostrando todos los sprites cargados en el SpriteManager,
    // agrupados por grupo de animación y con sus nombres visibles.
    // Se activa con tecla D (solo si existe window.spriteManager)
    
    static _debugOverlay = null;
    static _previewData = null;   // { texture, name, info, frames? }
    static _previewMode = null;   // 'sprite' | 'anim'
    static _previewAngle = 0;
    static _animPlaying = false;
    static _animFrame = 0;
    static _animSpeed = 5;
    static _animLooping = true;
    static _animRAF = null;
    static _previewCanvas = null;
    static _previewCtx = null;
    static _refs = {}; // { previewPanel, previewCanvas, frameLabel, frameSlider, speedLabel, angleLabel }
    
    static showDebugGrid(manager) {
        if (this._debugOverlay) { this.hideDebugGrid(); return; }
        
        this._previewData = null;
        this._previewMode = null;
        this._previewAngle = 0;
        this._animPlaying = false;
        this._animFrame = 0;
        this._animSpeed = 5;
        if (this._animRAF) { cancelAnimationFrame(this._animRAF); this._animRAF = null; }
        
        const overlay = document.createElement('div');
        overlay.id = 'sprite-debug-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(10,10,20,0.95);z-index:99999;';
        
        // ── Layout: left column (grid) + right column (preview) ──────────
        const leftCol = document.createElement('div');
        leftCol.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0;overflow-y:auto;padding:48px 20px 20px;transition:right 0.2s;';
        overlay.appendChild(leftCol);
        this._refs.leftCol = leftCol;
        
        const rightCol = document.createElement('div');
        rightCol.id = 'sprite-preview-panel';
        rightCol.style.cssText = [
            'position:fixed;right:0;top:0;width:0;height:100%;',
            'background:rgba(0,0,0,0.85);border-left:0px solid rgba(78,204,163,0.3);',
            'padding:0;overflow:hidden;transition:width 0.2s,padding 0.2s,border 0.2s;',
            'overflow-y:auto;box-sizing:border-box;',
        ].join('');
        overlay.appendChild(rightCol);
        this._refs.previewPanel = rightCol;
        
        // ── Título ───────────────────────────────────────────────────────
        const title = document.createElement('h1');
        title.style.cssText = 'color:#4ecca3;font:bold 16px/1.2 monospace;text-align:center;margin:0 0 8px;';
        title.textContent = 'Sprite Debug Grid  ·  [Alt + D] Cerrar';
        leftCol.appendChild(title);
        // ── Teclas ───────────────────────────────────────────────────────
        const onKey = (e) => {
            if (e.key === 'Escape' || e.key === 'd' || e.key === 'D') {
                this.hideDebugGrid();
                document.removeEventListener('keydown', onKey);
            }
        };
        document.addEventListener('keydown', onKey);
        
        // ── Recopilar sprites ─────────────────────────────────────────────
        let allSprites = [];
        for (const sprites of Object.values(manager.sprites)) {
            allSprites = Object.entries(sprites);
            break;
        }
        allSprites.sort((a, b) => a[0].localeCompare(b[0]));
        
        // Detectar sprites usados en alguna animación (por referencia de canvas)
        const usedSprites = new Set();
        for (const anims of Object.values(manager.animations)) {
            for (const anim of Object.values(anims)) {
                if (!anim.frames) continue;
                for (const [spName, sp] of allSprites) {
                    if (anim.frames.includes(sp.texture)) usedSprites.add(spName);
                }
            }
        }
        
        // Agrupar por prefijo (antes del primer _)
        const prefixGroups = {};
        for (const [name, sprite] of allSprites) {
            const prefix = name.includes('_') ? name.split('_')[0] : '(otros)';
            if (!prefixGroups[prefix]) prefixGroups[prefix] = [];
            prefixGroups[prefix].push([name, sprite]);
        }
        
        // ── Grid de sprites raw agrupados por prefijo ──────────────────────
        const rawHeader = document.createElement('h2');
        rawHeader.style.cssText = 'color:#ffe97d;font:bold 13px monospace;margin:8px 0 5px;letter-spacing:.3px;';
        rawHeader.textContent = `Sprites Raw (${allSprites.length} total)`;
        leftCol.appendChild(rawHeader);
        
        for (const [prefix, sprites] of Object.entries(prefixGroups)) {
            const prefixLabel = document.createElement('div');
            prefixLabel.style.cssText = 'color:#ffe97d88;font:bold 11px monospace;margin:8px 0 3px;letter-spacing:.5px;';
            prefixLabel.textContent = `▸ ${prefix}_ (${sprites.length})`;
            leftCol.appendChild(prefixLabel);
            
            const rawGrid = document.createElement('div');
            rawGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;';
            for (const [name, sprite] of sprites) {
                const isUsed = usedSprites.has(name);
                const cell = this._debugCell(rawGrid, sprite.texture, name, isUsed ? '#90ee90' : '#ffffffff', isUsed);
                cell.addEventListener('click', () => this._previewSprite(sprite.texture, name, null));
            }
            leftCol.appendChild(rawGrid);
        }
        
        // ── Animaciones por grupo ──────────────────────────────────────────
        const animHeader = document.createElement('h2');
        animHeader.style.cssText = 'color:#4ecca3;font:bold 13px monospace;margin:14px 0 5px;letter-spacing:.3px;';
        animHeader.textContent = 'Animaciones por Grupo';
        leftCol.appendChild(animHeader);
        
        // FPS recomendado según número de frames
        const calcRecommendedFps = (n) => Math.round(n / (n <= 2 ? 0.5 : n <= 4 ? 0.65 : 0.75));
        
        for (const [groupName, anims] of Object.entries(manager.animations)) {
            const groupLabel = document.createElement('h3');
            groupLabel.style.cssText = 'color:#fff;font:bold 11px monospace;margin:8px 0 4px;';
            groupLabel.textContent = `Grupo: ${groupName}`;
            leftCol.appendChild(groupLabel);
            
            const animGrid = document.createElement('div');
            animGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;';
            
            for (const [animName, anim] of Object.entries(anims)) {
                const firstFrame = anim.frames?.[0];
                if (!firstFrame) continue;
                
                const recFps = calcRecommendedFps(anim.frames.length);
                
                const cell = document.createElement('div');
                cell.style.cssText = [
                    'width:92px;text-align:center;',
                    'background:rgba(20,60,140,0.3);',
                    'border-radius:6px;padding:3px;border:1px solid rgba(80,140,255,0.4);',
                    'cursor:pointer;transition:background 0.15s;',
                ].join('');
                cell.onmouseenter = () => { cell.style.background = 'rgba(20,60,140,0.6)'; };
                cell.onmouseleave = () => { cell.style.background = 'rgba(20,60,140,0.3)'; };
                
                const img = document.createElement('canvas');
                img.width = 80; img.height = 80;
                const ictx = img.getContext('2d');
                if (firstFrame && firstFrame.width && firstFrame.height) {
                    const s = Math.min(80 / firstFrame.width, 80 / firstFrame.height);
                    const dw = firstFrame.width * s;
                    const dh = firstFrame.height * s;
                    ictx.drawImage(firstFrame, (80 - dw) / 2, (80 - dh) / 2, dw, dh);
                }
                img.style.cssText = 'width:100px;height:100px;image-rendering:pixelated;display:block;margin:0 auto;';
                img.draggable = false;
                
                const label = document.createElement('div');
                label.style.cssText = 'color:#7ab8ff;font:bold 10px monospace;text-align:center;margin-top:2px;';
                label.textContent = `${animName} (${anim.frames.length}f)`;
                
                const fpsHint = document.createElement('div');
                fpsHint.style.cssText = 'color:#4ecca3;font:10px monospace;text-align:center;opacity:0.8;';
                fpsHint.textContent = `≈ ${recFps} fps recom.`;
                
                cell.appendChild(img);
                cell.appendChild(label);
                cell.appendChild(fpsHint);
                
                cell.addEventListener('click', () => {
                    this._previewAnim(anim, animName, groupName);
                    setTimeout(() => {
                        if (this._refs.speedVal) {
                            this._animSpeed = recFps;
                            this._refs.speedVal.textContent = `${recFps} fps`;
                            if (this._refs.speedSlider) this._refs.speedSlider.value = Math.min(recFps, 30);
                        }
                    }, 0);
                });
                
                animGrid.appendChild(cell);
            }
            leftCol.appendChild(animGrid);
        }
        
        // ── Preview panel interno ────────────────────────────────────────
        this._buildPreviewPanel(rightCol);
        
        // ── Cerrar al hacer clic fuera ───────────────────────────────────
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.hideDebugGrid();
        });
        
        // Scroll transparente
        const scrollStyle = document.createElement('style');
        scrollStyle.textContent = [
            '#sprite-debug-overlay ::-webkit-scrollbar{width:5px;height:5px}',
            '#sprite-debug-overlay ::-webkit-scrollbar-track{background:transparent}',
            '#sprite-debug-overlay ::-webkit-scrollbar-thumb{background:rgba(78,204,163,0.3);border-radius:3px}',
            '#sprite-debug-overlay ::-webkit-scrollbar-thumb:hover{background:rgba(78,204,163,0.55)}',
            '#sprite-debug-overlay{scrollbar-width:thin;scrollbar-color:rgba(78,204,163,0.3) transparent}',
        ].join('\n');
        document.head.appendChild(scrollStyle);
        document.body.appendChild(overlay);
        this._debugOverlay = overlay;
    }
    
    /** Construye el contenido del panel de vista previa */
    static _buildPreviewPanel(panel) {
        panel.innerHTML = '';
        
        // Canvas grande
        const cv = document.createElement('canvas');
        cv.width = 256; cv.height = 256;
        cv.style.cssText = [
            'width:256px;height:256px;display:block;margin:8px auto;',
            'image-rendering:pixelated;background:#111;border-radius:8px;',
        ].join('');
        panel.appendChild(cv);
        this._previewCanvas = cv;
        this._previewCtx = cv.getContext('2d');
        
        // Info label
        const infoLabel = document.createElement('p');
        infoLabel.style.cssText = 'color:#ffe97d;font:bold 15px monospace;text-align:center;margin:4px 0 2px;';
        infoLabel.id = 'sprite-preview-name';
        infoLabel.textContent = 'Selecciona un sprite';
        panel.appendChild(infoLabel);
        this._refs.infoLabel = infoLabel;
        
        // Dimensiones
        const dimLabel = document.createElement('p');
        dimLabel.style.cssText = 'color:#666;font:14px monospace;text-align:center;margin:0 0 6px;';
        dimLabel.id = 'sprite-preview-dims';
        panel.appendChild(dimLabel);
        this._refs.dimLabel = dimLabel;
        
        // ── Rotación ─────────────────────────────────────────────────────
        const rotSection = document.createElement('div');
        rotSection.style.cssText = 'margin:6px 0;';
        
        const rotHeader = document.createElement('p');
        rotHeader.style.cssText = 'color:#aaa;font:14px monospace;margin:0 0 2px;';
        rotHeader.textContent = 'Rotación';
        rotSection.appendChild(rotHeader);
        
        const rotSlider = document.createElement('input');
        rotSlider.type = 'range';
        rotSlider.min = 0; rotSlider.max = 360; rotSlider.value = 0;
        rotSlider.style.cssText = 'width:100%;height:4px;cursor:pointer;accent-color:#4ecca3;';
        rotSlider.addEventListener('input', () => {
            this._previewAngle = parseFloat(rotSlider.value);
            this._refs.angleLabel.textContent = `${rotSlider.value}°`;
            this._renderPreview();
        });
        rotSection.appendChild(rotSlider);
        
        const angleLabel = document.createElement('span');
        angleLabel.style.cssText = 'color:#4ecca3;font:14px monospace;margin-left:4px;';
        angleLabel.textContent = '0°';
        rotSection.appendChild(angleLabel);
        this._refs.angleLabel = angleLabel;
        
        panel.appendChild(rotSection);
        
        // ── Animación ────────────────────────────────────────────────────
        const animSection = document.createElement('div');
        animSection.id = 'sprite-anim-controls';
        animSection.style.cssText = 'margin:6px 0;display:none;';
        
        const animHeader = document.createElement('p');
        animHeader.style.cssText = 'color:#aaa;font:14px monospace;margin:0 0 2px;';
        animHeader.textContent = 'Animación';
        animSection.appendChild(animHeader);
        
        // Play/Pause + frame counter
        const animRow = document.createElement('div');
        animRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin:2px 0;';
        
        const playBtn = document.createElement('button');
        playBtn.textContent = '▶';
        playBtn.style.cssText = [
            'background:rgba(78,204,163,0.2);border:1px solid #4ecca3;color:#4ecca3;',
            'border-radius:4px;padding:2px 10px;font:15px monospace;cursor:pointer;',
        ].join('');
        playBtn.onclick = () => {
            this._animPlaying = !this._animPlaying;
            playBtn.textContent = this._animPlaying ? '⏸' : '▶';
            if (this._animPlaying) this._animLoop();
        };
        animSection.appendChild(playBtn);
        this._refs.playBtn = playBtn;
        
        const frameLabel = document.createElement('span');
        frameLabel.style.cssText = 'color:#fff;font:14px monospace;margin:0 4px;';
        frameLabel.textContent = 'Frame 0/0';
        animRow.appendChild(frameLabel);
        this._refs.frameLabel = frameLabel;
        
        animSection.appendChild(animRow);
        
        // Frame slider
        const frameSlider = document.createElement('input');
        frameSlider.type = 'range';
        frameSlider.min = 0; frameSlider.max = 0; frameSlider.value = 0;
        frameSlider.style.cssText = 'width:100%;height:4px;cursor:pointer;accent-color:#4ecca3;';
        frameSlider.addEventListener('input', () => {
            if (!this._previewData?.frames) return;
            this._animFrame = parseInt(frameSlider.value);
            this._refs.frameLabel.textContent = `Frame ${this._animFrame + 1}/${this._previewData.frames.length}`;
            this._renderPreview();
        });
        animSection.appendChild(frameSlider);
        this._refs.frameSlider = frameSlider;
        
        // Speed slider
        const speedRow = document.createElement('div');
        speedRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin:2px 0;';
        
        const speedLabel = document.createElement('span');
        speedLabel.style.cssText = 'color:#888;font:14px monospace;';
        speedLabel.textContent = 'Vel:';
        speedRow.appendChild(speedLabel);
        
        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.min = 1; speedSlider.max = 30; speedSlider.value = 5;
        speedSlider.style.cssText = 'flex:1;height:4px;cursor:pointer;accent-color:#4ecca3;';
        speedSlider.addEventListener('input', () => {
            this._animSpeed = parseInt(speedSlider.value);
            this._refs.speedVal.textContent = `${speedSlider.value} fps`;
        });
        speedRow.appendChild(speedSlider);
        
        const speedVal = document.createElement('span');
        speedVal.style.cssText = 'color:#4ecca3;font:14px monospace;';
        speedVal.textContent = '5 fps';
        speedRow.appendChild(speedVal);
        this._refs.speedVal = speedVal;
        this._refs.speedSlider = speedSlider;
        
        animSection.appendChild(speedRow);
        
        // Loop toggle
        const loopRow = document.createElement('div');
        loopRow.style.cssText = 'display:flex;align-items:center;gap:6px;margin:4px 0;';
        
        const loopCheck = document.createElement('input');
        loopCheck.type = 'checkbox';
        loopCheck.checked = true;
        loopCheck.style.cssText = 'accent-color:#4ecca3;cursor:pointer;';
        loopCheck.addEventListener('change', () => {
            this._animLooping = loopCheck.checked;
            loopStatus.textContent = loopCheck.checked ? 'Bucle infinito' : 'Estado sin bucle (se detiene al final)';
        });
        loopRow.appendChild(loopCheck);
        
        const loopStatus = document.createElement('span');
        loopStatus.style.cssText = 'color:#4ecca3;font:14px monospace;';
        loopStatus.textContent = 'Bucle infinito';
        loopRow.appendChild(loopStatus);
        
        animSection.appendChild(loopRow);
        
        panel.appendChild(animSection);
        this._refs.animSection = animSection;
        this._refs.loopCheck = loopCheck;
        this._refs.loopStatus = loopStatus;
        
        // Texto de ayuda inicial
        const hint = document.createElement('p');
        hint.style.cssText = 'color:#555;font:14px monospace;text-align:center;margin-top:12px;';
        hint.textContent = 'Haz clic en cualquier sprite o animación de la cuadrícula para previsualizarlo';
        panel.appendChild(hint);
    }
    
    /** Muestra un sprite individual en el preview */
    static _previewSprite(texture, name, dims) {
        this._previewData = { texture, name, info: dims };
        this._previewMode = 'sprite';
        this._previewAngle = this._previewAngle || 0;
        this._animPlaying = false;
        if (this._animRAF) { cancelAnimationFrame(this._animRAF); this._animRAF = null; }
        
        // Ocultar controles de animación
        this._refs.animSection.style.display = 'none';
        
        this._refs.infoLabel.textContent = name;
        this._refs.dimLabel.textContent = dims ? `${dims.w}\u00d7${dims.h}` : '';
        this._openPreviewPanel();
        this._refs.angleLabel.textContent = `${this._previewAngle}°`;
        
        this._renderPreview();
    }
    
    /** Muestra una animación en el preview */
    static _previewAnim(anim, name, group) {
        this._previewData = { frames: anim.frames, name, group };
        this._previewMode = 'anim';
        this._previewAngle = this._previewAngle || 0;
        this._animFrame = 0;
        this._animPlaying = false;
        this._animLooping = true;
        if (this._animRAF) { cancelAnimationFrame(this._animRAF); this._animRAF = null; }
        
        // Mostrar controles de animación
        this._refs.animSection.style.display = 'block';
        this._refs.playBtn.textContent = '▶';
        this._refs.frameSlider.max = anim.frames.length - 1;
        this._refs.frameSlider.value = 0;
        this._refs.frameLabel.textContent = `Frame 1/${anim.frames.length}`;
        if (this._refs.loopCheck) {
            this._refs.loopCheck.checked = true;
            this._refs.loopStatus.textContent = 'Bucle infinito';
        }
        
        this._refs.infoLabel.textContent = `${group} › ${name}`;
        this._refs.dimLabel.textContent = `${anim.frames.length} frames`;
        this._openPreviewPanel();
        this._refs.angleLabel.textContent = `${this._previewAngle}°`;
        
        this._renderPreview();
    }
    
    /** Renderiza el preview actual con rotación */
    static _renderPreview() {
        const ctx = this._previewCtx;
        const cv = this._previewCanvas;
        if (!ctx || !cv) return;
        const size = 256;
        
        ctx.clearRect(0, 0, size, size);
        
        // Obtener textura
        let tex = null;
        if (this._previewMode === 'sprite' && this._previewData?.texture) {
            tex = this._previewData.texture;
        } else if (this._previewMode === 'anim' && this._previewData?.frames?.length) {
            tex = this._previewData.frames[this._animFrame] || this._previewData.frames[0];
        }
        if (!tex) return;
        
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate(this._previewAngle * Math.PI / 180);
        const s = Math.min(size / tex.width, size / tex.height) * 0.85;
        ctx.drawImage(tex, -tex.width * s / 2, -tex.height * s / 2, tex.width * s, tex.height * s);
        
        // Ejes de referencia (si hay rotación)
        if (this._previewAngle !== 0) {
            ctx.strokeStyle = 'rgba(78,204,163,0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(-size / 2, 0);
            ctx.lineTo(size / 2, 0);
            ctx.moveTo(0, -size / 2);
            ctx.lineTo(0, size / 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        ctx.restore();
    }
    
    /** Bucle de animación */
    static _animLoop() {
        if (!this._animPlaying || !this._previewData?.frames) return;
        const fps = this._animSpeed || 5;
        this._animRAF = setTimeout(() => {
            if (!this._animPlaying) return;
            const next = this._animFrame + 1;
            if (next >= this._previewData.frames.length) {
                if (this._animLooping) {
                    this._animFrame = 0;
                } else {
                    this._animPlaying = false;
                    if (this._refs.playBtn) this._refs.playBtn.textContent = '▶';
                    return;
                }
            } else {
                this._animFrame = next;
            }
            this._refs.frameSlider.value = this._animFrame;
            this._refs.frameLabel.textContent = `Frame ${this._animFrame + 1}/${this._previewData.frames.length}`;
            this._renderPreview();
            this._animLoop();
        }, 1000 / fps);
    }
    

    static _openPreviewPanel() {
        const panel = this._refs.previewPanel;
        const left  = this._refs.leftCol;
        if (!panel) return;
        panel.style.width   = '340px';
        panel.style.padding = '16px';
        panel.style.borderLeft = '1px solid rgba(78,204,163,0.3)';
        if (left) left.style.right = '340px';
        // Scroll transparente dentro del panel
        if (!panel._scrollStyled) {
            const st = document.createElement('style');
            st.textContent = [
                '#sprite-debug-overlay ::-webkit-scrollbar{width:5px;height:5px}',
                '#sprite-debug-overlay ::-webkit-scrollbar-track{background:transparent}',
                '#sprite-debug-overlay ::-webkit-scrollbar-thumb{background:rgba(78,204,163,0.3);border-radius:3px}',
                '#sprite-debug-overlay ::-webkit-scrollbar-thumb:hover{background:rgba(78,204,163,0.6)}',
                '#sprite-debug-overlay{scrollbar-width:thin;scrollbar-color:rgba(78,204,163,0.3) transparent}',
            ].join('\n');
            document.head.appendChild(st);
            panel._scrollStyled = true;
        }
    }

    static hideDebugGrid() {
        if (this._animRAF) {
            if (typeof this._animRAF === 'number') cancelAnimationFrame(this._animRAF);
            else clearTimeout(this._animRAF);
            this._animRAF = null;
        }
        this._animPlaying = false;
        this._previewData = null;
        this._previewMode = null;
        if (this._debugOverlay) {
            this._debugOverlay.remove();
            this._debugOverlay = null;
        }
    }
    
    static toggleDebugGrid(manager) {
        if (this._debugOverlay) {
            this.hideDebugGrid();
        } else if (manager) {
            this.showDebugGrid(manager);
        }
    }
    
    /** Crea una celda individual en la cuadrícula */
    static _debugCell(parent, texture, label, color = '#aaa', isUsed = false) {
        const border = isUsed ? '1px solid rgba(144,238,144,0.5)' : '1px solid rgba(255,255,255,0.07)';
        const bg     = isUsed ? 'rgba(144,238,144,0.07)'          : 'rgba(255,255,255,0.04)';
        const bgHov  = isUsed ? 'rgba(144,238,144,0.18)'          : 'rgba(255,255,255,0.13)';
        
        const cell = document.createElement('div');
        cell.style.cssText = [
            `width:82px;text-align:center;background:${bg};`,
            `border-radius:5px;padding:3px;cursor:pointer;transition:background 0.15s;border:${border};`,
        ].join('');
        cell.onmouseenter = () => { cell.style.background = bgHov; };
        cell.onmouseleave = () => { cell.style.background = bg; };
        
        const img = document.createElement('canvas');
        img.width = 100; img.height = 100;
        const tctx = img.getContext('2d');
        if (texture && texture.width && texture.height) {
            const s = Math.min(100 / texture.width, 100 / texture.height);
            const dw = texture.width * s;
            const dh = texture.height * s;
            tctx.drawImage(texture, (100 - dw) / 2, (100 - dh) / 2, dw, dh);
        }
        img.style.cssText = 'width:100px;height:100px;image-rendering:pixelated;display:block;margin:0 auto;';
        img.draggable = false;
        
        const lbl = document.createElement('div');
        lbl.style.cssText = `color:${color};font:10px monospace;text-align:center;margin-top:2px;user-select:none;`;
        lbl.textContent = label;
        
        cell.appendChild(img);
        cell.appendChild(lbl);
        parent.appendChild(cell);
        return cell;
    }
}

class SpriteManager {
    constructor(EngineClass = null, engineType = null) {
        this.engine = EngineClass;
        this.engineType = engineType || SpriteProcessor.detectEngine();
        this.sprites = {};
        this.animations = {};
        this.groups = {};
        this.imagePaths = {};
        this.compositions = {};
        this.hitboxManager = new HitboxManager();
        
        SpriteProcessor.setEngineType(this.engineType);
    }
    
    async load(imagePath, spriteData, options = {}) {
        const {
            name = 'default',
            groupByPrefix = false,
            customGroups = null,
            animations = null,
        } = options;
        
        this.imagePaths[name] = imagePath;
        
        const loadedSprites = await SpriteProcessor.loadSpriteSheet(imagePath, spriteData, options);
        
        const groupName = name || 'default';
        if (!this.sprites[groupName]) {
            this.sprites[groupName] = {};
        }
        
        Object.assign(this.sprites[groupName], loadedSprites);
        
        if (groupByPrefix || customGroups) {
            this.groups[groupName] = SpriteProcessor.createSpriteGroup(loadedSprites, {
                groupByPrefix,
                customGroups,
                separator: options.separator || '_',
            });
        }
        
        if (animations) {
            if (!this.animations[groupName]) {
                this.animations[groupName] = {};
            }
            const definedAnims = SpriteProcessor.defineAnimations(loadedSprites, animations);
            Object.assign(this.animations[groupName], definedAnims);
        }
        
        return this.sprites[groupName];
    }
    
    getSprite(group, name) {
        if (this.sprites[group]) {
            return this.sprites[group][name];
        }
        return null;
    }
    
    getAnimation(group, name) {
        if (this.animations[group]) {
            return this.animations[group][name];
        }
        return null;
    }
    
    getGroup(group) {
        return this.groups[group] || null;
    }
    
    getAllSprites(group) {
        return this.sprites[group] || {};
    }
    
    createAnimation(group, name, frameNames, options = {}) {
        if (!this.animations[group]) {
            this.animations[group] = {};
        }
        
        const sprites = this.sprites[group];
        if (!sprites) {
            throw new Error(`Sprite group "${group}" not found`);
        }
        
        this.animations[group][name] = SpriteProcessor.createAnimation(sprites, frameNames, options);
        return this.animations[group][name];
    }
    
    clearGroup(group) {
        if (this.sprites[group]) {
            delete this.sprites[group];
        }
        if (this.animations[group]) {
            delete this.animations[group];
        }
        if (this.groups[group]) {
            delete this.groups[group];
        }
        if (this.imagePaths[group]) {
            delete this.imagePaths[group];
        }
    }
    
    createDOMElement(group, spriteName, options = {}) {
        const sprite = this.getSprite(group, spriteName);
        if (!sprite) throw new Error(`Sprite "${spriteName}" not found in group "${group}"`);
        
        return SpriteProcessor.createDOMElement(sprite, options);
    }
    
    createDOMElements(group, options = {}) {
        const sprites = this.getAllSprites(group);
        const elements = {};
        
        for (const [name, sprite] of Object.entries(sprites)) {
            elements[name] = SpriteProcessor.createDOMElement(sprite, options);
        }
        
        return elements;
    }
    
    createAnimatedDOM(group, animationName, options = {}) {
        const anim = this.getAnimation(group, animationName);
        if (!anim) throw new Error(`Animation "${animationName}" not found in group "${group}"`);
        
        const element = document.createElement('img');
        
        return {
            element,
            animation: anim,
            
            update(dt) {
                anim.update(dt);
                if (anim.getTexture()) {
                    element.src = anim.getTexture().toDataURL();
                }
            },
            
            reset() {
                anim.reset();
            },
            
            setFrame(index) {
                anim.setFrame(index);
                if (anim.getTexture()) {
                    element.src = anim.getTexture().toDataURL();
                }
            }
        };
    }
    
    getImagePath(group) {
        return this.imagePaths[group] || null;
    }
    
    getSpriteAs(group, name, options = {}) {
        const sprite = this.getSprite(group, name);
        if (!sprite) return null;
        
        return SpriteProcessor.getFormattedSprite(sprite, options);
    }
    
    getAllSpritesAs(group, options = {}) {
        const sprites = this.getAllSprites(group);
        const formatted = {};
        
        for (const [name, sprite] of Object.entries(sprites)) {
            formatted[name] = SpriteProcessor.getFormattedSprite(sprite, options);
        }
        
        return formatted;
    }
    
    createAnimationAs(group, name, options = {}) {
        const anim = this.getAnimation(group, name);
        if (!anim) return null;
        
        if (this.engineType === 'pixi') {
            return this._createPIXIAnimation(group, name, options);
        }
        
        return {
            animation: anim,
            update: (dt) => anim.update(dt),
            getTexture: () => anim.getTexture(),
            reset: () => anim.reset(),
            setFrame: (i) => anim.setFrame(i),
        };
    }
    
    _createPIXIAnimation(group, name, options = {}) {
        const anim = this.getAnimation(group, name);
        const {
            speed = anim?.speed ?? 10,
            loop = anim?.loop ?? true,
            onComplete = anim?.onComplete ?? null,
        } = options;
        
        const textures = anim.frames.map(canvas => PIXI.Texture.from(canvas));
        const movieClip = new PIXI.AnimatedSprite(textures);
        
        movieClip.animationSpeed = speed / 60;
        movieClip.loop = loop;
        
        if (onComplete) {
            movieClip.on('complete', onComplete);
        }
        
        return movieClip;
    }
    
    compose(entityName, slotDefs) {
        this.compositions[entityName] = new EntityComposer(this, slotDefs);
        return this.compositions[entityName];
    }
    
    getComposition(name) {
        return this.compositions[name] || null;
    }
    
    getEngineType() {
        return this.engineType;
    }
    
    detectAndSetEngine() {
        this.engineType = SpriteProcessor.detectEngine();
        return this.engineType;
    }
}

class EntityComposer {
    constructor(manager, slotDefs = {}) {
        this.manager = manager;
        this.slots = {};
        this._animState = {};
        this._slotAnimations = {};
        
        for (const [slotName, def] of Object.entries(slotDefs)) {
            this.addSlot(slotName, def);
        }
    }
    
    addSlot(name, def) {
        const { group, sprite, x = 0, y = 0, z = 0, animations = null } = def;
        this.slots[name] = { group, sprite, x, y, z };
        
        if (animations) {
            this._slotAnimations[name] = {};
            const sprites = this.manager.getAllSprites(group);
            for (const [animName, animConfig] of Object.entries(animations)) {
                if (typeof animConfig === 'string') {
                    const resolved = SpriteProcessor._parseFrameRange(animConfig, animName);
                    const frameList = resolved.values.map(i => `${resolved.prefix}${i}`);
                    this._slotAnimations[name][animName] =
                    SpriteProcessor.createAnimation(sprites, frameList, { speed: 10, loop: true });
                } else {
                    const { frames, speed, loop } = animConfig;
                    let frameList;
                    if (typeof frames === 'string') {
                        const resolved = SpriteProcessor._parseFrameRange(frames, animName);
                        frameList = resolved.values.map(i => `${resolved.prefix}${i}`);
                    } else {
                        frameList = frames;
                    }
                    this._slotAnimations[name][animName] =
                    SpriteProcessor.createAnimation(sprites, frameList, { speed, loop: loop !== false });
                }
            }
        }
        
        return this;
    }
    
    setAnimation(slotName, animName) {
        this._animState[slotName] = animName;
        return this;
    }
    
    setAnimations(animMap) {
        for (const [slot, anim] of Object.entries(animMap)) {
            this.setAnimation(slot, anim);
        }
        return this;
    }
    
    getTexture(slotName) {
        const slot = this.slots[slotName];
        if (!slot) return null;
        
        const animName = this._animState[slotName];
        if (animName && this._slotAnimations[slotName] && this._slotAnimations[slotName][animName]) {
            return this._slotAnimations[slotName][animName].getTexture();
        }
        
        const sprite = this.manager.getSprite(slot.group, slot.sprite);
        return sprite ? sprite.texture : null;
    }
    
    getSprite(slotName) {
        const slot = this.slots[slotName];
        if (!slot) return null;
        
        const animName = this._animState[slotName];
        if (animName && this._slotAnimations[slotName] && this._slotAnimations[slotName][animName]) {
            return { texture: this._slotAnimations[slotName][animName].getTexture() };
        }
        
        return this.manager.getSprite(slot.group, slot.sprite);
    }
    
    update(dt) {
        for (const [slotName, animName] of Object.entries(this._animState)) {
            const anim = this._slotAnimations[slotName] && this._slotAnimations[slotName][animName];
            if (anim) anim.update(dt);
        }
    }
    
    render(ctx, x, y) {
        const sorted = Object.entries(this.slots).sort((a, b) => a[1].z - b[1].z);
        for (const [slotName, slot] of sorted) {
            const texture = this.getTexture(slotName);
            if (texture) {
                ctx.drawImage(texture, x + slot.x, y + slot.y);
            }
        }
    }
    
    toPIXI() {
        if (typeof PIXI === 'undefined') throw new Error('PIXI is not available');
        const container = new PIXI.Container();
        const sorted = Object.entries(this.slots).sort((a, b) => a[1].z - b[1].z);
        for (const [, slot] of sorted) {
            const sprite = this.manager.getSprite(slot.group, slot.sprite);
            if (sprite) {
                const pixiSprite = SpriteProcessor.toPIXI(sprite);
                pixiSprite.x = slot.x;
                pixiSprite.y = slot.y;
                container.addChild(pixiSprite);
            }
        }
        return container;
    }
    
    toDOM() {
        const container = document.createElement('div');
        container.style.position = 'relative';
        const sorted = Object.entries(this.slots).sort((a, b) => a[1].z - b[1].z);
        for (const [, slot] of sorted) {
            const sprite = this.manager.getSprite(slot.group, slot.sprite);
            if (sprite) {
                const el = SpriteProcessor.createDOMElement(sprite);
                el.style.position = 'absolute';
                el.style.left = `${slot.x}px`;
                el.style.top = `${slot.y}px`;
                container.appendChild(el);
            }
        }
        return container;
    }
    
    getSlotNames() {
        return Object.keys(this.slots);
    }
    
    getSlot(slotName) {
        return this.slots[slotName] || null;
    }
    
    getAnimations(slotName) {
        return this._slotAnimations[slotName] || null;
    }
    
    getCurrentAnimation(slotName) {
        return this._animState[slotName] || null;
    }
}

// ─── SISTEMA DE ESTADOS ──────────────────────────────────────────────────────
// Define estados con animaciones (looping o no-looping) y transiciones automáticas.
// Un estado sin loop reproduce la animación una vez y se detiene en el último frame.
// Si tiene nextState, transiciona automáticamente al terminar.
// Útil para proyectiles, explosiones, animaciones de muerte, etc.

/**
* Un estado individual dentro de una máquina de estados.
* Cada estado tiene su propia animación (frames + velocidad) y comportamiento.
*/
class SpriteState {
    /**
    * @param {object} config
    * @param {string}  config.name
    * @param {Array<HTMLCanvasElement>} config.frames  - Texturas (canvas) de cada frame
    * @param {number}  [config.speed=10]               - FPS de la animación
    * @param {boolean} [config.loop=true]              - true: bucle infinito, false: una vez
    * @param {string}  [config.nextState=null]          - Estado al que transicionar al terminar
    * @param {function} [config.onEnter=null]           - callback(entity) al entrar
    * @param {function} [config.onUpdate=null]          - callback(entity, dt) cada frame
    * @param {function} [config.onExit=null]            - callback(entity) al salir
    * @param {function} [config.onComplete=null]        - callback(entity) cuando la animación termina (solo no-loop)
    */
    constructor(config) {
        this.name = config.name;
        this.frames = config.frames || [];
        this.speed = config.speed || 10;
        this.loop = config.loop !== false;
        this.nextState = config.nextState || null;
        this.onEnter = config.onEnter || null;
        this.onUpdate = config.onUpdate || null;
        this.onExit = config.onExit || null;
        this.onComplete = config.onComplete || null;
        
        this.currentFrame = 0;
        this.elapsed = 0;
        this.completed = false;
    }
    
    reset() {
        this.currentFrame = 0;
        this.elapsed = 0;
        this.completed = false;
    }
    
    /**
    * @param {number} dt - Delta time en segundos
    */
    update(dt) {
        if (this.completed && !this.loop) return;
        this.elapsed += dt;
        const frameDuration = 1 / this.speed;
        while (this.elapsed >= frameDuration) {
            this.elapsed -= frameDuration;
            this.currentFrame++;
            if (this.currentFrame >= this.frames.length) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = this.frames.length - 1;
                    this.completed = true;
                    if (this.onComplete) this.onComplete();
                }
            }
        }
    }
    
    getTexture() {
        return this.frames[this.currentFrame] || null;
    }
    
    get progress() {
        if (this.frames.length <= 1) return 1;
        return this.currentFrame / (this.frames.length - 1);
    }
}

/**
* Máquina de estados para entidades con sprites.
* Administra transiciones entre estados y actualiza la animación activa.
*
* Ejemplo:
* ```js
* const fsm = new SpriteStateMachine(projectile, {
*   fly:  { frames: arrowFrames, loop: true },
*   hit:  { frames: explosionFrames, loop: false, nextState: 'done' },
*   done: { frames: [blank], loop: false },
* });
* fsm.setState('fly');
* ```
*/
class SpriteStateMachine {
    /**
    * @param {object} owner - Entidad dueña de la máquina (proyectil, enemigo, etc.)
    * @param {object<string,object>} states - Mapa nombre → config de SpriteState
    * @param {string} [initialState=null] - Estado inicial
    */
    constructor(owner, states = {}, initialState = null) {
        this.owner = owner;
        this.states = {};
        this.currentStateName = null;
        this.currentState = null;
        this.prevStateName = null;
        this.stateTime = 0;
        
        for (const [name, config] of Object.entries(states)) {
            this.addState(name, config);
        }
        
        if (initialState && this.states[initialState]) {
            this.setState(initialState);
        }
    }
    
    /**
    * Agrega o reemplaza un estado.
    * @param {string} name
    * @param {object} config - Misma estructura que SpriteState constructor
    */
    addState(name, config) {
        this.states[name] = new SpriteState({ name, ...config });
    }
    
    /**
    * Cambia al estado indicado.
    * @param {string} name
    */
    setState(name) {
        const st = this.states[name];
        if (!st) {
            console.warn(`[SpriteStateMachine] Estado "${name}" no encontrado`);
            return;
        }
        if (this.currentState && this.currentState.onExit) {
            this.currentState.onExit(this.owner);
        }
        this.prevStateName = this.currentStateName;
        this.currentStateName = name;
        this.currentState = st;
        this.currentState.reset();
        this.stateTime = 0;
        if (this.currentState.onEnter) {
            this.currentState.onEnter(this.owner);
        }
    }
    
    /**
    * @param {number} dt - Delta time en segundos
    */
    update(dt) {
        if (!this.currentState) return;
        this.stateTime += dt;
        this.currentState.update(dt);
        if (this.currentState.onUpdate) {
            this.currentState.onUpdate(this.owner, dt);
        }
        if (this.currentState.completed && this.currentState.nextState) {
            this.setState(this.currentState.nextState);
        }
    }
    
    /** @returns {HTMLCanvasElement|null} Textura del frame actual */
    getTexture() {
        return this.currentState?.getTexture() || null;
    }
    
    /** @returns {number} Progreso del estado actual (0-1) */
    get progress() {
        return this.currentState?.progress || 0;
    }
    
    /** ¿La animación del estado actual terminó? */
    get completed() {
        return this.currentState?.completed || false;
    }
    
    /** Tiempo en segundos desde que se entró al estado actual */
    get elapsed() {
        return this.stateTime;
    }
}

// Al cargar el script, agrega listener global para tecla D
document.addEventListener('keydown', (e) => {
    // Detectar Alt + D (o Alt + d)
    if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        const mgr = window.spriteManager || (window.game?.spriteManager);
        if (mgr) {
            e.preventDefault();
            SpriteProcessor.toggleDebugGrid(mgr);
        }
    }
});

export { SpriteProcessor, SpriteManager, EntityComposer, SpriteState, SpriteStateMachine };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpriteProcessor, SpriteManager, EntityComposer, SpriteState, SpriteStateMachine, HitboxManager, HitboxDebug };
}