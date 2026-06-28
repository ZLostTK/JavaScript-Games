import { normalizeRect, clampRectToImage, snapValue, createRect } from './state.js';
import { getGridPreviewCells } from './grid.js';

const HANDLE_SIZE = 8;
const MIN_RECT = 1;

/** @typedef {'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'} HandleId */

export class CanvasEditor {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {HTMLCanvasElement} minimapCanvas
   * @param {{ onChange?: () => void, onCoords?: (x: number, y: number, w?: number, h?: number) => void, onSelect?: (id: string | null) => void }} callbacks
   */
  constructor(canvas, minimapCanvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.minimapCanvas = minimapCanvas;
    this.minimapCtx = minimapCanvas.getContext('2d');
    this.callbacks = callbacks;

    /** @type {import('./state.js').createState extends () => infer S ? S : never} */
    this.state = null;

    this.interaction = null;
    /** @type {HandleId | null} */
    this.resizeHandle = null;
    this.dragStart = { x: 0, y: 0 };
    this.rectStart = null;
    /** @type {import('./state.js').SpriteRect | null} */
    this.movingRect = null;
    this.moveOffset = { x: 0, y: 0 };
    this.drawingRect = null;
    this.cursorPos = null;

    this._bindEvents();
    this._resizeObserver = new ResizeObserver(() => this.resize());
    this._resizeObserver.observe(canvas.parentElement);
  }

  /** @param {ReturnType<import('./state.js').createState>} state */
  setState(state) {
    this.state = state;
    this.render();
  }

  resize() {
    const wrapper = this.canvas.parentElement;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.render();
  }

  screenToImage(sx, sy) {
    return {
      x: (sx - this.state.panX) / this.state.zoom,
      y: (sy - this.state.panY) / this.state.zoom,
    };
  }

  imageToScreen(ix, iy) {
    return {
      x: ix * this.state.zoom + this.state.panX,
      y: iy * this.state.zoom + this.state.panY,
    };
  }

  fitToScreen() {
    if (!this.state?.image) return;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    const padding = 32;
    const scaleX = (w - padding * 2) / this.state.image.width;
    const scaleY = (h - padding * 2) / this.state.image.height;
    this.state.zoom = Math.min(scaleX, scaleY, 1);
    this.state.panX = (w - this.state.image.width * this.state.zoom) / 2;
    this.state.panY = (h - this.state.image.height * this.state.zoom) / 2;
    this.render();
    this.callbacks.onChange?.();
  }

