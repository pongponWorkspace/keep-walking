/**
 * Maps `SessionEvent` (`@keep-walking/shared/session`) and UI-driven moments to the exact event
 * names and properties `product/telemetry-events.md` section 3 declares (D-088: "ชื่อและ property
 * ต้องตรงทุกตัว"). This is the one mapper `sink.record()` calls go through for F04 (tech note F04
 * section 12.1: "engine ไม่รู้จัก telemetry ... mapper อยู่ใน apps/client/src/telemetry/").
 *
 * Every property here is a bucket/enum, never a raw distance, HP value, or coordinate (C2-3 is a
 * second, independent guard in `telemetry/guard.ts`; this file is the first line of defense by
 * construction — it never reads a `lat`/`lng`/`accuracy` field at all).
 */
import type { PlayerState, SessionEvent } from '@keep-walking/shared/session';
import type { TelemetryProperties, TelemetryPropertyValue } from './guard';

/** Derived structurally from the allowed `session` subpath's `PlayerState`, never imported from
 * the banned `@keep-walking/shared/reward` (ADR 0003 section 3, eslint `no-restricted-imports`).
 * `null` before the player has chosen a class (F06 R29) — every call site below only ever sees a
 * non-null value in practice (a tick/exit cannot happen before `chooseClass`, `no_class` rejects
 * check-in first), but the type stays honest about the player-state shape it is derived from. */
export type PlayerClass = PlayerState['classId'];

export type DurationBucket = '0-5m' | '5-15m' | '15-30m' | '30-60m' | '60m+';

/** Bucket edges are the literal enum boundaries `product/telemetry-events.md` section 3 names
 * (`0-5m`, `5-15m`, ...), not a tunable balance value — named here the same way this workspace
 * names other algorithm constants (e.g. `EPOCH_WEEKDAY_SHIFT`). */
const MS_PER_MIN = 60_000;
const EDGE_5_MIN = 5;
const EDGE_15_MIN = 15;
const EDGE_30_MIN = 30;
const EDGE_60_MIN = 60;
const DURATION_BUCKET_EDGES: readonly (readonly [number, DurationBucket])[] = [
  [EDGE_5_MIN, '0-5m'],
  [EDGE_15_MIN, '5-15m'],
  [EDGE_30_MIN, '15-30m'],
  [EDGE_60_MIN, '30-60m'],
];

/** `dungeon_exited.duration_s_bucket` (product/telemetry-events.md section 3). */
export function durationBucket(duration_ms: number): DurationBucket {
  for (const [edgeMin, label] of DURATION_BUCKET_EDGES) {
    if (duration_ms < edgeMin * MS_PER_MIN) {
      return label;
    }
  }
  return '60m+';
}

/** `onboarding_first_reward_granted.minutes_since_first_open_bucket` (product/telemetry-events.md
 * section 3, tech note F06 10.1): a *different* bucket table from `DurationBucket` above (edges at
 * 10/30/60, not 5/15/30/60) — declared as its own type/edges rather than reused, since the two
 * measure different things (this one, time since the player's first-ever app open, not a run's own
 * duration) and the doc gives each its own literal edges. */
export type MinutesSinceFirstOpenBucket = '0-10' | '10-30' | '30-60' | '60+';

const FIRST_OPEN_EDGE_10_MIN = 10;
const FIRST_OPEN_EDGE_30_MIN = 30;
const FIRST_OPEN_EDGE_60_MIN = 60;
const MINUTES_SINCE_FIRST_OPEN_EDGES: readonly (readonly [number, MinutesSinceFirstOpenBucket])[] =
  [
    [FIRST_OPEN_EDGE_10_MIN, '0-10'],
    [FIRST_OPEN_EDGE_30_MIN, '10-30'],
    [FIRST_OPEN_EDGE_60_MIN, '30-60'],
  ];

export function minutesSinceFirstOpenBucket(elapsed_ms: number): MinutesSinceFirstOpenBucket {
  const elapsedMin = Math.max(0, elapsed_ms) / MS_PER_MIN;
  for (const [edgeMin, label] of MINUTES_SINCE_FIRST_OPEN_EDGES) {
    if (elapsedMin < edgeMin) return label;
  }
  return '60+';
}

export type MinutesSinceRunStartBucket = '0-15' | '15-30' | '30-45' | '45-60' | '60+';

const RUN_START_EDGE_15_MIN = 15;
const RUN_START_EDGE_30_MIN = 30;
const RUN_START_EDGE_45_MIN = 45;
const RUN_START_EDGE_60_MIN = 60;
const MINUTES_SINCE_RUN_START_EDGES: readonly (readonly [number, MinutesSinceRunStartBucket])[] = [
  [RUN_START_EDGE_15_MIN, '0-15'],
  [RUN_START_EDGE_30_MIN, '15-30'],
  [RUN_START_EDGE_45_MIN, '30-45'],
  [RUN_START_EDGE_60_MIN, '45-60'],
];

