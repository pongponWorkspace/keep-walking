// sessionStep (tech note F04 section 2, section 9): the one reducer the client calls, composing
// run (presence/hysteresis/speed lock/check-in, all P2-F04-T20) -> gate (movement window, P2-
// F05-T08 `src/reward`) -> tick -> drop, in that order, per sample or per tick.
//
// Known simplifications of this pass (P2-X10 closed most of the P2-F05-T08 list; see report to
// orchestrator for what is left):
// - Presence hysteresis reuses the reward gate's own accuracy check for "usable" (not a fully
//   separate step-1 outlier filter); the outlier *speed* re-anchor rule is not applied to presence.
// - The settled horizon `H` (tech note F04 4.3) is approximated by `now_ms` itself: this session
//   does not yet hold a timer's result open while a pending set could still back-date across it.
//   In practice this only matters within one hysteresis/lock confirmation window of an edge.
// - Hit/damage/auto-retreat/death (F06) are out of scope (P2-F06-T06); `run.hp` is a placeholder.
import { boundaryDistance_m, pointInPolygon, MS_PER_S } from '@keep-walking/geo';
import {
  APPROACH_INIT,
  approachStep,
  clockCheck,
  closingSoonAt,
  isOpenAt,
  openingChangeAfter,
  presencePendingSince,
  presenceStep,
  presenceTrackerInit,
  runTimers,
  sampleTimeGate,
  selectPresenceStrategy,
  speedLockInit,
  speedLockStep,
  NotImplementedError,
  UnknownVerificationModeError,
} from '../run';
import type { CheckInContext } from '../run';
import { assertZoneLevelRule } from '../formulas';
import type { DropContext } from '../formulas';
import {
  gateAccumulatorCloseThrough,
  gateAccumulatorInit,
  gateAccumulatorStep,
  lootTable,
  parseDropTable,
  partialTick,
  rollTickLoot,
  soloTickExp,
  addExp,
} from '../reward';
import type { GateParams } from '../reward';
import {
  EMPTY_BAG,
  UnsupportedConfigError,
  InvalidSessionInputError,
  bagAdd,
  clockStart,
  clockStop,
  createPlayer,
  tauOf,
} from './types';
import type {
  CheckInRejectReason,
  PlayerState,
  RunState,
  RunStatus,
  RunSummary,
  SessionConfig,
  SessionEvent,
  SessionInput,
  SessionParams,
  SessionState,
} from './types';

export function createSession(now_ms: number, player: PlayerState = createPlayer()): SessionState {
  return {
    schemaVersion: 1,
    clock: { lastNow_ms: now_ms, lastSample_ms: null, settled_ms: null },
    pre: APPROACH_INIT,
    lock: speedLockInit(),
    run: null,
    player,
    lastSummary: null,
    latestSample: null,
  };
}

/** Consent withdrawal (tech note F06 8.4 step 4, P2-X16/J-P2-T30-1): purges every coordinate-
 * bearing field left at the session level once `state.run === null` (the client dispatches `exit`
 * first, in the same task, which already purges the run's own fields via `endRun`'s F05 R21
 * payout path). Does not touch `player`, `lastSummary`, or `clock.lastNow_ms` (D-116). Pure: the
 * caller still has to persist the result and write `kw.p2.consent` itself. */
export function purgeLocationData(state: SessionState): SessionState {
  return { ...state, pre: APPROACH_INIT, lock: speedLockInit(), latestSample: null };
}

function assertSupportedConfig(cfg: SessionConfig): void {
  const rs = cfg.runState;
  if (rs.suspendedTimeCounts || rs.rewardTickDuringGrace || rs.rewardTickDuringSuspended) {
    throw new UnsupportedConfigError(
      'suspendedTimeCounts / rewardTickDuringGrace / rewardTickDuringSuspended must be false in Phase 2 (tech note F04 5.4)',
    );
  }
  // D-112 / balance-model 18.6: fail closed rather than compute Z with an unimplemented rule.
  assertZoneLevelRule(cfg.combat.monsterAttack.zoneLevelFrom);
}

