// Check-in / confirm (F04-R01..R11, tech note F04 section 7, ADR 0003 section 7). `PresenceStrategy`
// picks its behaviour from a dungeon's `verification_mode`: v1 only implements `continuous_gps`;
// `entry_exit` fails closed (NotImplementedError) so an unsupported dungeon plays as "closed"
// rather than silently accepting a check-in it cannot verify.
import type { GateFilterParams } from '@keep-walking/geo';
import { gateFilterInit, gateFilterStep, MS_PER_S } from '@keep-walking/geo';
import type { ApproachState } from './approach';
import { APPROACH_INIT, approachStep } from './approach';
import type { DungeonSample } from './sample';
import type { SpeedLockParams } from './speed-lock';
import { lockedAt, speedLockBatch } from './speed-lock';

export type VerificationMode = 'continuous_gps' | 'entry_exit';

export class NotImplementedError extends Error {}
export class UnknownVerificationModeError extends Error {}

export type CheckInRejectReason =
  'speed_lock' | 'poor_accuracy' | 'not_enough_trace' | 'no_approach_from_outside';

export type CheckInResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: CheckInRejectReason; readonly readyIn_s: number | null };

export interface CheckInParams {
  readonly minContinuousApproach_s: number;
  /** Strict less-than (E6): equal to this value is rejected. */
  readonly maxAccuracy_m: number;
  readonly teleportIntoPolygonAllowed: boolean;
}

export interface CheckInContext {
  readonly approach: ApproachState;
  /** Latest sample that passed only the time gate (tech note 4.2), accurate or not. */
  readonly latest: {
    readonly t_ms: number;
    readonly accuracy_m: number;
    readonly inside: boolean;
  } | null;
  readonly locked: boolean;
  readonly dungeonId: string;
}

/** Decision order of R08: speed lock, then accuracy, then approach length, then origin. */
export function checkInDecision(ctx: CheckInContext, p: CheckInParams): CheckInResult {
  if (ctx.locked) return { ok: false, reason: 'speed_lock', readyIn_s: null };
  const latest = ctx.latest;
  if (latest === null || !(latest.accuracy_m < p.maxAccuracy_m)) {
    return { ok: false, reason: 'poor_accuracy', readyIn_s: null };
  }
  const start = ctx.approach.chainStartAt_ms;
  const isChainTip = ctx.approach.lastAt_ms === latest.t_ms;
  const need_ms = p.minContinuousApproach_s * MS_PER_S;
  if (start === null || !isChainTip || latest.t_ms - start < need_ms) {
    const readyIn_s =
      start !== null && isChainTip ? Math.ceil((need_ms - (latest.t_ms - start)) / MS_PER_S) : null;
    return { ok: false, reason: 'not_enough_trace', readyIn_s };
  }
  const outsideSeen = ctx.approach.outsideSeenAt_ms[ctx.dungeonId];
  if (!p.teleportIntoPolygonAllowed && (!latest.inside || outsideSeen === undefined)) {
    return { ok: false, reason: 'no_approach_from_outside', readyIn_s: null };
  }
  return { ok: true };
}

export interface PresenceStrategy {
  readonly mode: VerificationMode;
  checkIn(ctx: CheckInContext, params: CheckInParams): CheckInResult;
  /** Instant classification for display only (ADR 0003 section 7); the run state machine's
   * confirmed in/out comes from `presenceStep`, not from this method. */
  presence(latest: { readonly inside: boolean } | null): 'inside' | 'outside' | 'unknown';
}

const continuousGps: PresenceStrategy = {
  mode: 'continuous_gps',
  checkIn: checkInDecision,
  presence: (latest) => (latest === null ? 'unknown' : latest.inside ? 'inside' : 'outside'),
};

const NOT_IMPLEMENTED_MESSAGE = 'entry_exit is not implemented in v1 (outdoor only, ADR 0003 7)';
const entryExit: PresenceStrategy = {
  mode: 'entry_exit',
  checkIn: () => {
    throw new NotImplementedError(NOT_IMPLEMENTED_MESSAGE);
  },
  presence: () => {
    throw new NotImplementedError(NOT_IMPLEMENTED_MESSAGE);
  },
};

/** Selects the strategy from a dungeon record's `verification_mode`. Fails closed on anything
 * else (ADR 0003 section 7): an unknown mode must never silently accept a check-in. */
export function selectPresenceStrategy(mode: string): PresenceStrategy {
  if (mode === 'continuous_gps') return continuousGps;
  if (mode === 'entry_exit') return entryExit;
  throw new UnknownVerificationModeError(`unknown verification_mode: ${mode}`);
}

const SINGLE_DUNGEON_ID = 'default';

/** Batch form (design/systems/test-vectors/check-in.json `checkIn`): the continuous_gps decision
 * over one dungeon's samples (`inside` already classified) up to `now_ms`. */
export function checkInBatch(
  samples: readonly DungeonSample[],
  now_ms: number,
  p: CheckInParams & GateFilterParams & SpeedLockParams,
): CheckInResult {
  const seen = samples.filter((s) => s.t_ms <= now_ms);
  let filterState = gateFilterInit<DungeonSample>();
  const kept: boolean[] = seen.map((s) => {
    const r = gateFilterStep(filterState, s, p);
    filterState = r.state;
    return r.verdict.kept;
  });
  const transitions = speedLockBatch(seen, p);
  let approach: ApproachState = APPROACH_INIT;
  seen.forEach((s, i) => {
    const usableAndUnlocked = (kept[i] ?? false) && !lockedAt(s.t_ms, transitions);
    approach = approachStep(
      approach,
      {
        t_ms: s.t_ms,
        usableAndUnlocked,
        outsideDungeonIds: usableAndUnlocked && !s.inside ? [SINGLE_DUNGEON_ID] : [],
      },
      p,
    );
  });
  const latest = seen.at(-1);
  return checkInDecision(
    {
      approach,
      latest: latest === undefined ? null : latest,
      locked: lockedAt(now_ms, transitions),
      dungeonId: SINGLE_DUNGEON_ID,
    },
    p,
  );
}
