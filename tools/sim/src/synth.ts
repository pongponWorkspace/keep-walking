// Synthetic sample builders for the P2-F05-T20 vectors. Geometry helpers only; every number a
// vector uses is an example input named in the caller's CASE object, never a balance value.
import { EARTH_MEAN_RADIUS_M, MS_PER_S } from './gate';
import type { PresenceSample } from './presence';

const HALF_TURN_DEG = 180;
const DEG = Math.PI / HALF_TURN_DEG;
const COORD_DECIMALS = 8;
const BASE = 10;
const roundCoord = (x: number) => Math.round(x * BASE ** COORD_DECIMALS) / BASE ** COORD_DECIMALS;

export interface LatLng {
  lat: number;
  lng: number;
}

/** Moves a point by north / east metres on the local tangent plane. */
export function offset(p: LatLng, north_m: number, east_m: number): LatLng {
  return {
    lat: p.lat + north_m / EARTH_MEAN_RADIUS_M / DEG,
    lng: p.lng + east_m / (EARTH_MEAN_RADIUS_M * Math.cos(p.lat * DEG)) / DEG,
  };
}

export interface Segment {
  from_s: number;
  to_s: number;
  every_s: number;
  /** Position at from_s. */
  start: LatLng;
  vNorth_mps?: number;
  vEast_mps?: number;
  accuracy_m: number;
  inside?: boolean;
  boundaryDistance_m?: number;
}

/** Samples at from_s, from_s + every_s, ... <= to_s, moving at constant velocity from start. */
export function segment(g: Segment): PresenceSample[] {
  const out: PresenceSample[] = [];
  for (let t = g.from_s; t <= g.to_s + Number.EPSILON; t += g.every_s) {
    const dt = t - g.from_s;
    const p = offset(g.start, (g.vNorth_mps ?? 0) * dt, (g.vEast_mps ?? 0) * dt);
    out.push({
      t_ms: Math.round(t * MS_PER_S),
      lat: roundCoord(p.lat),
      lng: roundCoord(p.lng),
      accuracy_m: g.accuracy_m,
      inside: g.inside ?? true,
      boundaryDistance_m: g.boundaryDistance_m ?? Number.POSITIVE_INFINITY,
    });
  }
  return out;
}

/** Plain JSON form of samples for a vector input (drops boundary distance when not finite). */
export function jsonSamples(samples: readonly PresenceSample[], withBoundary: boolean) {
  return samples.map((s) => {
    const base = {
      t_ms: s.t_ms,
      lat: s.lat,
      lng: s.lng,
      accuracy_m: s.accuracy_m,
      inside: s.inside,
    };
    return withBoundary ? { ...base, boundaryDistance_m: s.boundaryDistance_m } : base;
  });
}

/** End position of a segment (to chain segments without a jump). */
export function endOf(g: Segment): LatLng {
  const dt = g.to_s - g.from_s;
  return offset(g.start, (g.vNorth_mps ?? 0) * dt, (g.vEast_mps ?? 0) * dt);
}
