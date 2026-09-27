/**
 * P2-F04-T22 — upgrades the `checkInBatch` (engine-batch) proofs in
 * `qa/tests/traces/engine-checkin.test.ts` (P2-F04-T19) to the real public interface
 * (`createSession`/`sessionStep`, `@keep-walking/shared/session`), now that `src/session` is DONE
 * (P2-F05-T08) — closes the "รอ session" row for F04-C03a/b/c in `qa/plans/F04-test-plan.md`
 * section 8, and adds F04-C18 (E15: exit then immediate re-confirm at the same dungeon).
 *
 * Every case here replays a committed trace unmodified through `sessionStep`; no internal
 * `run`/`reward` function is imported.
 */
import { describe, expect, it } from 'vitest';
import { loadCommittedTrace } from '../traces/lib/load-trace';
import { qaSessionParams, QA_RECT_DUNGEON_ID } from './lib/qa-session-params';
import { driveTrace, step, chooseAnyClass } from './lib/drive-session';
import { selectCheckInPreview } from '@keep-walking/shared/session';

const START_EPOCH_MS = Date.UTC(2026, 0, 5, 6, 0, 0); // an arbitrary Monday 13:00 Bangkok (open all day)

describe('F04-C03a — checkin_rejected reasons through sessionStep (public interface)', () => {
  it('qa-checkin-accuracy-35-01: poor_accuracy the whole approach, never ready', () => {
    const trace = loadCommittedTrace('data/gps-traces/qa/qa-checkin-accuracy-35-01.trace.json');
    const params = qaSessionParams();
    const { state } = driveTrace(trace, params, START_EPOCH_MS);
    const now_ms = START_EPOCH_MS + (trace.samples.at(-1)?.t ?? 0);
    const preview = selectCheckInPreview(state, QA_RECT_DUNGEON_ID, now_ms, params);
    expect(preview).toEqual({ ok: false, reason: 'poor_accuracy', readyIn_s: null });
  });

  // BUG-P2-002 (severity high, OPEN, owner backend-programmer): the *real* sessionStep path
  // accepts this teleport (`ok: true`) even though the exact same trace correctly and permanently
  // stays `no_approach_from_outside` through `checkInBatch` (qa/tests/traces/engine-checkin.test.ts,
  // P2-F04-T19) — the production reducer and the QA/vector-level batch helper disagree on the one
  // rule GD B-03 explicitly names ("ห้ามข้ามเวลาด้วยการเทเลพอร์ตเข้ากลาง polygon"). Root cause
  // (packages/shared/src/session/reducer.ts `handleSample`): `usableAndUnlocked = accuracyOk &&
  // !lock.locked` feeds `approachStep` — no speed-outlier check at all — even though
  // `packages/shared/src/run/approach.ts`'s own `ApproachSample.usableAndUnlocked` doc says it
  // should have "passed the gate outlier filter (accuracy + speed...)". This lets a single
  // impossible 1.3 km/1 s jump both (a) keep the approach chain unbroken (gap 1 s, far under
  // `maxSamplePairGap_s`) and (b) count as the required "seen outside" sample
  // (`teleportIntoPolygonAllowed: false`'s own check), so 60+ s of continuous *legitimate* inside
  // time after the teleport is enough to check in. `it.fails`: this assertion is the *spec-correct*
  // expectation and is expected to keep failing until backend-programmer fixes the reducer; a
  // sudden pass here is the signal to flip this back to a normal `it`.
  it.fails(
    'synthetic-teleport-spoof-01: no_approach_from_outside once the trace ends (BUG-P2-002)',
    () => {
      const trace = loadCommittedTrace(
        'data/gps-traces/synthetic/synthetic-teleport-spoof-01.trace.json',
      );
      const params = qaSessionParams();
      const { state } = driveTrace(trace, params, START_EPOCH_MS);
      const now_ms = START_EPOCH_MS + (trace.samples.at(-1)?.t ?? 0);
      const preview = selectCheckInPreview(state, QA_RECT_DUNGEON_ID, now_ms, params);
      expect(preview.ok).toBe(false);
      if (!preview.ok) expect(preview.reason).toBe('no_approach_from_outside');
    },
  );

  it('synthetic-driving-40kmh-01: speed_lock takes precedence mid-cruise', () => {
    const trace = loadCommittedTrace(
      'data/gps-traces/synthetic/synthetic-driving-40kmh-01.trace.json',
    );
    const params = qaSessionParams();
    const cruiseSample = trace.samples.find((s) => s.t === 120_000);
    expect(cruiseSample).toBeDefined();
    const cut = { ...trace, samples: trace.samples.filter((s) => s.t <= 120_000) };
    const { state } = driveTrace(cut, params, START_EPOCH_MS);
    const now_ms = START_EPOCH_MS + 120_000;
    const preview = selectCheckInPreview(state, QA_RECT_DUNGEON_ID, now_ms, params);
    expect(preview).toEqual({ ok: false, reason: 'speed_lock', readyIn_s: null });
  });

  it('synthetic-walk-in-01 (control): not_enough_trace at half approach time, ok:true at the end', () => {
    const trace = loadCommittedTrace('data/gps-traces/synthetic/synthetic-walk-in-01.trace.json');
    const params = qaSessionParams();
    const halfway = trace.samples.filter((s) => s.t <= 30_000);
    const halfDrive = driveTrace({ ...trace, samples: halfway }, params, START_EPOCH_MS);
    const halfPreview = selectCheckInPreview(
      halfDrive.state,
      QA_RECT_DUNGEON_ID,
      START_EPOCH_MS + 30_000,
      params,
    );
    expect(halfPreview.ok).toBe(false);
    if (!halfPreview.ok) expect(halfPreview.reason).toBe('not_enough_trace');

    const fullDrive = driveTrace(trace, params, START_EPOCH_MS);
    const now_ms = START_EPOCH_MS + (trace.samples.at(-1)?.t ?? 0);
    const fullPreview = selectCheckInPreview(fullDrive.state, QA_RECT_DUNGEON_ID, now_ms, params);
    expect(fullPreview).toEqual({ ok: true });
  });
});

