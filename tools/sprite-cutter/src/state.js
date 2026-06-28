/** @typedef {{ id: string, name: string, x: number, y: number, width: number, height: number }} SpriteRect */

/** @typedef {'manual' | 'grid'} EditorMode */

export function createState() {
  return {
    /** @type {HTMLImageElement | null} */
    image: null,
    imageName: '',
    /** @type {SpriteRect[]} */
    rectangles: [],
    selectedId: null,
    mode: /** @type {EditorMode} */ ('manual'),
    zoom: 1,
    panX: 0,
    panY: 0,
    snapEnabled: false,
    snapSize: 1,
    showLabels: true,
    namePrefix: 'sprite_',
    grid: {
      spriteWidth: 32,
      spriteHeight: 32,
      columns: 4,
      rows: 4,
      offsetX: 0,
      offsetY: 0,
      spacingX: 0,
      spacingY: 0,
      namePrefix: 'sprite_',
    },
    exportOptions: {
      scale: 1,
      anchorX: 0.5,
      anchorY: 0.5,
      withOptions: false,
    },
  };
}

let nextId = 1;

export function createRect(partial = {}) {
  return {
    id: `r${nextId++}`,
    name: partial.name ?? 'sprite_0',
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? 32,
    height: partial.height ?? 32,
  };
}

export function snapValue(value, enabled, size) {
  if (!enabled || size <= 0) return Math.round(value);
  return Math.round(value / size) * size;
}

export function normalizeRect(x0, y0, x1, y1, snapEnabled, snapSize) {
  let x = Math.min(x0, x1);
  let y = Math.min(y0, y1);
  let width = Math.abs(x1 - x0);
  let height = Math.abs(y1 - y0);

  if (snapEnabled) {
    x = snapValue(x, true, snapSize);
    y = snapValue(y, true, snapSize);
    width = Math.max(snapSize, snapValue(width, true, snapSize));
    height = Math.max(snapSize, snapValue(height, true, snapSize));
  } else {
    x = Math.round(x);
    y = Math.round(y);
    width = Math.round(width);
    height = Math.round(height);
  }

  return { x, y, width, height };
}

export function regenerateNames(rectangles, prefix) {
  rectangles.forEach((rect, index) => {
    rect.name = `${prefix}${index}`;
  });
}

export function clampRectToImage(rect, imgWidth, imgHeight) {
  rect.x = Math.max(0, Math.min(rect.x, imgWidth - 1));
  rect.y = Math.max(0, Math.min(rect.y, imgHeight - 1));
  rect.width = Math.max(1, Math.min(rect.width, imgWidth - rect.x));
  rect.height = Math.max(1, Math.min(rect.height, imgHeight - rect.y));
}