/** `run_auto_retreat.minutes_since_run_start_bucket` (product/telemetry-events.md section 3):
 * relative time since `RunState.startedAt_ms`, from the event's own `sinceStart_ms` — never joined
 * against wall-clock time. */
export function minutesSinceRunStartBucket(sinceStart_ms: number): MinutesSinceRunStartBucket {
  for (const [edgeMin, label] of MINUTES_SINCE_RUN_START_EDGES) {
    if (sinceStart_ms < edgeMin * MS_PER_MIN) {
      return label;
    }
  }
  return '60+';
}

/** Phase 2 is always solo (D-039/D-089): every party-shaped property is a fixed, documented value
 * rather than a computed one, so nobody ever has to explain "why is this always 1". */
const PARTY_SIZE_BUCKET_SOLO = '1';
const FULL_ROLE_SOLO = false;

export type PageHiddenBucket = '0' | '0-30' | '30-120' | '120-600' | '600+';

/** `dungeon_exited.page_hidden_total_s_bucket` (product/telemetry-events.md section 3, P2-F06-T14):
 * literal enum edges the doc names, not a tunable — `0` is exact (never hidden at all), the rest
 * are `(lo, hi]` half-open the same way `durationBucket`'s edges are read. */
const MS_PER_S = 1000;
const HIDDEN_EDGE_30_S = 30;
const HIDDEN_EDGE_120_S = 120;
const HIDDEN_EDGE_600_S = 600;
export function pageHiddenBucket(hiddenMs: number): PageHiddenBucket {
  if (hiddenMs <= 0) return '0';
  const hiddenS = hiddenMs / MS_PER_S;
  if (hiddenS <= HIDDEN_EDGE_30_S) return '0-30';
  if (hiddenS <= HIDDEN_EDGE_120_S) return '30-120';
  if (hiddenS <= HIDDEN_EDGE_600_S) return '120-600';
  return '600+';
}

export type WakeLockEngagedShareBucket = '0' | '0-25' | '25-75' | '75-100';

/** `dungeon_exited.wake_lock_engaged_share_bucket` (product/telemetry-events.md section 3, Q-T17-3
 * of tech note F06 section 10.2): `null` when the device never had `navigator.wakeLock` at all —
 * `heldMs` is meaningless (always 0) in that case, not "0% engaged" (a device that *could* engage
 * but didn't). `duration_ms <= 0` (a same-instant start/end, defensive only) also reads as `null`
 * rather than dividing by zero. */
const SHARE_PCT_MULTIPLIER = 100;
const SHARE_EDGE_25_PCT = 25;
const SHARE_EDGE_75_PCT = 75;
export function wakeLockEngagedShareBucket(
  heldMs: number,
  duration_ms: number,
  supported: boolean,
): WakeLockEngagedShareBucket | null {
  if (!supported || duration_ms <= 0) return null;
  const sharePct = (heldMs / duration_ms) * SHARE_PCT_MULTIPLIER;
  if (sharePct <= 0) return '0';
  if (sharePct <= SHARE_EDGE_25_PCT) return '0-25';
  if (sharePct <= SHARE_EDGE_75_PCT) return '25-75';
  return '75-100';
}

/** `getRunClientStats()`'s own return shape (`session/engine.ts` -> `apps/client/src/f04-app.ts`'s
 * `WakeLockController.snapshot()`), read only for the `dungeon_exited` mapping below. */
export interface RunClientStats {
  readonly pageHiddenMs: number;
  readonly wakeLockHeldMs: number;
  readonly wakeLockSupported: boolean;
}

export interface MappedTelemetryEvent {
  readonly name: string;
  readonly properties: TelemetryProperties;
}

/** `dungeon_confirm_shown` (product/telemetry-events.md section 3): fired by the confirm-popup UI
 * itself, not derived from a `SessionEvent` (the popup can open before any engine decision runs). */
export function dungeonConfirmShownEvent(
  dungeonId: string,
  overlap: boolean,
): MappedTelemetryEvent {
  return {
    name: 'dungeon_confirm_shown',
    properties: {
      dungeon_id: dungeonId,
      roles_present: '[]',
      overlap,
      vs_boss_choice_available: false,
    },
  };
}

/** `navigation_link_opened` (F04-R37). Fired by the nav-link UI, not a `SessionEvent`. */
export function navigationLinkOpenedEvent(
  dungeonId: string,
  target: 'google_maps' | 'apple_maps' | 'copy_fallback',
  fallbackAuto: boolean,
): MappedTelemetryEvent {
  return {
    name: 'navigation_link_opened',
    properties: { dungeon_id: dungeonId, target, fallback_auto: fallbackAuto },
  };
}

