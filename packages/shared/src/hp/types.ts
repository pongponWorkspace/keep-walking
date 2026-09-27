// HP engine state shapes (tech note F06 section 2, P2-F06-T06). Field names are this task's
// choice; the shapes and meanings are the contract `session` builds against (same rule as tech
// note F04 section 2 for run/reward). Reused across the module so every file agrees on one shape.
import type { PlayerClass } from '../reward';

export type { PlayerClass };

/** `SessionState.player.hp` (tech note F06 2.1, 6.1): HP outside any run, materialized as an
 * anchor point. `hpAt` (./regen) computes the regen closed-form at any `t_ms >= anchorAt_ms`; the
 * state itself only changes on an event (run start/end, potion, a `Recovering` crossing, a
 * backwards clock). There is no timer. */
export interface PlayerHpState {
  readonly value: number;
  readonly anchorAt_ms: number;
  readonly recovering: boolean;
}

/** `SessionState.run.hp` (tech note F06 2.2): HP and the hit clock's own bookkeeping while a run
 * is open. No PRNG state (ADR 0003 6.2): `nextAttemptTau_ms` is a derived number, not a draw —
 * the actual interval and hit/miss of attempt `nextAttemptIndex` are re-derived from
 * `streamRng(runSeed, 'hit', nextAttemptIndex)` every time they are needed. */
export interface RunHpState {
  readonly hp: number;
  readonly shield: number;
  readonly healedThroughTau_ms: number;
  readonly nextAttemptIndex: number;
  readonly nextAttemptTau_ms: number;
  readonly attempts: number;
  readonly hitsLanded: number;
  readonly potionsUsed: { readonly runBag: number; readonly inventory: number };
  readonly lowHpWarnings: number;
}

/** Structural subset of `session`'s `ActiveClock` (tech note F05 section 2): the hit clock shares
 * the reward window's own clock (D-114), but `hp` must not import the `session` module (ADR 0003
 * 3.1 import direction), so it names the two fields it needs instead of importing the type. Any
 * object with these two fields (in particular `RunState.clock`) satisfies this by structure. */
export interface RunClock {
  readonly closedSum_ms: number;
  readonly runningSince_ms: number | null;
}

export type PotionSource = 'runBag' | 'inventory';

/** `usePotion` rejection reasons this module can detect (tech note F06 6.4 items 2-5); `run_active`
 * (item 1) is `session`'s own check, since `hp` never sees `SessionState.run`. */
export type PotionRejectReason =
  'not_a_potion' | 'none_in_inventory' | 'not_recovering' | 'full_hp';
