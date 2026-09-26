// SessionState / SessionInput / SessionEvent shapes (tech note F04 section 2). Field names inside
// each interface are this task's choice; the shapes and meanings are the contract every other
// Phase 2 task (client plumbing, HP engine, QA) builds against.
import type { Polygon, MultiPolygon } from 'geojson';
import type { ApproachState, PresenceTrackerState, SpeedLockState } from '../run';
import type { GateAccumulatorState, LootParams, PlayerClass, SoloTickExpParams } from '../reward';

/** Fail-closed configuration guard (tech note F04 5.4): Phase 2 has no spec for any of these being
 * `true`, so `sessionStep` refuses to run rather than guess. */
export class UnsupportedConfigError extends Error {}
/** A caller (client, test) sent a structurally invalid input — a bug in the caller, not a game
 * situation (tech note F04 2.4). */
export class InvalidSessionInputError extends Error {}

export interface SessionDungeonRecord {
  readonly id: string;
  readonly verification_mode: string;
  readonly floor_level: number | null;
  readonly level_range: { readonly min: number; readonly max: number };
  readonly drop_table_id: string;
  readonly geometry: Polygon | MultiPolygon;
  readonly area_m2: number;
}

export interface SessionConfig {
  readonly movementGate: {
    readonly window_s: number;
    readonly minDistancePerWindow_m: number;
    readonly comparison: string;
    readonly sampleCadence_s: number;
    readonly maxSamplePairGap_s: number;
    readonly maxSampleAccuracy_m: number;
    readonly outlierSpeed_kmh: number;
    readonly outlierReanchorSamples: number;
  };
  readonly rewardTick: {
    readonly rewardTickInterval_s: number;
    readonly partialTickMinElapsed_s: number;
  };
  readonly runState: {
    readonly edgeHysteresisSamples: number;
    readonly edgeHysteresis_m: number;
    readonly clockSkewTolerance_s: number;
    readonly graceMax_s: number;
    readonly suspendedMax_s: number;
    readonly suspendedTimeCounts: boolean;
    readonly rewardTickDuringGrace: boolean;
    readonly rewardTickDuringSuspended: boolean;
  };
  readonly checkIn: {
    readonly minContinuousApproach_s: number;
    readonly maxAccuracy_m: number;
    readonly teleportIntoPolygonAllowed: boolean;
  };
  readonly speedLock: {
    readonly speedLock_kmh: number;
    readonly lockSustained_s: number;
    readonly unlockSustained_s: number;
  };
  readonly drops: {
    readonly smallDungeonMaxArea_m2: number;
    readonly dropTables: Readonly<Record<string, unknown>>;
    readonly items: Readonly<Record<string, unknown>>;
    readonly lootParams: LootParams;
  };
  readonly exp: SoloTickExpParams;
  readonly hpSafety: { readonly autoRetreatKeepsRunLoot: boolean };
  readonly death: { readonly loseAllRunLoot: boolean };
}

export interface SessionParams {
  readonly config: SessionConfig;
  readonly dungeons: Readonly<Record<string, SessionDungeonRecord>>;
}

export interface PlayerState {
  readonly level: number;
  readonly exp: number;
  readonly playerClass: PlayerClass;
  readonly autoRetreatEnabled: boolean;
  /** Persistent inventory (outside any run's bag), item id -> qty. */
  readonly inventory: Readonly<Record<string, number>>;
}

export function createPlayer(playerClass: PlayerClass = 'ranged'): PlayerState {
  return { level: 1, exp: 0, playerClass, autoRetreatEnabled: true, inventory: {} };
}

export type RunHpState = Record<string, never>; // Reserved for the HP engine, P2-F06-T06.

export interface RunBag {
  readonly items: Readonly<Record<string, number>>;
}
export const EMPTY_BAG: RunBag = { items: {} };

export function bagAdd(bag: RunBag, id: string, qty: number): RunBag {
  if (qty <= 0) return bag;
  return { items: { ...bag.items, [id]: (bag.items[id] ?? 0) + qty } };
}

/** tau(t) = closedSum_ms + (running ? t - runningSince_ms : 0) (tech note F05 section 2). */
export interface ActiveClock {
  readonly closedSum_ms: number;
  readonly runningSince_ms: number | null;
}
export function tauOf(clock: ActiveClock, t_ms: number): number {
  return clock.closedSum_ms + (clock.runningSince_ms === null ? 0 : t_ms - clock.runningSince_ms);
}
export function clockStop(clock: ActiveClock, at_ms: number): ActiveClock {
  if (clock.runningSince_ms === null) return clock;
  return {
    closedSum_ms: clock.closedSum_ms + (at_ms - clock.runningSince_ms),
    runningSince_ms: null,
  };
}
export function clockStart(clock: ActiveClock, at_ms: number): ActiveClock {
  if (clock.runningSince_ms !== null) return clock;
  return { closedSum_ms: clock.closedSum_ms, runningSince_ms: at_ms };
}

