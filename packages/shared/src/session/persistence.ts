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
import type {
  FromPersistedRejectReason,
  PersistedSession,
  SessionParams,
  SessionState,
} from './types';

const SCHEMA_VERSION = 1;
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

/** Strips `pre` and stamps `savedAt_ms`; the on-device sample caps themselves (tech note F04 11)
 * are `sessionStep`'s own job on every step, not this envelope's. */
export function toPersisted(state: SessionState, now_ms: number): PersistedSession {
  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt_ms: now_ms,
    state: { ...state, pre: APPROACH_INIT },
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
  return { ok: true, state: { ...state, pre: APPROACH_INIT } };
}
