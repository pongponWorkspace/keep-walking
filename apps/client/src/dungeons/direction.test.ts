import { describe, expect, it } from 'vitest';
import { bearing_deg, compassPointTo, snapBearingToCompass } from './direction';

describe('bearing_deg', () => {
  it('is 0 due north', () => {
    expect(bearing_deg({ lat: 13.7, lng: 100.5 }, { lat: 13.8, lng: 100.5 })).toBeCloseTo(0, 1);
  });
  it('is 90 due east', () => {
    expect(bearing_deg({ lat: 13.7, lng: 100.5 }, { lat: 13.7, lng: 100.6 })).toBeCloseTo(90, 0);
  });
  it('is 180 due south', () => {
    expect(bearing_deg({ lat: 13.8, lng: 100.5 }, { lat: 13.7, lng: 100.5 })).toBeCloseTo(180, 1);
  });
  it('is 270 due west', () => {
    expect(bearing_deg({ lat: 13.7, lng: 100.6 }, { lat: 13.7, lng: 100.5 })).toBeCloseTo(270, 0);
  });
});

describe('snapBearingToCompass', () => {
  it.each([
    [0, 'N'],
    [22, 'N'],
    [46, 'NE'],
    [90, 'E'],
    [135, 'SE'],
    [180, 'S'],
    [225, 'SW'],
    [270, 'W'],
    [315, 'NW'],
    [359, 'N'],
    [-10, 'N'],
    [360, 'N'],
  ] as const)('snaps %d degrees to %s', (deg, expected) => {
    expect(snapBearingToCompass(deg)).toBe(expected);
  });
});

describe('compassPointTo', () => {
  it('composes bearing + snap', () => {
    expect(compassPointTo({ lat: 13.7, lng: 100.5 }, { lat: 13.7, lng: 100.6 })).toBe('E');
  });
});
