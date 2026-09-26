// toPersisted / fromPersisted (tech note F04 2.1, 10.1, 10.2): the storage-adapter envelope
// (`PersistedSession`) around `SessionState`. `pre` (the pre-run approach chain) is never
// persisted (7.2, `app.privacy.onDeviceSamples.persistPreRunApproach = false`): every save and
// every load carries a fresh `APPROACH_INIT` instead. Structural validation is plain code, not
// Ajv (ADR 0003 C1-4): a value of the wrong shape is `corrupt`, a `schemaVersion` this build does
// not know is `schema_mismatch` (no migration in Phase 2), and a run whose `dungeonId` is not in
// the current artifact is `unknown_dungeon` (the run is dropped, the player is kept).
import { APPROACH_INIT } from '../run';
import type {
  FromPersistedRejectReason,
  PersistedSession,
  SessionParams,
  SessionState,
} from './types';

const SCHEMA_VERSION = 1;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
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
  return { ok: true, state: { ...state, pre: APPROACH_INIT } };
}
