/**
 * Golden-vector conformance for `@keep-walking/shared/character` (tech note
 * docs/tech/F10-account-shell.md sections 7, 11; P2-F10-T12 acceptance):
 *
 * 1. Every `vectors` entry of `design/systems/test-vectors/character-name.json` (the file's own
 *    fixture `lexicon`, `paramsOverride` applied on top of `config/balance/character.json`).
 * 2. Every `contentVectors.vectors` entry (the real `config/content/character-names.th.json`
 *    lexicon — an integration check, not the fixture).
 * 3. `contentVectors.pool`: every head+tail combination and every fallback name of the real
 *    content file passes `validateCharacterName` (T12 acceptance: "random name always passes
 *    validate").
 * 4. A 10,000-seed property test: `randomCharacterName` never returns a name
 *    `validateCharacterName` rejects, against the real content pool.
 * 5. The documented fail-closed path when `Intl.Segmenter` does not exist (tech note section 1).
 *
 * `params`/`lexicon` are plain JSON imports (`tsconfig.base.json` `resolveJsonModule`, the same
 * pattern `packages/shared/src/config/data.ts` already uses) — this file never reads `design/` or
 * `config/` from disk at runtime (`packages/shared/tsconfig.json` has no Node types, ADR 0003
 * section 8.3).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { isWithinTolerance } from '../golden-vector';
import { resolveStringList } from './lexicon';
import { randomCharacterName, validateCharacterName } from './index';
import type { CharacterNameParams, Lexicon, NameRng, RandomCharacterNameResult } from './index';
import rawParams from '../../../../config/balance/character.json';
import rawRealLexicon from '../../../../config/content/character-names.th.json';
import rawVectorFile from '../../../../design/systems/test-vectors/character-name.json';

const baseParams = rawParams as unknown as CharacterNameParams;
const fixtureLexicon = rawVectorFile.lexicon as unknown as Lexicon;
const realLexicon = rawRealLexicon as unknown as Lexicon;

interface VectorEntry {
  readonly input: Record<string, unknown>;
  readonly expected: Record<string, unknown>;
  readonly tolerance: number;
  readonly source: string;
}

/** Deep-clones `base` and applies each `"a.b.c": value` entry of `overrides` (the vector file's
 * own `paramsOverride` contract, tech note section 11 / file `_note`) at that dotted path. */
function withOverride(base: CharacterNameParams, overrides: unknown): CharacterNameParams {
  if (overrides === undefined) return base;
  if (typeof overrides !== 'object' || overrides === null) {
    throw new Error('vector input "paramsOverride" must be an object');
  }
  // JSON round-trip, not `structuredClone`: `packages/shared/tsconfig.json` has no DOM lib
  // (ADR 0003 8.3), and `base` is plain JSON-shaped data anyway (no Date/Map/function fields).
  const clone = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  for (const [path, value] of Object.entries(overrides as Record<string, unknown>)) {
    const parts = path.split('.');
    const last = parts.pop();
    if (last === undefined) throw new Error('empty paramsOverride path');
    let node: Record<string, unknown> = clone;
    for (const part of parts) {
      const next = node[part];
      if (typeof next !== 'object' || next === null) {
        throw new Error(`paramsOverride path "${path}" does not resolve (at "${part}")`);
      }
      node = next as Record<string, unknown>;
    }
    node[last] = value;
  }
  return clone as unknown as CharacterNameParams;
}

/** Replays `draws` in order; throws if the function under test asks for one more draw than the
 * vector provides (keeps `expected.draws` an exact, checkable count). */
function rngFromDraws(draws: readonly number[]): NameRng {
  let i = 0;
  return () => {
    const v = draws[i];
    if (v === undefined) throw new Error('rngFromDraws: exhausted (vector drew too many times)');
    i += 1;
    return v;
  };
}

