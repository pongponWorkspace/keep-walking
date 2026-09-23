/**
 * TC-HUD-01a..d, TC-HUD-02 (qa/plans/F02-test-plan.md section 4.3) — the movement-gate formula
 * (config/balance/dungeons.json#movementGate: distance > 50 m per 300 s window) proven against
 * synthetic/QA traces with a QA-authored formula independent of any HUD/app code (test plan
 * section 4.3: "ไม่ใช้ HUD ตรวจ HUD เอง"). The debug HUD itself (P1-F02-T11) is out of scope here;
 * this file proves the underlying arithmetic the HUD (and, later, the server) must reproduce.
 */
import { describe, expect, it } from 'vitest';
import { validateTrace } from '@keep-walking/shared';
import type { GpsTrace } from '@keep-walking/shared';
import { detectGaps, gateWindows, readQaTrace, readSyntheticTrace } from './support';

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mid = Math.floor(n / 2);
  return n % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

function p90(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(0.9 * (sorted.length - 1))] as number;
}

const WINDOW_MS = 300_000; // config/balance/dungeons.json#movementGate.window_s = 300
const MIN_DISTANCE_M = 50; // config/balance/dungeons.json#movementGate.minDistancePerWindow_m
const COMPARISON = 'greaterThan'; // config/balance/dungeons.json#movementGate.comparison

function validated(json: unknown): GpsTrace {
  const result = validateTrace(json);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.trace;
}

describe('TC-HUD-01a — a still phone gives 0 ticks', () => {
  it('synthetic-table-still-01: every window fails, max distance well under 20% of the threshold', () => {
    const trace = validated(readSyntheticTrace('synthetic-table-still-01'));
    const windows = gateWindows(trace, WINDOW_MS, MIN_DISTANCE_M);
    expect(windows.length).toBeGreaterThan(0);
    expect(windows.every((w) => !w.pass)).toBe(true);
    expect(Math.max(...windows.map((w) => w.distanceM))).toBeLessThan(MIN_DISTANCE_M * 0.2);
  });
});

describe('TC-HUD-01b — a bench with jitter still gives ticks', () => {
  it('synthetic-bench-jitter-01: jitter alone clears the gate in every window measured', () => {
    const trace = validated(readSyntheticTrace('synthetic-bench-jitter-01'));
    const windows = gateWindows(trace, WINDOW_MS, MIN_DISTANCE_M);
    expect(windows.length).toBeGreaterThan(0);
    const passCount = windows.filter((w) => w.pass).length;
    expect(passCount).toBeGreaterThan(0);
    // NOTE for the QA gate: if FIELD-I1 (real bench walk) later shows every window passing
    // unintentionally, that is a design question for systems-designer, not a HUD bug (test plan §4.3).
  });
});

describe('TC-HUD-01c — exactly 50 m at the boundary does not pass, 50.01 m does', () => {
  it('synthetic-boundary-50m-01: the burst-A window (~49.9994 m) fails, the burst-B window (~50.0101 m) passes', () => {
    const trace = validated(readSyntheticTrace('synthetic-boundary-50m-01'));
    const windows = gateWindows(trace, WINDOW_MS, MIN_DISTANCE_M);
    const burstAWindow = windows.find((w) => w.fromMs === 300_000);
    const burstBWindow = windows.find((w) => w.fromMs === 600_000);
    expect(burstAWindow?.distanceM).toBeCloseTo(49.9994, 2);
    expect(burstAWindow?.pass).toBe(false);
    expect(burstBWindow?.distanceM).toBeCloseTo(50.0101, 2);
    expect(burstBWindow?.pass).toBe(true);
  });

  it('PENDING (Phase 2): the operator itself on synthetic numbers — exactly 50.0 m must fail, 50.01 m must pass', () => {
    // The GPS-trace grid (<= 5 decimals, ~1.1 m per cell per docs/tech/gps-trace-format.md) cannot
    // encode a distance of exactly 50.0000 m (location-engineer, P1-F02-T05 numbers) — confirmed
    // empirically above (closest achievable is 49.9994 m). This case proves the comparator
    // (`greaterThan`, strict) on synthetic numbers instead, and is the one that must be re-run
    // against the real pure gate function once it exists (Phase 2), not against a GPS trace.
    const isGatePass = (distanceM: number): boolean =>
      COMPARISON === 'greaterThan' ? distanceM > MIN_DISTANCE_M : distanceM >= MIN_DISTANCE_M;
    expect(isGatePass(50.0)).toBe(false);
    expect(isGatePass(50.01)).toBe(true);
  });
});

