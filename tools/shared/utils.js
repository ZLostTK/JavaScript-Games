/**
 * Shared utilities for tools in this monorepo.
 */

/** @param {string} str */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** @param {unknown} data */
export function formatJson(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * @param {string} json
 * @param {string} [filename]
 * @param {string} [mimeType]
 */
export function downloadJson(json, filename = 'data.json', mimeType = 'application/json') {
  downloadBlob(new Blob([json], { type: mimeType }), filename);
}

/**
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** @param {string} text */
export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(ta);
  }
}

/**
 * Draw image into a fixed-size thumbnail canvas preserving aspect ratio.
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource} source
 * @param {number} sw source width
 * @param {number} sh source height
 * @param {number} size target box size (square)
 */
export function drawAspectThumb(ctx, source, sw, sh, size) {
  const scale = Math.min(size / sw, size / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (size - dw) / 2;
  const dy = (size - dh) / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(source, 0, 0, sw, sh, dx, dy, dw, dh);
}

/**
 * Pack frames into a horizontal spritesheet.
 * @param {{ name: string, texture: HTMLCanvasElement, width: number, height: number }[]} frames
 * @returns {{ canvas: HTMLCanvasElement, sprites: { name: string, x: number, y: number, width: number, height: number }[] }}
 */
export function packSpritesheet(frames) {
  if (frames.length === 0) {
    throw new Error('No frames to pack');
  }

  const pad = 1;
  let x = 0;
  let maxH = 0;
  const sprites = [];

  for (const frame of frames) {
    sprites.push({
      name: frame.name,
      x,
      y: 0,
      width: frame.width,
      height: frame.height,
    });
    x += frame.width + pad;
    maxH = Math.max(maxH, frame.height);
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, x - pad);
  canvas.height = maxH;
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const s = sprites[i];
    ctx.drawImage(frame.texture, s.x, s.y);
  }

  return { canvas, sprites };
}

/** @param {string} message @returns {boolean} */
export function confirmAction(message) {
  return window.confirm(message);
}
