/**
 * `banned.passes.*`: named normalization pipelines applied to a name and to every banned term /
 * allow entry before they are compared (character.json `banned._note`, P2-H64). Every step is one
 * of the seven `PassOp` values; none of them build a `RegExp` from config (systems-designer
 * contract). `applyPass` resolves `base` (heavy = light then heavy's own steps) before running a
 * pass's own `steps`.
 */
import {
  codePointOf,
  codePointsOf,
  collapseRepeatedCodePoints,
  inRanges,
  lowercaseLatinCodePoint,
  mapCodePoints,
} from './code-points';
import { normalizeName } from './normalize';
import type { CharacterNameParams, PassStep } from './types';

function required<T>(value: T | undefined, field: string, op: string): T {
  if (value === undefined) throw new Error(`banned pass step "${op}": missing "${field}"`);
  return value;
}

/** `op: "latinRunMap"`: maps characters inside a maximal run of `runCodePoints`/`runChars` that
 * contains at least one real `letterCodePoints` letter (so `b4dw0rd` maps, a bare `2026` does
 * not); runs are found first, over the *whole* string, then mapped. */
function applyLatinRunMap(s: string, step: PassStep): string {
  const runCodePoints = required(step.runCodePoints, 'runCodePoints', step.op);
  const runChars = new Set(required(step.runChars, 'runChars', step.op));
  const letterCodePoints = required(step.letterCodePoints, 'letterCodePoints', step.op);
  const map = new Map(required(step.map, 'map', step.op).map((m) => [m.from, m.to]));
  const chars = codePointsOf(s);
  const inRun = (ch: string): boolean => {
    const cp = ch.codePointAt(0);
    return runChars.has(ch) || (cp !== undefined && inRanges(cp, runCodePoints));
  };
  const isLetter = (ch: string): boolean => {
    const cp = ch.codePointAt(0);
    return cp !== undefined && inRanges(cp, letterCodePoints);
  };
  let out = '';
  let i = 0;
  while (i < chars.length) {
    if (!inRun(chars[i] as string)) {
      out += chars[i];
      i += 1;
      continue;
    }
    let j = i;
    while (j < chars.length && inRun(chars[j] as string)) j += 1;
    const run = chars.slice(i, j);
    const qualifies = run.some((ch) => isLetter(ch));
    out += run.map((ch) => (qualifies ? (map.get(ch) ?? ch) : ch)).join('');
    i = j;
  }
  return out;
}

function applyStep(s: string, step: PassStep, params: CharacterNameParams): string {
  switch (step.op) {
    case 'nameNormalize':
      return normalizeName(s, params.name.normalize);
    case 'lowercaseLatin':
      return mapCodePoints(s, lowercaseLatinCodePoint);
    case 'removeCodePoints': {
      const ranges = required(step.ranges, 'ranges', step.op);
      return codePointsOf(s)
        .filter((ch) => {
          const cp = ch.codePointAt(0);
          return !(cp !== undefined && inRanges(cp, ranges));
        })
        .join('');
    }
    case 'removeChars': {
      const chars = new Set(required(step.chars, 'chars', step.op));
      return codePointsOf(s)
        .filter((ch) => !chars.has(ch))
        .join('');
    }
    case 'mapCodePointRange': {
      const fromCp = codePointOf(required(step.from, 'from', step.op));
      const toCp = codePointOf(required(step.to, 'to', step.op));
      const toStartCp = codePointOf(required(step.toStart, 'toStart', step.op));
      return mapCodePoints(s, (cp) =>
        cp >= fromCp && cp <= toCp ? toStartCp + (cp - fromCp) : cp,
      );
    }
    case 'collapseRepeats':
      return collapseRepeatedCodePoints(s);
    case 'latinRunMap':
      return applyLatinRunMap(s, step);
    /* c8 ignore next 4 -- exhaustiveness guard, PassOp has no other member */
    default: {
      const exhaustive: never = step.op;
      return exhaustive;
    }
  }
}

/** Applies named pass `passName` (`params.banned.passes[passName]`) to `s`: its `base` pass first
 * (if any), then its own `steps` in order. `mapCodePointRange`'s `from`/`to` are parsed as single
 * code points (not ranges) directly from the step, matching the schema's `$defs.codePoint`. */
export function applyPass(s: string, passName: string, params: CharacterNameParams): string {
  const def = params.banned.passes[passName];
  if (def === undefined) throw new Error(`banned.passes: unknown pass "${passName}"`);
  const input = def.base === undefined ? s : applyPass(s, def.base, params);
  return def.steps.reduce((acc, step) => applyStep(acc, step, params), input);
}
