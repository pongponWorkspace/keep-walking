/**
 * Byte counters for the HUD (docs/tech/F02-map-location-spike.md section 11, TL-S07). Only ever
 * active behind `hud=1` (the caller decides when to install/read this; this module itself is
 * side-effect-free state so it is trivially unit-testable without a DOM).
 *
 * Categories match the CSV columns (`gps-trace-format.md` 4.1): `mb_js` comes from Resource
 * Timing only (same-origin script chunks always report `encodedBodySize`, section 11 table row
 * "JS"); `mb_style` and `mb_tiles` come from the primary in-app counters below (`countBytes`),
 * fed by `map/protocol.ts`'s `kw+https` handler and the counting PMTiles `Source`.
 *
 * Privacy (config/app/privacy.json#logging.byteCounterStoresTileUrls = false): this module stores
 * only running totals per category, never a URL or path.
 */

export type ByteCategory = 'style' | 'tiles';

export type BytesMethod = 'transfer' | 'decoded';

export interface ByteTotals {
  readonly style: number;
  readonly tiles: number;
}

let styleBytes = 0;
let tilesBytes = 0;

/** Adds `n` decoded bytes to `category`'s running total. Never stores the URL that produced them. */
export function countBytes(category: ByteCategory, n: number): void {
  if (!Number.isFinite(n) || n < 0) {
    return;
  }
  if (category === 'style') {
    styleBytes += n;
  } else {
    tilesBytes += n;
  }
}

export function getByteTotals(): ByteTotals {
  return { style: styleBytes, tiles: tilesBytes };
}

/** Test-only reset so each test starts from a clean counter (module state is otherwise global). */
export function resetByteTotals(): void {
  styleBytes = 0;
  tilesBytes = 0;
}

/**
 * JS bytes from same-origin script/module Resource Timing entries (section 11 table row "JS").
 * Uses `encodedBodySize` (the over-the-wire, possibly-gzipped size) when the browser reports it;
 * `decodedBodySize` (safe-high fallback, `bytesMethod: 'decoded'`) never sees this path go to 0.
 * Not exported as a running counter (unlike style/tiles) because Resource Timing already keeps
 * its own history for the page's lifetime, and re-summing on read avoids a second bookkeeping path.
 */
export function computeJsBytes(): { bytes: number; method: BytesMethod } {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
    return { bytes: 0, method: 'decoded' };
  }
  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  const scripts = entries.filter(
    (entry) => entry.initiatorType === 'script' || entry.initiatorType === 'link',
  );
  const transferTotal = scripts.reduce((sum, entry) => sum + entry.encodedBodySize, 0);
  if (transferTotal > 0) {
    return { bytes: transferTotal, method: 'transfer' };
  }
  const decodedTotal = scripts.reduce((sum, entry) => sum + entry.decodedBodySize, 0);
  return { bytes: decodedTotal, method: 'decoded' };
}
