class SpriteProcessor {
    static cache = new Map();
    static textures = new Map();
    static engineType = null;
    static _detectedEngine = null;

    static detectEngine() {
        if (this._detectedEngine) return this._detectedEngine;

        if (typeof PIXI !== 'undefined' && PIXI.Application) {
            this._detectedEngine = 'pixi';
            this.engineType = 'pixi';
            return 'pixi';
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
            const { frames, speed, loop, onComplete } = config;
            
            if (typeof frames === 'string') {
                const range = this._parseFrameRange(frames);
                const frameList = [];
                for (let i = range.start; i <= range.end; i++) {
                    const frameName = `${range.prefix}${i}`;
                    if (sprites[frameName]) {
                        frameList.push(frameName);
                    }
                }
                animations[animName] = this.createAnimation(sprites, frameList, { speed, loop, onComplete });
            } else if (Array.isArray(frames)) {
                animations[animName] = this.createAnimation(sprites, frames, { speed, loop, onComplete });
            } else {
                throw new Error(`Invalid animation definition for "${animName}"`);
            }
        }
        
        return animations;
    }

    static _parseFrameRange(rangeStr) {
        const match = rangeStr.match(/^(.+?)(\d+)-(\d+)$/);
        if (!match) {
            throw new Error(`Invalid range format: ${rangeStr}. Use format: prefix0-10`);
        }
        
        return {
            prefix: match[1],
            start: parseInt(match[2], 10),
            end: parseInt(match[3], 10),
        };
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
}

class SpriteManager {
    constructor(EngineClass = null, engineType = null) {
        this.engine = EngineClass;
        this.engineType = engineType || SpriteProcessor.detectEngine();
        this.sprites = {};
        this.animations = {};
        this.groups = {};
        this.imagePaths = {};
        
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
        const { speed = 10, loop = true } = options;
        const sprites = this.getAllSprites(group);
        const anim = this.getAnimation(group, name);
        
        const textures = anim.frames.map(canvas => PIXI.Texture.from(canvas));
        const movieClip = new PIXI.AnimatedSprite(textures);
        
        movieClip.animationSpeed = speed / 60;
        movieClip.loop = loop;
        
        if (options.onComplete) {
            movieClip.on('complete', options.onComplete);
        }
        
        return movieClip;
    }

    getEngineType() {
        return this.engineType;
    }

    detectAndSetEngine() {
        this.engineType = SpriteProcessor.detectEngine();
        return this.engineType;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SpriteProcessor, SpriteManager };
}