describe('F04-C18 (E15) — exit, then immediate re-confirm at the same dungeon', () => {
  // spec F04 E15 (design/features/F04-dungeon-presence.md line 152): "ออกเองแล้ว confirm แห่งเดิม
  // ทันที -> ได้ ต้องผ่าน check-in ใหม่ · run ใหม่ rewardWindow เริ่มใหม่" — this reads as "allowed"
  // (the player is still standing right there, still evidently present), a freshly *evaluated*
  // check-in (not skipped), and a brand new run whose reward window starts at zero. It does not
  // say check-in must be re-*failed*.
  //
  // [ASSUMPTION A-P2-F04-T22-1: `qa/plans/F04-test-plan.md` section 8 read this case as "must be
  // rejected not_enough_trace", citing `app.privacy.onDeviceSamples.persistPreRunApproach = false`
  // as the reason. That flag only controls whether `pre` survives `toPersisted`/`fromPersisted`
  // (packages/shared/src/session/persistence.ts's own comment: "pre ... is never persisted"), not
  // whether an `exit` input clears the in-memory approach chain of a session that never stopped
  // running — driving this case through the real `sessionStep` (below) confirms the chain is
  // intentionally untouched by `exit`, so a player who never actually left the polygon re-enters
  // immediately, matching E15's own "ได้" (allowed). Handoff: qa-tester's own next test-plan
  // revision should correct this line rather than treat it as a bug; not filed in qa/bugs.md since
  // it is a QA-plan wording issue, not an engine defect. Owner: qa-tester.]
  it('re-confirm succeeds immediately (still present) with a brand new run and a reward window at zero', () => {
    const trace = loadCommittedTrace('data/gps-traces/synthetic/synthetic-walk-in-01.trace.json');
    const params = qaSessionParams();
    const { state: driven } = driveTrace(trace, params, START_EPOCH_MS);
    const enterAt_ms = START_EPOCH_MS + (trace.samples.at(-1)?.t ?? 0);
    // F06-tech 6.3 item 1: a fresh player has no class yet; the real flow always chooses one
    // before the map ever shows a dungeon, so every confirm-path test needs this first.
    const { state: entered } = chooseAnyClass(driven, enterAt_ms, params);
    const confirmed = step(
      entered,
      { type: 'confirm', dungeonId: QA_RECT_DUNGEON_ID, runSeed: 1 },
      enterAt_ms,
      params,
    );
    const firstRunId = confirmed.state.run?.runId;
    expect(confirmed.events.some((e) => e.type === 'dungeon_entered')).toBe(true);
    expect(firstRunId).toBeDefined();

    const exited = step(confirmed.state, { type: 'exit' }, enterAt_ms + 1_000, params);
    expect(
      exited.events.some((e) => e.type === 'dungeon_exited' && e.exitReason === 'manual_exit'),
    ).toBe(true);
    expect(exited.state.run).toBeNull();

    const reConfirm = step(
      exited.state,
      { type: 'confirm', dungeonId: QA_RECT_DUNGEON_ID, runSeed: 2 },
      enterAt_ms + 1_500,
      params,
    );
    expect(reConfirm.events.some((e) => e.type === 'dungeon_entered')).toBe(true);
    // A brand-new run: different id, reward window/grant count reset to zero (E15 "rewardWindow
    // เริ่มใหม่") — nothing carries over from the run just exited.
    expect(reConfirm.state.run?.runId).not.toBe(firstRunId);
    expect(reConfirm.state.run?.grantedCount).toBe(0);
    expect(reConfirm.state.run?.startedAt_ms).toBe(enterAt_ms + 1_500);
  });
});
