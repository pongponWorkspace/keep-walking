// QA reference-calculator assertions for board acceptance "(GD B-04) เดิน 20 นาที + ช่องว่าง 5
// นาทีห่าง 400 ม. + เดินต่อ 5 นาที -> 400 ม. ไม่ถูกนับ" (spec F05 G2) and exit checklist E3/E4
// ("มือถือวางนิ่ง 0 tick", "ม้านั่งมี jitter ยังได้ tick"), using
// tools/traces/src/metrics.ts's `gateWindows` / `traceStats` — the location-engineer's own
// "expectations for QA... not the gate itself" reference calculator (data/gps-traces/README.md
// section 5), not the in-flight packages/shared/src/reward module (P2-F05-T08, still
// IN_PROGRESS). The golden vectors (design/systems/test-vectors/movement-gate.json,
// reward-window.json) are the authority on the real engine once that module settles; this file
// only proves the *shape* of each trace already matches the GDD's intuition.
import { describe, expect, it } from 'vitest';
import { gateWindows, traceStats } from '../../../tools/traces/src/metrics';
import { loadTraceConfig } from './lib/qa-builder';
import { loadCommittedTrace } from './lib/load-trace';

// `gateWindows` takes the full TraceConfig (loadTraceConfig()) directly — the first-draft
// GateOptions shape (tools/traces/src/metrics.ts, window_s/minDistance_m/comparison only) is
// `@deprecated`; passing `cfg` here gives identical windows since GateOptions was always just
// those three fields carved out of the same config.
const cfg = loadTraceConfig();
const SYNTHETIC = 'data/gps-traces/synthetic/';
const QA = 'data/gps-traces/qa/';

describe('E3 — synthetic-table-still-01 (location-engineer, read-only): a still phone gives 0 passing windows', () => {
  it('no 5-minute sliding window clears minDistancePerWindow_m', () => {
    const trace = loadCommittedTrace(`${SYNTHETIC}synthetic-table-still-01.trace.json`);
    const windows = gateWindows(trace.samples, cfg);
    expect(windows.length).toBeGreaterThan(0);
    expect(windows.every((w) => !w.pass)).toBe(true);
  });
});

describe('E4 — synthetic-bench-jitter-01 (location-engineer, read-only): natural jitter on a bench still clears the gate', () => {
  it('every 5-minute sliding window clears minDistancePerWindow_m', () => {
    const trace = loadCommittedTrace(`${SYNTHETIC}synthetic-bench-jitter-01.trace.json`);
    const windows = gateWindows(trace.samples, cfg);
    expect(windows.length).toBeGreaterThan(0);
    expect(windows.every((w) => w.pass)).toBe(true);
  });
});

/** Finds the one real signal-loss gap in a trace (consecutive samples further apart than
 * maxSamplePairGap_s): its exact [start, end) in ms, measured from the trace itself rather than
 * assumed from the scenario's target numbers. */
function findGap(trace: ReturnType<typeof loadCommittedTrace>): {
  start_ms: number;
  end_ms: number;
} {
  const samples = trace.samples;
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1] as { t: number };
    const cur = samples[i] as { t: number };
    if (cur.t - prev.t > 30_000) return { start_ms: prev.t, end_ms: cur.t };
  }
  throw new Error('trace has no gap wider than 30 s');
}

describe('qa-movement-gap-400m-01 — the ~400 m walked during the 5-minute signal loss is not counted (F05 G2, GD B-04)', () => {
  const trace = loadCommittedTrace(`${QA}qa-movement-gap-400m-01.trace.json`);
  const stats = traceStats(trace);
  const windows = gateWindows(trace.samples, cfg);
  const gap = findGap(trace);

  it('has a real ~5-minute gap and a ~30-minute walk, matching the scenario description', () => {
    expect(stats.gaps).toBe(1);
    expect(gap.end_ms - gap.start_ms).toBeGreaterThan(295_000);
    expect(gap.end_ms - gap.start_ms).toBeLessThan(310_000);
    expect(stats.duration_s).toBeGreaterThan(1790);
  });

  it('a window that falls entirely inside the gap has exactly 0 m (no pair can ever straddle a signal loss)', () => {
    // A sliding window (slide 30 s) can only sum the haversine distance between consecutive
    // samples that both fall inside it (tools/traces/src/metrics.ts `gateWindows`): with no
    // samples at all inside the 300 s gap, the window with no real fix in it whatsoever gets
    // exactly 0 m, never a share of the ~400 m "walked in the dark".
    const fullyInsideGap = windows.filter((w) => {
      const startMs = w.start_s * 1000;
      const endMs = startMs + cfg.gateWindow_s * 1000;
      return startMs >= gap.start_ms && endMs <= gap.end_ms;
    });
    expect(fullyInsideGap.length).toBeGreaterThan(0);
    for (const w of fullyInsideGap) {
      expect(w.distance_m).toBe(0);
      expect(w.pass).toBe(false);
    }
  });

  it('the walk before the gap clears the gate on its own', () => {
    const beforeGap = windows.filter(
      (w) => w.start_s * 1000 + cfg.gateWindow_s * 1000 <= gap.start_ms,
    );
    expect(beforeGap.length).toBeGreaterThan(0);
    expect(beforeGap.every((w) => w.pass)).toBe(true);
  });

  it('distance climbs back up and the very last window (mostly the post-gap walk) clears the gate again — the gap costs a wait, not the run', () => {
    // Only five minutes are walked after the gap (as GD B-04 specifies), so no window can sit
    // *entirely* past the gap end and still fit before the trace's own end — the last window
    // necessarily still overlaps the gap's last second. It still passes on the strength of the
    // real post-gap samples alone.
    const last = windows.at(-1);
    if (last === undefined) throw new Error('no windows computed');
    expect(last.pass).toBe(true);
    // Monotonically recovering, not a step back to the full pre-gap distance: proves the credit
    // comes from newly walked ground, not from re-admitting the ~400 m gap distance.
    const tail = windows.slice(-6).map((w) => w.distance_m);
    for (let i = 1; i < tail.length; i += 1) {
      expect(tail[i] as number).toBeGreaterThan(tail[i - 1] as number);
    }
  });
});
