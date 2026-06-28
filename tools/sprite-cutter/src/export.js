/**
 * @param {import('./state.js').SpriteRect[]} rectangles
 * @param {{ scale?: number, anchorX?: number, anchorY?: number, withOptions?: boolean }} options
 */
export function buildExportPayload(rectangles, options = {}) {
  const sprites = rectangles.map(({ name, x, y, width, height }) => ({
    name,
    x,
    y,
    width,
    height,
  }));

  if (options.withOptions) {
    return {
      sprites,
      options: {
        scale: options.scale ?? 1,
        anchorX: options.anchorX ?? 0.5,
        anchorY: options.anchorY ?? 0.5,
      },
    };
  }

  return sprites;
}

export function formatJson(payload) {
  return JSON.stringify(payload, null, 2);
}

/**
 * @param {string} json
 * @param {string} filename
 */
export function downloadJson(json, filename = 'sprites.json') {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
}

export function exportFilename(imageName) {
  if (!imageName) return 'sprites.json';
  const base = imageName.replace(/\.[^.]+$/, '');
  return `${base}-sprites.json`;
}