export type RunStatus = 'active' | 'grace' | 'suspended';

export interface RunState {
  readonly runId: string;
  readonly dungeonId: string;
  readonly runSeed: number;
  readonly startedAt_ms: number;
  readonly status: RunStatus;
  readonly exitStartedAt_ms: number | null;
  /** Why the run is currently outside Active, `null` while Active (tech note F04 5.3): a
   * `no_evidence` exit never geometrically left, so it returns on the next usable sample inside
   * the polygon without waiting for a hysteresis-confirmed transition (there is nothing to
   * confirm — the presence tracker's confirmed side never changed). */
  readonly exitCause: 'left_polygon' | 'no_evidence' | null;
  readonly clock: ActiveClock;
  readonly reward: GateAccumulatorState;
  readonly rewardScratch: GateAccumulatorState | null;
  readonly grantedCount: number;
  readonly bag: RunBag;
  readonly hp: RunHpState;
  /** Presence tracker (run/hysteresis PresenceTrackerState), lazily typed to avoid an import cycle. */
  readonly presence: PresenceTrackerState;
}

export interface RunSummary {
  readonly dungeonId: string;
  readonly exitReason:
    | 'manual_exit'
    | 'timeout'
    | 'auto_retreat'
    | 'death'
    | 'dungeon_closed'
    | 'emergency_close'
    | 'clock_invalid';
  readonly startedAt_ms: number;
  readonly endedAt_ms: number;
  readonly ticksEvaluated: number;
  readonly ticksGranted: number;
  readonly partialTick: { readonly f: number; readonly granted: boolean } | null;
  readonly loot: readonly { readonly id: string; readonly qty: number }[];
  readonly expGained: number;
  readonly levelsGained: number;
}

export interface SessionState {
  readonly schemaVersion: 1;
  readonly clock: {
    readonly lastNow_ms: number | null;
    readonly lastSample_ms: number | null;
    readonly settled_ms: number | null;
  };
  readonly pre: ApproachState;
  readonly lock: SpeedLockState;
  readonly run: RunState | null;
  readonly player: PlayerState;
  readonly lastSummary: RunSummary | null;
  /** Latest sample that passed only the time gate (tech note F04 7.1 `CheckInContext.latest`),
   * accurate or not; not persisted (same privacy class as `pre`, tech note F04 7.2). */
  readonly latestSample: RawSample | null;
}

export interface RawSample {
  readonly t_ms: number;
  readonly lat: number;
  readonly lng: number;
  readonly accuracy_m: number;
}

export type SessionInput =
  | { readonly type: 'sample'; readonly sample: RawSample }
  | { readonly type: 'tick' }
  | { readonly type: 'confirm'; readonly dungeonId: string; readonly runSeed: number }
  | { readonly type: 'exit' }
  | { readonly type: 'setAutoRetreat'; readonly enabled: boolean }
  | { readonly type: 'ackSummary' }
  | { readonly type: 'emergencyClose' };

export type CheckInRejectReason =
  | 'speed_lock'
  | 'poor_accuracy'
  | 'not_enough_trace'
  | 'no_approach_from_outside'
  | 'dungeon_closed'
  | 'run_active'
  | 'unsupported_mode';

export type SessionEvent =
  | {
      readonly type: 'checkin_rejected';
      readonly dungeonId: string;
      readonly reason: CheckInRejectReason;
      readonly at_ms: number;
    }
  | {
      readonly type: 'dungeon_entered';
      readonly dungeonId: string;
      readonly runId: string;
      readonly at_ms: number;
    }
  | {
      readonly type: 'run_state_changed';
      readonly from: RunStatus | 'active';
      readonly to: RunStatus;
      readonly cause: 'left_polygon' | 'no_evidence' | 'returned' | 'grace_expired';
      readonly at_ms: number;
    }
  | {
      readonly type: 'run_tick_granted';
      readonly dungeonId: string;
      readonly tickIndex: number;
      readonly loot: readonly { readonly id: string; readonly qty: number }[];
      readonly expGained: number;
      readonly partial: boolean;
      readonly at_ms: number;
    }
  | {
      readonly type: 'run_tick_denied';
      readonly dungeonId: string;
      readonly tickIndex: number;
      readonly partial: boolean;
      readonly at_ms: number;
    }
  | {
      readonly type: 'dungeon_exited';
      readonly dungeonId: string;
      readonly runId: string;
      readonly exitReason: RunSummary['exitReason'];
      readonly summary: RunSummary;
      readonly at_ms: number;
    }
  | {
      readonly type: 'sample_rejected';
      readonly reason: 'future' | 'non_monotonic' | 'late' | 'invalid';
      readonly at_ms: number;
    };
