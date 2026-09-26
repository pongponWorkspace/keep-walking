// Deterministic seeded PRNG for the tiny amount of noise texture some cues use (a dry "knock"
// under a click). Not the game's gameplay RNG (ADR 0003) — this is asset synthesis only, seeded by
// the cue id string so re-running the generator on the same source always produces the same bytes
// (asset-delivery.md 8: "อินพุตเดียวกันได้ไบต์เดียวกันทุกครั้ง").
//
// Named constants below are the standard published constants of the two algorithms (FNV-1a,
// mulberry32) — not tunable values, just spelled out so eslint's no-magic-numbers rule (repo-wide,
// meant to keep gameplay balance values out of code) has a name to point at.

const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;

/** FNV-1a string hash to turn a cue id into a 32-bit seed. */
export function seedFromString(s: string): number {
  let h = FNV_OFFSET_BASIS_32;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME_32);
  }
  return h >>> 0;
}

const MULBERRY32_INCREMENT = 0x6d2b79f5;
const MULBERRY32_SHIFT_A = 15;
const MULBERRY32_SHIFT_B = 7;
const MULBERRY32_MIX = 61;
const MULBERRY32_SHIFT_C = 14;
const UINT32_RANGE = 4294967296; // 2^32, divisor to turn a uint32 into a float in [0, 1)

/** mulberry32: small, fast, deterministic PRNG. Returns a function yielding floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + MULBERRY32_INCREMENT) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> MULBERRY32_SHIFT_A), t | 1);
    t ^= t + Math.imul(t ^ (t >>> MULBERRY32_SHIFT_B), t | MULBERRY32_MIX);
    return ((t ^ (t >>> MULBERRY32_SHIFT_C)) >>> 0) / UINT32_RANGE;
  };
}
