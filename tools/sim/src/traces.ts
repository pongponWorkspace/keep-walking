// Trace fixtures for the gate / presence reference (P2-F05-T20). Reads committed traces in
// data/gps-traces (format docs/tech/gps-trace-format.md) and the synthetic test polygon. The
// point-in-polygon and boundary distance here are a small independent copy for the simulator;
// runtime code uses packages/geo.
import { REPO_ROOT, readJsonFile } from './config';
import { EARTH_MEAN_RADIUS_M, MS_PER_S } from './gate';
import type { Sample } from './gate';

const HALF_TURN_DEG = 180;
const DEG_TO_RAD = Math.PI / HALF_TURN_DEG;

export type Ring = [number, number][];
export interface PolygonRings {
  /** Outer ring then holes, [lng, lat] as in GeoJSON. */
  rings: Ring[];
}

export interface TraceRef {
  /** Repo-relative path of a *.trace.json file. */
  trace: string;
  /** Repo-relative path of a GeoJSON polygon, or null = every sample counts as inside. */
  polygon: string | null;
  /** Keep every n-th sample (1 = all, 5 = 1 Hz → 0.2 Hz). */
  every: number;
  /** Index of the first sample kept by `every` (phase of the decimation). */
  phase: number;
}

interface TraceFile {
  samples: { t: number; lat: number; lng: number; accuracy: number }[];
}
interface GeoJsonFile {
  features: { geometry: { type: string; coordinates: Ring[] } }[];
}

export function loadPolygon(path: string): PolygonRings {
  const file = readJsonFile(`${REPO_ROOT}${path}`) as unknown as GeoJsonFile;
  const g = file.features[0]?.geometry;
  if (g === undefined || g.type !== 'Polygon') throw new Error(`${path}: expected one Polygon`);
  return { rings: g.coordinates };
}

function insideRing(lat: number, lng: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [bx, by] = ring[i] as [number, number];
    const [ax, ay] = ring[j] as [number, number];
    if (by > lat !== ay > lat) {
      const x = bx + ((lat - by) * (ax - bx)) / (ay - by);
      if (lng < x) inside = !inside;
    }
  }
  return inside;
}

/** Shortest distance (m) to any ring segment on a local equirectangular plane centred at the point. */
export function boundaryDistance_m(lat: number, lng: number, poly: PolygonRings): number {
  const kx = Math.cos(lat * DEG_TO_RAD) * DEG_TO_RAD * EARTH_MEAN_RADIUS_M;
  const ky = DEG_TO_RAD * EARTH_MEAN_RADIUS_M;
  let best = Number.POSITIVE_INFINITY;
  for (const ring of poly.rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [pxA, pyA] = ring[j] as [number, number];
      const [pxB, pyB] = ring[i] as [number, number];
      const ax = (pxA - lng) * kx;
      const ay = (pyA - lat) * ky;
      const dx = (pxB - lng) * kx - ax;
      const dy = (pyB - lat) * ky - ay;
      const len2 = dx * dx + dy * dy;
      const f = len2 === 0 ? 0 : Math.min(1, Math.max(0, -(ax * dx + ay * dy) / len2));
      best = Math.min(best, Math.hypot(ax + f * dx, ay + f * dy));
    }
  }
  return best;
}

/** Inside the outer ring and not inside a hole (a point exactly on an edge is rare on these grids). */
export function pointInPolygon(lat: number, lng: number, poly: PolygonRings): boolean {
  const [outer, ...holes] = poly.rings;
  if (outer === undefined) return false;
  return insideRing(lat, lng, outer) && !holes.some((h) => insideRing(lat, lng, h));
}

export interface TraceSample extends Sample {
  boundaryDistance_m: number;
}

/** Loads a trace as engine samples (t_ms = trace t) with inside / boundary distance attached. */
export function loadTraceSamples(ref: TraceRef): TraceSample[] {
  const file = readJsonFile(`${REPO_ROOT}${ref.trace}`) as unknown as TraceFile;
  const poly = ref.polygon === null ? null : loadPolygon(ref.polygon);
  return file.samples
    .filter((_, i) => i >= ref.phase && (i - ref.phase) % ref.every === 0)
    .map((s) => ({
      t_ms: s.t,
      lat: s.lat,
      lng: s.lng,
      accuracy_m: s.accuracy,
      inside: poly === null ? true : pointInPolygon(s.lat, s.lng, poly),
      boundaryDistance_m:
        poly === null ? Number.POSITIVE_INFINITY : boundaryDistance_m(s.lat, s.lng, poly),
    }));
}

export const TRACE_DIR = 'data/gps-traces/synthetic/';
export const TEST_POLYGON = `${TRACE_DIR}polygons/test-rect-benchasiri.geojson`;
export const tracePath = (id: string) => `${TRACE_DIR}${id}.trace.json`;
export const secondsToMs = (s: number) => s * MS_PER_S;
