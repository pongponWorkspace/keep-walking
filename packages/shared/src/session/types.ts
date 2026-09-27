// SessionState / SessionInput / SessionEvent shapes (tech note F04 section 2). Field names inside
// each interface are this task's choice; the shapes and meanings are the contract every other
// Phase 2 task (client plumbing, HP engine, QA) builds against.
import type { Polygon, MultiPolygon } from 'geojson';
import type { ApproachState, OpeningHours, PresenceTrackerState, SpeedLockState } from '../run';
import type {
  ClosedGateWindow,
  GateAccumulatorState,
  LootParams,
  PlayerClass,
  SoloTickExpParams,
} from '../reward';
import type {
  HpConfigInput,
  HpRoleParams,
  PlayerHpState,
  PotionRejectReason,
  RunHpState,
} from '../hp';

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
  /** Normalized opening hours (tech note F04 section 8, artifact `data/dungeons/artifact`). */
  readonly opening_hours: OpeningHours;
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
  readonly hpSafety: {
    readonly autoRetreatKeepsRunLoot: boolean;
    readonly autoRetreatEnabledByDefault: boolean;
    readonly autoRetreatThreshold_pct: number;
    readonly lowHpWarningThreshold_pct: number;
  };
  readonly death: { readonly loseAllRunLoot: boolean };
  /** balance.dungeons.exit (tech note F06 section 6.1); HP regen starts the instant a run ends,
   * every exit reason (R03). */
  readonly exit: { readonly regenStartsOnExit: boolean };
  /** balance.dungeons.openingHours (tech note F04 section 8). */
  readonly openingHours: { readonly utcOffset_min: number; readonly closingSoonNotice_s: number };
  /** D-112 fail-closed guard (balance-model 18.6, extended by F06 3.7/3.4): the engine refuses to
   * run rather than compute Z, damage or the hit clock with a rule it does not implement. */
  readonly combat: {
    readonly monsterAttack: {
      readonly zoneLevelFrom: string;
      readonly monsterAtkCoef: number;
      readonly monsterAtkExponent: number;
    };
    readonly defense: { readonly defSoftcap: number };
    readonly attackCheck: {
      readonly intervalMin_s: number;
      readonly intervalMax_s: number;
      readonly intervalDistribution: string;
      readonly hitChancePerCheck_pct: number;
    };
    readonly levelGapDamage: {
      readonly damageMultPerLevelBelowRange: number;
      readonly mode: string;
      readonly maxMult: number | null;
    };
    readonly raidFailPenalty: { readonly monsterAtkMultAfterFailedRaid: number };
  };
  readonly classes: {
    readonly buffStacking: { readonly pPerMemberBase: number; readonly pLevelDivisor: number };
    readonly roles: {
      readonly tanker: HpRoleParams & { readonly missingDebuffMult: number };
      readonly support: HpRoleParams & { readonly inDungeonHealBase_pctMaxHpPerMin: number };
      readonly magic: HpRoleParams & { readonly shieldPerRewardTick_pctMaxHpPerBuffPct: number };
    };
  };
  readonly economy: {
    readonly potions: Readonly<
      Record<string, { readonly heal_pctMaxHp?: number; readonly reviveToHp_pct?: number }>
    >;
    readonly autoPotion: {
      readonly enabledByDefault: boolean;
      readonly defaultThreshold_pct: number;
      readonly defaultPotionOrder: readonly string[];
      readonly sourceOrder: readonly string[];
    };
  };
  readonly progression: {
    readonly baseStats: { readonly hp: number; readonly def: number; readonly vit: number };
    readonly statPerPoint: {
      readonly hp: number;
      readonly def: number;
      readonly vitHpRegenSpeed_pct: number;
      readonly vitPotionEfficiency_pct: number;
    };
    readonly statPoints: { readonly pointsPerLevel: number; readonly pointsFormula: string };
    readonly hpRecovery: {
      readonly deathRecoveryTo_pct: number;
      readonly deathRecoveryDuration_s: number;
      readonly outsideDungeonRegen_pctMaxHpPerMin: number;
    };
  };
}

/** Adapts `SessionConfig`'s own (flat, F04/F05-established) field names into `hp`'s
 * `HpConfigInput` shape (tech note F06 3.7): the same pattern `gateParamsOf` (reducer.ts) already
 * uses for `reward`'s `GateParams`. Exported so `session`'s own tests can build one `HpParams`
 * once instead of repeating this mapping. */
export function hpConfigInputOf(cfg: SessionConfig): HpConfigInput {
  return {
    combat: cfg.combat,
    classes: cfg.classes,
    economy: cfg.economy,
    progression: cfg.progression,
    dungeons: {
      hpSafety: {
        autoRetreatEnabledByDefault: cfg.hpSafety.autoRetreatEnabledByDefault,
        autoRetreatThreshold_pct: cfg.hpSafety.autoRetreatThreshold_pct,
        lowHpWarningThreshold_pct: cfg.hpSafety.lowHpWarningThreshold_pct,
      },
      exit: cfg.exit,
    },
  };
}

