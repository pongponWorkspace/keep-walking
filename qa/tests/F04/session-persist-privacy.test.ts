/**
 * P2-F04-T22 — F04-C06 (acceptance 6, E7, "แอปถูกปิด") and F04-C11a/b (acceptance 11, privacy):
 * closes the two rows `qa/plans/F04-test-plan.md` section 8 marked "รอ P2-F04-T25" — the storage
 * adapter (`toPersisted`/`fromPersisted`, `@keep-walking/shared/session`) is DONE.
 *
 * F04-C06 follows the exact hook `docs/tech/F04-dungeon-presence.md` section 17 names: "test เรียก
 * toPersisted -> ข้าม sample ช่วงหนึ่ง -> fromPersisted(raw, now_ms+gap) -> tick -> ป้อนต่อ". The
 * Grace/Suspended *boundary* seconds themselves (2:59/3:01, 14:59/15:01) are already proven at the
 * golden-vector level (`design/systems/test-vectors/run-state.json`, confirmed green in
 * `qa/plans/F04-test-plan.md` section 9) — this file proves the *persistence round-trip* carries
 * that same real-time gap faithfully (no time gained or lost across a save/skip/load), using gap
 * lengths derived from config rather than hardcoded minutes.
 */
import { describe, expect, it } from 'vitest';
import { toPersisted, fromPersisted, selectCheckInPreview } from '@keep-walking/shared/session';
import type { SessionState } from '@keep-walking/shared/session';
import { loadCommittedTrace } from '../traces/lib/load-trace';
import { qaSessionParams, QA_RECT_DUNGEON_ID } from './lib/qa-session-params';
import { step, chooseAnyClass, driveTrace } from './lib/drive-session';
import { looksLikeCoordinate } from '../../../apps/client/src/telemetry/guard';
import { appTelemetryConfig } from '../../../apps/client/src/config/telemetry';
import { createTelemetrySink } from '../../../apps/client/src/telemetry/sink';
import { KNOWN_EVENT_NAMES } from '../../../apps/client/src/telemetry/known-events';
import { mapSessionEvent } from '../../../apps/client/src/telemetry/f04-events';

/** Walks every leaf value of a JSON-serializable object and reports which ones (as strings) look
 * like a Thailand coordinate under the same guard `config/app/telemetry.json` already defines for
 * telemetry export (`looksLikeCoordinate`, apps/client/src/telemetry/guard.ts) — reused verbatim
 * here for storage, since the shape of "a leaked coordinate" is identical either way. */
function coordinateLikeLeaves(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'number' || typeof value === 'string') {
    const text = typeof value === 'number' ? String(value) : value;
    if (looksLikeCoordinate(text, appTelemetryConfig.export.coordinateLikeNumberGuard)) {
      out.push(text);
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const v of value) coordinateLikeLeaves(v, out);
    return out;
  }
  if (value !== null && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) coordinateLikeLeaves(v, out);
  }
  return out;
}

const START_EPOCH_MS = Date.UTC(2026, 0, 5, 6, 0, 0);
const MS_PER_S = 1000;

/** Confirms a real run via the same synthetic walk-in trace `session-checkin-lifecycle.test.ts`
 * uses, so this file never invents its own approach logic — returns the Active state right at the
 * moment of entry. */
function confirmedActiveState(): { readonly state: SessionState; readonly enteredAt_ms: number } {
  const trace = loadCommittedTrace('data/gps-traces/synthetic/synthetic-walk-in-01.trace.json');
  const params = qaSessionParams();
  const driven = driveTrace(trace, params, START_EPOCH_MS);
  const enteredAt_ms = START_EPOCH_MS + (trace.samples.at(-1)?.t ?? 0);
  const withClass = chooseAnyClass(driven.state, enteredAt_ms, params);
  const confirmed = step(
    withClass.state,
    { type: 'confirm', dungeonId: QA_RECT_DUNGEON_ID, runSeed: 7 },
    enteredAt_ms,
    params,
  );
  expect(confirmed.state.run?.status).toBe('active');
  return { state: confirmed.state, enteredAt_ms };
}

