// Seeded PRNG + per-stream seed derivation (ADR 0003 section 6, ported from tools/sim/src/rng.ts
// without forking). No unseeded randomness anywhere in this file (CLAUDE.md non-negotiable 1):
// every number comes from mulberry32(seed), and every seed comes from deriveSeed(runSeed, tag,
// index) — a pure hash, not a stateful generator. There is no PRNG state that outlives one call,
// so `state` in run/reward/hp never carries a PRNG (ADR 0003 6.2): a tick that fails the
// movement gate, or one extra hit, never shifts the sequence any other tick or hit sees.
const MULBERRY_INCREMENT = 0x6d2b79f5;
const SHIFT_A = 15;
const SHIFT_B = 7;
const SHIFT_C = 14;
const OR_B = 61;
const UINT32_RANGE = 4294967296;

export type Rng = () => number;

/** Uniform numbers in [0, 1). Same seed -> same sequence, forever (no wall clock, no I/O). */
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

// ---- deriveSeed (ADR 0003 section 6.2): FNV-1a 32-bit over the UTF-8 bytes of
// `${runSeed}:${streamTag}:${index}`. Encoding UTF-8 by hand (instead of a global TextEncoder)
// keeps this file free of any ambient global, matching the same purity rule the ESLint config
// enforces for the rest of packages/shared/src (ADR 0003 C1-2). ----
const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;
const UINT32_MASK = 0xffffffff;
const UTF8_ONE_BYTE_MAX = 0x80;
const UTF8_TWO_BYTE_MAX = 0x800;
const UTF8_THREE_BYTE_MAX = 0x10000;
const UTF8_CONTINUATION_MASK = 0x3f;
const UTF8_CONTINUATION_TAG = 0x80;
const UTF8_TWO_BYTE_TAG = 0xc0;
const UTF8_THREE_BYTE_TAG = 0xe0;
const UTF8_FOUR_BYTE_TAG = 0xf0;
// Bit shifts for each leading byte's high bits (named, not computed, so no literal multiplier
// is needed at the call site: the game-core lint caps bare numeric literals at [-1, 0, 1, 2, 100]).
const UTF8_SHIFT_LEAD_2BYTE = 6;
const UTF8_SHIFT_LEAD_3BYTE = 12;
const UTF8_SHIFT_MID_3BYTE = 6;
const UTF8_SHIFT_LEAD_4BYTE = 18;
const UTF8_SHIFT_HIGH_MID_4BYTE = 12;
const UTF8_SHIFT_LOW_MID_4BYTE = 6;

function utf8Bytes(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    if (codePoint < UTF8_ONE_BYTE_MAX) {
      bytes.push(codePoint);
    } else if (codePoint < UTF8_TWO_BYTE_MAX) {
      bytes.push(
        UTF8_TWO_BYTE_TAG | (codePoint >> UTF8_SHIFT_LEAD_2BYTE),
        UTF8_CONTINUATION_TAG | (codePoint & UTF8_CONTINUATION_MASK),
      );
    } else if (codePoint < UTF8_THREE_BYTE_MAX) {
      bytes.push(
        UTF8_THREE_BYTE_TAG | (codePoint >> UTF8_SHIFT_LEAD_3BYTE),
        UTF8_CONTINUATION_TAG | ((codePoint >> UTF8_SHIFT_MID_3BYTE) & UTF8_CONTINUATION_MASK),
        UTF8_CONTINUATION_TAG | (codePoint & UTF8_CONTINUATION_MASK),
      );
    } else {
      bytes.push(
        UTF8_FOUR_BYTE_TAG | (codePoint >> UTF8_SHIFT_LEAD_4BYTE),
        UTF8_CONTINUATION_TAG | ((codePoint >> UTF8_SHIFT_HIGH_MID_4BYTE) & UTF8_CONTINUATION_MASK),
        UTF8_CONTINUATION_TAG | ((codePoint >> UTF8_SHIFT_LOW_MID_4BYTE) & UTF8_CONTINUATION_MASK),
        UTF8_CONTINUATION_TAG | (codePoint & UTF8_CONTINUATION_MASK),
      );
    }
  }
  return bytes;
}

/** FNV-1a 32-bit hash of the UTF-8 bytes of `text` (ADR 0003 6.2, algorithm constant, not balance). */
export function fnv1a32(text: string): number {
  let hash = FNV_OFFSET_BASIS_32;
  for (const byte of utf8Bytes(text)) {
    hash = (hash ^ byte) >>> 0;
    hash = Math.imul(hash, FNV_PRIME_32) & UINT32_MASK;
  }
  return hash >>> 0;
}

/**
 * Streams so far (ADR 0003 6.2): "drop" (index = reward tick ordinal that passed the gate,
 * starting at 0) and "hit" (index = monster hit-attempt ordinal, starting at 0). A new system
 * adds a new tag; it must never reuse one of these (ADR 0003 6.2, changing this is a contract
 * change to ADR 0003 and every vector, not a local edit).
 */
export type StreamTag = 'drop' | 'hit';

/**
 * runSeed and index are formatted as plain decimal integers with no leading zero, per ADR 0003
 * 6.2 ("runSeed, index เป็นเลขฐานสิบไม่มีเลขศูนย์นำหน้า").
 */
export function deriveSeed(runSeed: number, streamTag: StreamTag, index: number): number {
  if (!Number.isInteger(runSeed) || runSeed < 0) {
    throw new RangeError('runSeed must be a non-negative integer');
  }
  if (!Number.isInteger(index) || index < 0) {
    throw new RangeError('index must be a non-negative integer');
  }
  return fnv1a32(`${runSeed}:${streamTag}:${index}`);
}

/** mulberry32(deriveSeed(runSeed, streamTag, index)) — the one PRNG constructor engines call. */
export function streamRng(runSeed: number, streamTag: StreamTag, index: number): Rng {
  return mulberry32(deriveSeed(runSeed, streamTag, index));
}