  resetZoom() {
    if (!this.state?.image) return;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);
    this.state.zoom = 1;
    this.state.panX = (w - this.state.image.width) / 2;
    this.state.panY = (h - this.state.image.height) / 2;
    this.render();
    this.callbacks.onChange?.();
  }

  /** @param {import('./state.js').SpriteRect} rect */
  getRectAt(ix, iy) {
    const rects = [...this.state.rectangles].reverse();
    for (const rect of rects) {
      if (ix >= rect.x && ix <= rect.x + rect.width && iy >= rect.y && iy <= rect.y + rect.height) {
        return rect;
      }
    }
    return null;
  }

  /** @param {import('./state.js').SpriteRect} rect @param {number} sx @param {number} sy @returns {HandleId | null} */
  getHandleAt(rect, sx, sy) {
    if (this.state.selectedId !== rect.id) return null;

    const corners = {
      nw: this.imageToScreen(rect.x, rect.y),
      ne: this.imageToScreen(rect.x + rect.width, rect.y),
      se: this.imageToScreen(rect.x + rect.width, rect.y + rect.height),
      sw: this.imageToScreen(rect.x, rect.y + rect.height),
    };

    const half = HANDLE_SIZE / 2;
    for (const [id, pt] of Object.entries(corners)) {
      if (Math.abs(sx - pt.x) <= half && Math.abs(sy - pt.y) <= half) {
        return /** @type {HandleId} */ (id);
      }
    }

    const edges = {
      n: this.imageToScreen(rect.x + rect.width / 2, rect.y),
      s: this.imageToScreen(rect.x + rect.width / 2, rect.y + rect.height),
      e: this.imageToScreen(rect.x + rect.width, rect.y + rect.height / 2),
      w: this.imageToScreen(rect.x, rect.y + rect.height / 2),
    };

    for (const [id, pt] of Object.entries(edges)) {
      if (Math.abs(sx - pt.x) <= half && Math.abs(sy - pt.y) <= half) {
        return /** @type {HandleId} */ (id);
      }
    }

    return null;
  }

  _bindEvents() {
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => this._onMouseLeave());
    document.addEventListener('mouseup', (e) => {
      if (this.interaction) this._onMouseUp(e);
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _onWheel(e) {
    e.preventDefault();
    if (!this.state?.image) return;

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const before = this.screenToImage(mx, my);

    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    this.state.zoom = Math.min(32, Math.max(0.05, this.state.zoom * factor));

    this.state.panX = mx - before.x * this.state.zoom;
    this.state.panY = my - before.y * this.state.zoom;

    this.render();
    this.callbacks.onChange?.();
  }

  /** @param {MouseEvent} e */
  _onMouseDown(e) {
    if (!this.state?.image) return;

    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const img = this.screenToImage(sx, sy);

    if (e.button === 2 || e.button === 1) {
      this.interaction = 'pan';
      this.dragStart = { x: sx, y: sy };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    const selected = this.state.rectangles.find((r) => r.id === this.state.selectedId);

    if (selected) {
      const handle = this.getHandleAt(selected, sx, sy);
      if (handle) {
        this.interaction = 'resize';
        this.resizeHandle = handle;
        this.rectStart = { ...selected };
        this.dragStart = { x: img.x, y: img.y };
        return;
      }
    }

    const hit = this.getRectAt(img.x, img.y);
    if (hit) {
      this.state.selectedId = hit.id;
      this.callbacks.onSelect?.(hit.id);
      this.interaction = 'move';
      this.movingRect = hit;
      this.moveOffset = { x: img.x - hit.x, y: img.y - hit.y };
      this.canvas.style.cursor = 'move';
      this.render();
      return;
    }

    if (this.state.mode === 'manual') {
      this.state.selectedId = null;
      this.callbacks.onSelect?.(null);
      this.interaction = 'draw';
      this.dragStart = { x: img.x, y: img.y };
      this.drawingRect = { x: img.x, y: img.y, width: 0, height: 0 };
    } else {
      this.state.selectedId = null;
      this.callbacks.onSelect?.(null);
    }

    this.render();
  }

  /** @param {MouseEvent} e */
  _onMouseMove(e) {
    const bounds = this.canvas.getBoundingClientRect();
    const sx = e.clientX - bounds.left;
    const sy = e.clientY - bounds.top;
    const img = this.screenToImage(sx, sy);
    this.cursorPos = img;

    if (this.state?.image) {
      this.callbacks.onCoords?.(
        Math.round(img.x),
        Math.round(img.y),
        this.drawingRect?.width,
        this.drawingRect?.height,
      );
    }

    if (!this.interaction) {
      this._updateHoverCursor(sx, sy, img);
      this.render();
      return;
    }

    if (this.interaction === 'pan') {
      this.state.panX += sx - this.dragStart.x;
      this.state.panY += sy - this.dragStart.y;
      this.dragStart = { x: sx, y: sy };
      this.render();
      return;
    }

    if (this.interaction === 'draw' && this.drawingRect) {
      const normalized = normalizeRect(
        this.dragStart.x,
        this.dragStart.y,
        img.x,
        img.y,
        this.state.snapEnabled,
        this.state.snapSize,
      );
      Object.assign(this.drawingRect, normalized);
      this.render();
      return;
    }

    if (this.interaction === 'move' && this.movingRect) {
      let nx = img.x - this.moveOffset.x;
      let ny = img.y - this.moveOffset.y;
      if (this.state.snapEnabled) {
        nx = snapValue(nx, true, this.state.snapSize);
        ny = snapValue(ny, true, this.state.snapSize);
      } else {
        nx = Math.round(nx);
        ny = Math.round(ny);
      }
      this.movingRect.x = nx;
      this.movingRect.y = ny;
      clampRectToImage(this.movingRect, this.state.image.width, this.state.image.height);
      this.render();
      this.callbacks.onChange?.();
      return;
    }

    if (this.interaction === 'resize' && this.rectStart && this.resizeHandle) {
      this._applyResize(img);
      this.render();
      this.callbacks.onChange?.();
    }
  }

  /** @param {{ x: number, y: number }} img */
  _applyResize(img) {
    const r = this.state.rectangles.find((rect) => rect.id === this.state.selectedId);
    if (!r || !this.rectStart) return;

    let { x, y, width, height } = { ...this.rectStart };
    let ix = img.x;
    let iy = img.y;

    if (this.state.snapEnabled) {
      ix = snapValue(ix, true, this.state.snapSize);
      iy = snapValue(iy, true, this.state.snapSize);
    } else {
      ix = Math.round(ix);
      iy = Math.round(iy);
    }

    const right = x + width;
    const bottom = y + height;
    const handle = this.resizeHandle;

    if (handle.includes('w')) {
      x = Math.min(ix, right - MIN_RECT);
      width = right - x;
    }
    if (handle.includes('e')) {
      width = Math.max(MIN_RECT, ix - x);
    }
    if (handle.includes('n')) {
      y = Math.min(iy, bottom - MIN_RECT);
      height = bottom - y;
    }
    if (handle.includes('s')) {
      height = Math.max(MIN_RECT, iy - y);
    }

    if (this.state.snapEnabled) {
      width = Math.max(this.state.snapSize, snapValue(width, true, this.state.snapSize));
      height = Math.max(this.state.snapSize, snapValue(height, true, this.state.snapSize));
    }

    Object.assign(r, { x, y, width, height });
    clampRectToImage(r, this.state.image.width, this.state.image.height);
  }

  /** @param {MouseEvent} e */
  _onMouseUp(e) {
    if (this.interaction === 'draw' && this.drawingRect) {
      const { width, height } = this.drawingRect;
      if (width >= MIN_RECT && height >= MIN_RECT) {
        const rect = createRect({
          ...this.drawingRect,
          name: `${this.state.namePrefix}${this.state.rectangles.length}`,
        });
        clampRectToImage(rect, this.state.image.width, this.state.image.height);
        this.state.rectangles.push(rect);
        this.state.selectedId = rect.id;
        this.callbacks.onSelect?.(rect.id);
        this.callbacks.onChange?.();
      }
    }

    if (this.interaction === 'move' || this.interaction === 'resize') {
      this.callbacks.onChange?.();
    }

    this.interaction = null;
    this.resizeHandle = null;
    this.rectStart = null;
    this.movingRect = null;
    this.drawingRect = null;
    this.canvas.style.cursor = 'crosshair';
    this.render();
  }

  _onMouseLeave() {
    this.interaction = null;
    this.drawingRect = null;
    this.canvas.style.cursor = 'default';
  }

  _updateHoverCursor(sx, sy, img) {
    const selected = this.state.rectangles.find((r) => r.id === this.state.selectedId);
    if (selected) {
      const handle = this.getHandleAt(selected, sx, sy);
      if (handle) {
        const cursors = {
          nw: 'nwse-resize', ne: 'nesw-resize', se: 'nwse-resize', sw: 'nesw-resize',
          n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
        };
        this.canvas.style.cursor = cursors[handle];
        return;
      }
    }

    const hit = this.getRectAt(img.x, img.y);
    this.canvas.style.cursor = hit ? 'move' : 'crosshair';
  }

  render() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.fillStyle = '#0a0a14';
    this.ctx.fillRect(0, 0, w, h);

    if (!this.state?.image) {
      this.ctx.fillStyle = '#606070';
      this.ctx.font = '14px system-ui, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Carga una imagen o arrástrala aquí', w / 2, h / 2);
      this._renderMinimap(null);
      return;
    }

    this.ctx.save();
    this.ctx.imageSmoothingEnabled = this.state.zoom < 2;

    this.ctx.drawImage(
      this.state.image,
      this.state.panX,
      this.state.panY,
      this.state.image.width * this.state.zoom,
      this.state.image.height * this.state.zoom,
    );

    if (this.state.mode === 'grid') {
      this._drawGridPreview();
    }

    for (const rect of this.state.rectangles) {
      this._drawRect(rect, rect.id === this.state.selectedId);
    }

    if (this.drawingRect) {
      this._drawRect({ ...this.drawingRect, name: '', id: '' }, false, '#4fc3f7', 1);
    }

    this.ctx.restore();
    this._renderMinimap(this.state.image);
  }

  _drawGridPreview() {
    const cells = getGridPreviewCells(this.state);
    for (const cell of cells) {
      if (cell.x + cell.width > this.state.image.width || cell.y + cell.height > this.state.image.height) {
        continue;
      }
      const tl = this.imageToScreen(cell.x, cell.y);
      const br = this.imageToScreen(cell.x + cell.width, cell.y + cell.height);
      this.ctx.strokeStyle = 'rgba(245, 197, 24, 0.6)';
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([4, 4]);
      this.ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
      this.ctx.setLineDash([]);
    }
  }

  /** @param {import('./state.js').SpriteRect | object} rect @param {boolean} selected */
  _drawRect(rect, selected, color = '#4ecca3', lineWidth = 1) {
    const tl = this.imageToScreen(rect.x, rect.y);
    const br = this.imageToScreen(rect.x + rect.width, rect.y + rect.height);
    const rw = br.x - tl.x;
    const rh = br.y - tl.y;

    this.ctx.strokeStyle = selected ? '#e94560' : color;
    this.ctx.lineWidth = selected ? 2.5 : lineWidth;
    this.ctx.strokeRect(tl.x, tl.y, rw, rh);

    if (this.state.showLabels && rect.name) {
      this.ctx.fillStyle = selected ? '#e94560' : '#4ecca3';
      this.ctx.font = `${Math.max(10, 11 * this.state.zoom)}px system-ui, sans-serif`;
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText(rect.name, tl.x + 2, tl.y - 2);
    }

    const dimText = `${rect.width}×${rect.height}`;
    this.ctx.fillStyle = 'rgba(224, 224, 224, 0.85)';
    this.ctx.font = `${Math.max(9, 10 * this.state.zoom)}px monospace`;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(dimText, tl.x + 2, tl.y + 2);

    if (selected) {
      this._drawHandles(rect);
    }
  }

  /** @param {import('./state.js').SpriteRect | object} rect */
  _drawHandles(rect) {
    const points = [
      [rect.x, rect.y],
      [rect.x + rect.width, rect.y],
      [rect.x + rect.width, rect.y + rect.height],
      [rect.x, rect.y + rect.height],
      [rect.x + rect.width / 2, rect.y],
      [rect.x + rect.width / 2, rect.y + rect.height],
      [rect.x + rect.width, rect.y + rect.height / 2],
      [rect.x, rect.y + rect.height / 2],
    ];

    this.ctx.fillStyle = '#e94560';
    for (const [ix, iy] of points) {
      const s = this.imageToScreen(ix, iy);
      this.ctx.fillRect(s.x - HANDLE_SIZE / 2, s.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    }
  }

  /** @param {HTMLImageElement | null} image */
  _renderMinimap(image) {
    const mw = this.minimapCanvas.width;
    const mh = this.minimapCanvas.height;
    this.minimapCtx.clearRect(0, 0, mw, mh);
    this.minimapCtx.fillStyle = 'rgba(10, 10, 20, 0.92)';
    this.minimapCtx.fillRect(0, 0, mw, mh);

    if (!image) return;

    const scale = Math.min(mw / image.width, mh / image.height);
    const dw = image.width * scale;
    const dh = image.height * scale;
    const ox = (mw - dw) / 2;
    const oy = (mh - dh) / 2;

    this.minimapCtx.drawImage(image, ox, oy, dw, dh);

    for (const rect of this.state.rectangles) {
      this.minimapCtx.strokeStyle = rect.id === this.state.selectedId ? '#e94560' : 'rgba(78, 204, 163, 0.8)';
      this.minimapCtx.lineWidth = 1;
      this.minimapCtx.strokeRect(
        ox + rect.x * scale,
        oy + rect.y * scale,
        rect.width * scale,
        rect.height * scale,
      );
    }

    const dpr = window.devicePixelRatio || 1;
    const cw = this.canvas.width / dpr;
    const ch = this.canvas.height / dpr;
    const vx = -this.state.panX / this.state.zoom;
    const vy = -this.state.panY / this.state.zoom;
    const vw = cw / this.state.zoom;
    const vh = ch / this.state.zoom;

    this.minimapCtx.strokeStyle = 'rgba(79, 195, 247, 0.9)';
    this.minimapCtx.lineWidth = 2;
    this.minimapCtx.strokeRect(
      ox + vx * scale,
      oy + vy * scale,
      vw * scale,
      vh * scale,
    );
  }
}
