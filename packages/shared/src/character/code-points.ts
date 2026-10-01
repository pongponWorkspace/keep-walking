/**
 * Code point helpers shared by every file in this module. Everything here iterates by Unicode
 * code point (`Array.from`/`for...of` a string, `String.fromCodePoint`), never by UTF-16 code
 * unit (`.charCodeAt`/`.length`/`[i]`) — a surrogate pair (e.g. an emoji) is one element, matching
 * how `name.allowed`/`name.checkOrder` think about a name (tech note F10 section 7.1).
 *
 * `no-magic-numbers` (ADR 0001, packages/shared/src is game-core) requires every literal besides
 * -1/0/1/2/100 to be a named constant — including the handful of plain numbers this low-level
 * module needs (a hex radix, the one ASCII case-folding offset, the "U+" prefix length).
 */
const HEX_RADIX = 16;
const CODE_POINT_PREFIX_LENGTH = 2; // "U+".length
const LATIN_UPPER_A = 0x41;
const LATIN_UPPER_Z = 0x5a;
const ASCII_CASE_OFFSET = 0x20; // 'a' - 'A' === 0x20, same value as U+0020 SPACE (coincidence)
export const SPACE_CODE_POINT = 0x20;

/** Parses a `"U+XXXX"` string (schema `$defs.codePoint`) to its numeric code point. */
export function codePointOf(hex: string): number {
  return parseInt(hex.slice(CODE_POINT_PREFIX_LENGTH), HEX_RADIX);
}

/** `true` when `cp` falls inside `[from, to]` (inclusive), either end parsed from config. */
export function inRange(
  cp: number,
  range: { readonly from: string; readonly to: string },
): boolean {
  return cp >= codePointOf(range.from) && cp <= codePointOf(range.to);
}

export function inRanges(
  cp: number,
  ranges: readonly { readonly from: string; readonly to: string }[],
): boolean {
  return ranges.some((range) => inRange(cp, range));
}

/** The code points of `s`, one string per code point (not per UTF-16 unit). */
export function codePointsOf(s: string): string[] {
  return Array.from(s);
}

/** Maps every code point of `s` through `fn` (code point number in, code point number out). */
export function mapCodePoints(s: string, fn: (cp: number) => number): string {
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    out += String.fromCodePoint(cp === undefined ? ch.charCodeAt(0) : fn(cp));
  }
  return out;
}

/** Keeps only the code points of `s` for which `predicate` is `true`. */
export function filterCodePoints(s: string, predicate: (cp: number) => boolean): string {
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && predicate(cp)) out += ch;
  }
  return out;
}

/** `banned.passes.*.steps[].op: "lowercaseLatin"` (step 2: `A`-`Z` to `a`-`z`; no config fields of
 * its own, the ASCII case range is a fixed, universal rule). */
export function lowercaseLatinCodePoint(cp: number): number {
  return cp >= LATIN_UPPER_A && cp <= LATIN_UPPER_Z ? cp + ASCII_CASE_OFFSET : cp;
}

/** `banned.passes.*.steps[].op: "collapseRepeats"` (step 8: any run of the same code point to
 * one). */
export function collapseRepeatedCodePoints(s: string): string {
  let out = '';
  let last: number | undefined;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp !== last) out += ch;
    last = cp;
  }
  return out;
}