function nameOf(input: Record<string, unknown>): string {
  const v = input['name'];
  if (typeof v !== 'string') throw new Error('vector input "name" must be a string');
  return v;
}
function drawsOf(input: Record<string, unknown>): number[] {
  const v = input['rngDraws'];
  if (!Array.isArray(v) || !v.every((x) => typeof x === 'number')) {
    throw new Error('vector input "rngDraws" must be a number array');
  }
  return v;
}

function runValidate(input: Record<string, unknown>, lexicon: Lexicon): unknown {
  const params = withOverride(baseParams, input['paramsOverride']);
  return validateCharacterName(nameOf(input), params, lexicon);
}

function runRandom(input: Record<string, unknown>, lexicon: Lexicon): RandomCharacterNameResult {
  const params = withOverride(baseParams, input['paramsOverride']);
  return randomCharacterName(rngFromDraws(drawsOf(input)), lexicon, params);
}

/** Evaluates one `character-name.json` vector (base or content). Throws on a fn this file does
 * not know — a genuinely new fn should fail loudly, not be silently skipped (same convention as
 * `formulas/vectors.test.ts`). */
function evaluateCharacterVector(vector: VectorEntry, lexicon: Lexicon): unknown {
  const fn = String(vector.input['fn']);
  switch (fn) {
    case 'validateCharacterName':
      return runValidate(vector.input, lexicon);
    case 'randomCharacterName':
      return runRandom(vector.input, lexicon);
    default:
      throw new Error(`character.test.ts does not know how to evaluate fn "${fn}"`);
  }
}

function assertVector(vector: VectorEntry, index: number, lexicon: Lexicon): void {
  const actual = evaluateCharacterVector(vector, lexicon);
  expect(
    isWithinTolerance(actual, vector.expected, vector.tolerance),
    `[${index}] ${String(vector.input['fn'])}: expected ${JSON.stringify(vector.expected)}, got ` +
      `${JSON.stringify(actual)} (tolerance ${vector.tolerance}) · ${vector.source}`,
  ).toBe(true);
}

const baseVectors = rawVectorFile.vectors as unknown as readonly VectorEntry[];
const contentVectors = rawVectorFile.contentVectors.vectors as unknown as readonly VectorEntry[];
const pool = rawVectorFile.contentVectors.pool as unknown as VectorEntry;

describe('design/systems/test-vectors/character-name.json (fixture lexicon)', () => {
  it('found the fixture vectors (file discovery did not silently return nothing)', () => {
    expect(baseVectors.length).toBeGreaterThan(0);
  });

  baseVectors.forEach((vector, index) => {
    it(`[${index}] ${String(vector.input['fn'])}`, () => {
      assertVector(vector, index, fixtureLexicon);
    });
  });
});

describe('character-name.json contentVectors (real config/content/character-names.th.json)', () => {
  it('found the content vectors', () => {
    expect(contentVectors.length).toBeGreaterThan(0);
  });

  contentVectors.forEach((vector, index) => {
    it(`[${index}] ${String(vector.input['fn'])}`, () => {
      assertVector(vector, index, realLexicon);
    });
  });

  // `fn: "validateEveryRandomName"` is a pool-level check, not a port of a `character` export
  // (T12 acceptance: "random name always passes validate" over the whole real pool, not one
  // sample) — evaluated here directly rather than through `evaluateCharacterVector`.
  it('pool: every head+tail combination and every fallback name passes validate', () => {
    const input = pool.input;
    const templatePaths = input['template'];
    const fallbackKey = input['fallbackKey'];
    if (!Array.isArray(templatePaths) || !templatePaths.every((p) => typeof p === 'string')) {
      throw new Error('pool.input.template must be a string array');
    }
    if (typeof fallbackKey !== 'string') throw new Error('pool.input.fallbackKey must be a string');
    const lists = templatePaths.map((path) => resolveStringList(realLexicon, path));
    const combos = lists
      .reduce<string[][]>(
        (acc, list) => acc.flatMap((parts) => list.map((item) => [...parts, item])),
        [[]],
      )
      .map((parts) => parts.join(baseParams.random.joiner));
    const fallbackList = resolveStringList(realLexicon, fallbackKey);
    const passOf = (names: readonly string[]): number =>
      names.filter((name) => validateCharacterName(name, baseParams, realLexicon).ok).length;
    const actual = {
      combinations: combos.length,
      pass: passOf(combos),
      fallback: fallbackList.length,
      fallbackPass: passOf(fallbackList),
    };
    expect(
      isWithinTolerance(actual, pool.expected, pool.tolerance),
      `pool: expected ${JSON.stringify(pool.expected)}, got ${JSON.stringify(actual)} · ${pool.source}`,
    ).toBe(true);
  });
});

