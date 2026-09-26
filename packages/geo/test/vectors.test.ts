// geo against the systems-designer golden vectors (P2-X03): design/systems/test-vectors/
// movement-gate.json `gateWindows` and run-state.json `edgeHysteresis`, both produced by the
// independent reference in tools/sim/src (never imported here). The harness only places fixes on
// the window clock (tau, running interval) the way tech note F05 section 2 says; every rule under
// test (filter, grid, pair conditions, hysteresis) is geo's own code.
import { readFileSync } from 'node:fs';
import type { MultiPolygon, Polygon } from 'geojson';
import { describe, expect, it } from 'vitest';
import {
  edgeHysteresisTransitions,
  pointInPolygon,
  rewardWindowInit,
  rewardWindowStep,
} from '../src/index';
import type { ClosedWindow, GeoSample, RewardWindowParams } from '../src/index';

const REPO = new URL('../../../', import.meta.url);
const readJson = (path: string): unknown => JSON.parse(readFileSync(new URL(path, REPO), 'utf8'));

type Obj = Record<string, unknown>;
interface Vector {
  readonly input: Obj;
  readonly expected: unknown;
  readonly tolerance: number;
  readonly source: string;
}
const vectors = (file: string, fn: string): Vector[] =>
  (readJson(`design/systems/test-vectors/${file}`) as { vectors: Vector[] }).vectors.filter(
    (v) => v.input['fn'] === fn,
  );
const label = (v: Vector) => v.source.slice(v.source.lastIndexOf('·') + 2);

interface Interval {
  readonly start_ms: number;
  readonly end_ms: number | null;
}
interface InSample extends GeoSample {
  readonly inside: boolean;
}

function intervalOf(t_ms: number, clock: readonly Interval[]): number {
  return clock.findIndex((c) => t_ms >= c.start_ms && (c.end_ms === null || t_ms <= c.end_ms));
}

function tauAt(t_ms: number, clock: readonly Interval[]): number {
  let tau = 0;
  for (const c of clock) {
    if (t_ms <= c.start_ms) break;
    tau += (c.end_ms === null ? t_ms : Math.min(t_ms, c.end_ms)) - c.start_ms;
  }
  return tau;
}

function samplesOf(input: Obj): InSample[] {
  if (Array.isArray(input['samples'])) return input['samples'] as InSample[];
  const file = readJson(input['trace'] as string) as {
    samples: { t: number; lat: number; lng: number; accuracy: number }[];
  };
  const polyPath = input['polygon'] as string | null;
  const poly =
    polyPath === null
      ? null
      : (readJson(polyPath) as { features: { geometry: Polygon | MultiPolygon }[] }).features[0]
          ?.geometry;
  const every = input['every'] as number;
  const phase = input['phase'] as number;
  return file.samples
    .filter((_, i) => i >= phase && (i - phase) % every === 0)
    .map((s) => {
      const g = { t_ms: s.t, lat: s.lat, lng: s.lng, accuracy_m: s.accuracy };
      return { ...g, inside: poly === null || poly === undefined ? true : pointInPolygon(g, poly) };
    });
}

/** geo rewardWindow over the vector, reported in the reference's shape. */
function gateWindows(input: Obj) {
  const params = input['params'] as Obj;
  const p: RewardWindowParams = {
    window_s: params['window_s'] as number,
    sampleCadence_s: params['sampleCadence_s'] as number,
    maxSamplePairGap_s: params['maxSamplePairGap_s'] as number,
    maxSampleAccuracy_m: params['maxSampleAccuracy_m'] as number,
    outlierSpeed_kmh: params['outlierSpeed_kmh'] as number,
    outlierReanchorSamples: params['outlierReanchorSamples'] as number,
    speedLock_kmh: params['speedLock_kmh'] as number,
  };
  const clock = input['clock'] as Interval[];
  expect(input['endAt_ms']).toBeNull();
  const confirm = clock[0]?.start_ms ?? Number.POSITIVE_INFINITY;
  let state = rewardWindowInit(p);
  const closed: ClosedWindow[] = [];
  let droppedAccuracy = 0;
  let droppedSpeed = 0;
  let tauJudge = 0;
  for (const s of samplesOf(input).filter((x) => x.t_ms >= confirm)) {
    const running = intervalOf(s.t_ms, clock) >= 0;
    const tau_ms = tauAt(s.t_ms, clock);
    const { t_ms, lat, lng, accuracy_m } = s;
    const r = rewardWindowStep(
      state,
      { sample: { t_ms, lat, lng, accuracy_m }, tau_ms, countable: s.inside && running },
      p,
    );
    state = r.state;
    closed.push(...r.closed);
    if (r.verdict.kept && running) tauJudge = Math.max(tauJudge, tau_ms);
    if (!r.verdict.kept && r.verdict.reason === 'accuracy') droppedAccuracy += 1;
    if (!r.verdict.kept && r.verdict.reason === 'speed') droppedSpeed += 1;
  }
  const window_ms = p.window_s * 1000;
  return {
    windows: closed.map((w) => ({ k: w.k, distance_m: w.distance_m })),
    open: { k: state.k, elapsed_ms: tauJudge - state.k * window_ms, distance_m: state.distance_m },
    droppedAccuracy,
    droppedSpeed,
  };
}

interface ExpectedGate {
  windows: { k: number; distance_m: number; passed: boolean }[];
  open: { k: number; elapsed_ms: number; distance_m: number };
  droppedAccuracy: number;
  droppedSpeed: number;
}

describe('movement-gate.json gateWindows through geo rewardWindow (reference tools/sim)', () => {
  it.each(vectors('movement-gate.json', 'gateWindows').map((v) => [label(v), v] as const))(
    '%s',
    (_name, v) => {
      const e = v.expected as ExpectedGate;
      const a = gateWindows(v.input);
      const tol = v.tolerance;
      expect(a.windows.map((w) => w.k)).toEqual(e.windows.map((w) => w.k));
      a.windows.forEach((w, i) =>
        expect(Math.abs(w.distance_m - (e.windows[i]?.distance_m ?? NaN))).toBeLessThanOrEqual(tol),
      );
      expect(a.open.k).toBe(e.open.k);
      expect(a.open.elapsed_ms).toBe(e.open.elapsed_ms);
      expect(Math.abs(a.open.distance_m - e.open.distance_m)).toBeLessThanOrEqual(tol);
      expect([a.droppedAccuracy, a.droppedSpeed]).toEqual([e.droppedAccuracy, e.droppedSpeed]);
    },
  );
});

describe('run-state.json edgeHysteresis through geo (D-103, reference tools/sim)', () => {
  it.each(vectors('run-state.json', 'edgeHysteresis').map((v) => [label(v), v] as const))(
    '%s',
    (_name, v) => {
      const params = v.input['params'] as Obj;
      const observations = v.input['observations'] as {
        t_ms: number;
        inside: boolean;
        boundaryDistance_m: number;
      }[];
      const initial = v.input['initialSide'] === 'in' ? 'inside' : 'outside';
      const actual = edgeHysteresisTransitions(observations, initial, {
        edgeHysteresisSamples: params['edgeHysteresisSamples'] as number,
        edgeHysteresis_m: params['edgeHysteresis_m'] as number,
        // The vectors are 1 s apart; the gap rule (D-104) never fires here.
        maxSamplePairGap_s: 30,
      }).map((t) => ({ to: t.to === 'inside' ? 'in' : 'out', at_ms: t.since_t_ms }));
      expect(actual).toEqual(v.expected);
    },
  );
});
