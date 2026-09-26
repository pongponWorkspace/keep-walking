// Real engine assertion for board acceptance "polygon ซ้อน" (spec F04-R03: "เมื่อเข้าแล้ว polygon
// ของ run = polygon ที่เลือกเท่านั้น การอยู่ใน polygon อื่นที่ซ้อนกันไม่มีผลต่อ run state", E9),
// through the actual `runTimeline` (packages/shared/src/run/run-timeline.ts, P2-F04-T20 DONE):
// the same qa-polygon-overlap-01 trace fed twice, once classified against TEST_RECT and once
// against qa-rect-overlap-b, must each independently show a real exit while inside the other one.
import { describe, expect, it } from 'vitest';
import type { PresenceSample } from '@keep-walking/shared/run';
import { runTimeline } from '@keep-walking/shared/run';
import { boundaryDistance_m } from '@keep-walking/geo';
import { loadQaEngineParams } from './lib/engine-config';
import {
  classifySamples,
  loadCommittedTrace,
  rectPolygon,
  TEST_RECT_POLYGON,
} from './lib/load-trace';
import { QA_OVERLAP_RECT } from './lib/overlap-polygon';

const p = loadQaEngineParams();
const QA = 'data/gps-traces/qa/';
const OVERLAP_POLYGON = rectPolygon(QA_OVERLAP_RECT);

function presenceSamplesAgainst(
  trace: ReturnType<typeof loadCommittedTrace>,
  polygon: typeof TEST_RECT_POLYGON,
): PresenceSample[] {
  return classifySamples(trace, polygon).map((s) => ({
    ...s,
    boundaryDistance_m: boundaryDistance_m(s, polygon),
  }));
}

function firstInsideAt_ms(samples: readonly { t_ms: number; inside: boolean }[]): number {
  const first = samples.find((s) => s.inside);
  if (first === undefined) throw new Error('trace never enters this polygon');
  return first.t_ms;
}

describe('runTimeline — qa-polygon-overlap-01, one trace against each of the two overlapping polygons', () => {
  const trace = loadCommittedTrace(`${QA}qa-polygon-overlap-01.trace.json`);
  // A run can only start while confirmed inside (F04-R02/R07): confirm at the first fix inside
  // each polygon, not at t = 0 (the walker starts outside both).
  const now_ms = trace.samples.at(-1)?.t ?? 0;
  const runParams = {
    maxSampleAccuracy_m: p.maxSampleAccuracy_m,
    outlierSpeed_kmh: p.outlierSpeed_kmh,
    outlierReanchorSamples: p.outlierReanchorSamples,
    edgeHysteresisSamples: p.edgeHysteresisSamples,
    edgeHysteresis_m: p.edgeHysteresis_m,
    maxSamplePairGap_s: p.maxSamplePairGap_s,
    graceMax_s: p.graceMax_s,
    suspendedMax_s: p.suspendedMax_s,
  };

  it('a run confirmed on TEST_RECT leaves (goes to grace) once the walker is east of it, in qa-rect-overlap-b only', () => {
    const samples = presenceSamplesAgainst(trace, TEST_RECT_POLYGON);
    const result = runTimeline(samples, firstInsideAt_ms(samples), now_ms, runParams);
    const left = result.events.find(
      (e) => e.type === 'run_state_changed' && e.from === 'active' && e.to === 'grace',
    );
    expect(left, JSON.stringify(result.events)).toBeDefined();
  });

  it('a run confirmed on qa-rect-overlap-b leaves (goes to grace) once the walker is west of it, in TEST_RECT only — R03 is symmetric', () => {
    const samples = presenceSamplesAgainst(trace, OVERLAP_POLYGON);
    const result = runTimeline(samples, firstInsideAt_ms(samples), now_ms, runParams);
    const left = result.events.find(
      (e) => e.type === 'run_state_changed' && e.from === 'active' && e.to === 'grace',
    );
    expect(left, JSON.stringify(result.events)).toBeDefined();
  });

  it('both runs return to active on the way back through the overlap strip (the walker later leaves for good, walking back past the start point outside both)', () => {
    for (const polygon of [TEST_RECT_POLYGON, OVERLAP_POLYGON]) {
      const samples = presenceSamplesAgainst(trace, polygon);
      const result = runTimeline(samples, firstInsideAt_ms(samples), now_ms, runParams);
      const returned = result.events.find(
        (e) => e.type === 'run_state_changed' && e.to === 'active' && e.cause === 'returned',
      );
      expect(returned, JSON.stringify(result.events)).toBeDefined();
      // Never times out (suspendedMax_s = 900 s) inside this ~11-minute trace: R03 costs the
      // player a Grace/Suspended wait, never the run itself, as long as they walk back in time.
      expect(result.events.some((e) => e.type === 'dungeon_exited')).toBe(false);
    }
  });
});
