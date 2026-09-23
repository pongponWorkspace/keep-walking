import { describe, expect, it } from 'vitest';
import { accuracyCircleRing, destinationPoint } from './geo-circle';

const LUMPHINI = { lng: 100.54154, lat: 13.7306 };

function haversineMeters(a: { lng: number; lat: number }, b: { lng: number; lat: number }): number {
  const R = 6_371_008.8;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

describe('destinationPoint', () => {
  it('moves due north by roughly the given distance', () => {
    const point = destinationPoint(LUMPHINI, 100, 0);
    expect(point.lat).toBeGreaterThan(LUMPHINI.lat);
    expect(point.lng).toBeCloseTo(LUMPHINI.lng, 3);
    expect(haversineMeters(LUMPHINI, point)).toBeCloseTo(100, 0);
  });

  it('moves due east by roughly the given distance', () => {
    const point = destinationPoint(LUMPHINI, 50, 90);
    expect(point.lng).toBeGreaterThan(LUMPHINI.lng);
    expect(haversineMeters(LUMPHINI, point)).toBeCloseTo(50, 0);
  });
});

describe('accuracyCircleRing', () => {
  it('returns a closed ring (first point === last point)', () => {
    const ring = accuracyCircleRing(LUMPHINI, 20);
    expect(ring[0]).toEqual(ring.at(-1));
    expect(ring.length).toBeGreaterThan(4);
  });

  it('every point sits at roughly the given radius from the center', () => {
    const radius = 30;
    const ring = accuracyCircleRing(LUMPHINI, radius);
    for (const [lng, lat] of ring) {
      expect(haversineMeters(LUMPHINI, { lng, lat })).toBeCloseTo(radius, 0);
    }
  });

  it('grows with a larger radius', () => {
    const small = accuracyCircleRing(LUMPHINI, 5);
    const large = accuracyCircleRing(LUMPHINI, 200);
    const smallSpread = haversineMeters(
      { lng: small[0]?.[0] ?? 0, lat: small[0]?.[1] ?? 0 },
      LUMPHINI,
    );
    const largeSpread = haversineMeters(
      { lng: large[0]?.[0] ?? 0, lat: large[0]?.[1] ?? 0 },
      LUMPHINI,
    );
    expect(largeSpread).toBeGreaterThan(smallSpread);
  });
});