/** `anticheat_speed_lock_triggered` (F04-R20..R24). Fired by the speed-lock UI/state watcher. */
export function speedLockTriggeredEvent(
  phase: 'enter' | 'exit',
  inRun: boolean,
  dungeonId: string | null,
): MappedTelemetryEvent {
  return {
    name: 'anticheat_speed_lock_triggered',
    properties: { phase, in_run: inRun, dungeon_id: dungeonId },
  };
}

/** `session_state_discarded` (tech note F04 section 10.2). */
export function sessionStateDiscardedEvent(
  reason: 'corrupt' | 'schema_mismatch' | 'unknown_dungeon',
): MappedTelemetryEvent {
  return { name: 'session_state_discarded', properties: { reason } };
}

/** `storage_quota_exceeded` (tech note F04 section 10.4). */
export function storageQuotaExceededEvent(
  evicted: 'telemetry_half' | 'telemetry_all' | 'none',
): MappedTelemetryEvent {
  return { name: 'storage_quota_exceeded', properties: { evicted } };
}

/**
 * `onboarding_first_reward_granted` (product/telemetry-events.md section 3, tech note F06 10.1
 * F06-TG-02): fired *alongside* `run_tick_granted` — never instead of it — whenever that event's
 * own `firstEver` is `true`. `session/engine.ts#persistAndMap` is the one call site: it maps the
 * `run_tick_granted` `SessionEvent` through `mapSessionEvent` as always, then calls this function
 * separately (same `at_ms`, so both records land at the identical timestamp in the ring buffer) —
 * this is a second, independent mapping, not a change to `mapSessionEvent`'s own one-event-in/
 * one-record-out contract, since one `SessionEvent` legitimately produces *two* telemetry records
 * only in this one case (the doc's own wording: "ธงที่เป็นครั้งแรกในชีวิต ไม่ใช่ tick แยกต่างหาก").
 *
 * `elapsedSinceFirstOpen_ms` is `at_ms - firstOpenAt_ms` (`kw.p2.onboarding.firstOpenAt_ms`,
 * `onboarding/onboarding-step.ts`'s own `OnboardingStorage`) — never exported as a real timestamp,
 * only ever reduced to the bucket enum below (C2-4).
 */
export function onboardingFirstRewardGrantedEvent(
  dungeonId: string,
  elapsedSinceFirstOpen_ms: number,
  playerClass: PlayerClass,
): MappedTelemetryEvent {
  return {
    name: 'onboarding_first_reward_granted',
    properties: {
      dungeon_id: dungeonId,
      minutes_since_first_open_bucket: minutesSinceFirstOpenBucket(elapsedSinceFirstOpen_ms),
      class: playerClass,
    },
  };
}

/** `dungeon_closing_soon_notified` (F04-R29). */
export function dungeonClosingSoonNotifiedEvent(dungeonId: string): MappedTelemetryEvent {
  return { name: 'dungeon_closing_soon_notified', properties: { dungeon_id: dungeonId } };
}

/**
 * One `SessionEvent` -> zero or one telemetry record, including the HP engine's own events
 * (P2-F06-T06, `docs/tech/F06-hp-damage-onboarding.md` 12.3): `run_hp_low`/`run_auto_retreat`/
 * `run_death` carry their own `classId` (used directly, not `playerClass`, since they can fire on
 * the same step a `run_death`/`run_auto_retreat` ends the run and `state.player.classId` never
 * changes mid-session anyway — same value either way). `playerClass` (the F04 events' own source)
 * is read once per step from `SessionState.player` (never from the event itself, which has no
 * class field for the older F04 events).
 */
