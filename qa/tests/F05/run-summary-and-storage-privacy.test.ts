/**
 * P2-F05-T11 — two remaining acceptance items:
 *  1. `RunSummary.expGained`/`levelsGained` (BUG-P2-004 candidate, see qa/bugs.md): found already
 *     fixed (P2-X35, coordinator note 2026-09-27) before this task wrote a regression test, so this
 *     is a plain `it`, not an `it.fails` — see the F04-style precedent (BUG-P2-002) this task
 *     would otherwise have followed.
 *  2. Storage after a run ends carries no coordinates (P2-H02: `latestSample`, `lock.lastAccurate`,
 *     the gate filter/grid all stripped) — F04-C11a proved this for a *mid-run* persisted state
 *     (`qa/tests/F04/session-persist-privacy.test.ts`); this file proves the same property once
 *     the run has actually **ended** (`state.run === null`, `lastSummary` populated), the moment
 *     this feature's summary screen and home-state read from.
 */
import { describe, expect, it } from 'vitest';
import { loadCommittedTrace } from '../traces/lib/load-trace';
import { qaSessionParams, QA_RECT_DUNGEON_ID } from '../F04/lib/qa-session-params';
import { step } from '../F04/lib/drive-session';
import { confirmAndReplay } from './lib/confirm-and-replay';
import { toPersisted } from '@keep-walking/shared/session';
import type { SessionEvent } from '@keep-walking/shared/session';
import { looksLikeCoordinate } from '../../../apps/client/src/telemetry/guard';
import { appTelemetryConfig } from '../../../apps/client/src/config/telemetry';

const START_EPOCH_MS = Date.UTC(2026, 0, 5, 6, 0, 0);
const QA = 'data/gps-traces/qa/';

type Granted = Extract<SessionEvent, { type: 'run_tick_granted' }>;
type Exited = Extract<SessionEvent, { type: 'dungeon_exited' }>;
function granted(events: readonly SessionEvent[]): Granted[] {
  return events.filter((e): e is Granted => e.type === 'run_tick_granted');
}

/** Same black-box coordinate guard `qa/tests/F04/session-persist-privacy.test.ts` uses (the app's
 * own shipped telemetry-export guard, reused verbatim — a leaked coordinate is the same shape in
 * storage as in telemetry). */
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

describe('RunSummary.expGained / levelsGained accumulate real tick rewards (P2-X35, fixed)', () => {
  it('a run that grants several ticks (one a level-up) ends with a summary matching their sum', () => {
    const params = qaSessionParams();
    const trace = loadCommittedTrace(`${QA}qa-gate-normalwalk-gap-01.trace.json`);
    const replay = confirmAndReplay(trace, params, QA_RECT_DUNGEON_ID, START_EPOCH_MS, 301);
    const ticks = granted(replay.events);
    expect(ticks.length).toBeGreaterThanOrEqual(1);
    const expectedExp = ticks.reduce((sum, e) => sum + e.expGained, 0);
    const expectedLevels = ticks.reduce((sum, e) => sum + (e.levelAfter - e.levelBefore), 0);
    expect(expectedLevels).toBeGreaterThanOrEqual(1); // this trace levels the player up at least once

    const exitAt_ms = START_EPOCH_MS + (trace.samples.at(-1)?.t ?? 0) + 5000;
    const exited = step(replay.state, { type: 'exit' }, exitAt_ms, params);
    const exitEvent = exited.events.find((e): e is Exited => e.type === 'dungeon_exited');
    expect(exitEvent).toBeDefined();
    if (exitEvent === undefined) return;
    expect(exitEvent.exitReason).toBe('manual_exit');
    expect(exitEvent.summary.expGained).toBe(expectedExp);
    expect(exitEvent.summary.levelsGained).toBe(expectedLevels);
    expect(exited.state.lastSummary?.expGained).toBe(expectedExp);
    expect(exited.state.lastSummary?.levelsGained).toBe(expectedLevels);
  });
});

describe('P2-H02 — storage after a run ends carries no coordinates', () => {
  it('toPersisted of an ended-run state (run: null, lastSummary set) has no lat/lng keys and no coordinate-shaped numbers', () => {
    const params = qaSessionParams();
    const trace = loadCommittedTrace(`${QA}qa-gate-speedlock-01.trace.json`);
    const replay = confirmAndReplay(trace, params, QA_RECT_DUNGEON_ID, START_EPOCH_MS, 302);
    const exitAt_ms = START_EPOCH_MS + (trace.samples.at(-1)?.t ?? 0) + 5000;
    const exited = step(replay.state, { type: 'exit' }, exitAt_ms, params);
    expect(exited.state.run).toBeNull();
    expect(exited.state.lastSummary).not.toBeNull();

    const saved = toPersisted(exited.state, exitAt_ms);
    const json = JSON.stringify(saved);
    expect(json).not.toMatch(/"(lat|lng|latitude|longitude|accuracy_m)"\s*:/i);
    expect(coordinateLikeLeaves(saved)).toEqual([]);
    // Belt and suspenders (P2-H02 doc comment, persistence.ts): the specific fields it names are
    // gone, not merely "no string happens to look like one".
    expect(saved.state.latestSample).toBeNull();
    expect(saved.state.lock.lastAccurate).toBeNull();
    expect(saved.state.checkInFilter).toEqual({ anchor: null, pending: [] });
  });
});
