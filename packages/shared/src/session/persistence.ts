// toPersisted / fromPersisted (tech note F04 2.1, 10.1, 10.2): the storage-adapter envelope
// (`PersistedSession`) around `SessionState`. `pre` (the pre-run approach chain) is never
// persisted (7.2, `app.privacy.onDeviceSamples.persistPreRunApproach = false`): every save and
// every load carries a fresh `APPROACH_INIT` instead. Structural validation is plain code, not
// Ajv (ADR 0003 C1-4): a value of the wrong shape is `corrupt`, a `schemaVersion` this build does
// not know is `schema_mismatch` (no migration in Phase 2), and a run whose `dungeonId` is not in
// the current artifact is `unknown_dungeon` (the run is dropped, the player is kept).
import { APPROACH_INIT } from '../run';
import { expToNext } from '../formulas';
import { hpParamsFromConfig } from '../hp';
import { hpConfigInputOf } from './types';
import type { GateFilterState } from '@keep-walking/geo';
import type { GateAccumulatorState } from '../reward';
import type {
  FromPersistedRejectReason,
  PersistedSession,
  SessionParams,
  SessionState,
} from './types';

const SCHEMA_VERSION = 2; // P2-X35: RunState gained expGained/levelsGained, no migration (Phase 2)
const KNOWN_CLASSES: ReadonlySet<string> = new Set(['tanker', 'ranged', 'support', 'magic']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Tech note F06 2.5: values a hand-edited `kw.p2.session` could carry that would push the engine
 * into a state its own spec never describes. Not an anti-cheat measure (Phase 2 grants no real
 * reward, D-087) — it exists so a corrupted `localStorage` value fails closed (`corrupt`, a fresh
 * session) instead of the engine guessing. Only `player`; `run` is validated by the `dungeonId`
 * check already in `fromPersisted` (a run's own numbers came from this same engine, never typed). */
function isCorruptPlayer(state: SessionState, params: SessionParams): boolean {
  const player = state.player;
  if (player.classId !== null && !KNOWN_CLASSES.has(player.classId)) return true;
  const exp = params.config.exp.exp;
  if (
    !Number.isInteger(player.level) ||
    player.level < exp.startLevel ||
    player.level > exp.maxLevel
  ) {
    return true;
  }
  if (player.level < exp.maxLevel) {
    if (player.exp < 0 || player.exp >= expToNext(player.level, exp)) return true;
  } else if (player.exp !== 0) {
    return true;
  }
  const alloc = player.allocated;
  if (alloc.atk !== 0 || alloc.def !== 0 || alloc.hp !== 0 || alloc.vit !== 0) return true;
  let hpParams;
  try {
    hpParams = hpParamsFromConfig(hpConfigInputOf(params.config));
  } catch {
    return false; // a bad config is `assertSupportedConfig`'s own job, not this one's
  }
  const maxHp = hpParams.player.baseStats.hp + hpParams.player.statPerPoint.hp * alloc.hp;
  if (player.hp.value < 0 || player.hp.value > maxHp) return true;
  if (
    state.run !== null &&
    (state.run.hp.shield < 0 || state.run.hp.hp < 0 || state.run.hp.hp > maxHp)
  ) {
    return true;
  }
  for (const [id, qty] of Object.entries(player.inventory)) {
    if (!Number.isInteger(qty) || qty <= 0 || params.config.drops.items[id] === undefined)
      return true;
  }
  if (!Number.isInteger(player.lifetimeTicksGranted) || player.lifetimeTicksGranted < 0)
    return true;
  return false;
}

/** Coordinate audit of `SessionState` (P2-H02, CLAUDE.md non-negotiable 7 / PDPA — `kw.p2.session`
 * is `localStorage`, unlike `position_log` it has no TTL at all, so nothing raw may ever land in
 * it). Every field that can carry a real `lat`/`lng`/`accuracy_m` tied to a position, and what
 * happens to each before it reaches the envelope:
 *  - `latestSample` (`RawSample`, tech note F04 7.1/7.2): the raw fix itself; the whole reason this
 *    field is documented "not persisted" — stripped to `null`.
 *  - `lock.lastAccurate` (`SpeedLockState`, tech note F04 section 6): the last accurate fix paired
 *    for the speed check (`{ t_ms, lat, lng }`) — stripped to `null` along with `runStart_ms`
 *    (meaningless without the fix it was measured from). `locked` (a boolean, not a position) is
 *    kept: losing whether the player is currently speed-locked is a gameplay regression on reload,
 *    not a privacy requirement.
 *  - `checkInFilter` (`GateFilterState`, P2-X34/BUG-P2-002: the check-in approach evidence's own
 *    ADR 0003 5.3 step-1 outlier filter, independent of any run) — `anchor`/`pending` are raw
 *    `GeoSample`s, stripped to the filter's own initial shape (`{ anchor: null, pending: [] }`),
 *    same as `run.reward.filter` below. Losing the anchor on reload only costs one pair's worth of
 *    speed-outlier context, same trade-off as `pre`.
 *  - `run.reward` / `run.rewardScratch` (`GateAccumulatorState`, ADR 0003 5.3-5.4, ships from
 *    `@keep-walking/geo`):
 *      - `filter.anchor` / `filter.pending` (`GateFilterState`) are raw `GeoSample`s — stripped to
 *        the filter's own initial shape (`{ anchor: null, pending: [] }`).
 *      - `grid.last` / `grid.lastPoint` (`GridState`) carry `lat`/`lng` — stripped to `null`.
 *      - `k`, `distance_m` (`filter`/`grid`'s other counters: `nextSeg`, `nextIndex`) are plain
 *        numbers with no position; kept, so a reload does not also erase already-earned
 *        reward-window progress. The cost of stripping the fix/point above is that the very next
 *        sample after a reload starts a fresh pair (no distance credited for that one pair) —
 *        the same trade-off already accepted for `pre` below.
 *  - `pre` (`ApproachState`): already reset to `APPROACH_INIT` on every save and load (tech note
 *    F04 7.2, unchanged by this task).
 *  - Everything else in `SessionState` carries no coordinate, checked by inspection of every type
 *    it holds (2026-09-27 audit): `clock` (three `*_ms` numbers); `player` (`PlayerState` — level,
 *    exp, allocated points, `PlayerHpState`, inventory counts, ms timestamps); `run`'s own
 *    non-reward fields (`presence` is `EdgeHysteresisState` — a side, two counts, two `*_ms`
 *    fields, geo's own comment "only a handful of numbers, no fix list"; `hp` is `RunHpState` —
 *    hp/shield/indices; `bag`, `notices`, `scratchClosed`, `grantedCount`, `closesAt_ms`, ids,
 *    `clock` — none of these are positions); `lastSummary` (`RunSummary`, already documented
 *    "no coordinates in any of these fields", C2-4).
 *
 * Applied on save (`toPersisted`) and on load (`fromPersisted`): an old blob written before this
 * fix (or a hand-edited one) that still carries a coordinate in any of these fields never reaches
 * a running session either — it is silently dropped, not treated as `corrupt` (rule/mode/level
 * corruption is `isCorruptPlayer`'s job; a stray coordinate is this function's). */
function stripGateFilter(): GateFilterState {
  return { anchor: null, pending: [] };
}

function stripGateAccumulator(s: GateAccumulatorState): GateAccumulatorState {
  return {
    ...s,
    filter: stripGateFilter(),
    grid: { ...s.grid, last: null, lastPoint: null },
  };
}

function stripCoordinates(state: SessionState): SessionState {
  return {
    ...state,
    lock: { locked: state.lock.locked, runStart_ms: null, lastAccurate: null },
    checkInFilter: stripGateFilter(),
    run:
      state.run === null
        ? null
        : {
            ...state.run,
            reward: stripGateAccumulator(state.run.reward),
            rewardScratch:
              state.run.rewardScratch === null
                ? null
                : stripGateAccumulator(state.run.rewardScratch),
          },
    latestSample: null,
  };
}

/** Strips `pre`, every coordinate-bearing field (`stripCoordinates` above), and stamps
 * `savedAt_ms`; the on-device sample caps themselves (tech note F04 11) are `sessionStep`'s own
 * job on every step, not this envelope's. */
export function toPersisted(state: SessionState, now_ms: number): PersistedSession {
  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt_ms: now_ms,
    state: stripCoordinates({ ...state, pre: APPROACH_INIT }),
  };
}

export type FromPersistedResult =
  | { readonly ok: true; readonly state: SessionState }
  | { readonly ok: false; readonly reason: FromPersistedRejectReason };

/** `raw` is already `JSON.parse`d (a parse failure is the caller's own `corrupt` case, tech note
 * F04 10.2 — it never reaches here). */
export function fromPersisted(raw: unknown, params: SessionParams): FromPersistedResult {
  if (!isRecord(raw) || typeof raw['savedAt_ms'] !== 'number' || !isRecord(raw['state'])) {
    return { ok: false, reason: 'corrupt' };
  }
  const rawState = raw['state'];
  if (raw['schemaVersion'] !== SCHEMA_VERSION || rawState['schemaVersion'] !== SCHEMA_VERSION) {
    return { ok: false, reason: 'schema_mismatch' };
  }
  const state = rawState as unknown as SessionState;
  if (state.run !== null && params.dungeons[state.run.dungeonId] === undefined) {
    return { ok: false, reason: 'unknown_dungeon' };
  }
  if (isCorruptPlayer(state, params)) return { ok: false, reason: 'corrupt' };
  return { ok: true, state: stripCoordinates({ ...state, pre: APPROACH_INIT }) };
}
