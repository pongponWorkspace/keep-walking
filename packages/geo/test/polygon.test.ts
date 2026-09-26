import type { MultiPolygon, Polygon, Position } from 'geojson';
import { describe, expect, it } from 'vitest';
import { boundaryDistance_m, inPlayArea, pointInPolygon, rewindPolygon } from '../src/index';
import { offset, PLAY_AREA_MASK, TEST_RECT } from './fixtures';

const square = (w: number, s: number, e: number, n: number): Position[] => [
  [w, s],
  [e, s],
  [e, n],
  [w, n],
  [w, s],
];
const DONUT: Polygon = { type: 'Polygon', coordinates: [square(0, 0, 10, 10), square(4, 4, 6, 6)] };
const MULTI: MultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [[square(0, 0, 1, 1)], [square(5, 5, 6, 6), square(5.4, 5.4, 5.6, 5.6)]],
};
const pt = (lng: number, lat: number) => ({ lat, lng });

describe('pointInPolygon', () => {
  it('handles holes: inside the ring, not inside the hole', () => {
    expect(pointInPolygon(pt(2, 2), DONUT)).toBe(true);
    expect(pointInPolygon(pt(5, 5), DONUT)).toBe(false);
    expect(pointInPolygon(pt(11, 5), DONUT)).toBe(false);
  });

  it('counts the boundary (outer and hole edges, vertices) as inside', () => {
    expect(pointInPolygon(pt(0, 5), DONUT)).toBe(true);
    expect(pointInPolygon(pt(10, 10), DONUT)).toBe(true);
    expect(pointInPolygon(pt(4, 5), DONUT)).toBe(true);
  });

  it('handles MultiPolygon with a hole in the second part', () => {
    expect(pointInPolygon(pt(0.5, 0.5), MULTI)).toBe(true);
    expect(pointInPolygon(pt(5.2, 5.2), MULTI)).toBe(true);
    expect(pointInPolygon(pt(5.5, 5.5), MULTI)).toBe(false);
    expect(pointInPolygon(pt(3, 3), MULTI)).toBe(false);
  });

  it('does not depend on winding or on an explicitly closed ring', () => {
    const open: Polygon = {
      type: 'Polygon',
      coordinates: [square(0, 0, 10, 10).slice(0, 4).reverse()],
    };
    expect(pointInPolygon(pt(3, 3), open)).toBe(true);
    expect(pointInPolygon(pt(-1, 3), open)).toBe(false);
  });

  it('agrees with the trace README on the test rectangle (edge = inside)', () => {
    const rect = TEST_RECT();
    expect(pointInPolygon({ lat: 13.7305, lng: 100.5672 }, rect)).toBe(true);
    expect(pointInPolygon({ lat: 13.7293, lng: 100.5672 }, rect)).toBe(true);
    expect(pointInPolygon({ lat: 13.72929, lng: 100.5672 }, rect)).toBe(false);
  });
});

describe('boundaryDistance_m', () => {
  it('measures to the nearest edge from inside and outside', () => {
    const rect = TEST_RECT();
    const south = { lat: 13.7293, lng: 100.5672 };
    expect(boundaryDistance_m(offset(south, 10, 0), rect)).toBeCloseTo(10, 2);
    expect(boundaryDistance_m(offset(south, -7, 0), rect)).toBeCloseTo(7, 2);
    expect(boundaryDistance_m(south, rect)).toBeCloseTo(0, 6);
  });

  it('includes hole edges', () => {
    // 0.1 deg of longitude from the hole edge at lat 5.
    const d = boundaryDistance_m(pt(3.9, 5), DONUT);
    expect(d).toBeCloseTo(0.1 * (Math.PI / 180) * 6_371_008.8 * Math.cos((5 * Math.PI) / 180), -1);
  });
});

describe('rewindPolygon (RFC 7946: outer CCW, holes CW)', () => {
  const area2 = (r: Position[]) =>
    r.reduce((s, p, i) => {
      const q = r[(i + 1) % r.length] as Position;
      return s + (p[0] as number) * (q[1] as number) - (q[0] as number) * (p[1] as number);
    }, 0);

  it('rewinds a Polygon and a MultiPolygon without mutating the input', () => {
    const cw: Polygon = {
      type: 'Polygon',
      coordinates: [square(0, 0, 10, 10).reverse(), square(4, 4, 6, 6)],
    };
    const before = JSON.stringify(cw);
    const out = rewindPolygon(cw);
    expect(JSON.stringify(cw)).toBe(before);
    expect(area2(out.coordinates[0] as Position[])).toBeGreaterThan(0);
    expect(area2(out.coordinates[1] as Position[])).toBeLessThan(0);
    const m = rewindPolygon(MULTI);
    expect(m.coordinates.every((p) => area2(p[0] as Position[]) > 0)).toBe(true);
    expect(area2(m.coordinates[1]?.[1] as Position[])).toBeLessThan(0);
  });

  it('keeps already-correct rings as they are', () => {
    const ok = rewindPolygon(rewindPolygon(DONUT));
    expect(ok).toEqual(rewindPolygon(DONUT));
  });
});

describe('inPlayArea (data/map/playarea-mask.geojson, D-064)', () => {
  const mask = PLAY_AREA_MASK();
  it.each([
    ['Lumphini Park (Bangkok)', 13.7306, 100.54154, true],
    ['Benjakitti Park (Bangkok)', 13.72908, 100.55476, true],
    ['test rectangle, Benjasiri (Bangkok)', 13.7305, 100.5672, true],
    ['Chiang Mai old city', 18.7883, 98.9853, false],
    ['Pattaya (Chon Buri, not in the mask)', 12.9236, 100.8825, false],
    ['Gulf of Thailand', 12.5, 100.5, false],
    ['Null Island', 0, 0, false],
  ])('%s -> %s', (_name, lat, lng, expected) => {
    expect(inPlayArea({ lat, lng }, mask)).toBe(expected);
  });
});
