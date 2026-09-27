import { describe, expect, it } from 'vitest';
import { displayDistance, formatDistanceText } from './distance';
import { formatCopyText } from '../copy/format';
import openingHoursVectors from '../../../../design/systems/test-vectors/opening-hours.json';

interface DisplayDistanceVector {
  readonly input: {
    readonly fn: string;
    readonly distance_m: number;
    readonly steps: readonly { readonly upTo_m: number | null; readonly step_m: number }[];
  };
  readonly expected: number;
}

function isDisplayDistanceVector(value: unknown): value is DisplayDistanceVector {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { input?: { fn?: unknown } }).input?.fn === 'displayDistance'
  );
}

function allVectors(file: unknown): DisplayDistanceVector[] {
  const found: DisplayDistanceVector[] = [];
  function walk(node: unknown): void {
    if (isDisplayDistanceVector(node)) {
      found.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (typeof node === 'object' && node !== null) {
      Object.values(node).forEach(walk);
    }
  }
  walk(file);
  return found;
}

describe('displayDistance', () => {
  const vectors = allVectors(openingHoursVectors);

  it('has at least one golden vector to check against (design/systems/test-vectors)', () => {
    expect(vectors.length).toBeGreaterThan(0);
  });

  it.each(vectors.map((v) => [v.input.distance_m, v] as const))(
    'matches the golden vector for %d m',
    (_distance, vector) => {
      expect(displayDistance(vector.input.distance_m, vector.input.steps)).toBe(vector.expected);
    },
  );

  it('never shows less than the true distance (R34)', () => {
    const steps = [
      { upTo_m: 1000, step_m: 50 },
      { upTo_m: null, step_m: 100 },
    ];
    for (const distance of [1, 49, 50, 51, 999, 1001, 5000]) {
      expect(displayDistance(distance, steps)).toBeGreaterThanOrEqual(distance);
    }
  });
});

// C-03 (copy gate P2-X37): `{distanceText}` through `unit.m`/`unit.km`, never a literal `'m'`.
describe('formatDistanceText', () => {
  const steps = [
    { upTo_m: 1000, step_m: 50 },
    { upTo_m: 10000, step_m: 100 },
    { upTo_m: null, step_m: 1000 },
  ];

  it('formats under 1,000 m with unit.m', () => {
    expect(formatDistanceText(650, steps)).toBe(formatCopyText('unit.m', { value: 650 }));
  });

  it('rounds up to the band step before formatting (R34)', () => {
    expect(formatDistanceText(651, steps)).toBe(formatCopyText('unit.m', { value: 700 }));
  });

  it('formats 1,000 m and above with unit.km, one decimal place', () => {
    expect(formatDistanceText(1901, steps)).toBe(formatCopyText('unit.km', { value: '2.0' }));
    expect(formatDistanceText(12345, steps)).toBe(formatCopyText('unit.km', { value: '13.0' }));
  });

  it('never contains a literal ASCII "m" unit', () => {
    expect(formatDistanceText(650, steps)).not.toMatch(/\dm\b/);
    expect(formatDistanceText(12345, steps)).not.toMatch(/\dm\b/);
  });
});
