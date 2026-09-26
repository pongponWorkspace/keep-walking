// Deterministic colour quantizer: RGBA → ≤ maxColors palette, no dithering (asset-pipeline 4.2).
// Exact when the image already has ≤ maxColors colours. Otherwise median cut weighted by pixel
// count, where each box is represented by its most frequent colour, so flat token fills (the
// bulk of every sheet) keep their exact hex and only antialias edge pixels move.
import type { IndexedImage } from './png';

const RGBA = 4;
const R_SHIFT = 24;
const G_SHIFT = 16;
const B_SHIFT = 8;
const CHANNEL_SHIFT = [R_SHIFT, G_SHIFT, B_SHIFT] as const;
const BYTE_MASK = 0xff;
const ALPHA = 3;

interface Colour {
  key: number;
  c: [number, number, number, number];
  count: number;
}

function keyOf(r: number, g: number, b: number, a: number): number {
  // Fully transparent pixels collapse to one colour: their RGB is invisible.
  if (a === 0) return 0;
  return ((r << CHANNEL_SHIFT[0]) | (g << CHANNEL_SHIFT[1]) | (b << CHANNEL_SHIFT[2]) | a) >>> 0;
}

function channels(key: number): [number, number, number, number] {
  return [
    (key >>> CHANNEL_SHIFT[0]) & BYTE_MASK,
    (key >>> CHANNEL_SHIFT[1]) & BYTE_MASK,
    (key >>> CHANNEL_SHIFT[2]) & BYTE_MASK,
    key & BYTE_MASK,
  ];
}

function byFrequency(a: Colour, b: Colour): number {
  return b.count - a.count || a.key - b.key;
}

function range(box: Colour[], ch: number): number {
  let lo = Infinity;
  let hi = -Infinity;
  for (const col of box) {
    const v = col.c[ch] ?? 0;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return hi - lo;
}

function widestChannel(box: Colour[]): { ch: number; width: number } {
  let best = { ch: 0, width: -1 };
  for (let ch = 0; ch < RGBA; ch++) {
    const width = range(box, ch);
    if (width > best.width) best = { ch, width };
  }
  return best;
}

function medianCut(colours: Colour[], maxColors: number): Colour[][] {
  const boxes: Colour[][] = [colours];
  while (boxes.length < maxColors) {
    let pick = -1;
    let pickScore = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      const score = widestChannel(box).width;
      if (score > pickScore) {
        pick = i;
        pickScore = score;
      }
    });
    if (pick < 0) break;
    const box = boxes[pick] ?? [];
    const { ch } = widestChannel(box);
    const sorted = [...box].sort((a, b) => (a.c[ch] ?? 0) - (b.c[ch] ?? 0) || a.key - b.key);
    const total = sorted.reduce((s, col) => s + col.count, 0);
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < sorted.length - 1; i++) {
      acc += sorted[i]?.count ?? 0;
      cut = i + 1;
      if (acc * 2 >= total) break;
    }
    boxes.splice(pick, 1, sorted.slice(0, cut), sorted.slice(cut));
  }
  return boxes;
}

function nearest(c: readonly number[], palette: Colour[]): number {
  let best = 0;
  let bestDist = Infinity;
  palette.forEach((p, i) => {
    let d = 0;
    for (let ch = 0; ch < RGBA; ch++) {
      const diff = (c[ch] ?? 0) - (p.c[ch] ?? 0);
      d += diff * diff;
    }
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  });
  return best;
}

export interface QuantizeResult extends IndexedImage {
  /** Distinct colours in the source before quantizing. */
  sourceColors: number;
}

export function quantize(rgba: Uint8Array, width: number, height: number, maxColors: number): QuantizeResult {
  const counts = new Map<number, number>();
  const pixelKeys = new Uint32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * RGBA;
    const key = keyOf(rgba[o] ?? 0, rgba[o + 1] ?? 0, rgba[o + 2] ?? 0, rgba[o + ALPHA] ?? 0);
    pixelKeys[i] = key;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const colours: Colour[] = [...counts.entries()].map(([key, count]) => ({ key, c: channels(key), count }));
  colours.sort(byFrequency);
  const reps: Colour[] =
    colours.length <= maxColors
      ? colours
      : medianCut(colours, maxColors).map((box) => [...box].sort(byFrequency)[0] as Colour);
  // Transparent first (short tRNS), then by frequency: a stable, deterministic palette order.
  reps.sort((a, b) => (a.key === 0 ? -1 : b.key === 0 ? 1 : byFrequency(a, b)));
  const indexOf = new Map<number, number>();
  for (const col of colours) indexOf.set(col.key, nearest(col.c, reps));
  const indices = new Uint8Array(width * height);
  for (let i = 0; i < pixelKeys.length; i++) indices[i] = indexOf.get(pixelKeys[i] ?? 0) ?? 0;
  const palette = new Uint8Array(reps.length * RGBA);
  reps.forEach((col, i) => palette.set(col.c, i * RGBA));
  return { width, height, palette, indices, sourceColors: colours.length };
}
