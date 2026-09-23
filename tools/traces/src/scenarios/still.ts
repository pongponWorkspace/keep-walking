// Not walking: phone in hand on a bench, phone flat on a table, and the exact gate boundary.
import { COORDINATE_DECIMALS } from '../builder';
import type { LatLng } from '../geo';
import { haversine_m, offset, roundTo } from '../geo';
import { MS_PER_S } from '../metrics';
import { BENCH_SPOT, TABLE_SPOT, TEST_RECT_CENTER } from '../places';
import { OuNoise } from '../rng';
import { Recorder, stand } from './common';
import type { ScenarioDef } from './types';

const BENCH = {
  duration_s: 900,
  interval_s: 1,
  /** Hand-held phone: the fix wanders a few metres, correlated over tens of seconds. */
  noise: { sigma_m: 1.5, tau_s: 45 },
  accuracyMin_m: 5,
  accuracyMax_m: 10,
} as const;

export const benchJitterScenario: ScenarioDef = {
  id: 'synthetic-bench-jitter-01',
  scenario: 'bench-jitter',
  seed: 201,
  environment: 'bench',
  description:
    'นั่งม้านั่งในสวน 15 นาที มือถืออยู่ในมือ jitter ธรรมชาติราว 1.5 ม. ระยะสะสมจาก jitter ผ่าน movement gate (GDD: นั่งพักบนม้านั่งยังได้อยู่)',
  build: ({ rng }, b) => {
    const rec = new Recorder(b, rng, BENCH.noise, (r) =>
      r.uniform(BENCH.accuracyMin_m, BENCH.accuracyMax_m),
    );
    stand(rec, BENCH_SPOT, BENCH.duration_s + BENCH.interval_s, BENCH.interval_s);
  },
};

const TABLE = {
  duration_s: 900,
  interval_s: 1,
  /** Phone flat and still: sub-metre wander, slow. */
  noise: { sigma_m: 0.35, tau_s: 90 },
  /**
   * The platform holds the last fix until the estimate moves more than this (fused providers do
   * this for a still device). Without it, rounding to 5 decimals turns sub-metre wander into
   * repeated 1.1 m cell flips that no real still phone produces.
   */
  holdThreshold_m: 0.9,
  accuracyMin_m: 3,
  accuracyMax_m: 5,
} as const;

export const tableStillScenario: ScenarioDef = {
  id: 'synthetic-table-still-01',
  scenario: 'table-still',
  seed: 202,
  environment: 'table',
  description:
    'มือถือวางนิ่งบนโต๊ะในศาลาสวน 15 นาที jitter ต่ำกว่า 1 ม. accuracy 3-5 ม. ต้องได้ 0 หน้าต่างที่ผ่าน movement gate',
  build: ({ rng }, b) => {
    const n = new OuNoise(rng, TABLE.noise.sigma_m, TABLE.noise.tau_s);
    const e = new OuNoise(rng, TABLE.noise.sigma_m, TABLE.noise.tau_s);
    let held: LatLng | undefined;
    for (let t = 0; t <= TABLE.duration_s; t += TABLE.interval_s) {
      const estimate = offset(TABLE_SPOT, n.step(TABLE.interval_s), e.step(TABLE.interval_s));
      if (held === undefined || haversine_m(held, estimate) > TABLE.holdThreshold_m)
        held = estimate;
      b.add({
        t_ms: t * MS_PER_S,
        point: held,
        accuracy: rng.uniform(TABLE.accuracyMin_m, TABLE.accuracyMax_m),
      });
    }
  },
};

const BOUNDARY = {
  /** Still time before, between, and after bursts = window + this margin, so no window holds two bursts. */
  stillMargin_s: 60,
  interval_s: 1,
  accuracy_m: 5,
  /** Burst A must land in [gate - belowMax, gate - belowMin]: at the boundary but never above it. */
  belowMax_m: 0.001,
  belowMin_m: 0.0002,
  /** Burst B must land in [gate + aboveMin, gate + aboveMax]. */
  aboveMin_m: 0.01,
  aboveMax_m: 0.02,
  minSteps: 25,
  maxSteps: 45,
} as const;