function gateParamsOf(cfg: SessionConfig): GateParams {
  return {
    window_s: cfg.rewardTick.rewardTickInterval_s,
    minDistancePerWindow_m: cfg.movementGate.minDistancePerWindow_m,
    comparison: cfg.movementGate.comparison,
    sampleCadence_s: cfg.movementGate.sampleCadence_s,
    maxSamplePairGap_s: cfg.movementGate.maxSamplePairGap_s,
    maxSampleAccuracy_m: cfg.movementGate.maxSampleAccuracy_m,
    outlierSpeed_kmh: cfg.movementGate.outlierSpeed_kmh,
    outlierReanchorSamples: cfg.movementGate.outlierReanchorSamples,
    speedLock_kmh: cfg.speedLock.speedLock_kmh,
  };
}

function itemRarityOf(items: Readonly<Record<string, unknown>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [id, def] of Object.entries(items)) {
    if (typeof def === 'object' && def !== null && 'rarity' in def) {
      out[id] = String((def as { rarity: unknown }).rarity);
    }
  }
  return out;
}

/** One reward tick's loot + exp (F05 section 5): rolls loot with the run's own seed and the
 * count of ticks already granted as the drop stream index (ADR 0003 6.3), adds exp to the player,
 * and puts the loot in the run's bag (not the player's persistent inventory, F05 R20). */
function grantTick(
  run: RunState,
  player: PlayerState,
  f: number,
  params: SessionParams,
): {
  run: RunState;
  player: PlayerState;
  loot: readonly { id: string; qty: number }[];
  expGained: number;
} {
  const cfg = params.config;
  const record = params.dungeons[run.dungeonId];
  if (record === undefined)
    throw new InvalidSessionInputError(`unknown dungeonId ${run.dungeonId}`);
  const expResult = soloTickExp(
    player.level,
    player.playerClass,
    record.level_range.min,
    record.level_range.max,
    f,
    cfg.exp,
  );
  const rawTable = cfg.drops.dropTables[record.drop_table_id];
  const def = parseDropTable(record.drop_table_id, rawTable, itemRarityOf(cfg.drops.items));
  const ctx: DropContext = {
    rangedBuff_pct: player.playerClass === 'ranged' ? 0 : null,
    smallDungeon: record.area_m2 <= cfg.drops.smallDungeonMaxArea_m2,
    lowTrust: false,
    failedRaidBossHpLeft: null,
  };
  const table = lootTable(def, ctx, cfg.drops.lootParams);
  const loot = rollTickLoot(run.runSeed, run.grantedCount, table, f);
  const bag = loot.items.reduce((b, it) => bagAdd(b, it.id, it.qty), run.bag);
  const added = addExp(player.level, player.exp, expResult.exp, cfg.exp.exp);
  return {
    run: { ...run, bag, grantedCount: run.grantedCount + 1 },
    player: { ...player, level: added.level, exp: added.exp },
    loot: loot.items,
    expGained: expResult.exp,
  };
}

interface RunEvents {
  run: RunState;
  player: PlayerState;
  events: SessionEvent[];
}

/** Applies every window `gateAccumulatorStep`/`gateAccumulatorCloseThrough` judged, in order,
 * emitting `run_tick_granted` / `run_tick_denied` (F05 section 5). */
function applyClosedWindows(
  run: RunState,
  player: PlayerState,
  closed: readonly { readonly k: number; readonly distance_m: number; readonly passed: boolean }[],
  params: SessionParams,
  at_ms: number,
): RunEvents {
  let r = run;
  let p = player;
  const events: SessionEvent[] = [];
  for (const c of closed) {
    if (!c.passed) {
      events.push({
        type: 'run_tick_denied',
        dungeonId: r.dungeonId,
        tickIndex: c.k,
        partial: false,
        at_ms,
      });
      continue;
    }
    const granted = grantTick(r, p, 1, params);
    r = granted.run;
    p = granted.player;
    events.push({
      type: 'run_tick_granted',
      dungeonId: r.dungeonId,
      tickIndex: c.k,
      loot: granted.loot,
      expGained: granted.expGained,
      partial: false,
      at_ms,
    });
  }
  return { run: r, player: p, events };
}

