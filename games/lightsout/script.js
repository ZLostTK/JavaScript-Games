class LightsOutGame {
    init() {
        this.COLS = 5;
        this.ROWS = 5;
        this.CELL = 80;
        this.GAP = 6;
        this.won = false;
        this.moves = 0;
        this.elapsed = 0;
        this.timerActive = false;
        
        Audio.synth('click', 'square', 440, 0.08, 0.25);
        Audio.synth('win', 'sine', 880, 0.6, 0.35, 1760);
        
        this.hadMouse = false;
        this.hadTouch = false;
        
        this._newGame();
    }
    
    _newGame() {
        this.grid = Array.from({ length: this.ROWS }, () => new Array(this.COLS).fill(false));
        const shuffles = 20 + Math.floor(Math.random() * 21);
        for (let k = 0; k < shuffles; k++) {
            const r = Math.floor(Math.random() * this.ROWS);
            const c = Math.floor(Math.random() * this.COLS);
            this._toggle(r, c);
        }
        this.won = false;
        this.moves = 0;
        this.elapsed = 0;
        this.timerActive = true;
    }
    
    _toggle(row, col) {
        const flip = (r, c) => {
            if (r >= 0 && r < this.ROWS && c >= 0 && c < this.COLS)
                this.grid[r][c] = !this.grid[r][c];
        };
        flip(row, col);
        flip(row - 1, col);
        flip(row + 1, col);
        flip(row, col - 1);
        flip(row, col + 1);
    }
    
    _checkWin() {
        return this.grid.every(row => row.every(cell => !cell));
    }
    
    _boardOrigin() {
        const boardW = this.COLS * this.CELL + (this.COLS - 1) * this.GAP;
        const boardH = this.ROWS * this.CELL + (this.ROWS - 1) * this.GAP;
        const ox = (Engine.W - boardW) / 2;
        const oy = (Engine.H - boardH) / 2 + 30;
        return { ox, oy, boardW, boardH };
    }
    
    _fmtTime(s) {
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }
    
    update(dt) {
        if (!this.won && this.timerActive) this.elapsed += dt;
        
        const mouse = Input.getMouse();
        const gm = Engine.toGame(mouse.x, mouse.y);
        const touch = Input.getTouch();
        const gt = touch ? Engine.toGame(touch.x, touch.y) : null;
        
        const mouseClick = Input.isMousePressed() && !this.hadMouse;
        const touchTap = Input.getTouchCount() > 0 && !this.hadTouch;
        
        this.hadMouse = Input.isMousePressed();
        this.hadTouch = Input.getTouchCount() > 0;
        
        const clickPos = mouseClick ? gm : (touchTap ? gt : null);
        
        if (clickPos) {
            const { ox, oy } = this._boardOrigin();
            const btnX = Engine.W / 2 - 70;
            const btnY = Engine.H - 52;
            const btnW = 140;
            const btnH = 36;
            
            if (clickPos.x >= btnX && clickPos.x <= btnX + btnW && clickPos.y >= btnY && clickPos.y <= btnY + btnH) {
                this._newGame();
                return;
            }
            
            if (!this.won) {
                for (let r = 0; r < this.ROWS; r++) {
                    for (let c = 0; c < this.COLS; c++) {
                        const cx = ox + c * (this.CELL + this.GAP);
                        const cy = oy + r * (this.CELL + this.GAP);
                        if (clickPos.x >= cx && clickPos.x <= cx + this.CELL && clickPos.y >= cy && clickPos.y <= cy + this.CELL) {
                            this._toggle(r, c);
                            this.moves++;
                            Audio.play('click');
                            if (this._checkWin()) {
                                this.won = true;
                                this.timerActive = false;
                                Audio.play('win');
                            }
                            return;
                        }
                    }
                }
            }
        }
    }
    
    render(ctx) {
        Engine.rect(0, 0, Engine.W, Engine.H, '#0d0d1a');
        
        Engine.text('LIGHTS OUT', Engine.W / 2, 36, '#f0c040', 28, 'center');
        Engine.text(`Movimientos: ${this.moves}`, Engine.W / 2 - 90, 72, '#aaaacc', 16, 'center');
        Engine.text(`Tiempo: ${this._fmtTime(this.elapsed)}`, Engine.W / 2 + 90, 72, '#aaaacc', 16, 'center');
        
        const { ox, oy } = this._boardOrigin();
        
        for (let r = 0; r < this.ROWS; r++) {
            for (let c = 0; c < this.COLS; c++) {
                const cx = ox + c * (this.CELL + this.GAP);
                const cy = oy + r * (this.CELL + this.GAP);
                const on = this.grid[r][c];
                const bg = on ? '#f5d020' : '#1e1e3a';
                const border = on ? '#fff8aa' : '#2e2e5a';
                
                Engine.rect(cx - 2, cy - 2, this.CELL + 4, this.CELL + 4, border);
                Engine.rect(cx, cy, this.CELL, this.CELL, bg);
                
                if (on) {
                    Engine.rect(cx + 6, cy + 6, this.CELL - 12, this.CELL - 12, '#fffde0');
                }
            }
        }
        
        const btnX = Engine.W / 2 - 70;
        const btnY = Engine.H - 52;
        Engine.rect(btnX - 2, btnY - 2, 144, 40, '#555599');
        Engine.rect(btnX, btnY, 140, 36, '#3333aa');
        Engine.text('REINICIAR', Engine.W / 2, btnY + 18, '#ffffff', 16, 'center');
        
        if (this.won) {
            Engine.rect(0, 0, Engine.W, Engine.H, 'rgba(0,0,0,0.65)');
            
            const bx = Engine.W / 2 - 180;
            const by = Engine.H / 2 - 90;
            Engine.rect(bx - 4, by - 4, 368, 188, '#f0c040');
            Engine.rect(bx, by, 360, 180, '#111130');
            
            Engine.text('¡VICTORIA!', Engine.W / 2, Engine.H / 2 - 50, '#f0c040', 32, 'center');
            Engine.text(`Movimientos: ${this.moves}`, Engine.W / 2, Engine.H / 2 - 8, '#ccccff', 18, 'center');
            Engine.text(`Tiempo: ${this._fmtTime(this.elapsed)}`, Engine.W / 2, Engine.H / 2 + 22, '#ccccff', 18, 'center');
            Engine.text('Pulsa REINICIAR para jugar', Engine.W / 2, Engine.H / 2 + 58, '#888899', 14, 'center');
        }
    }
}

Engine.init('gameCanvas', { width: 480, height: 640, bg: '#0d0d1a' });
Engine.start(new LightsOutGame());