export function mapSessionEvent(
  event: SessionEvent,
  playerClass: PlayerClass,
  /** `state.run?.dungeonId` at the time of this event — `run_state_changed` carries no
   * `dungeonId` of its own (SessionEvent shape, tech note F04 section 2.5); the caller (the only
   * place that has both the event and the surrounding `SessionState`) supplies it. */
  currentRunDungeonId?: string,
  /** Only read for `dungeon_exited` (P2-F06-T14, tech note F06 10.2 Q-T17-3): the caller
   * (`session/engine.ts#persistAndMap`) fetches this fresh, synchronously, in the same turn as the
   * dispatch that produced the event — a live `WakeLockController.snapshot()`/page-hidden read at
   * exactly the run's end, not a value carried on the `SessionEvent` itself (the engine has no idea
   * Wake Lock exists, ADR 0003 C1-1). `undefined` for every other event type and every existing
   * call site that has not wired a stats source yet — never a required parameter, so no other
   * caller has to change. */
  runClientStats?: RunClientStats,
): MappedTelemetryEvent | undefined {
  switch (event.type) {
    case 'checkin_rejected':
      return {
        name: 'checkin_rejected',
        properties: { dungeon_id: event.dungeonId, reason: event.reason },
      };
    case 'dungeon_entered':
      return {
        name: 'dungeon_entered',
        properties: {
          dungeon_id: event.dungeonId,
          entry_type: 'normal',
          party_size_at_entry_bucket: PARTY_SIZE_BUCKET_SOLO,
        },
      };
    case 'run_state_changed':
      return {
        name: 'run_state_changed',
        properties: {
          dungeon_id: currentRunDungeonId ?? null,
          from: event.from,
          to: event.to,
          cause: event.cause,
        },
      };
    case 'run_tick_granted':
      return {
        name: 'run_tick_granted',
        properties: {
          dungeon_id: event.dungeonId,
          party_size_bucket: PARTY_SIZE_BUCKET_SOLO,
          full_role: FULL_ROLE_SOLO,
          roles_present: `["${playerClass}"]`,
          partial: event.partial,
          class: playerClass,
        },
      };
    case 'run_tick_denied':
      return {
        name: 'run_tick_denied',
        properties: { dungeon_id: event.dungeonId, class: playerClass, partial: event.partial },
      };
    case 'dungeon_exited': {
      const duration_ms = event.summary.endedAt_ms - event.summary.startedAt_ms;
      const partialTickApplied = event.summary.partialTick?.granted === true;
      const properties: Record<string, TelemetryPropertyValue> = {
        dungeon_id: event.dungeonId,
        exit_reason: event.exitReason,
        duration_s_bucket: durationBucket(duration_ms),
        ticks_granted_count: event.summary.ticksGranted,
        partial_tick_applied: partialTickApplied,
        class: playerClass,
        // P2-F06-T14 (product/telemetry-events.md section 3): `undefined` `runClientStats` (no
        // Wake Lock wiring reached this call site yet, or a unit test with no stats source) reads
        // the same as "unsupported" — `null` for the share, `'0'` for hidden time (nothing to
        // report, not a lie: zero hidden time really is what an unwired caller observed).
        page_hidden_total_s_bucket: pageHiddenBucket(runClientStats?.pageHiddenMs ?? 0),
        wake_lock_engaged_share_bucket: wakeLockEngagedShareBucket(
          runClientStats?.wakeLockHeldMs ?? 0,
          duration_ms,
          runClientStats?.wakeLockSupported ?? false,
        ),
      };
      return { name: 'dungeon_exited', properties };
    }
    case 'dungeon_closing_soon':
      return dungeonClosingSoonNotifiedEvent(event.dungeonId);
    case 'run_hp_low':
      return {
        name: 'run_hp_low',
        properties: { dungeon_id: event.dungeonId, class: event.classId },
      };
    case 'run_auto_retreat':
      return {
        name: 'run_auto_retreat',
        properties: {
          dungeon_id: event.dungeonId,
          class: event.classId,
          minutes_since_run_start_bucket: minutesSinceRunStartBucket(event.sinceStart_ms),
        },
      };
    case 'run_death':
      return {
        name: 'run_death',
        properties: { dungeon_id: event.dungeonId, class: event.classId },
      };
    case 'run_potion_auto_used':
      return {
        name: 'run_potion_auto_used',
        properties: { dungeon_id: event.dungeonId, item_id: event.itemId },
      };
    case 'auto_retreat_setting_changed':
      return {
        name: 'auto_retreat_setting_changed',
        properties: { enabled: event.enabled },
      };
    // `potion_used` (F06 tech note 6.3, P2-H24): fires outside any run (Recovering/home use of a
    // potion from the inventory), so it maps to `inventory_potion_used` — never `dungeon_id`,
    // never merged with `run_potion_auto_used` (product/telemetry-events.md section 3, "ห้ามรวม
    // สอง event นี้เป็นตัวเดียวกัน").
    case 'potion_used':
      return {
        name: 'inventory_potion_used',
        properties: { item_id: event.itemId, revived: event.revived },
      };
    // `sample_rejected`, `run_hit` (per-attempt, no telemetry event of its own — `run_hp_low`/
    // `run_auto_retreat`/`run_death` already cover the thresholds that matter), `class_chosen`/
    // `class_choice_rejected` (no telemetry event declared for these in
    // product/telemetry-events.md), `potion_use_rejected` (same — only the successful `potion_used`
    // is a declared event) and `player_recovered` (no telemetry event; Recovering's own UI is
    // display-only) never map to a telemetry record.
    case 'sample_rejected':
    case 'run_hit':
    case 'class_chosen':
    case 'class_choice_rejected':
    case 'potion_use_rejected':
    case 'player_recovered':
      return undefined;
  }
}