describe('F04-C06 (acceptance 6, E7) — app closed, resumed through toPersisted/fromPersisted', () => {
  it('a short gap (well inside graceMax_s) survives with no lost run and no phantom distance', () => {
    const params = qaSessionParams();
    const { state, enteredAt_ms } = confirmedActiveState();
    const graceMax_s = params.config.runState.graceMax_s;
    const gap_ms = Math.floor((graceMax_s / 2) * MS_PER_S); // config-derived, safely < graceMax_s

    const saved = toPersisted(state, enteredAt_ms);
    const resumeAt_ms = enteredAt_ms + gap_ms;
    const loaded = fromPersisted(JSON.parse(JSON.stringify(saved)), params);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const ticked = step(loaded.state, { type: 'tick' }, resumeAt_ms, params);
    // The run is not deleted by the app being closed (E7): still the same run, still not ended.
    expect(ticked.state.run?.runId).toBe(state.run?.runId);
    expect(ticked.events.some((e) => e.type === 'dungeon_exited')).toBe(false);
    // No distance/tick can appear out of a gap with zero samples in it.
    expect(ticked.events.some((e) => e.type === 'run_tick_granted')).toBe(false);

    // Reopening while genuinely still inside the polygon returns to Active immediately.
    const trace = loadCommittedTrace('data/gps-traces/synthetic/synthetic-walk-in-01.trace.json');
    const lastSample = trace.samples.at(-1);
    expect(lastSample).toBeDefined();
    const resumed = step(
      ticked.state,
      {
        type: 'sample',
        sample: {
          t_ms: resumeAt_ms + MS_PER_S,
          lat: lastSample?.lat ?? 0,
          lng: lastSample?.lng ?? 0,
          accuracy_m: lastSample?.accuracy ?? 5,
        },
      },
      resumeAt_ms + MS_PER_S,
      params,
    );
    expect(resumed.state.run?.status).toBe('active');
    expect(resumed.state.run?.runId).toBe(state.run?.runId);
  });

  it('a long gap (past graceMax_s + suspendedMax_s) ends the run timeout, loot preserved ("ของไม่หาย")', () => {
    const params = qaSessionParams();
    const { state, enteredAt_ms } = confirmedActiveState();
    const totalBudget_s = params.config.runState.graceMax_s + params.config.runState.suspendedMax_s;
    const margin_s = 60;
    const gap_ms = (totalBudget_s + margin_s) * MS_PER_S; // safely past the whole budget

    const saved = toPersisted(state, enteredAt_ms);
    const resumeAt_ms = enteredAt_ms + gap_ms;
    const loaded = fromPersisted(JSON.parse(JSON.stringify(saved)), params);
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;

    const ticked = step(loaded.state, { type: 'tick' }, resumeAt_ms, params);
    const exitEvent = ticked.events.find((e) => e.type === 'dungeon_exited');
    expect(exitEvent).toBeDefined();
    if (exitEvent?.type === 'dungeon_exited') {
      expect(exitEvent.exitReason).toBe('timeout');
      // "ของไม่หาย" (R23: only `death` loses run loot) — a summary always exists, and loot is
      // whatever the run had already earned before the gap (this run earned none, since it never
      // moved — the point here is *presence*, not that the array is non-empty).
      expect(exitEvent.summary.lost).toEqual([]);
    }
    expect(ticked.state.run).toBeNull();
    expect(ticked.state.lastSummary?.exitReason).toBe('timeout');
  });
});

describe('F04-C11a (acceptance 11) — storage carries no coordinates after toPersisted', () => {
  it('a persisted envelope, mid-run, has no lat/lng keys and no coordinate-shaped numbers', () => {
    const { state, enteredAt_ms } = confirmedActiveState();
    const saved = toPersisted(state, enteredAt_ms);
    const json = JSON.stringify(saved);
    // Black-box guard (no reliance on which internal field name held the coordinate): no key
    // literally named lat/lng/latitude/longitude/accuracy, and no leaf value that looks like a
    // Thailand coordinate under the same guard telemetry export uses (belt and suspenders).
    expect(json).not.toMatch(/"(lat|lng|latitude|longitude|accuracy_m)"\s*:/i);
    expect(coordinateLikeLeaves(saved)).toEqual([]);
  });
});

describe('F04-C11b (acceptance 11) — telemetry carries no coordinates through the real sink', () => {
  it('a full confirm -> tick -> exit run, mapped through the real f04-events mapper into the real sink, never stores a coordinate', () => {
    const trace = loadCommittedTrace('data/gps-traces/synthetic/synthetic-walk-in-01.trace.json');
    const params = qaSessionParams();
    const sink = createTelemetrySink({
      config: appTelemetryConfig.localSink,
      forbiddenPropertyNames: appTelemetryConfig.export.forbiddenPropertyNames,
      coordinateGuard: appTelemetryConfig.export.coordinateLikeNumberGuard,
      knownEventNames: KNOWN_EVENT_NAMES,
      sessionId: 'qa00001',
      platform: 'qa-test',
      appVersion: 'qa',
      now: () => START_EPOCH_MS,
    });

    let state = chooseAnyClass(
      driveTrace({ ...trace, samples: [] }, params, START_EPOCH_MS).state,
      START_EPOCH_MS,
      params,
    ).state;
    const record = (events: ReturnType<typeof step>['events'], dungeonId: string) => {
      for (const event of events) {
        const mapped = mapSessionEvent(event, state.player.classId, dungeonId);
        if (mapped !== undefined) sink.record(mapped.name, mapped.properties);
      }
    };
    let confirmedAt: number | undefined;
    for (const s of trace.samples) {
      const now_ms = START_EPOCH_MS + s.t;
      const sampled = step(
        state,
        {
          type: 'sample',
          sample: { t_ms: now_ms, lat: s.lat, lng: s.lng, accuracy_m: s.accuracy },
        },
        now_ms,
        params,
      );
      state = sampled.state;
      record(sampled.events, QA_RECT_DUNGEON_ID);
      if (confirmedAt === undefined) {
        const preview = selectCheckInPreview(state, QA_RECT_DUNGEON_ID, now_ms, params);
        if (preview.ok) {
          const confirmed = step(
            state,
            { type: 'confirm', dungeonId: QA_RECT_DUNGEON_ID, runSeed: 3 },
            now_ms,
            params,
          );
          state = confirmed.state;
          record(confirmed.events, QA_RECT_DUNGEON_ID);
          confirmedAt = now_ms;
        }
      }
    }
    expect(confirmedAt).toBeDefined();
    const exited = step(state, { type: 'exit' }, START_EPOCH_MS + 999_000, params);
    record(exited.events, QA_RECT_DUNGEON_ID);

    expect(sink.snapshot().length).toBeGreaterThan(0);
    expect(sink.redactedCount).toBe(0); // nothing the mapper sent even needed redacting
    const serialized = sink.serialize();
    expect(serialized).not.toMatch(/"(lat|lng|latitude|longitude|accuracy_m)"\s*:/i);
    expect(coordinateLikeLeaves(JSON.parse(serialized))).toEqual([]);
  });
});
