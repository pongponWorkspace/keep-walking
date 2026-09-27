/**
 * P2-F06-T17 acceptance: "onboarding shows no forbidden system · first reward comes from a normal
 * tick (no reward when gate fails)". Drives the real, public `sessionStep`/`selectPlayerView`
 * (`@keep-walking/shared/session`) through committed traces, and the real, pure
 * `apps/client/src/onboarding/onboarding-step.ts` (`currentOnboardingStep`, `isSystemTeachLocked`)
 * fed with those same engine outputs — never re-deriving either from scratch.
 *
 * Reuses the F04 QA harness (`qaSessionParams`, `driveTrace`, `chooseAnyClass`) so this drives the
 * exact `SessionConfig` `apps/client` ships, not a hand-rolled one.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { SessionEvent } from '@keep-walking/shared/session';
import { loadCommittedTrace } from '../traces/lib/load-trace';
import { qaSessionParams, QA_RECT_DUNGEON_ID } from '../F04/lib/qa-session-params';
import { confirmAndReplay } from '../F05/lib/confirm-and-replay';
import {
  currentOnboardingStep,
  isSystemTeachLocked,
} from '../../../apps/client/src/onboarding/onboarding-step';

const START_EPOCH_MS = Date.UTC(2026, 9, 2, 6, 0, 0); // pinned start= (P2-F06-T10 lesson)

/** `config/balance/unlocks.json`'s every `unlockId` (U1-U8, NPC) — read live, mirrors
 * `onboarding-step.ts`'s own doc comment for how a real caller builds `lockedSystemIds`, never a
 * hand-typed list in this test file. */
function lockedSystemIdsFromConfig(): readonly string[] {
  const json = JSON.parse(readFileSync('config/balance/unlocks.json', 'utf8')) as Record<
    string,
    unknown
  >;
  const ids: string[] = [];
  for (const v of Object.values(json)) {
    if (v !== null && typeof v === 'object' && 'unlockId' in (v as Record<string, unknown>)) {
      ids.push(String((v as Record<string, unknown>)['unlockId']));
    }
  }
  return ids;
}

function ticksOf(events: readonly SessionEvent[]) {
  return events.filter(
    (e): e is Extract<SessionEvent, { type: 'run_tick_granted' }> => e.type === 'run_tick_granted',
  );
}

/** The client-owned onboarding steps (intro/age/consent) already answered — this file only
 * exercises the *engine-owned* part of the step machine (class/first_run/first_reward), which is
 * what `sessionStep`/`selectPlayerView` actually drive. */
const CLIENT_STEPS_DONE = {
  schemaVersion: 1 as const,
  introSeen: true,
  ageGatePassed: true,
  consentAnswered: true,
  firstOpenAt_ms: START_EPOCH_MS,
};

describe('F06 onboarding — first reward is an ordinary tick, no reward when the gate fails', () => {
  it('a full session that never moves enough grants zero ticks and never leaves onboarding (F06-C13/C39, H-E20)', () => {
    const params = qaSessionParams();
    const trace = loadCommittedTrace('data/gps-traces/qa/qa-gate-still-01.trace.json');
    const { state: after, events } = confirmAndReplay(
      trace,
      params,
      QA_RECT_DUNGEON_ID,
      START_EPOCH_MS,
      1,
    );
    expect(ticksOf(events)).toHaveLength(0);
    expect(after.player.lifetimeTicksGranted).toBe(0);

    const lockedIds = lockedSystemIdsFromConfig();
    expect(
      currentOnboardingStep({
        storage: CLIENT_STEPS_DONE,
        underageThisSession: false,
        locationConsent: 'granted',
        permissionGranted: true,
        mapAcknowledged: true,
        classChosen: after.player.classId !== null,
        firstRunEntered: after.player.firstRunEnteredAt_ms !== null,
        firstRewardDone: after.player.lifetimeTicksGranted > 0,
      }),
    ).toBe('first_reward');
    for (const id of lockedIds) {
      expect(
        isSystemTeachLocked(id, { firstRewardDone: false }, { lockedSystemIds: lockedIds }),
      ).toBe(true);
    }
  });

  it('the first granted tick is firstEver and mechanically identical to a later tick; onboarding then unlocks (F06-C13/C39)', () => {
    const params = qaSessionParams();
    const trace = loadCommittedTrace('data/gps-traces/qa/qa-gate-normalwalk-gap-01.trace.json');
    const { state: after, events } = confirmAndReplay(
      trace,
      params,
      QA_RECT_DUNGEON_ID,
      START_EPOCH_MS,
      1,
    );
    const ticks = ticksOf(events);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks[0]?.firstEver).toBe(true);
    for (const t of ticks.slice(1)) expect(t.firstEver).toBe(false);

    // "Mechanically identical" (D-089: no separate onboarding code path): the first and a later
    // granted tick carry the exact same field set, differing only in the fields that legitimately
    // vary run-to-run (index, loot roll, level progress) — never an onboarding-only field.
    expect(Object.keys(ticks[0] ?? {}).sort()).toEqual(Object.keys(ticks[1] ?? {}).sort());

    expect(after.player.lifetimeTicksGranted).toBeGreaterThan(0);
    const lockedIds = lockedSystemIdsFromConfig();
    for (const id of lockedIds) {
      expect(
        isSystemTeachLocked(id, { firstRewardDone: true }, { lockedSystemIds: lockedIds }),
      ).toBe(false);
    }
    expect(
      currentOnboardingStep({
        storage: CLIENT_STEPS_DONE,
        underageThisSession: false,
        locationConsent: 'granted',
        permissionGranted: true,
        mapAcknowledged: true,
        classChosen: true,
        firstRunEntered: true,
        firstRewardDone: true,
      }),
    ).toBe('done');
  });

  it('the engine itself never branches on lifetimeTicksGranted/firstEver to change a reward (D-089, code-search)', () => {
    // Static contract check: `reward`/`hp` must never *read* `lifetimeTicksGranted`/`firstEver` to
    // change behaviour — only ever *write* the counter or *produce* the flag for the client to
    // read. A grep for the field name inside a conditional in those two folders is a proxy for "no
    // onboarding branch exists in the engine".
    const rewardSrc = readFileSync('packages/shared/src/reward/index.ts', 'utf8');
    const hpSrcFiles = ['hit.ts', 'heal.ts', 'regen.ts', 'attempt.ts'].map((f) =>
      readFileSync(`packages/shared/src/hp/${f}`, 'utf8'),
    );
    for (const src of [rewardSrc, ...hpSrcFiles]) {
      expect(src.includes('lifetimeTicksGranted')).toBe(false);
      expect(src.includes('firstEver')).toBe(false);
    }
  });
});
