/**
 * F06-C34 (qa/plans/F06-test-plan.md section 9, D-114) — board handoff from P2-H20:
 * "ทดสอบ no_class/no_hp ผ่าน confirm ไม่ใช่ preview" (P2-F06-T21).
 *
 * `handleConfirm` (packages/shared/src/session/reducer.ts) checks, in order: `run_active` ->
 * `no_class` -> `no_hp` -> `dungeon_closed` -> ... `packages/shared/src/session/hp.test.ts`
 * (a dev unit test, not owned by QA) already dispatches a real `confirm` and gets `no_class` back,
 * but only documents in its title (never actually reaches) the `no_hp` branch — "no_hp is
 * unreachable at full HP" is true of *that* test's own setup, not a proof the branch works. This
 * file is the QA black-box case that drives a session all the way to HP 0 through real combat
 * (via `walkUntilRetreatOrDeath`, the same helper `hp-safety-auto-retreat-death-revive.test.ts`
 * uses) and then dispatches a second, real `confirm` — through the public `sessionStep` engine
 * entry point, never `selectCheckInPreview` alone — to prove the engine's actual gate rejects a
 * re-entry attempt while Recovering, not just a preview/dry-run helper that never mutates state.
 */
import { describe, expect, it } from 'vitest';
import { createPlayer, createSession, sessionStep } from '@keep-walking/shared/session';
import type { SessionEvent } from '@keep-walking/shared/session';
import {
  qaSessionParams,
  qaSessionParamsWithClosableRect,
  QA_RECT_DUNGEON_ID,
} from '../F04/lib/qa-session-params';
import { walkUntilRetreatOrDeath } from './lib/walk-until';

const START_EPOCH_MS = Date.UTC(2026, 9, 2, 6, 0, 0); // pinned start= (P2-F06-T10 lesson)

function lastRejection(events: readonly SessionEvent[]) {
  const rejections = events.filter(
    (e): e is Extract<SessionEvent, { type: 'checkin_rejected' }> => e.type === 'checkin_rejected',
  );
  return rejections.at(-1);
}

/** The exact instant `run_death` fired -- reconfirming any later than this lets outside-dungeon
 * regen (F06-R03) start lifting HP off the floor, which would silently turn a "still at HP 0" test
 * into a "already partly recovered" one. Same instant, not "a moment after". */
function deathAt(events: readonly SessionEvent[]): number {
  const death = events.find(
    (e): e is Extract<SessionEvent, { type: 'run_death' }> => e.type === 'run_death',
  );
  if (death === undefined)
    throw new Error('walkUntilRetreatOrDeath did not produce a run_death event');
  return death.at_ms;
}