const KEEPS_LOOT: ReadonlySet<RunSummary['exitReason']> = new Set([
  'manual_exit',
  'auto_retreat',
  'timeout',
  'clock_invalid',
  'dungeon_closed',
  'emergency_close',
]);
/** exitReason -> whether the close is "game-side" (D-059 partial tick applies, F05 section 6). */
const GAME_SIDE_CLOSE: ReadonlySet<RunSummary['exitReason']> = new Set([
  'dungeon_closed',
  'emergency_close',
]);

/** Ends a run per the F05 R21/R22 payout table: pays out, purges every coordinate-bearing field,
 * and returns the new session state plus the events (`run_tick_granted`/`denied` of a game-side
 * close's partial tick, then `dungeon_exited`). */
function endRun(
  s: SessionState,
  run: RunState,
  reason: RunSummary['exitReason'],
  at_ms: number,
  params: SessionParams,
): { state: SessionState; events: SessionEvent[] } {
  const events: SessionEvent[] = [];
  let r = { ...run, clock: clockStop(run.clock, at_ms) };
  let player = s.player;
  let partialTickResult: { f: number; granted: boolean } | null = null;
  if (GAME_SIDE_CLOSE.has(reason)) {
    const gp = gateParamsOf(params.config);
    const tauEnd = tauOf(r.clock, at_ms);
    const closeThrough = gateAccumulatorCloseThrough(r.reward, tauEnd, gp);
    r = { ...r, reward: closeThrough.state };
    const applied = applyClosedWindows(r, player, closeThrough.closed, params, at_ms);
    r = applied.run;
    player = applied.player;
    events.push(...applied.events);
    const elapsed_ms = tauEnd - r.reward.k * (gp.window_s * MS_PER_S);
    const pt = partialTick(elapsed_ms, r.reward.distance_m, {
      window_s: gp.window_s,
      minDistancePerWindow_m: gp.minDistancePerWindow_m,
      comparison: gp.comparison,
      partialTickMinElapsed_s: params.config.rewardTick.partialTickMinElapsed_s,
    });
    partialTickResult = pt.evaluated ? { f: pt.f, granted: pt.granted } : null;
    if (pt.evaluated) {
      if (pt.granted) {
        const granted = grantTick(r, player, pt.f, params);
        r = granted.run;
        player = granted.player;
        events.push({
          type: 'run_tick_granted',
          dungeonId: r.dungeonId,
          tickIndex: r.reward.k,
          loot: granted.loot,
          expGained: granted.expGained,
          partial: true,
          at_ms,
        });
      } else {
        events.push({
          type: 'run_tick_denied',
          dungeonId: r.dungeonId,
          tickIndex: r.reward.k,
          partial: true,
          at_ms,
        });
      }
    }
  }
  const keepsLoot = KEEPS_LOOT.has(reason);
  const inventory = { ...player.inventory };
  if (keepsLoot) {
    for (const [id, qty] of Object.entries(r.bag.items)) inventory[id] = (inventory[id] ?? 0) + qty;
  }
  const summary: RunSummary = {
    dungeonId: r.dungeonId,
    exitReason: reason,
    startedAt_ms: r.startedAt_ms,
    endedAt_ms: at_ms,
    ticksEvaluated: r.reward.k + (partialTickResult !== null ? 1 : 0),
    ticksGranted: r.grantedCount,
    partialTick: partialTickResult,
    loot: keepsLoot ? Object.entries(r.bag.items).map(([id, qty]) => ({ id, qty })) : [],
    expGained: 0,
    levelsGained: 0,
  };
  events.push({
    type: 'dungeon_exited',
    dungeonId: r.dungeonId,
    runId: r.runId,
    exitReason: reason,
    summary,
    at_ms,
  });
  return {
    state: { ...s, player: { ...player, inventory }, run: null, lastSummary: summary },
    events,
  };
}

