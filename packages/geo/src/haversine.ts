import type { GateComparison, GeoSample, LatLng } from './types';
import { DEG_TO_RAD, EARTH_MEAN_RADIUS_M, KMH_PER_MPS, MS_PER_S } from './units';

/** Great-circle distance in metres on a sphere of radius EARTH_MEAN_RADIUS_M. */
export function haversine_m(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG_TO_RAD) * Math.cos(b.lat * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_MEAN_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Speed between two fixes in km/h, for the speed lock (F04-R20).
 *
 * v1 (P2-F04-T12): the raw speed of the pair, great-circle distance over elapsed time.
 * P2-F05-T13 replaces the internals with a filtered speed and keeps this signature.
 *
 * A pair that does not move forward in time (`b.t_ms <= a.t_ms`) has no defined speed: it returns
 * 0 when the two positions are equal and +Infinity otherwise, so a caller that feeds unordered
 * samples fails towards "too fast" rather than towards a silent pass.
 */
export function pairSpeed_kmh(
  a: Pick<GeoSample, 't_ms' | 'lat' | 'lng'>,
  b: Pick<GeoSample, 't_ms' | 'lat' | 'lng'>,
): number {
  const distance_m = haversine_m(a, b);
  const dt_ms = b.t_ms - a.t_ms;
  if (dt_ms <= 0) {
    return distance_m === 0 ? 0 : Number.POSITIVE_INFINITY;
  }
  return (distance_m / (dt_ms / MS_PER_S)) * KMH_PER_MPS;
}

/** Distance and a threshold compared as config `movementGate.comparison` says. Unknown → throw. */
export function passesGate(
  distance_m: number,
  minDistance_m: number,
  comparison: GateComparison,
): boolean {
  if (comparison === 'greaterThan') return distance_m > minDistance_m;
  if (comparison === 'greaterThanOrEqual') return distance_m >= minDistance_m;
  // Fail closed (ADR 0003 5.2 item 4): a value outside the type (bad config) must not pass.
  throw new RangeError(`unknown gate comparison: ${String(comparison)}`);
}
