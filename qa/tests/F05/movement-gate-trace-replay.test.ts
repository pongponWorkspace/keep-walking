/**
 * P2-F05-T11 — black-box F05 movement gate, replayed through the real public interface
 * (`sessionStep`, never `packages/shared/src/reward` internals directly). Every trace here is
 * QA-authored (`data/gps-traces/qa/qa-gate-*.trace.json`): a real approach-from-outside into
 * `QA_RECT_DUNGEON_ID` (>= `anticheat.checkIn.minContinuousApproach_s` of continuous evidence,
 * the exact sample sequence of `synthetic-walk-in-01` rigidly translated in the local tangent
 * plane so the *approach itself* is byte-for-byte the location-engineer's own validated shape,
 * only relocated), truncated the instant `selectCheckInPreview` turns `ok:true`, then one
 * deliberate "teleport" sample straight to the behaviour's anchor point (speed far past
 * `movementGate.outlierSpeed_kmh` — the same ADR 0003 5.3 step-1 filter BUG-P2-002 already proved
 * runs from the first sample of a session drops that single pair, so it contributes zero distance
 * and is not a case of "confirm inside the polygon by teleporting": the polygon entry itself was a
 * genuine walk-in, only the last few metres of positioning before the behaviour starts are
 * elided). Where the behaviour reuses a location-engineer trace unmodified (table-still,
 * bench-jitter, boundary-50m) every lat/lng is byte-identical to the committed `synthetic/*` file,
 * so the pairwise distances QA already validated at the reference-calculator level
 * (`qa/tests/traces/engine-movement-gate.test.ts`, `data/gps-traces/README.md` section 6) hold
 * through the real engine too — this file adds the "through `sessionStep`" proof those files
 * intentionally deferred (`qa/plans/F05-test-plan.md` section 6).
 */
import { describe, expect, it } from 'vitest';
import { loadCommittedTrace } from '../traces/lib/load-trace';
import { qaSessionParams, QA_RECT_DUNGEON_ID } from '../F04/lib/qa-session-params';
import { confirmAndReplay } from './lib/confirm-and-replay';
import type { SessionEvent } from '@keep-walking/shared/session';

const START_EPOCH_MS = Date.UTC(2026, 0, 5, 6, 0, 0);
const QA = 'data/gps-traces/qa/';

type Granted = Extract<SessionEvent, { type: 'run_tick_granted' }>;
type Denied = Extract<SessionEvent, { type: 'run_tick_denied' }>;

function granted(events: readonly SessionEvent[]): Granted[] {
  return events.filter((e): e is Granted => e.type === 'run_tick_granted');
}
function denied(events: readonly SessionEvent[]): Denied[] {
  return events.filter((e): e is Denied => e.type === 'run_tick_denied');
}

describe('F05-C-E3 (acceptance: a still phone gives 0 ticks) — qa-gate-still-01 through sessionStep', () => {
  it('every closed reward window over 15 minutes lying still is denied, none granted', () => {
    const trace = loadCommittedTrace(`${QA}qa-gate-still-01.trace.json`);
    const params = qaSessionParams();
    const replay = confirmAndReplay(trace, params, QA_RECT_DUNGEON_ID, START_EPOCH_MS, 101);
    expect(replay.confirmedAtT).not.toBeNull();
    expect(granted(replay.events)).toHaveLength(0);
    expect(denied(replay.events).map((e) => e.tickIndex)).toEqual([0, 1, 2]);
  });
});

describe('F05-C-E4 (acceptance: jitter on a bench still counts as movement, ADR 0003 filter) — qa-gate-bench-jitter-01', () => {
  it('at least one reward window over 15 minutes of natural GPS jitter is granted', () => {
    const trace = loadCommittedTrace(`${QA}qa-gate-bench-jitter-01.trace.json`);
    const params = qaSessionParams();
    const replay = confirmAndReplay(trace, params, QA_RECT_DUNGEON_ID, START_EPOCH_MS, 102);
    expect(replay.confirmedAtT).not.toBeNull();
    // The location-engineer's own reference-calculator numbers for this exact trace
    // (README section 6: 53.4-56.5 m per window) are a narrow margin above the 50 m threshold
    // (finding F-16) — real-engine grid alignment starts at the confirm instant rather than the
    // trace's own t=0, so which window a given second of jitter lands in can shift by a few
    // metres at the edges. The acceptance is "at least one window", proven here without
    // over-claiming every window passes.
    expect(granted(replay.events).length).toBeGreaterThanOrEqual(1);
  });
});

describe('G1 (acceptance: a distance exactly at the threshold does not pass, strict comparison) — qa-gate-boundary-01', () => {
  it('a walk whose per-window distance sits right at minDistancePerWindow_m is denied every window', () => {
    const trace = loadCommittedTrace(`${QA}qa-gate-boundary-01.trace.json`);
    const params = qaSessionParams();
    const replay = confirmAndReplay(trace, params, QA_RECT_DUNGEON_ID, START_EPOCH_MS, 103);
    expect(replay.confirmedAtT).not.toBeNull();
    expect(granted(replay.events)).toHaveLength(0);
    expect(denied(replay.events).map((e) => e.tickIndex)).toEqual([0, 1, 2]);
    // The literal strict-comparison epsilon (distance_m === minDistancePerWindow_m exactly fails,
    // +0.000001 passes, -0.000001 fails) is the `passesGate` golden vector
    // (design/systems/test-vectors/movement-gate.json, G1) proven against the real pure function
    // in packages/shared/src/formulas/vectors.test.ts — this trace-replay case proves the same
    // "does not pass" intuition end to end through the production reducer, not just the formula.
  });
});
