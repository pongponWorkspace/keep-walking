import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  EARTH_MEAN_RADIUS_M,
  haversine_m,
  KMH_PER_MPS,
  pairSpeed_kmh,
  passesGate,
} from '../src/index';
import type { GateComparison } from '../src/index';
import { offset, ORIGIN } from './fixtures';

describe('leaf package (ADR 0003 B-01)', () => {
  it('declares no @keep-walking/* dependency of any kind', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as Record<string, Record<string, string> | undefined>;
    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      const names = Object.keys(pkg[field] ?? {});
      expect(names.filter((n) => n.startsWith('@keep-walking/'))).toEqual([]);
    }
  });
});

describe('haversine_m', () => {
  it('uses the IUGG mean radius 6,371,008.8 m', () => {
    expect(EARTH_MEAN_RADIUS_M).toBe(6_371_008.8);
    // One degree of latitude = R * pi / 180.
    const d = haversine_m({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeCloseTo((EARTH_MEAN_RADIUS_M * Math.PI) / 180, 6);
  });

  it('is symmetric and zero for the same point', () => {
    const b = { lat: 13.7317, lng: 100.5683 };
    expect(haversine_m(ORIGIN, ORIGIN)).toBe(0);
    expect(haversine_m(ORIGIN, b)).toBeCloseTo(haversine_m(b, ORIGIN), 9);
  });

  it('matches a local offset within a millimetre at 100 m in Bangkok', () => {
    expect(haversine_m(ORIGIN, offset(ORIGIN, 60, 80))).toBeCloseTo(100, 3);
  });

  it('matches the tools/traces boundary value: 1e-5 deg of latitude = 1.11195 m', () => {
    const d = haversine_m({ lat: 13.73, lng: 100.5 }, { lat: 13.73001, lng: 100.5 });
    expect(d).toBeCloseTo(1.111951, 5);
  });
});

describe('pairSpeed_kmh (speed lock v1: raw pair speed)', () => {
  it('converts metres per second to km/h', () => {
    expect(KMH_PER_MPS).toBe(3.6);
    const a = { t_ms: 0, ...ORIGIN };
    const b = { t_ms: 10_000, ...offset(ORIGIN, 0, 100) };
    expect(pairSpeed_kmh(a, b)).toBeCloseTo(36, 6);
  });

  it('fails towards "too fast" when time does not move forward', () => {
    const a = { t_ms: 5000, ...ORIGIN };
    expect(pairSpeed_kmh(a, { ...a })).toBe(0);
    expect(pairSpeed_kmh(a, { t_ms: 5000, ...offset(ORIGIN, 1, 0) })).toBe(Infinity);
    expect(pairSpeed_kmh(a, { t_ms: 4000, ...offset(ORIGIN, 1, 0) })).toBe(Infinity);
  });
});

describe('passesGate (G1, fail closed)', () => {
  it('greaterThan: exactly the threshold does not pass', () => {
    expect(passesGate(50, 50, 'greaterThan')).toBe(false);
    expect(passesGate(50.000001, 50, 'greaterThan')).toBe(true);
  });

  it('greaterThanOrEqual: exactly the threshold passes', () => {
    expect(passesGate(50, 50, 'greaterThanOrEqual')).toBe(true);
  });

  it('throws on an unknown comparison', () => {
    expect(() => passesGate(99, 50, 'atLeast' as GateComparison)).toThrow(RangeError);
  });
});
