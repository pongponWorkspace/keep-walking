import { describe, expect, it } from 'vitest';
import { closingSoonAt, isOpenAt, openingChangeAfter } from './opening-hours-display';
import openingHoursVectors from '../../../../design/systems/test-vectors/opening-hours.json';

interface Vector {
  readonly input: { readonly fn: string; readonly [key: string]: unknown };
  readonly expected: unknown;
}

const vectors = (openingHoursVectors as { vectors: readonly Vector[] }).vectors;

function byFn(fn: string): readonly Vector[] {
  return vectors.filter((v) => v.input.fn === fn);
}

describe('isOpenAt (golden vectors)', () => {
  const isOpenAtVectors = byFn('isOpenAt');
  it('has vectors', () => expect(isOpenAtVectors.length).toBeGreaterThan(0));
  it.each(isOpenAtVectors.map((v, i) => [i, v] as const))('vector %d', (_i, v) => {
    const input = v.input as unknown as { hours: never; utcOffset_min: number; t_ms: number };
    expect(isOpenAt(input.hours, input.utcOffset_min, input.t_ms)).toBe(v.expected);
  });
});

describe('openingChangeAfter (golden vectors)', () => {
  const changeVectors = byFn('openingChangeAfter');
  it('has vectors', () => expect(changeVectors.length).toBeGreaterThan(0));
  it.each(changeVectors.map((v, i) => [i, v] as const))('vector %d', (_i, v) => {
    const input = v.input as unknown as {
      hours: never;
      utcOffset_min: number;
      t_ms: number;
      horizonDays?: number;
    };
    expect(
      openingChangeAfter(input.hours, input.utcOffset_min, input.t_ms, input.horizonDays),
    ).toBe(v.expected);
  });
});

describe('closingSoonAt (golden vectors)', () => {
  const closingVectors = byFn('closingSoonAt');
  it('has vectors', () => expect(closingVectors.length).toBeGreaterThan(0));
  it.each(closingVectors.map((v, i) => [i, v] as const))('vector %d', (_i, v) => {
    const input = v.input as unknown as {
      closesAt_ms: number | null;
      startedAt_ms: number;
      closingSoonNotice_s: number;
    };
    expect(
      closingSoonAt(input.closesAt_ms, input.startedAt_ms, input.closingSoonNotice_s),
    ).toBe(v.expected);
  });
});