export interface SessionParams {
  readonly config: SessionConfig;
  readonly dungeons: Readonly<Record<string, SessionDungeonRecord>>;
}

/** Phase 2 never allocates a stat point (R34): the literal-zero type below makes any code path
 * that tries typecheck-fail, the same trick `allocated.atk` already used before this task. F10
 * (Phase 4) widens every field to `number` and adds a `schemaVersion` bump when it lands. */
export interface AllocatedStats {
  readonly atk: 0;
  readonly def: 0;
  readonly hp: 0;
  readonly vit: 0;
}
export const ZERO_ALLOCATED: AllocatedStats = { atk: 0, def: 0, hp: 0, vit: 0 };

export interface PlayerState {
  /** `null` = not chosen yet (R29); chosen once, never changed in Phase 2 (R30). */
  readonly classId: PlayerClass | null;
  readonly level: number;
  /** Exp into the current level, unrounded (balance-model 17.1, D-110). */
  readonly exp: number;
  readonly allocated: AllocatedStats;
  /** HP outside any run (tech note F06 section 6); during a run the real number lives in
   * `RunState.hp.hp` instead (R02, R03). */
  readonly hp: PlayerHpState;
  readonly autoRetreatEnabled: boolean;
  /** Persistent inventory (outside any run's bag), item id -> qty > 0 (no zero-count keys). */
  readonly inventory: Readonly<Record<string, number>>;
  /** `dungeon_entered` the first time ever, for onboarding step `first_run_entered` (R36). */
  readonly firstRunEnteredAt_ms: number | null;
  /** Reward ticks granted across every run this player has ever had (R39): the "first reward"
   * onboarding flag is `lifetimeTicksGranted > 0`, read-only outside `session` (R39 tech gate). */
  readonly lifetimeTicksGranted: number;
}

/** A fresh player (tech note F06 2.1): full HP, no class, empty inventory, auto-retreat at the
 * config default (R19, R22). `startLevel` and `baseStats.hp` come from config, never hardcoded
 * (CLAUDE.md non-negotiable 3). */
export function createPlayer(now_ms: number, cfg: SessionConfig): PlayerState {
  return {
    classId: null,
    level: cfg.exp.exp.startLevel,
    exp: 0,
    allocated: ZERO_ALLOCATED,
    hp: { value: cfg.progression.baseStats.hp, anchorAt_ms: now_ms, recovering: false },
    autoRetreatEnabled: cfg.hpSafety.autoRetreatEnabledByDefault,
    inventory: {},
    firstRunEnteredAt_ms: null,
    lifetimeTicksGranted: 0,
  };
}

export interface RunBag {
  readonly items: Readonly<Record<string, number>>;
}
export const EMPTY_BAG: RunBag = { items: {} };

export function bagAdd(bag: RunBag, id: string, qty: number): RunBag {
  if (qty <= 0) return bag;
  return { items: { ...bag.items, [id]: (bag.items[id] ?? 0) + qty } };
}

/** Debits one auto-drunk potion from the run bag (tech note F06 3.5): the counterpart of `bagAdd`
 * that removes rather than adds, dropping the key once it reaches 0 (no zero-count keys, same
 * convention as `player.inventory`). */
