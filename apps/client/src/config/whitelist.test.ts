import { describe, expect, it } from 'vitest';
import {
  BALANCE_WHITELIST,
  FORBIDDEN_ANYWHERE,
  buildBalanceSubset,
  pickTopLevelKeys,
  stableStringify,
} from './whitelist';

describe('pickTopLevelKeys', () => {
  it('keeps only the requested top-level keys', () => {
    expect(pickTopLevelKeys({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('silently omits a listed key that is not present in the source', () => {
    expect(pickTopLevelKeys({ a: 1 }, ['a', 'openingHours'])).toEqual({ a: 1 });
  });

  it('never mutates the input', () => {
    const input = { a: 1, b: { coverageFilter: true } };
    const picked = pickTopLevelKeys(input, ['a']);
    expect(picked).toEqual({ a: 1 });
    expect(input).toEqual({ a: 1, b: { coverageFilter: true } });
  });
});

describe('buildBalanceSubset', () => {
  it('namespaces every whitelist entry and drops everything outside it', () => {
    const sourcesByFile: Record<string, unknown> = {};
    for (const entry of BALANCE_WHITELIST) {
      const inWhitelist = Object.fromEntries(entry.topLevelKeys.map((k) => [k, `${k}-value`]));
      sourcesByFile[entry.file] = { ...inWhitelist, coverageFilter: 'must-not-survive' };
    }
    const subset = buildBalanceSubset(sourcesByFile) as Record<string, Record<string, unknown>>;
    for (const entry of BALANCE_WHITELIST) {
      expect(subset[entry.namespace]).not.toHaveProperty('coverageFilter');
      for (const key of entry.topLevelKeys) {
        expect(subset[entry.namespace]?.[key]).toBe(`${key}-value`);
      }
    }
  });

  it('throws when a whitelisted file is missing from the sources (a wiring bug, not data)', () => {
    expect(() => buildBalanceSubset({})).toThrow(/missing or non-object source/);
  });
});

describe('stableStringify', () => {
  it('sorts object keys recursively but keeps array order', () => {
    const text = stableStringify({ b: 1, a: [3, 2, { d: 1, c: 2 }] });
    expect(text).toBe(
      '{\n  "a": [\n    3,\n    2,\n    {\n      "c": 2,\n      "d": 1\n    }\n  ],\n  "b": 1\n}',
    );
  });

  it('is stable across two calls with keys inserted in a different order', () => {
    expect(stableStringify({ z: 1, a: 2 })).toBe(stableStringify({ a: 2, z: 1 }));
  });
});

describe('FORBIDDEN_ANYWHERE', () => {
  it('names every group-C key from docs/tech/F04-dungeon-presence.md section 15.3 that this task closes', () => {
    // This list is deliberately not exhaustive of every group-C name (raid.*, enhance.*,
    // equipment.* never had a whitelist entry at all, so they cannot appear structurally); it
    // covers the names most likely to be added to BALANCE_WHITELIST by a future typo, since those
    // sit inside files this client does read part of (dungeons.json, anticheat.json, classes.json,
    // combat.json, balance/privacy.json).
    expect(FORBIDDEN_ANYWHERE).toEqual(
      expect.arrayContaining([
        'coverageFilter',
        'trustScore',
        'safety',
        'raidFailPenalty',
        'positionLogTtl_s',
      ]),
    );
  });
});
