// Test fixtures for @keep-walking/geo. geo never reads config (ADR 0003 4.1): these values are
// fixtures, NOT balance. They mirror the values ratified in D-102 (P2-F05-T20) so the trace
// results here match the tools/sim reference and design/systems/test-vectors; the real values are
// config keys owned by systems-designer (config/balance/dungeons.json#movementGate, #runState,
// config/balance/anticheat.json#speedLock).
import { readFileSync } from 'node:fs';
import type { MultiPolygon, Polygon } from 'geojson';
import type {
  DiagnosticParams,
  EdgeHysteresisGapParams,
  EdgeHysteresisParams,
  GeoSample,
  LatLng,
  RewardWindowParams,
} from '../src/index';
import { EARTH_MEAN_RADIUS_M } from '../src/index';

const REPO = new URL('../../../', import.meta.url);

/** Gate thresholds used by the trace tests (current config: 50 m, 300 s, greaterThan). */
export const GATE = {
  minDistancePerWindow_m: 50,
  window_s: 300,
  comparison: 'greaterThan',
} as const;

/** Filter + grid fixture (D-102). Cadence 5 s sits inside the band where table = 0, bench >= 1. */
export const FILTER = {
  maxSampleAccuracy_m: 30,
  outlierSpeed_kmh: 60,
  outlierReanchorSamples: 5,
  sampleCadence_s: 5,
  maxSamplePairGap_s: 30,
} as const;

/** speedLock_kmh of the current config: the reward-path pair limit (F05 3.1 item 5). */
export const SPEED_LOCK_KMH = 25;

export const REWARD: RewardWindowParams = {
  ...FILTER,
  window_s: GATE.window_s,
  speedLock_kmh: SPEED_LOCK_KMH,
};

export const DIAG: DiagnosticParams = { ...FILTER, ...GATE, windowStep_s: 30 };

/** Hysteresis fixture (D-102/D-103): 6 counted fixes beyond a 5 m band, gap rule 30 s (D-104). */
export const HYST: EdgeHysteresisParams & EdgeHysteresisGapParams = {
  edgeHysteresisSamples: 6,
  edgeHysteresis_m: 5,
  maxSamplePairGap_s: FILTER.maxSamplePairGap_s,
};

/** graceMax_s of the current config, used only to read the edge-walk expectations. */
export const GRACE_MAX_S = 180;

interface TraceFileSample {
  t: number;
  lat: number;
  lng: number;
  accuracy: number;
}

export function loadTrace(id: string): GeoSample[] {
  const url = new URL(`data/gps-traces/synthetic/${id}.trace.json`, REPO);
  const file = JSON.parse(readFileSync(url, 'utf8')) as { samples: TraceFileSample[] };
  return file.samples.map((s) => ({ t_ms: s.t, lat: s.lat, lng: s.lng, accuracy_m: s.accuracy }));
}

function loadFirstGeometry(path: string): Polygon | MultiPolygon {
  const file = JSON.parse(readFileSync(new URL(path, REPO), 'utf8')) as {
    features: { geometry: Polygon | MultiPolygon }[];
  };
  const geometry = file.features[0]?.geometry;
  if (geometry === undefined) throw new Error(`no feature in ${path}`);
  return geometry;
}

export const TEST_RECT = (): Polygon | MultiPolygon =>
  loadFirstGeometry('data/gps-traces/synthetic/polygons/test-rect-benchasiri.geojson');

export const PLAY_AREA_MASK = (): Polygon | MultiPolygon =>
  loadFirstGeometry('data/map/playarea-mask.geojson');

const DEG = Math.PI / 180;

/** Moves a point by north/east metres on the local tangent plane (test geometry only). */
export function offset(p: LatLng, north_m: number, east_m: number): LatLng {
  return {
    lat: p.lat + north_m / EARTH_MEAN_RADIUS_M / DEG,
    lng: p.lng + east_m / (EARTH_MEAN_RADIUS_M * Math.cos(p.lat * DEG)) / DEG,
  };
}

export const ORIGIN: LatLng = { lat: 13.7306, lng: 100.54154 };

/** A straight walk east at `speed_mps`, one fix every `every_s`, from t = start_s. */
export function straightWalk(
  duration_s: number,
  every_s: number,
  speed_mps: number,
  opts: { start_s?: number; from?: LatLng; accuracy_m?: number } = {},
): GeoSample[] {
  const out: GeoSample[] = [];
  const start = opts.start_s ?? 0;
  for (let t = 0; t <= duration_s; t += every_s) {
    const p = offset(opts.from ?? ORIGIN, 0, speed_mps * t);
    out.push({ t_ms: (start + t) * 1000, ...p, accuracy_m: opts.accuracy_m ?? 5 });
  }
  return out;
}
