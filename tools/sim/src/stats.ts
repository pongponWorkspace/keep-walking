// Sample statistics for Monte Carlo reports (not formulas, not balance values). The PRNG itself
// (mulberry32, uniform, streamRng) comes from @keep-walking/shared/formulas (TL B-05).

/** Percentile (0..100) of a numeric sample using nearest-rank. */
export function percentile(sorted: readonly number[], pct: number): number {
  if (sorted.length === 0) throw new RangeError('empty sample');
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
  return sorted[rank] as number;
}

export function mean(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}
