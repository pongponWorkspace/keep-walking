/**
 * P2-F06-T17: a small, reusable "keep feeding real walking samples through sessionStep until an
 * HP outcome fires (or a safety cap is hit)" loop, for cases that need more real minutes than any
 * single committed trace covers (auto-retreat, death, long survival runs) — never a fixed-length
 * fixture, because the real duration is config-driven (RNG + `combat.json`), not a constant this
 * file should hardcode.
 *
 * The walk itself is an ordinary back-and-forth line inside the QA rectangle
 * (`tools/traces/src/places.ts#TEST_RECT`, the same polygon `qa/tests/F04/lib/qa-session-params.ts`
 * already uses for `QA_RECT_DUNGEON_ID`) at an ordinary walking pace, comfortably under
 * `anticheat.json#speedLock.speedLock_kmh` and comfortably over the 50 m/5 min movement gate every
 * window — real, gate-passing movement, not jitter (same distinction F05's own QA traces draw
 * between `qa-gate-still-01`/`qa-gate-bench-jitter-01` and `qa-gate-normalwalk-gap-01`).
 */
import { createSession, createPlayer, sessionStep } from '@keep-walking/shared/session';
import type {
  PlayerClass,
  SessionEvent,
  SessionParams,
  SessionState,
} from '@keep-walking/shared/session';
import { selectCheckInPreview } from '@keep-walking/shared/session';
import { TEST_RECT } from '../../../../tools/traces/src/places';

const STEP_MS = 15000;
// 300s = one full movement-gate window per leg -- the walking *speed* this produces (TEST_RECT's
// diagonal covered once every this many ms) must stay independent of `stepMs`
// (`walkUntilRetreatOrDeath`'s `stepMs` option, P2-F06-T21): shrinking the step size without also
// shrinking the step *count* per leg would cover the same distance in less wall-clock time and trip
// `anticheat.json#speedLock.speedLock_kmh` (freezing both the reward-gate clock and the hit clock,
// F06-R06 -- exactly the "never lands a hit" failure this constant search once produced). At the
// default 15s step this is still exactly 20 steps, byte-for-byte the same walk every existing
// caller already relies on.
const LEG_DURATION_MS = 300_000;
function legStepsFor(stepMs: number): number {
  return Math.max(1, Math.round(LEG_DURATION_MS / stepMs));
}

function pointOnLeg(legFrac: number): { lat: number; lng: number } {
  return {
    lat: TEST_RECT.south + (TEST_RECT.north - TEST_RECT.south) * legFrac,
    lng: TEST_RECT.west + (TEST_RECT.east - TEST_RECT.west) * legFrac,
  };
}

// anticheat.json#checkIn.minContinuousApproach_s (60): the approach must start on a usable sample
// OUTSIDE the polygon and end inside it, continuous for at least that long — a bare "already
// standing on the centre from t=0" trace never passes `selectCheckInPreview` (`no_approach_from_outside`).
// 105s of margin over the 60s minimum, independent of `stepMs` (`walkUntilRetreatOrDeath`'s
// `stepMs` option, P2-F06-T21): at the default 15s step this is still exactly 7 steps (105s),
// byte-for-byte the same walk every existing caller already relies on; a caller asking for a
// smaller step (to bound clock-skew risk near a death instant) gets proportionally more steps
// instead of a too-short approach that would never pass `minContinuousApproach_s` at all.
const APPROACH_DURATION_MS = 105_000;
function approachStepsFor(stepMs: number): number {
  return Math.max(2, Math.ceil(APPROACH_DURATION_MS / stepMs));
}
const OUTSIDE_POINT = { lat: TEST_RECT.south - 0.003, lng: TEST_RECT.west - 0.003 }; // ~470 m away

function approachPoint(i: number, approachSteps: number): { lat: number; lng: number } {
  if (i >= approachSteps) return pointOnLeg(0.5);
  const frac = i / approachSteps;
  const centre = pointOnLeg(0.5);
  return {
    lat: OUTSIDE_POINT.lat + (centre.lat - OUTSIDE_POINT.lat) * frac,
    lng: OUTSIDE_POINT.lng + (centre.lng - OUTSIDE_POINT.lng) * frac,
  };
}

export interface WalkUntilResult {
  readonly state: SessionState;
  readonly events: readonly SessionEvent[];
  readonly outcome: 'autoRetreat' | 'death' | null;
  readonly samplesUsed: number;
}

