import { describe, expect, it } from 'vitest';
import { configKeyResolves, findDuplicateTopLevelKeys, findTopLevelKeys } from '../src/io';
import { repoRoot } from './helpers';

describe('findTopLevelKeys / findDuplicateTopLevelKeys', () => {
  it('finds every top-level key, including a repeat that JSON.parse would silently drop', () => {
    const raw =
      '{"_meta":{"file":"x"},"run.a":{"text":"1"},"nested":{"run.a":"not a top-level key"},"run.a":{"text":"2"}}';
    expect(findTopLevelKeys(raw)).toEqual(['_meta', 'run.a', 'nested', 'run.a']);
    expect(findDuplicateTopLevelKeys(raw)).toEqual(['run.a']);
  });

  it('does not flag a key that only appears once', () => {
    const raw = '{"a":1,"b":{"a":2}}';
    expect(findDuplicateTopLevelKeys(raw)).toEqual([]);
  });

  it('handles escaped quotes inside string values without losing track of depth', () => {
    const raw = '{"a":"a \\"quoted\\" value","b":1}';
    expect(findTopLevelKeys(raw)).toEqual(['a', 'b']);
  });
});

describe('configKeyResolves', () => {
  it('resolves a real balance config pointer', () => {
    expect(
      configKeyResolves('config/balance/dungeons.json#hpSafety.autoRetreatThreshold_pct', repoRoot),
    ).toBe(true);
  });

  it('is false for a file that does not exist', () => {
    expect(configKeyResolves('config/balance/does-not-exist.json#a.b', repoRoot)).toBe(false);
  });

  it('is false for a path that does not resolve inside an existing file', () => {
    expect(configKeyResolves('config/balance/dungeons.json#no.such.path', repoRoot)).toBe(false);
  });

  it('is false when there is no "#"', () => {
    expect(configKeyResolves('config/balance/dungeons.json', repoRoot)).toBe(false);
  });
});
