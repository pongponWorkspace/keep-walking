import { describe, expect, it } from 'vitest';
import { checkS1 } from '../src/checks/s1';
import { contextFor, rules } from './helpers';

function failsS1(ctx: ReturnType<typeof contextFor>): boolean {
  return checkS1(ctx, []).some((issue) => issue.level === 'FAIL');
}

describe('S1 structure', () => {
  it('accepts run.death and run.death.alt1 as two independent flat entries', () => {
    const ctx = contextFor({
      'run.death': { text: 'ตาย', voice: 'system', kind: 'message', context: 'x' },
      'run.death.alt1': {
        text: 'ตายอีกแบบ',
        voice: 'system',
        kind: 'message',
        context: 'x',
        altOf: 'run.death',
      },
    });
    expect(failsS1(ctx)).toBe(false);
  });

  it('forwards JSON Schema errors (e.g. a misspelled field) as FAIL', () => {
    const ctx = contextFor({
      'run.x': { text: 'x', voice: 'system', kind: 'label', context: 'x' },
    });
    const issues = checkS1(ctx, [
      { instancePath: '/run.x/contex', message: 'must NOT have additional properties' },
    ]);
    expect(issues.some((issue) => issue.level === 'FAIL' && issue.check === 'S1')).toBe(true);
  });

  it('FAILs when altOf points at a key that does not exist', () => {
    const ctx = contextFor({
      'run.x': { text: 'x', voice: 'system', kind: 'message', context: 'x', altOf: 'run.missing' },
    });
    expect(failsS1(ctx)).toBe(true);
  });

  it('FAILs when altOf points at a key that itself has altOf (no chaining)', () => {
    const ctx = contextFor({
      'run.a': { text: 'a', voice: 'system', kind: 'message', context: 'x' },
      'run.b': { text: 'b', voice: 'system', kind: 'message', context: 'x', altOf: 'run.a' },
      'run.c': { text: 'c', voice: 'system', kind: 'message', context: 'x', altOf: 'run.b' },
    });
    expect(failsS1(ctx)).toBe(true);
  });

  it('FAILs when altOf voice/kind does not match the source entry', () => {
    const ctx = contextFor({
      'run.a': { text: 'a', voice: 'system', kind: 'message', context: 'x' },
      'run.b': { text: 'b', voice: 'system', kind: 'label', context: 'x', altOf: 'run.a' },
    });
    expect(failsS1(ctx)).toBe(true);
  });

  it('FAILs when cellsFirstLine is used outside voice legal + kind message', () => {
    const ctx = contextFor({
      'run.x': { text: 'x', voice: 'system', kind: 'message', context: 'x', cellsFirstLine: 5 },
    });
    expect(failsS1(ctx)).toBe(true);
  });

  it('accepts cellsFirstLine on voice legal + kind message', () => {
    const ctx = contextFor({
      'legal.x': { text: 'x', voice: 'legal', kind: 'message', context: 'x', cellsFirstLine: 1 },
    });
    expect(failsS1(ctx)).toBe(false);
  });

  it('FAILs when voice/kind is not an allowed pair (voice: character + kind: message)', () => {
    const ctx = contextFor({
      'run.x': { text: 'มอนสเตอร์: x', voice: 'character', kind: 'message', context: 'x' },
    });
    expect(failsS1(ctx)).toBe(true);
  });

  it('FAILs when beat and altOf are both set (altOf inherits beat from the source)', () => {
    const ctx = contextFor({
      'run.a': {
        text: 'a',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'death',
        alts: ['x', 'y'],
      },
      'run.b': {
        text: 'b',
        voice: 'system',
        kind: 'message',
        context: 'x',
        altOf: 'run.a',
        beat: 'death',
      },
    });
    expect(failsS1(ctx)).toBe(true);
  });

  it('FAILs when a _meta.dayNameExceptions key does not exist in the file', () => {
    const ctx = contextFor(
      { 'weekday.saturday': { text: 'วันเสาร์', voice: 'system', kind: 'label', context: 'x' } },
      { meta: { dayNameExceptions: { keys: ['weekday.sunday'], reason: 'x' } } },
    );
    expect(failsS1(ctx)).toBe(true);
  });

  it('FAILs when a _meta.numericExceptions key does not exist in the file', () => {
    const ctx = contextFor(
      { 'run.a': { text: 'a', voice: 'system', kind: 'label', context: 'x' } },
      { meta: { numericExceptions: [{ keys: ['run.missing'], reason: 'x' }] } },
    );
    expect(failsS1(ctx)).toBe(true);
  });

  it('WARNs when an area is not in copy-rules.json#areas', () => {
    const ctx = contextFor({
      'totallyUnknownArea.x': { text: 'x', voice: 'system', kind: 'label', context: 'x' },
    });
    const issues = checkS1(ctx, []);
    expect(issues.some((issue) => issue.check === 'S1' && issue.level === 'WARN')).toBe(true);
    expect(issues.some((issue) => issue.level === 'FAIL')).toBe(false);
  });

  it('WARNs on a top-level `_` key other than _meta/_variables', () => {
    const ctx = contextFor(
      { 'run.a': { text: 'a', voice: 'system', kind: 'label', context: 'x' } },
      undefined,
    );
    (ctx.copyJson as Record<string, unknown>)['_extra'] = { note: 'x' };
    const issues = checkS1(ctx, []);
    expect(issues.some((issue) => issue.key === '_extra' && issue.level === 'WARN')).toBe(true);
  });

  it('WARNs when _meta is missing version/doc', () => {
    const ctx = contextFor(
      { 'run.a': { text: 'a', voice: 'system', kind: 'label', context: 'x' } },
      { meta: { version: undefined, doc: undefined } },
    );
    const issues = checkS1(ctx, []);
    expect(issues.filter((issue) => issue.key === '_meta' && issue.level === 'WARN').length).toBe(
      2,
    );
  });

  it('FAILs when a limits.buttonFullWidth key does not exist, or exists but is not kind button', () => {
    const ctx = contextFor(
      {
        'run.summaryContinue': {
          text: 'เดินต่อเพื่อรับเพิ่ม',
          voice: 'system',
          kind: 'label',
          context: 'x',
        },
      },
      undefined,
      undefined,
      rules,
    );
    expect(failsS1(ctx)).toBe(true);
  });

  it('accepts run.summaryContinue as kind button (real limits.buttonFullWidth.keys entry)', () => {
    const ctx = contextFor(
      {
        'run.summaryContinue': {
          text: 'เดินต่อเพื่อรับเพิ่ม',
          voice: 'system',
          kind: 'button',
          context: 'x',
        },
      },
      undefined,
      undefined,
      rules,
    );
    expect(failsS1(ctx)).toBe(false);
  });
});