/** Deterministic seeded PRNG (mulberry32), test-only: `NameRng` draws in `[0, 1)`, one per call,
 * reproducible per `seed` so a failing seed is reportable and replayable. */
function mulberry32(seed: number): NameRng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('randomCharacterName: 10,000-seed property (real content pool, T12 acceptance)', () => {
  const SEED_COUNT = 10_000;

  // ~15s for 10,000 seeds (measured): well under vitest's default 5,000ms per-test timeout, so
  // this needs its own, explicit one (third argument) rather than a global testTimeout bump.
  const PROPERTY_TEST_TIMEOUT_MS = 60_000;

  it(
    `every one of ${SEED_COUNT} seeds produces a name validateCharacterName accepts`,
    () => {
      for (let seed = 0; seed < SEED_COUNT; seed += 1) {
        const result = randomCharacterName(mulberry32(seed), realLexicon, baseParams);
        const check = validateCharacterName(result.name, baseParams, realLexicon);
        expect(
          check.ok,
          `seed ${seed}: randomCharacterName produced "${result.name}" (attempts ${result.attempts}, ` +
            `fallback ${String(result.fallback)}) which validateCharacterName rejected` +
            (check.ok ? '' : ` (${check.reason})`),
        ).toBe(true);
      }
    },
    PROPERTY_TEST_TIMEOUT_MS,
  );
});

// `Intl.Segmenter` is declared read-only by lib.es2022.intl's own type; a plain `as unknown as`
// re-view through this narrower, mutable shape is the only way to stub it out, and is confined to
// this one describe block (restored in `afterEach`, never left stubbed for another test file).
interface MutableIntl {
  Segmenter: typeof Intl.Segmenter | undefined;
}

describe('validateCharacterName / randomCharacterName: no Intl.Segmenter (tech note section 1)', () => {
  const mutableIntl = Intl as unknown as MutableIntl;
  const realSegmenter = Intl.Segmenter;

  afterEach(() => {
    mutableIntl.Segmenter = realSegmenter;
  });

  it('validateCharacterName fails closed with "charset", never lets a name through', () => {
    // Simulating a baseline browser without Intl.Segmenter at all (A-T04-4).
    mutableIntl.Segmenter = undefined;
    const result = validateCharacterName('สมชาย', baseParams, fixtureLexicon);
    expect(result).toEqual({ ok: false, reason: 'charset' });
  });

  it('randomCharacterName cannot find a passing name either (every candidate is "charset"), so character creation is refused rather than silently handing back an unusable name', () => {
    mutableIntl.Segmenter = undefined;
    const draws = Array.from({ length: baseParams.random.maxAttempts * 2 + 1 }, () => 0);
    // Matches the tech note's own framing (section 1): "randomCharacterName returns a value from
    // the fallbackKey list, which also does not pass validate on that machine" — since every
    // fallback candidate is run through the same fail-closed validateCharacterName, none can ever
    // be returned as `ok`, so this throws instead of handing back a name no player could keep
    // (random.ts's own contract: "this only throws on a genuinely broken config" — on a machine
    // with no Intl.Segmenter at all, no config could satisfy it, so the behaviour is the same:
    // character creation is refused outright).
    expect(() => randomCharacterName(rngFromDraws(draws), fixtureLexicon, baseParams)).toThrow();
  });
});
