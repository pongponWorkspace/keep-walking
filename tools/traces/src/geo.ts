// Geometry helpers for synthetic traces. Offline tool code: the game's geometry lives in
// packages/geo (location-engineer, later phase). The earth radius here is the one the README
// asks every consumer (HUD S12, gate) to use, so pre-computed distances match exactly.

/** IUGG mean earth radius in metres (same value turf.js uses). */
export const EARTH_RADIUS_M = 6_371_008.8;
const HALF_TURN_DEG = 180;
const DEG_TO_RAD = Math.PI / HALF_TURN_DEG;
const RAD_TO_DEG = HALF_TURN_DEG / Math.PI;
const DECIMAL_BASE = 10;
const FULL_TURN_DEG = 360;

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/** Great-circle distance in metres (haversine). */
export function haversine_m(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLng = (b.lng - a.lng) * DEG_TO_RAD;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * DEG_TO_RAD) * Math.cos(b.lat * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Moves a point by north/east metres on a local tangent plane (fine for < a few km). */
export function offset(p: LatLng, north_m: number, east_m: number): LatLng {
  const lat = p.lat + (north_m / EARTH_RADIUS_M) * RAD_TO_DEG;
  const lng = p.lng + (east_m / (EARTH_RADIUS_M * Math.cos(p.lat * DEG_TO_RAD))) * RAD_TO_DEG;
  return { lat, lng };
}

/** North/east metres from `origin` to `p` on the local tangent plane. */
export function toLocal(origin: LatLng, p: LatLng): { north: number; east: number } {
  return {
    north: (p.lat - origin.lat) * DEG_TO_RAD * EARTH_RADIUS_M,
    east: (p.lng - origin.lng) * DEG_TO_RAD * EARTH_RADIUS_M * Math.cos(origin.lat * DEG_TO_RAD),
  };
}

/** Initial bearing from a to b in degrees, 0 <= x < 360. */
export function bearing_deg(a: LatLng, b: LatLng): number {
  const { north, east } = toLocal(a, b);
  const deg = Math.atan2(east, north) * RAD_TO_DEG;
  return (deg + FULL_TURN_DEG) % FULL_TURN_DEG;
}

/** Rounds to `decimals` places; the result prints with at most that many decimals. */
export function roundTo(value: number, decimals: number): number {
  const factor = DECIMAL_BASE ** decimals;
  return Math.round(value * factor) / factor;
}

/** Sum of haversine distances between consecutive points (no filtering). */
export function pathLength_m(points: readonly LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += haversine_m(points[i - 1] as LatLng, points[i] as LatLng);
  }
  return total;
}

/**
 * A polyline walked at a given distance from its start. Closed loops wrap around, so a walker can
 * go round a park more than once.
 */
export class Polyline {
  private readonly cumulative: number[] = [0];
  readonly length_m: number;

  constructor(
    private readonly points: readonly LatLng[],
    private readonly closed = false,
  ) {
    if (points.length < 2) {
      throw new Error('a polyline needs at least two points');
    }
    const all = closed ? [...points, points[0] as LatLng] : [...points];
    for (let i = 1; i < all.length; i += 1) {
      const prev = this.cumulative[i - 1] as number;
      this.cumulative.push(prev + haversine_m(all[i - 1] as LatLng, all[i] as LatLng));
    }
    this.length_m = this.cumulative.at(-1) as number;
  }

  /** Point and travel bearing at `distance_m` along the line (clamped, or wrapped when closed). */
  at(distance_m: number): { point: LatLng; heading: number } {
    const all = this.closed ? [...this.points, this.points[0] as LatLng] : this.points;
    let d = this.closed
      ? ((distance_m % this.length_m) + this.length_m) % this.length_m
      : Math.min(Math.max(distance_m, 0), this.length_m);
    let i = 1;
    while (i < this.cumulative.length - 1 && (this.cumulative[i] as number) < d) {
      i += 1;
    }
    const a = all[i - 1] as LatLng;
    const b = all[i] as LatLng;
    const segStart = this.cumulative[i - 1] as number;
    const segLength = (this.cumulative[i] as number) - segStart;
    d -= segStart;
    const f = segLength === 0 ? 0 : d / segLength;
    const point = { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
    return { point, heading: bearing_deg(a, b) };
  }
}
