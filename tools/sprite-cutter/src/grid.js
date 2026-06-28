import { createRect } from './state.js';

/**
 * @param {import('./state.js').createState extends () => infer S ? S : never} state
 * @returns {import('./state.js').SpriteRect[]}
 */
export function generateGridRectangles(state) {
  const g = state.grid;
  const { spriteWidth, spriteHeight, columns, rows, offsetX, offsetY, spacingX, spacingY, namePrefix } = g;
  /** @type {import('./state.js').SpriteRect[]} */
  const rects = [];
  let index = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = offsetX + col * (spriteWidth + spacingX);
      const y = offsetY + row * (spriteHeight + spacingY);

      if (state.image) {
        if (x + spriteWidth > state.image.width || y + spriteHeight > state.image.height) {
          continue;
        }
      }

      rects.push(createRect({
        name: `${namePrefix}${index}`,
        x,
        y,
        width: spriteWidth,
        height: spriteHeight,
      }));
      index++;
    }
  }

  return rects;
}

/**
 * @param {import('./state.js').createState extends () => infer S ? S : never} state
 * @returns {{ col: number, row: number, x: number, y: number, width: number, height: number }[]}
 */
export function getGridPreviewCells(state) {
  const g = state.grid;
  const cells = [];

  for (let row = 0; row < g.rows; row++) {
    for (let col = 0; col < g.columns; col++) {
      cells.push({
        col,
        row,
        x: g.offsetX + col * (g.spriteWidth + g.spacingX),
        y: g.offsetY + row * (g.spriteHeight + g.spacingY),
        width: g.spriteWidth,
        height: g.spriteHeight,
      });
    }
  }

  return cells;
}

export function readGridFromForm(form) {
  return {
    spriteWidth: Math.max(1, parseInt(form.spriteWidth, 10) || 32),
    spriteHeight: Math.max(1, parseInt(form.spriteHeight, 10) || 32),
    columns: Math.max(1, parseInt(form.columns, 10) || 1),
    rows: Math.max(1, parseInt(form.rows, 10) || 1),
    offsetX: Math.max(0, parseInt(form.offsetX, 10) || 0),
    offsetY: Math.max(0, parseInt(form.offsetY, 10) || 0),
    spacingX: Math.max(0, parseInt(form.spacingX, 10) || 0),
    spacingY: Math.max(0, parseInt(form.spacingY, 10) || 0),
    namePrefix: form.namePrefix || 'sprite_',
  };
}