function reject(dungeonId: string, reason: CheckInRejectReason, at_ms: number): SessionEvent {
  return { type: 'checkin_rejected', dungeonId, reason, at_ms };
}

/** `confirm` (tech note F04 7.4): T1-T4, in R08's order. */
function handleConfirm(
  s: SessionState,
  dungeonId: string,
  runSeed: number,
  now_ms: number,
  params: SessionParams,
): { state: SessionState; events: SessionEvent[] } {
  const record = params.dungeons[dungeonId];
  if (record === undefined) throw new InvalidSessionInputError(`unknown dungeonId "${dungeonId}"`);
  if (s.run !== null) return { state: s, events: [reject(dungeonId, 'run_active', now_ms)] };
  const utcOffset_min = params.config.openingHours.utcOffset_min;
  if (!isOpenAt(record.opening_hours, utcOffset_min, now_ms)) {
    return { state: s, events: [reject(dungeonId, 'dungeon_closed', now_ms)] };
  }
  let strategy;
  try {
    if (record.floor_level !== null) throw new UnknownVerificationModeError('floor_level');
    strategy = selectPresenceStrategy(record.verification_mode);
  } catch (e) {
    if (e instanceof NotImplementedError || e instanceof UnknownVerificationModeError) {
      return { state: s, events: [reject(dungeonId, 'unsupported_mode', now_ms)] };
    }
    throw e;
  }
  const latest = s.latestSample;
  const ctx: CheckInContext = {
    approach: s.pre,
    latest:
      latest === null
        ? null
        : {
            t_ms: latest.t_ms,
            accuracy_m: latest.accuracy_m,
            inside: pointInPolygon(latest, record.geometry),
          },
    locked: s.lock.locked,
    dungeonId,
  };
  const result = strategy.checkIn(ctx, params.config.checkIn);
  if (!result.ok) return { state: s, events: [reject(dungeonId, result.reason, now_ms)] };
  const runId = `${String(now_ms)}-${String(runSeed)}`;
  const run: RunState = {
    runId,
    dungeonId,
    runSeed,
    startedAt_ms: now_ms,
    status: 'active',
    exitStartedAt_ms: null,
    exitCause: null,
    clock: { closedSum_ms: 0, runningSince_ms: now_ms },
    reward: gateAccumulatorInit(),
    rewardScratch: null,
    scratchClosed: [],
    grantedCount: 0,
    bag: EMPTY_BAG,
    hp: {},
    presence: presenceTrackerInit('inside', now_ms),
    closesAt_ms: openingChangeAfter(record.opening_hours, utcOffset_min, now_ms),
    notices: { closingSoonSent: false },
  };
  return {
    state: { ...s, run },
    events: [{ type: 'dungeon_entered', dungeonId, runId, at_ms: now_ms }],
  };
}

/** Applies a confirmed presence transition (F04 5.2) to the run: stop/start the reward clock and
 * emit `run_state_changed`. Simplification of this pass: applied at the confirming sample's own
 * time, not backdated to the first sample of the confirming set (see file header). */
function applyPresenceTransition(
  run: RunState,
  confirmed: { readonly to: 'inside' | 'outside'; readonly at_ms: number },
  events: SessionEvent[],
): RunState {
  if (confirmed.to === 'inside') {
    if (run.status === 'active') return run;
    events.push({
      type: 'run_state_changed',
      from: run.status,
      to: 'active',
      cause: 'returned',
      at_ms: confirmed.at_ms,
    });
    return {
      ...run,
      status: 'active',
      exitStartedAt_ms: null,
      exitCause: null,
      clock: clockStart(run.clock, confirmed.at_ms),
    };
  }
  if (run.status !== 'active') return run;
  events.push({
    type: 'run_state_changed',
    from: 'active',
    to: 'grace',
    cause: 'left_polygon',
    at_ms: confirmed.at_ms,
  });
  return {
    ...run,
    status: 'grace',
    exitStartedAt_ms: confirmed.at_ms,
    exitCause: 'left_polygon',
    clock: clockStop(run.clock, confirmed.at_ms),
  };
}