const DECIMAL_BASE = 10;
const GRID = DECIMAL_BASE ** -COORDINATE_DECIMALS;

/** Grid path: `n` steps north, then `e` east, then `d` diagonal (north-east), all on the 5-decimal grid. */
export function gridBurst(start: LatLng, n: number, e: number, d: number): LatLng[] {
  const pts: LatLng[] = [start];
  let i = 0;
  let j = 0;
  const push = () =>
    pts.push({
      lat: roundTo(start.lat + i * GRID, COORDINATE_DECIMALS),
      lng: roundTo(start.lng + j * GRID, COORDINATE_DECIMALS),
    });
  for (let k = 0; k < n; k += 1) {
    i += 1;
    push();
  }
  for (let k = 0; k < e; k += 1) {
    j += 1;
    push();
  }
  for (let k = 0; k < d; k += 1) {
    i += 1;
    j += 1;
    push();
  }
  return pts;
}

function sequentialLength(pts: readonly LatLng[]): number {
  let total = 0;
  for (let k = 1; k < pts.length; k += 1)
    total += haversine_m(pts[k - 1] as LatLng, pts[k] as LatLng);
  return total;
}

/** Deterministic search for the grid burst whose length falls in [lo, hi]; picks the one closest to `target`. */
export function findBurst(start: LatLng, lo: number, hi: number, target: number): LatLng[] {
  let best: { pts: LatLng[]; err: number } | undefined;
  for (let n = 0; n <= BOUNDARY.maxSteps; n += 1) {
    for (let e = 0; n + e <= BOUNDARY.maxSteps; e += 1) {
      for (let d = Math.max(0, BOUNDARY.minSteps - n - e); n + e + d <= BOUNDARY.maxSteps; d += 1) {
        const pts = gridBurst(start, n, e, d);
        const len = sequentialLength(pts);
        if (len >= lo && len <= hi && (best === undefined || Math.abs(len - target) < best.err)) {
          best = { pts, err: Math.abs(len - target) };
        }
      }
    }
  }
  if (best === undefined) throw new Error(`no grid burst with length in [${lo}, ${hi}]`);
  return best.pts;
}

export const boundaryScenario: ScenarioDef = {
  id: 'synthetic-boundary-50m-01',
  scenario: 'gate-boundary',
  seed: 203,
  environment: 'park',
  description:
    'ทดสอบขอบ movement gate: นิ่งสนิท สลับกับเดินสั้น 2 ครั้ง ครั้งแรกระยะเท่ากับเกณฑ์ (ไม่เกิน) ครั้งที่สองเกินเกณฑ์ 0.01-0.02 ม. ค่าเกณฑ์อ่านจาก config',
  build: ({ cfg }, b) => {
    const gate = cfg.gateMinDistance_m;
    const still_s = cfg.gateWindow_s + BOUNDARY.stillMargin_s;
    let t = 0;
    const origin = {
      lat: roundTo(TEST_RECT_CENTER.lat, COORDINATE_DECIMALS),
      lng: roundTo(TEST_RECT_CENTER.lng, COORDINATE_DECIMALS),
    };
    const hold = (p: LatLng) => {
      for (const end = t + still_s * MS_PER_S; t < end; t += BOUNDARY.interval_s * MS_PER_S) {
        b.add({ t_ms: t, point: p, accuracy: BOUNDARY.accuracy_m });
      }
    };
    const move = (pts: readonly LatLng[]) => {
      for (const p of pts.slice(1)) {
        b.add({ t_ms: t, point: p, accuracy: BOUNDARY.accuracy_m });
        t += BOUNDARY.interval_s * MS_PER_S;
      }
    };
    hold(origin);
    const burstA = findBurst(origin, gate - BOUNDARY.belowMax_m, gate - BOUNDARY.belowMin_m, gate);
    move(burstA);
    const afterA = burstA.at(-1) as LatLng;
    hold(afterA);
    const burstB = findBurst(
      afterA,
      gate + BOUNDARY.aboveMin_m,
      gate + BOUNDARY.aboveMax_m,
      gate + BOUNDARY.aboveMin_m,
    );
    move(burstB);
    hold(burstB.at(-1) as LatLng);
  },
};