/** Confirms into `dungeonId` (dwelling first, same "walk in, wait for `ok:true`" shape
 * `confirmAndReplay` uses), optionally flips `setAutoRetreat` right after confirming, then keeps
 * feeding the back-and-forth walk until a `run_auto_retreat`/`run_death` event appears or
 * `maxSamples` is reached (a test failure, not a silent pass — the assumption that the scenario
 * terminates should be visible). */
export interface WalkUntilOptions {
  /** `false` = stand still at the centre after confirming (no net movement -> the 50 m/5 min
   * reward gate never passes -> zero ticks ever granted -> the run bag stays empty for its whole
   * life, the black-box way to get a "no potions available" run instead of picking a drop table
   * with no potions in it). Defaults to `true` (the back-and-forth walk). */
  readonly moveAfterConfirm?: boolean;
  readonly maxSamples?: number;
  /** Sample spacing in ms (default `STEP_MS` = 15000, the back-and-forth walk's own gate-window
   * unit). A hit's own `at_ms` (F06-R07's random interval draw) can land anywhere inside the gap
   * between the previous and the enclosing sample, so the gap between a `run_death`/
   * `run_auto_retreat` event's `at_ms` and the state's own `clock.lastNow_ms` right after it is
   * bounded by this step size — a caller that needs to re-dispatch a real `sessionStep` input at
   * (or immediately after) that exact instant, without tripping `clockCheck`'s
   * `dungeons.hpSafety`/`runState.clockSkewTolerance_s` guard (`config/balance/dungeons.json`, 5 s
   * by default) or letting outside-dungeon regen (F06-R03) already move HP off the floor before the
   * re-dispatch, needs this smaller than that tolerance (P2-F06-T21 F06-C34). Leaves every existing
   * caller's timing untouched (default unchanged). */
  readonly stepMs?: number;
}

export function walkUntilRetreatOrDeath(
  params: SessionParams,
  dungeonId: string,
  startEpochMs: number,
  runSeed: number,
  classId: PlayerClass,
  autoRetreatEnabled: boolean,
  options: WalkUntilOptions = {},
): WalkUntilResult {
  const maxSamples = options.maxSamples ?? 4000;
  const moveAfterConfirm = options.moveAfterConfirm ?? true;
  const stepMs = options.stepMs ?? STEP_MS;
  const approachSteps = approachStepsFor(stepMs);
  const legSteps = legStepsFor(stepMs);
  let state = createSession(startEpochMs, params, createPlayer(startEpochMs, params.config));
  const events: SessionEvent[] = [];
  const chosen = sessionStep(state, { type: 'chooseClass', classId }, startEpochMs, params);
  state = chosen.state;
  events.push(...chosen.events);

  let confirmed = false;
  let confirmedAtStep = 0;
  let outcome: WalkUntilResult['outcome'] = null;
  let i = 0;
  for (; i < maxSamples && outcome === null; i += 1) {
    const now_ms = startEpochMs + 1000 + i * stepMs;
    // Approach from outside first (checkIn.minContinuousApproach_s), then walk the back-and-forth
    // leg once confirmed (leg timing restarts at confirm so the first post-confirm leg is whole).
    const stepsSinceConfirm = i - confirmedAtStep;
    const legIndex = Math.floor(stepsSinceConfirm / legSteps);
    const withinLeg = (stepsSinceConfirm % legSteps) / legSteps;
    const legFrac = legIndex % 2 === 0 ? withinLeg : 1 - withinLeg;
    const pt = confirmed
      ? moveAfterConfirm
        ? pointOnLeg(legFrac)
        : pointOnLeg(0.5)
      : approachPoint(i, approachSteps);
    const sampled = sessionStep(
      state,
      { type: 'sample', sample: { t_ms: now_ms, lat: pt.lat, lng: pt.lng, accuracy_m: 8 } },
      now_ms,
      params,
    );
    state = sampled.state;
    events.push(...sampled.events);

    if (!confirmed) {
      const preview = selectCheckInPreview(state, dungeonId, now_ms, params);
      if (preview.ok) {
        const confirmedStep = sessionStep(
          state,
          { type: 'confirm', dungeonId, runSeed },
          now_ms,
          params,
        );
        state = confirmedStep.state;
        events.push(...confirmedStep.events);
        confirmed = true;
        confirmedAtStep = i + 1;
        if (!autoRetreatEnabled) {
          const off = sessionStep(
            state,
            { type: 'setAutoRetreat', enabled: false },
            now_ms,
            params,
          );
          state = off.state;
          events.push(...off.events);
        }
      }
    }
    for (const e of sampled.events) {
      if (e.type === 'run_auto_retreat') outcome = 'autoRetreat';
      if (e.type === 'run_death') outcome = 'death';
    }
  }
  return { state, events, outcome, samplesUsed: i };
}
