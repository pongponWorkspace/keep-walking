// Real engine assertions for board acceptance "(GD B-03) teleport เข้า polygon และ accuracy 35 ม.
// ถูกปฏิเสธ" and "(GD B-02) driving-40kmh ติด lock", run through the actual, already-built
// `checkInBatch` (packages/shared/src/run/check-in.ts, P2-F04-T20 DONE) — not a description of
// expected behaviour, a passing test against the real code path. Traces are read-only:
// synthetic-teleport-spoof-01 and synthetic-driving-40kmh-01 belong to location-engineer
// (data/gps-traces/synthetic/); this file only reads them. qa-checkin-accuracy-35-01 is this
// task's own trace (qa/tests/traces/scenarios/checkin-accuracy.ts).
import { describe, expect, it } from 'vitest';
import { checkInBatch } from '@keep-walking/shared/run';
import { loadQaEngineParams } from './lib/engine-config';
import { TEST_RECT_POLYGON, classifySamples, loadCommittedTrace } from './lib/load-trace';

const p = loadQaEngineParams();
const SYNTHETIC = 'data/gps-traces/synthetic/';
const QA = 'data/gps-traces/qa/';

describe('checkInBatch — qa-checkin-accuracy-35-01 (accuracy 35 m, never below maxAccuracy_m 30 m)', () => {
  const trace = loadCommittedTrace(`${QA}qa-checkin-accuracy-35-01.trace.json`);
  const samples = classifySamples(trace, TEST_RECT_POLYGON);

  it('is rejected poor_accuracy at every point in the trace, including after a walk that would otherwise be long enough', () => {
    const checkpoints = [30_000, 90_000, 150_000, samples.at(-1)?.t_ms ?? 0];
    for (const now_ms of checkpoints) {
      const result = checkInBatch(samples, now_ms, p);
      expect(result).toStrictEqual({ ok: false, reason: 'poor_accuracy', readyIn_s: null });
    }
  });
});

describe('checkInBatch — synthetic-teleport-spoof-01 (location-engineer, read-only)', () => {
  const trace = loadCommittedTrace(`${SYNTHETIC}synthetic-teleport-spoof-01.trace.json`);
  const samples = classifySamples(trace, TEST_RECT_POLYGON);

  it('never becomes ok: true, and settles on no_approach_from_outside once the walk is long enough', () => {
    const end = samples.at(-1)?.t_ms ?? 0;
    const result = checkInBatch(samples, end, p);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no_approach_from_outside');
  });

  it('is not_enough_trace right after the teleported fix (no continuous chain yet)', () => {
    const firstInsideAfterTeleport = samples.findIndex((s) => s.inside);
    const teleportSample = samples[firstInsideAfterTeleport];
    if (teleportSample === undefined) throw new Error('fixture has no inside sample');
    const result = checkInBatch(samples, teleportSample.t_ms, p);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_enough_trace');
  });
});

describe('checkInBatch — synthetic-driving-40kmh-01 (location-engineer, read-only)', () => {
  const trace = loadCommittedTrace(`${SYNTHETIC}synthetic-driving-40kmh-01.trace.json`);
  const samples = classifySamples(trace, TEST_RECT_POLYGON);

  it('rejects speed_lock while the car is above speedLock_kmh, ahead of every other reason (R08 order)', () => {
    // The car passes 25 km/h a little after 80 s (README: locks at 84 s); well inside the cruise
    // leg it is certainly locked.
    const cruising_ms = 120_000;
    const result = checkInBatch(samples, cruising_ms, p);
    expect(result).toStrictEqual({ ok: false, reason: 'speed_lock', readyIn_s: null });
  });
});

describe('checkInBatch — synthetic-walk-in-01 (location-engineer, read-only, positive control)', () => {
  const trace = loadCommittedTrace(`${SYNTHETIC}synthetic-walk-in-01.trace.json`);
  const samples = classifySamples(trace, TEST_RECT_POLYGON);

  it('is not_enough_trace before minContinuousApproach_s of the approach has elapsed', () => {
    const first = samples[0];
    if (first === undefined) throw new Error('fixture has no samples');
    const early_ms = first.t_ms + (p.minContinuousApproach_s / 2) * 1000;
    const result = checkInBatch(samples, early_ms, p);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not_enough_trace');
  });

  it('is ok: true once the walk is inside, from outside, for at least minContinuousApproach_s at good accuracy', () => {
    const end = samples.at(-1)?.t_ms ?? 0;
    const result = checkInBatch(samples, end, p);
    expect(result).toStrictEqual({ ok: true });
  });
});
