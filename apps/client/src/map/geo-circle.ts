/**
 * Builds a GeoJSON polygon approximating a circle of `radiusMeters` around a point, for the
 * accuracy circle around the player's position dot. A real-world-metre polygon (rather than a
 * MapLibre `circle-radius` in pixels) keeps the circle's true size on the ground as the map is
 * zoomed, which is the point of showing it at all (it is the GPS fix's accuracy radius).
 *
 * Pure geometry, no MapLibre/DOM import, so it is unit-testable without a browser (ADR 0001 3.6).
 */

/** IUGG mean Earth radius, metres — same constant `data/gps-traces/README.md` section 5 uses for
 * distance calculations, so the accuracy circle drawn here agrees with how far a sample really is. */
const EARTH_RADIUS_M = 6_371_008.8;
const FULL_TURN_DEG = 360;
const HALF_TURN_DEG = FULL_TURN_DEG / 2;
const DEGREES_PER_RADIAN = HALF_TURN_DEG / Math.PI;
const RADIANS_PER_DEGREE = Math.PI / HALF_TURN_DEG;
/** Points on the drawn circle. High enough to look round at any zoom, cheap to redraw per sample. */
const CIRCLE_SEGMENTS = 64;

export interface LngLat {
  readonly lng: number;
  readonly lat: number;
}

/** `[lng, lat]` pairs, first === last (GeoJSON linear ring convention). */
export type CircleRing = readonly (readonly [number, number])[];

/**
 * One point `distanceMeters` from `center` at compass `bearingDeg` (0 = north), using the
 * spherical direct geodesic formula. Accurate enough at the scale of a GPS accuracy circle
 * (tens to low hundreds of metres); not meant for long distances.
 */
export function destinationPoint(
  center: LngLat,
  distanceMeters: number,
  bearingDeg: number,
): LngLat {
  const angularDistance = distanceMeters / EARTH_RADIUS_M;
  const bearing = bearingDeg * RADIANS_PER_DEGREE;
  const lat1 = center.lat * RADIANS_PER_DEGREE;
  const lng1 = center.lng * RADIANS_PER_DEGREE;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    lat: lat2 * DEGREES_PER_RADIAN,
    lng:
      ((lng2 * DEGREES_PER_RADIAN + FULL_TURN_DEG + HALF_TURN_DEG) % FULL_TURN_DEG) - HALF_TURN_DEG,
  };
}

/** A closed ring of `CIRCLE_SEGMENTS` points, radius in metres, ready for a GeoJSON `Polygon`. */
export function accuracyCircleRing(center: LngLat, radiusMeters: number): CircleRing {
  const ring: [number, number][] = [];
  for (let i = 0; i <= CIRCLE_SEGMENTS; i += 1) {
    const bearing = (i / CIRCLE_SEGMENTS) * FULL_TURN_DEG;
    const point = destinationPoint(center, radiusMeters, bearing);
    ring.push([point.lng, point.lat]);
  }
  return ring;
}