/**
 * F05 3.5 scratch accumulator: while a confirmed return (Grace/Suspended -> Active) or a confirmed
 * unlock is pending, `since_ms` (the pending set's own first, back-dated sample) is non-null and
 * this sample replays into `run.rewardScratch` (created fresh at that first sample) instead of
 * `run.reward`, which stays frozen. `promotedNow_ms` is this same set's confirmation instant when
 * this very sample is the one that confirms it: `main := scratch`, and every window `scratchClosed`
 * closed while pending is granted now, at `promotedNow_ms` (never earlier — a set that never
 * confirms never grants anything). `since_ms === null` means no pending set right now (matched the
 * original side again, or D-104 dropped it): any live scratch is discarded.
 */
function feedScratch(
  run: RunState,
  since_ms: number | null,
  promotedNow_ms: number | null,
  sample: { readonly t_ms: number; readonly lat: number; readonly lng: number; readonly accuracy_m: number },
  insideRun: boolean,
  gp: GateParams,
  player: PlayerState,
  params: SessionParams,
  events: SessionEvent[],
): { readonly run: RunState; readonly player: PlayerState } {
  if (since_ms === null) {
    if (run.rewardScratch === null) return { run, player };
    return { run: { ...run, rewardScratch: null, scratchClosed: [] }, player };
  }
  const base = run.rewardScratch ?? gateAccumulatorInit();
  const tau_ms = run.clock.closedSum_ms + (sample.t_ms - since_ms);
  const step = gateAccumulatorStep(base, { sample, tau_ms, countable: insideRun }, gp);
  const fed: RunState = {
    ...run,
    rewardScratch: step.state,
    scratchClosed: [...run.scratchClosed, ...step.closed],
  };
  if (promotedNow_ms === null) return { run: fed, player };
  const closed = fed.scratchClosed;
  const promoted: RunState = {
    ...fed,
    reward: fed.rewardScratch ?? fed.reward,
    rewardScratch: null,
    scratchClosed: [],
  };
  const applied = applyClosedWindows(promoted, player, closed, params, promotedNow_ms);
  events.push(...applied.events);
  return { run: applied.run, player: applied.player };
}

/** input `sample` (tech note F04 9.1 steps 2-7): classify once, feed speed lock, approach,
 * presence (if a run is active) and the reward accumulator, in that order. */