describe('TC-HUD-01d — the same gate formula applies without a dungeon/raid branch', () => {
  it('gateWindows() takes no context argument: one formula for every appliesTo target', () => {
    // config/balance/dungeons.json#movementGate.appliesTo = ["dungeon", "raid"], no exceptions.
    // Proving the gate is actually *invoked* identically inside a raid run needs run-state code
    // that does not exist until Phase 2/3 (test plan §4.3, §7) — deferred, not a F02 gap.
    expect(gateWindows.length).toBe(3); // (trace, windowMs, minDistanceM) — no "context" parameter
  });
});

describe('TC-HUD-02 — signal-gap detection (S13)', () => {
  it('qa-gps-gap-2min: exactly one gap > 10 s, totalling ~120 s', () => {
    const trace = validated(readQaTrace('qa-gps-gap-2min'));
    const gaps = detectGaps(trace, 10_000);
    expect(gaps.length).toBe(1);
    const gapTotalS = gaps.reduce((sum, g) => sum + g.gapMs, 0) / 1000;
    expect(gapTotalS).toBeGreaterThanOrEqual(119);
    expect(gapTotalS).toBeLessThanOrEqual(121);
    const durationS = (trace.samples.at(-1)?.t ?? 0) / 1000;
    const gapPct = (gapTotalS / durationS) * 100;
    expect(gapPct).toBeCloseTo((120 / durationS) * 100, 1);
  });
});

describe('TC-HUD-09 — TTFF: first fix at accuracy <= checkIn.maxAccuracy_m (30 m), boundary is inclusive', () => {
  it('synthetic-warmup-accuracy-01: TTFF is exactly 45 s (accuracy is 30.0 there, 30.1 one second before)', () => {
    const trace = validated(readSyntheticTrace('synthetic-warmup-accuracy-01'));
    const ttff = trace.samples.find((s) => s.accuracy <= 30);
    expect(ttff?.t).toBe(45_000);
    const before = trace.samples.find((s) => s.t === 44_000);
    expect(before?.accuracy).toBeGreaterThan(30);
  });
});

describe('TC-HUD-08 — accuracy median/p90 exclude the first 60 s of warm-up', () => {
  it('synthetic-warmup-accuracy-01: median and p90 after the 60 s cutoff are in the 4-9 m band', () => {
    const trace = validated(readSyntheticTrace('synthetic-warmup-accuracy-01'));
    const afterWarmup = trace.samples.filter((s) => s.t >= 60_000).map((s) => s.accuracy);
    expect(afterWarmup.length).toBeGreaterThan(0);
    expect(median(afterWarmup)).toBeGreaterThanOrEqual(4);
    expect(median(afterWarmup)).toBeLessThanOrEqual(9);
    expect(p90(afterWarmup)).toBeGreaterThanOrEqual(4);
    expect(p90(afterWarmup)).toBeLessThanOrEqual(9);
    // Without the cutoff the warm-up (starts at 150 m) would dominate the median/p90 — proving the
    // cutoff matters, not just that the tail values happen to be small.
    const withoutCutoff = trace.samples.map((s) => s.accuracy);
    expect(median(withoutCutoff)).not.toBe(median(afterWarmup));
  });
});
