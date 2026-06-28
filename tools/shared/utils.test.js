import { describe, it, expect } from 'vitest';
import { escapeHtml, formatJson, drawAspectThumb } from './utils.js';

describe('escapeHtml', () => {
  it('escapes special characters', () => {
    expect(escapeHtml('<script>"&"</script>')).toBe(
      '&lt;script&gt;&quot;&amp;&quot;&lt;/script&gt;',
    );
  });

  it('coerces non-strings', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('formatJson', () => {
  it('pretty-prints JSON', () => {
    expect(formatJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });
});

describe('drawAspectThumb', () => {
  it('centers wide images in square thumb', () => {
    const src = document.createElement('canvas');
    src.width = 64;
    src.height = 32;
    const thumb = document.createElement('canvas');
    thumb.width = 32;
    thumb.height = 32;
    const ctx = thumb.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 32, 32);
    drawAspectThumb(ctx, src, 64, 32, 32);
    const top = ctx.getImageData(16, 0, 1, 1).data;
    const mid = ctx.getImageData(16, 16, 1, 1).data;
    expect(top[0]).toBe(0);
    expect(mid[3]).toBeGreaterThan(0);
  });
});
