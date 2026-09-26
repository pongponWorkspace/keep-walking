import { describe, expect, it } from 'vitest';
import { decodePng, encodeIndexedPng } from '../src/png';
import { quantize } from '../src/quantize';

function image(width: number, height: number, pick: (x: number, y: number) => [number, number, number, number]): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) out.set(pick(x, y), (y * width + x) * 4);
  return out;
}

describe('png + quantize', () => {
  it('round-trips an image with few colours exactly, alpha included', () => {
    const src = image(9, 5, (x, y) => (x < 3 ? [0x1a, 0x1a, 0x22, 255] : y < 2 ? [255, 0xcc, 0, 255] : [0, 0, 0, 0]));
    const q = quantize(src, 9, 5, 128);
    expect(q.sourceColors).toBe(3);
    const png = encodeIndexedPng(q);
    const back = decodePng(png);
    expect(back).toMatchObject({ width: 9, height: 5, colorType: 3, hasAlpha: true, paletteSize: 3 });
    expect(Buffer.from(back.rgba)).toEqual(Buffer.from(src));
  });

  it('caps the palette, keeps dominant flat colours exact, and is deterministic', () => {
    const src = image(64, 64, (x, y) => (x < 32 ? [0xcc, 0x11, 0x77, 255] : [x * 4, y * 4, (x + y) * 2, 128 + y]));
    const a = encodeIndexedPng(quantize(src, 64, 64, 16));
    const b = encodeIndexedPng(quantize(src, 64, 64, 16));
    expect(a.equals(b)).toBe(true);
    const back = decodePng(a);
    expect(back.paletteSize).toBeLessThanOrEqual(16);
    expect([...back.rgba.subarray(0, 4)]).toEqual([0xcc, 0x11, 0x77, 255]);
  });

  it('collapses fully transparent pixels to one entry', () => {
    const src = image(4, 1, (x) => [x * 60, 10, 10, 0]);
    expect(quantize(src, 4, 1, 128).sourceColors).toBe(1);
  });
});
