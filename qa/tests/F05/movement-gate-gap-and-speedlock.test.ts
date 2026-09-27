/**
 * P2-F05-T11 — the other two movement-gate acceptance traces (same approach+teleport convention
 * as `movement-gate-trace-replay.test.ts`, see that file's header): a signal gap that must not
 * earn the distance walked across it (GD B-04), and a sustained speed lock that must grant no tick
 * at all while locked (F05 G7, R21).
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
type StateChanged = Extract<SessionEvent, { type: 'run_state_changed' }>;

function granted(events: readonly SessionEvent[]): Granted[] {
  return events.filter((e): e is Granted => e.type === 'run_tick_granted');
}
function denied(events: readonly SessionEvent[]): Denied[] {
  return events.filter((e): e is Denied => e.type === 'run_tick_denied');
}
function stateChanges(events: readonly SessionEvent[]): StateChanged[] {
  return events.filter((e): e is StateChanged => e.type === 'run_state_changed');
}

describe('acceptance: normal walking gets a tick in every window, and a 5-minute signal gap + 400 m jump does not earn that distance (F05 G2, GD B-04) — qa-gate-normalwalk-gap-01', () => {
  it('grants every window of the 20-minute walk before and after the gap, denies nothing, and the gap itself pauses the reward clock (Grace -> Suspended -> returned) rather than crediting any distance', () => {
    const trace = loadCommittedTrace(`${QA}qa-gate-normalwalk-gap-01.trace.json`);
    const params = qaSessionParams();
    const replay = confirmAndReplay(trace, params, QA_RECT_DUNGEON_ID, START_EPOCH_MS, 104);
    expect(replay.confirmedAtT).not.toBeNull();

    // "Normal walking gets a tick in every window": the whole 20-minute walk before the gap (4
    // windows) plus the 5-minute walk after it (1 more window) are all granted; the movement gate
    // never denies a single one of them.
    expect(granted(replay.events).map((e) => e.tickIndex)).toEqual([0, 1, 2, 3, 4]);
    expect(denied(replay.events)).toHaveLength(0);

    // The ~400 m walked while the signal is gone is not earned — not because a window evaluates
    // it and fails (there are no samples at all during the gap to feed a window), but because the
    // gap is long enough that presence itself leaves Active (no_evidence -> Grace -> Suspended,
    // `runState.rewardTickDuringGrace`/`rewardTickDuringSuspended` both false) and the reward
    // clock is paused for exactly that stretch, then resumes once real samples return
    // (`cause: 'returned'`) — the same mechanism F04 proves at the presence level, shown here to
    // also gate F05's reward clock, never a partial or phantom window.
    const changes = stateChanges(replay.events);
    expect(changes.map((e) => e.cause)).toEqual(['no_evidence', 'grace_expired', 'returned']);
    expect(changes[0]?.to).toBe('grace');
    expect(changes[1]?.to).toBe('suspended');
    expect(changes[2]?.to).toBe('active');
  });
});

describe('acceptance: no ticks during speed lock (F05 G7, R21) — qa-gate-speedlock-01', () => {
  it('grants nothing at all while sustained >25 km/h holds the reward clock stopped, then grants the first window once unlocked and walking resumes', () => {
    const trace = loadCommittedTrace(`${QA}qa-gate-speedlock-01.trace.json`);
    const params = qaSessionParams();
    const replay = confirmAndReplay(trace, params, QA_RECT_DUNGEON_ID, START_EPOCH_MS, 105);
    expect(replay.confirmedAtT).not.toBeNull();

    const ticks = [...granted(replay.events), ...denied(replay.events)].sort(
      (a, b) => a.at_ms - b.at_ms,
    );
    // Exactly one tick event for the whole trace: nothing at all fires while the ~4.5-minute fast
    // stretch (well past `anticheat.speedLock.lockSustained_s`) keeps `run.clock` stopped — the
    // reward window literally cannot close, granted or denied, until enough *unlocked* wall time
    // accumulates after `unlockSustained_s` confirms the exit. That one event is a grant, proving
    // the walk after unlocking still counts once the run recovers (not a permanent penalty).
    expect(ticks).toHaveLength(1);
    expect(ticks[0]?.type).toBe('run_tick_granted');
    expect((ticks[0] as Granted).tickIndex).toBe(0);
  });
});
