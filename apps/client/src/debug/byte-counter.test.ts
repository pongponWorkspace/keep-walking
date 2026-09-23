import { afterEach, describe, expect, it } from 'vitest';
import { computeJsBytes, countBytes, getByteTotals, resetByteTotals } from './byte-counter';

describe('countBytes / getByteTotals', () => {
  afterEach(() => resetByteTotals());

  it('accumulates per category, starting from zero', () => {
    expect(getByteTotals()).toEqual({ style: 0, tiles: 0 });
    countBytes('style', 1000);
    countBytes('style', 500);
    countBytes('tiles', 2000);
    expect(getByteTotals()).toEqual({ style: 1500, tiles: 2000 });
  });

  it('ignores negative or non-finite values (never a URL leaks in, but also never garbage counts)', () => {
    countBytes('tiles', -5);
    countBytes('tiles', Number.NaN);
    countBytes('tiles', Number.POSITIVE_INFINITY);
    expect(getByteTotals().tiles).toBe(0);
  });

  it('resetByteTotals returns every category to zero', () => {
    countBytes('style', 999);
    resetByteTotals();
    expect(getByteTotals()).toEqual({ style: 0, tiles: 0 });
  });
});

describe('computeJsBytes', () => {
  it('returns zero, method decoded, when Resource Timing is unavailable (this suite runs without a DOM)', () => {
    expect(computeJsBytes()).toEqual({ bytes: 0, method: 'decoded' });
  });
});
