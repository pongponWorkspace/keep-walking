// Point-in-polygon with holes and MultiPolygon (RFC 7946), distance to the boundary, ring
// winding, and the play area mask (D-064). Positions are [lng, lat] as in GeoJSON.
import type { MultiPolygon, Polygon, Position } from 'geojson';
import type { LatLng } from './types';
import { DEG_TO_RAD, EARTH_MEAN_RADIUS_M } from './units';

export type PolygonGeometry = Polygon | MultiPolygon;

function polygonsOf(geometry: PolygonGeometry): Position[][][] {
  return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
}

function lngOf(p: Position): number {
  return p[0] as number;
}

function latOf(p: Position): number {
  return p[1] as number;
}

/** True when `pt` lies exactly on a segment of the ring (planar test in degrees). */
function onRingBoundary(pt: LatLng, ring: readonly Position[]): boolean {
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[j] as Position;
    const b = ring[i] as Position;
    const cross =
      (lngOf(b) - lngOf(a)) * (pt.lat - latOf(a)) - (latOf(b) - latOf(a)) * (pt.lng - lngOf(a));
    if (
      cross === 0 &&
      pt.lng >= Math.min(lngOf(a), lngOf(b)) &&
      pt.lng <= Math.max(lngOf(a), lngOf(b)) &&
      pt.lat >= Math.min(latOf(a), latOf(b)) &&
      pt.lat <= Math.max(latOf(a), latOf(b))
    ) {
      return true;
    }
  }
  return false;
}

/** Even-odd crossing test for one ring, closed or not. Boundary handling is done by the caller. */
function insideRing(pt: LatLng, ring: readonly Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[j] as Position;
    const b = ring[i] as Position;
    if (latOf(b) > pt.lat !== latOf(a) > pt.lat) {
      const x = lngOf(b) + ((pt.lat - latOf(b)) * (lngOf(a) - lngOf(b))) / (latOf(a) - latOf(b));
      if (pt.lng < x) inside = !inside;
    }
  }
  return inside;
}

/**
 * True when `pt` is inside the polygon: inside an outer ring and not inside one of its holes.
 * A point exactly on any ring (outer or hole) counts as inside. Ring winding does not matter.
 */
export function pointInPolygon(pt: LatLng, geometry: PolygonGeometry): boolean {
  for (const rings of polygonsOf(geometry)) {
    const [outer, ...holes] = rings;
    if (outer === undefined) continue;
    if (rings.some((ring) => onRingBoundary(pt, ring))) return true;
    if (insideRing(pt, outer) && !holes.some((hole) => insideRing(pt, hole))) return true;
  }
  return false;
}

/**
 * Shortest distance in metres from `pt` to any ring segment of the polygon (outer rings and
 * holes), on a local equirectangular plane centred at `pt`. Error is well under 0.1 % for the
 * short distances that matter here (edge hysteresis, a few metres to a few hundred).
 */
export function boundaryDistance_m(pt: LatLng, geometry: PolygonGeometry): number {
  const kx = Math.cos(pt.lat * DEG_TO_RAD) * DEG_TO_RAD * EARTH_MEAN_RADIUS_M;
  const ky = DEG_TO_RAD * EARTH_MEAN_RADIUS_M;
  let best = Number.POSITIVE_INFINITY;
  for (const rings of polygonsOf(geometry)) {
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const a = ring[j] as Position;
        const b = ring[i] as Position;
        const ax = (lngOf(a) - pt.lng) * kx;
        const ay = (latOf(a) - pt.lat) * ky;
        const dx = (lngOf(b) - pt.lng) * kx - ax;
        const dy = (latOf(b) - pt.lat) * ky - ay;
        const len2 = dx * dx + dy * dy;
        const f = len2 === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2));
        best = Math.min(best, Math.hypot(ax + f * dx, ay + f * dy));
      }
    }
  }
  return best;
}

/** Inside/outside of one fix plus its distance to the boundary: the input of edge hysteresis. */
export function edgeObservation(
  pt: LatLng,
  geometry: PolygonGeometry,
): { readonly inside: boolean; readonly boundaryDistance_m: number } {
  return {
    inside: pointInPolygon(pt, geometry),
    boundaryDistance_m: boundaryDistance_m(pt, geometry),
  };
}

/** Twice the signed planar area of a ring in degrees²: > 0 counter-clockwise. */
function signedArea2(ring: readonly Position[]): number {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[j] as Position;
    const b = ring[i] as Position;
    sum += lngOf(a) * latOf(b) - lngOf(b) * latOf(a);
  }
  return sum;
}

function wound(ring: readonly Position[], counterClockwise: boolean): Position[] {
  const copy = ring.map((p) => [...p]);
  return signedArea2(ring) > 0 === counterClockwise ? copy : copy.reverse();
}

function rewindRings(rings: readonly Position[][]): Position[][] {
  return rings.map((ring, index) => wound(ring, index === 0));
}

/**
 * RFC 7946 winding: outer rings counter-clockwise, holes clockwise. Returns a new geometry and
 * never mutates the input (replaces @turf/rewind, tech note F02 15.2 item 7).
 */
export function rewindPolygon<G extends PolygonGeometry>(geometry: G): G {
  if (geometry.type === 'Polygon') {
    return { ...geometry, coordinates: rewindRings(geometry.coordinates) };
  }
  return { ...geometry, coordinates: geometry.coordinates.map(rewindRings) };
}

/**
 * "In the play area" against data/map/playarea-mask.geojson (D-064). The mask is the world with
 * the play area cut out as holes, so a point is in the play area when it lies inside a hole and
 * not inside the mask itself (a point on a hole edge is on the mask, so outside the play area).
 */
export function inPlayArea(pt: LatLng, mask: PolygonGeometry): boolean {
  const inAHole = polygonsOf(mask).some((rings) =>
    rings.slice(1).some((hole) => insideRing(pt, hole)),
  );
  return inAHole && !pointInPolygon(pt, mask);
}