function handleSample(
  s: SessionState,
  sample: {
    readonly t_ms: number;
    readonly lat: number;
    readonly lng: number;
    readonly accuracy_m: number;
  },
  now_ms: number,
  params: SessionParams,
  events: SessionEvent[],
): SessionState {
  const gate = sampleTimeGate(
    sample.t_ms,
    now_ms,
    s.clock.lastSample_ms,
    s.clock.settled_ms,
    params.config.runState.clockSkewTolerance_s,
  );
  if (gate !== 'ok') {
    events.push({ type: 'sample_rejected', reason: gate, at_ms: now_ms });
    return s;
  }
  const accuracyOk = sample.accuracy_m <= params.config.movementGate.maxSampleAccuracy_m;
  const insideOf: Record<string, boolean> = {};
  for (const [id, rec] of Object.entries(params.dungeons))
    insideOf[id] = pointInPolygon(sample, rec.geometry);

  const wasLocked = s.lock.locked;
  const lockStep = speedLockStep(s.lock, sample, {
    speedLock_kmh: params.config.speedLock.speedLock_kmh,
    lockSustained_s: params.config.speedLock.lockSustained_s,
    unlockSustained_s: params.config.speedLock.unlockSustained_s,
    maxSampleAccuracy_m: params.config.movementGate.maxSampleAccuracy_m,
    maxSamplePairGap_s: params.config.movementGate.maxSamplePairGap_s,
  });
  const lock = lockStep.state;
  let run = s.run;
  let player = s.player;
  // R21: the reward clock stops while locked (speed lock is not "outside time", tech note F04 6).
  if (run !== null && run.status === 'active' && lockStep.confirmed !== null) {
    const at_ms = lockStep.confirmed.at_ms;
    run =
      lockStep.confirmed.phase === 'enter'
        ? { ...run, clock: clockStop(run.clock, at_ms) }
        : { ...run, clock: clockStart(run.clock, at_ms) };
  }
  // F05 3.5: while locked, a pending unlock's samples replay through a scratch accumulator (the
  // clock itself already resumed above when this sample is the one that confirms the unlock).
  if (run !== null && run.status === 'active' && wasLocked) {
    const unlockAt_ms = lockStep.confirmed?.phase === 'exit' ? lockStep.confirmed.at_ms : null;
    const since_ms = unlockAt_ms ?? lock.runStart_ms;
    const fed = feedScratch(
      run,
      since_ms,
      unlockAt_ms,
      sample,
      insideOf[run.dungeonId] ?? false,
      gateParamsOf(params.config),
      player,
      params,
      events,
    );
    run = fed.run;
    player = fed.player;
  }

  const usableAndUnlocked = accuracyOk && !lock.locked;
  const outsideDungeonIds = usableAndUnlocked
    ? Object.keys(params.dungeons).filter((id) => !insideOf[id])
    : [];
  const pre = approachStep(
    s.pre,
    { t_ms: sample.t_ms, usableAndUnlocked, outsideDungeonIds },
    { maxSamplePairGap_s: params.config.movementGate.maxSamplePairGap_s },
  );

  if (run !== null && accuracyOk) {
    const insideRun = insideOf[run.dungeonId] ?? false;
    const record = params.dungeons[run.dungeonId];
    const wasActive = run.status === 'active';
    const wasOutsideSide = run.presence.geo.side === 'outside';
    const obs = {
      t_ms: sample.t_ms,
      inside: insideRun,
      boundaryDistance_m:
        record === undefined
          ? Number.POSITIVE_INFINITY
          : boundaryDistance_m(sample, record.geometry),
    };
    const presence = presenceStep(run.presence, obs, {
      edgeHysteresisSamples: params.config.runState.edgeHysteresisSamples,
      edgeHysteresis_m: params.config.runState.edgeHysteresis_m,
      maxSamplePairGap_s: params.config.movementGate.maxSamplePairGap_s,
    });
    run = { ...run, presence: presence.tracker };
    if (presence.confirmed !== null) {
      run = applyPresenceTransition(run, presence.confirmed, events);
    } else if (run.status !== 'active' && run.exitCause === 'no_evidence') {
      // tech note F06 15.1 (F04-R15 item 7, D-118, P2-X16/S-1): judge exactly the FIRST usable
      // sample after a no_evidence exit, once. A no_evidence exit never geometrically left (F04
      // 5.3), so the presence tracker's confirmed side is still 'inside' and `presenceStep` above
      // never has a transition to confirm on its own here.
      if (insideRun) {
        // Rule 1: s1 is inside (band included) -> Active immediately, no hysteresis set, no
        // missed distance to replay (no evidence means no samples happened at all).
        events.push({
          type: 'run_state_changed',
          from: run.status,
          to: 'active',
          cause: 'returned',
          at_ms: sample.t_ms,
        });
        run = {
          ...run,
          status: 'active',
          exitStartedAt_ms: null,
          exitCause: null,
          clock: clockStart(run.clock, sample.t_ms),
        };
      } else {
        // Rule 2: s1 is outside -> a genuine (evidenced) left_polygon, not backdated past t_last
        // (exitStartedAt_ms is unchanged, R14): the tracker resets to confirmed 'outside' anchored
        // at s1 so returning from here on needs a full hysteresis set, same as any other exit.
        // This branch's own `run.exitCause` guard above ensures it only ever fires for s1 itself.
        run = { ...run, exitCause: 'left_polygon', presence: presenceTrackerInit('outside', sample.t_ms) };
      }
    }

    // F05 3.5: while Grace/Suspended, a pending return's samples replay through a scratch
    // accumulator so the distance counts once the return backdates (`applyPresenceTransition`
    // above already started the clock at the same instant it promotes here).
    let promotedThisSample = false;
    if (!wasActive && wasOutsideSide) {
      const returnAt_ms =
        presence.confirmed !== null && presence.confirmed.to === 'inside'
          ? presence.confirmed.at_ms
          : null;
      const since_ms = returnAt_ms ?? presencePendingSince(run.presence);
      const fed = feedScratch(
        run,
        since_ms,
        returnAt_ms,
        sample,
        insideRun,
        gateParamsOf(params.config),
        player,
        params,
        events,
      );
      run = fed.run;
      player = fed.player;
      promotedThisSample = returnAt_ms !== null;
    }

    if (!promotedThisSample && run.status === 'active' && !lock.locked) {
      const tau_ms = tauOf(run.clock, sample.t_ms);
      const step = gateAccumulatorStep(
        run.reward,
        { sample, tau_ms, countable: insideRun },
        gateParamsOf(params.config),
      );
      run = { ...run, reward: step.state };
      const applied = applyClosedWindows(run, player, step.closed, params, sample.t_ms);
      run = applied.run;
      player = applied.player;
      events.push(...applied.events);
    }
  }
  return {
    ...s,
    pre,
    lock,
    run,
    player,
    latestSample: sample,
    clock: { ...s.clock, lastSample_ms: accuracyOk ? sample.t_ms : s.clock.lastSample_ms },
  };
}

