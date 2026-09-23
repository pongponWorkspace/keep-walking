// Seeded PRNG (mulberry32). Algorithm constants, not balance values.
const MULBERRY_INCREMENT = 0x6d2b79f5;
const SHIFT_A = 15;
const SHIFT_B = 7;
const SHIFT_C = 14;
const OR_B = 61;
const UINT32_RANGE = 4294967296;

export type Rng = () => number;

/** Returns a function giving uniform numbers in [0, 1). Same seed → same sequence. */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> SHIFT_A), t | 1);
    t ^= t + Math.imul(t ^ (t >>> SHIFT_B), t | OR_B);
    return ((t ^ (t >>> SHIFT_C)) >>> 0) / UINT32_RANGE;
  };
}

export function uniform(rng: Rng, min: number, max: number): number {
  return min + (max - min) * rng();
}

/** Percentile (0..100) of a numeric sample using nearest-rank. */
export function percentile(sorted: readonly number[], pct: number): number {
  if (sorted.length === 0) throw new RangeError('empty sample');
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[rank] as number;
}

export function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