describe('F06-C34 — confirm rejects no_class and no_hp through the real public engine (D-114)', () => {
  it('no_class: confirm before chooseClass is dispatched is rejected via a real sessionStep confirm call', () => {
    const params = qaSessionParams();
    // No `chooseClass` dispatch at all -- `player.classId` stays `null` (createSession's own
    // default), the exact precondition `handleConfirm` checks before it ever looks at HP.
    const state = createSession(
      START_EPOCH_MS,
      params,
      createPlayer(START_EPOCH_MS, params.config),
    );
    const result = sessionStep(
      state,
      { type: 'confirm', dungeonId: QA_RECT_DUNGEON_ID, runSeed: 1 },
      START_EPOCH_MS,
      params,
    );
    // The state must not have started a run either -- a real rejection, not a partial success.
    expect(result.state.run).toBeNull();
    expect(result.events).toEqual([
      {
        type: 'checkin_rejected',
        dungeonId: QA_RECT_DUNGEON_ID,
        reason: 'no_class',
        readyIn_s: null,
        at_ms: START_EPOCH_MS,
      },
    ]);
  });

  it('no_hp: after a real death (HP truly at 0, class already chosen), a second confirm is rejected no_hp -- not a preview call, an actual sessionStep dispatch', () => {
    const params = qaSessionParams();
    const walked = walkUntilRetreatOrDeath(
      params,
      QA_RECT_DUNGEON_ID,
      START_EPOCH_MS,
      7,
      'ranged',
      false, // auto-retreat off from the start -> the run ends in real death, not auto_retreat
      // Small step (well under the 5 s clockSkewTolerance_s): the death hit's own at_ms can land
      // anywhere inside the gap since the previous sample (F06-R07), so a small step bounds how far
      // that instant can be behind the state's own clock.lastNow_ms once the death-carrying sample
      // is processed -- large enough gaps would make the very next confirm below fail clockCheck
      // before it ever reaches the no_hp branch.
      { stepMs: 2000 },
    );
    // Preconditions for this to be a clean test of the no_hp branch specifically (not some other
    // rejection reason firing first): classId is still set, HP is truly 0, and the previous run
    // has actually ended (run_active must not be what fires instead).
    expect(walked.outcome).toBe('death');
    expect(walked.state.player.classId).toBe('ranged');
    expect(walked.state.player.hp.value).toBe(0);
    expect(walked.state.player.hp.recovering).toBe(true);
    expect(walked.state.run).toBeNull();

    const now_ms = deathAt(walked.events); // the exact instant of death, before any regen accrues
    const reconfirm = sessionStep(
      walked.state,
      { type: 'confirm', dungeonId: QA_RECT_DUNGEON_ID, runSeed: 99 },
      now_ms,
      params,
    );
    // Still no run started -- confirm truly did nothing, it did not fall through to starting one.
    expect(reconfirm.state.run).toBeNull();
    const rejection = lastRejection(reconfirm.events);
    expect(rejection?.reason).toBe('no_hp');
    expect(rejection?.dungeonId).toBe(QA_RECT_DUNGEON_ID);
    expect(rejection?.readyIn_s).toBeNull();
  });

  it('no_hp precedes dungeon_closed in handleConfirm order: confirm on a dead player is still no_hp even naming a dungeon that is permanently closed', () => {
    // reducer.ts's own comment on `handleConfirm`: "T1-T4, in R08's order, with the HP checks
    // inserted after run_active and before dungeon_closed" -- a player at HP 0 must see no_hp even
    // for a dungeon whose opening hours would independently reject the same confirm; the player
    // never learns anything about that dungeon's schedule until they are alive again.
    const { params, dungeonId: closedDungeonId } = qaSessionParamsWithClosableRect({ weekly: {} }); // always closed, every day
    const walked = walkUntilRetreatOrDeath(
      params,
      QA_RECT_DUNGEON_ID, // the always-open QA rectangle -- only used to reach a real death
      START_EPOCH_MS,
      11,
      'tanker',
      false,
      { stepMs: 2000 }, // see the sibling case above for why
    );
    expect(walked.outcome).toBe('death');
    expect(walked.state.player.hp.value).toBe(0);
    const now_ms = deathAt(walked.events); // the exact instant of death, before any regen accrues
    // Sanity: this dungeon really is closed at `now_ms` for a player who *is* alive -- otherwise
    // this test would not actually be racing no_hp against dungeon_closed at all.
    const aliveCheck = sessionStep(
      createSession(now_ms, params, createPlayer(now_ms, params.config)),
      { type: 'chooseClass', classId: 'tanker' },
      now_ms,
      params,
    );
    const aliveConfirm = sessionStep(
      aliveCheck.state,
      { type: 'confirm', dungeonId: closedDungeonId, runSeed: 100 },
      now_ms,
      params,
    );
    expect(lastRejection(aliveConfirm.events)?.reason).toBe('dungeon_closed');

    // The dead player, same dungeon, same instant: no_hp wins.
    const reconfirm = sessionStep(
      walked.state,
      { type: 'confirm', dungeonId: closedDungeonId, runSeed: 100 },
      now_ms,
      params,
    );
    expect(lastRejection(reconfirm.events)?.reason).toBe('no_hp');
  });
});
