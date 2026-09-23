import { describe, expect, it } from 'vitest';
import { checkS7 } from '../src/checks/s7';
import { contextFor } from './helpers';

describe('S7 — the _variables registry', () => {
  it('FAILs a {variable} that is not registered', () => {
    const ctx = contextFor({
      'run.x': { text: 'เจอ {fooBar} คน', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS7(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('passes a registered variable', () => {
    const ctx = contextFor({
      'run.x': { text: 'เจอ {count} คน', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS7(ctx).filter((issue) => issue.level === 'FAIL')).toEqual([]);
  });

  it('FAILs when _variables.x.example is longer than maxCells', () => {
    const ctx = contextFor(
      { 'run.x': { text: 'x', voice: 'system', kind: 'label', context: 'x' } },
      { variables: { count: { maxCells: 2, example: 'มากเกินไปแน่นอน', source: 'test' } } },
    );
    expect(checkS7(ctx).some((issue) => issue.level === 'FAIL' && issue.key === 'count')).toBe(
      true,
    );
  });

  it('WARNs when configKey does not resolve', () => {
    const ctx = contextFor(
      { 'run.x': { text: 'x', voice: 'system', kind: 'label', context: 'x' } },
      {
        variables: {
          count: {
            maxCells: 4,
            example: '3',
            source: 'test',
            configKey: 'config/balance/does-not-exist.json#a',
          },
        },
      },
    );
    expect(checkS7(ctx).some((issue) => issue.level === 'WARN' && issue.key === 'count')).toBe(
      true,
    );
  });

  it('FAILs a brace that is not part of a well-formed {variable}', () => {
    const ctx = contextFor({
      'run.x': { text: 'อุปกรณ์ +{fromLevel', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS7(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('FAILs when an alt uses a different variable set than text', () => {
    const ctx = contextFor({
      'run.a': {
        text: 'เจอ {count} คน',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'death',
        alts: ['เจอ {distanceText} คน', 'เจอคน'],
      },
    });
    expect(checkS7(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('FAILs when an altOf entry uses a different variable set than its source', () => {
    const ctx = contextFor({
      'run.a': { text: 'เจอ {count} คน', voice: 'system', kind: 'message', context: 'x' },
      'run.b': {
        text: 'เจอ {distanceText} คน',
        voice: 'system',
        kind: 'message',
        context: 'x',
        altOf: 'run.a',
      },
    });
    expect(checkS7(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });
});
