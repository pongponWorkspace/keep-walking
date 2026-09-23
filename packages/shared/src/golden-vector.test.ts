import { describe, expect, it } from 'vitest';
import { isWithinTolerance, type GoldenVector } from './index';

describe('isWithinTolerance', () => {
  it('accepts numbers inside the tolerance and rejects numbers outside it', () => {
    expect(isWithinTolerance(0.323, 0.3225, 0.001)).toBe(true);
    expect(isWithinTolerance(0.33, 0.3225, 0.001)).toBe(false);
  });

  it('compares arrays and objects element by element', () => {
    expect(isWithinTolerance({ hp: [10, 20.004] }, { hp: [10, 20] }, 0.01)).toBe(true);
    expect(isWithinTolerance({ hp: [10] }, { hp: [10, 20] }, 0.01)).toBe(false);
    expect(isWithinTolerance({ a: 1, extra: 2 }, { a: 1 }, 0)).toBe(false);
  });

  it('requires strict equality for non-numeric leaves', () => {
    expect(isWithinTolerance({ state: 'granted' }, { state: 'granted' }, 0)).toBe(true);
    expect(isWithinTolerance({ state: 'denied' }, { state: 'granted' }, 0)).toBe(false);
  });

  it('rejects a negative tolerance', () => {
    expect(() => isWithinTolerance(1, 1, -1)).toThrow(RangeError);
  });

  it('runs a golden vector in the shared {input, expected, tolerance, source} format', () => {
    const vector: GoldenVector<{ moved_m: number }, boolean> = {
      input: { moved_m: 60 },
      expected: true,
      tolerance: 0,
      source: 'example only: format check, not a real gate threshold',
    };
    expect(isWithinTolerance(vector.input.moved_m >= 50, vector.expected, vector.tolerance)).toBe(
      true,
    );
  });
});