export function bagRemoveOne(bag: RunBag, id: string): RunBag {
  const left = (bag.items[id] ?? 0) - 1;
  if (left > 0) return { items: { ...bag.items, [id]: left } };
  return {
    items: Object.fromEntries(Object.entries(bag.items).filter(([itemId]) => itemId !== id)),
  };
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
  /** F05 3.5 scratch accumulator: only non-null while a confirmed return (from Grace/Suspended) or
   * a confirmed unlock is pending, replaying distance from the pending set's first sample so it
   * counts once the transition backdates (tech note F04 5.2, F05 3.5). */
  readonly rewardScratch: GateAccumulatorState | null;
  /** Windows `rewardScratch` closed while pending, not yet granted (F05 3.5): applied at
   * `main := scratch` promotion so a set that never confirms never grants anything. */
  readonly scratchClosed: readonly ClosedGateWindow[];
  readonly grantedCount: number;
  readonly bag: RunBag;
  readonly hp: RunHpState;
  /** Presence tracker (run/hysteresis PresenceTrackerState), lazily typed to avoid an import cycle. */
  readonly presence: PresenceTrackerState;
  /** End of the opening-hours interval that covered `startedAt_ms` (tech note F04 8.3), or `null`
   * when open without end within the search horizon. */
  readonly closesAt_ms: number | null;
  readonly notices: { readonly closingSoonSent: boolean };
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
  /** F06 2.4: HP the run ended at (not rounded), and the stats needed to read it (no coordinates
   * in any of these fields, C2-4). */
  readonly hpAtEnd: number;
  readonly maxHp: number;
  readonly hitsLanded: number;
  readonly potionsUsed: { readonly runBag: number; readonly inventory: number };
  readonly lowHpWarnings: number;
  /** Items lost on `death` (`dungeons.death.loseAllRunLoot`); empty for every other exit reason
   * (R23, drives the summary screen's "items lost" line). */
  readonly lost: readonly { readonly id: string; readonly qty: number }[];
  readonly classId: PlayerClass | null;
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
  | { readonly type: 'emergencyClose' }
  | { readonly type: 'chooseClass'; readonly classId: PlayerClass }
  | { readonly type: 'usePotion'; readonly itemId: string };

export type CheckInRejectReason =
  | 'speed_lock'
  | 'poor_accuracy'
  | 'not_enough_trace'
  | 'no_approach_from_outside'
  | 'dungeon_closed'
  | 'run_active'
  | 'unsupported_mode'
  /** F06 6.3: `player.classId === null` (fail-closed only — the sheet picks a class before the
   * map, so this should never fire in the normal flow). */
  | 'no_class'
  /** F06 6.3: `hpAt(player.hp, now_ms) <= 0`, the one instant a fresh death has not yet started
   * Recovering (regen begins immediately, R05). */
  | 'no_hp';

export type ClassChooseRejectReason = 'already_chosen' | 'run_active' | 'unknown_class';

export type UsePotionRejectReason = 'run_active' | PotionRejectReason;

export type SessionEvent =
  | {
      readonly type: 'checkin_rejected';
      readonly dungeonId: string;
      readonly reason: CheckInRejectReason;
      /** Seconds left until `not_enough_trace` clears (`CheckInResult.readyIn_s`); `null` for
       * every other reason, and for `not_enough_trace` itself when the approach chain has not
       * even started yet (same value `selectCheckInPreview` would return at this instant). */
      readonly readyIn_s: number | null;
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
      readonly levelBefore: number;
      readonly levelAfter: number;
      /** `lifetimeTicksGranted` was 0 before this tick (tech note F06 4.1, R39): the onboarding
       * "first reward" flag, for the client's effect/copy choice only — never a different reward. */
      readonly firstEver: boolean;
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
      readonly type: 'dungeon_closing_soon';
      readonly dungeonId: string;
      readonly closesIn_s: number;
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
    }
  | {
      readonly type: 'run_hit';
      readonly dungeonId: string;
      readonly attemptIndex: number;
      readonly damage: number;
      readonly shieldAbsorbed: number;
      readonly hpAfterHit: number;
      readonly hpAfter: number;
      readonly maxHp: number;
      readonly outcome: 'continue' | 'autoRetreat' | 'died';
      readonly at_ms: number;
    }
  | {
      readonly type: 'run_potion_auto_used';
      readonly dungeonId: string;
      readonly itemId: string;
      readonly source: 'runBag' | 'inventory';
      readonly healed: number;
      readonly at_ms: number;
    }
  | {
      readonly type: 'run_hp_low';
      readonly dungeonId: string;
      readonly classId: PlayerClass | null;
      readonly at_ms: number;
    }
  | {
      readonly type: 'run_auto_retreat';
      readonly dungeonId: string;
      readonly classId: PlayerClass | null;
      readonly sinceStart_ms: number;
      readonly activeTau_ms: number;
      readonly at_ms: number;
    }
  | {
      readonly type: 'run_death';
      readonly dungeonId: string;
      readonly classId: PlayerClass | null;
      readonly lost: readonly { readonly id: string; readonly qty: number }[];
      readonly at_ms: number;
    }
  | { readonly type: 'class_chosen'; readonly classId: PlayerClass; readonly at_ms: number }
  | {
      readonly type: 'class_choice_rejected';
      readonly reason: ClassChooseRejectReason;
      readonly at_ms: number;
    }
  | {
      readonly type: 'auto_retreat_setting_changed';
      readonly enabled: boolean;
      readonly at_ms: number;
    }
  | {
      readonly type: 'potion_used';
      readonly itemId: string;
      readonly healed: number;
      readonly revived: boolean;
      readonly at_ms: number;
    }
  | {
      readonly type: 'potion_use_rejected';
      readonly itemId: string;
      readonly reason: UsePotionRejectReason;
      readonly at_ms: number;
    }
  | { readonly type: 'player_recovered'; readonly at_ms: number };

/** Storage-adapter envelope (tech note F04 10.1): `JSON.stringify` of this is the whole value of
 * the `kw.p2.session` key. `toPersisted` / `fromPersisted` (P2-X10) live in `./persistence`. */
export interface PersistedSession {
  readonly schemaVersion: 1;
  readonly savedAt_ms: number;
  readonly state: SessionState;
}

/** Why `fromPersisted` discarded a stored value and started a fresh session (tech note F04 10.2). */
export type FromPersistedRejectReason = 'schema_mismatch' | 'corrupt' | 'unknown_dungeon';