/**
 * Time-only processing (tech note F04 9.1 step 8-9, done for every input): no-evidence exit while
 * Active, then Grace -> Suspended -> timeout while outside. Returns `dungeon_exited` via `endRun`
 * when `suspendedMax_s` is passed.
 */
function processTimeline(
  s: SessionState,
  now_ms: number,
  params: SessionParams,
  events: SessionEvent[],
): SessionState {
  let run = s.run;
  if (run === null) return s;
  const gapMs = params.config.movementGate.maxSamplePairGap_s * MS_PER_S;
  if (
    run.status === 'active' &&
    s.clock.lastSample_ms !== null &&
    now_ms - s.clock.lastSample_ms > gapMs
  ) {
    const at_ms = s.clock.lastSample_ms;
    events.push({
      type: 'run_state_changed',
      from: 'active',
      to: 'grace',
      cause: 'no_evidence',
      at_ms,
    });
    run = {
      ...run,
      status: 'grace',
      exitStartedAt_ms: at_ms,
      exitCause: 'no_evidence',
      clock: clockStop(run.clock, at_ms),
    };
    // Any lock-pending-unlock scratch (F05 3.5) is moot the instant presence itself now blocks the
    // clock: a later unlock alone would no longer be enough to resume it.
    if (run.rewardScratch !== null) run = { ...run, rewardScratch: null, scratchClosed: [] };
  }
  const closesAt_ms = run.closesAt_ms;
  if (closesAt_ms !== null) {
    const noticeAt_ms = closingSoonAt(
      closesAt_ms,
      run.startedAt_ms,
      params.config.openingHours.closingSoonNotice_s,
    );
    if (!run.notices.closingSoonSent && noticeAt_ms !== null && now_ms >= noticeAt_ms) {
      events.push({
        type: 'dungeon_closing_soon',
        dungeonId: run.dungeonId,
        closesIn_s: Math.round((closesAt_ms - noticeAt_ms) / MS_PER_S),
        at_ms: noticeAt_ms,
      });
      run = { ...run, notices: { closingSoonSent: true } };
    }
    // R25-R31/D-059 (tech note F04 8.3, 9.3 item 6): a game-side close outranks Suspended timeout
    // when both would fire at the same instant, so it is judged before the timer chain below.
    if (now_ms >= closesAt_ms) {
      const ended = endRun({ ...s, run }, run, 'dungeon_closed', closesAt_ms, params);
      events.push(...ended.events);
      return ended.state;
    }
  }
  if (run.status !== 'active' && run.exitStartedAt_ms !== null) {
    const timers = runTimers(run.status, run.exitStartedAt_ms, now_ms, {
      graceMax_s: params.config.runState.graceMax_s,
      suspendedMax_s: params.config.runState.suspendedMax_s,
    });
    for (const ev of timers.events) {
      if (ev.type === 'run_state_changed') {
        events.push({
          type: 'run_state_changed',
          from: run.status,
          to: ev.to as RunStatus,
          cause: ev.cause,
          at_ms: ev.at_ms,
        });
        run = { ...run, status: ev.to as RunStatus };
      } else {
        const ended = endRun({ ...s, run }, run, 'timeout', ev.at_ms, params);
        events.push(...ended.events);
        return ended.state;
      }
    }
  }
  return { ...s, run };
}

/** The one entry point (tech note F04 section 2.1): run -> gate -> tick -> drop, per input. */
export function sessionStep(
  state: SessionState,
  input: SessionInput,
  now_ms: number,
  params: SessionParams,
): { state: SessionState; events: readonly SessionEvent[] } {
  assertSupportedConfig(params.config);
  const events: SessionEvent[] = [];
  let s = state;

  const cc = clockCheck(now_ms, s.clock.lastNow_ms, params.config.runState.clockSkewTolerance_s);
  if (cc === 'invalid') {
    if (s.run !== null) {
      const at_ms = Math.max(
        s.clock.settled_ms ?? 0,
        s.clock.lastSample_ms ?? 0,
        s.run.startedAt_ms,
      );
      const ended = endRun(s, s.run, 'clock_invalid', at_ms, params);
      s = ended.state;
      events.push(...ended.events);
    } else {
      s = { ...s, pre: APPROACH_INIT, lock: speedLockInit() };
    }
    return {
      state: { ...s, clock: { lastNow_ms: now_ms, lastSample_ms: null, settled_ms: null } },
      events,
    };
  }
  s = { ...s, clock: { ...s.clock, lastNow_ms: now_ms } };

  if (input.type === 'ackSummary') return { state: { ...s, lastSummary: null }, events };
  if (input.type === 'setAutoRetreat') {
    return { state: { ...s, player: { ...s.player, autoRetreatEnabled: input.enabled } }, events };
  }
  if (input.type === 'confirm') {
    const r = handleConfirm(s, input.dungeonId, input.runSeed, now_ms, params);
    return { state: r.state, events: [...events, ...r.events] };
  }
  if (input.type === 'exit' || input.type === 'emergencyClose') {
    if (s.run === null) return { state: s, events };
    const reason = input.type === 'exit' ? 'manual_exit' : 'emergency_close';
    const ended = endRun(s, s.run, reason, now_ms, params);
    return { state: ended.state, events: [...events, ...ended.events] };
  }
  if (input.type === 'sample') {
    // tech note F06 15.2 (S-2): settle the timeline up to the sample's own `t_ms` first, with the
    // same rule `processTimeline` uses at the end of every step (gap vs. `lastSample_ms`, then the
    // Grace/Suspended/timeout timers). Without this, a `sample` that arrives before the next
    // `tick` (a resumed watchPosition callback racing a sleeping timer) would keep the run Active
    // across an arbitrarily long gap and never time out.
    s = processTimeline(s, input.sample.t_ms, params, events);
    s = handleSample(s, input.sample, now_ms, params, events);
  } else if (input.type !== 'tick') {
    throw new InvalidSessionInputError(`unknown session input type`);
  }
  s = processTimeline(s, now_ms, params, events);
  return { state: s, events };
}
