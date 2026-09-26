/**
 * `kw.p2.session` read/write (tech note F04 sections 10-11, D-088, C1-5, GD B-08). Wraps
 * `storage/local-store.ts`'s generic envelope with `SessionState`'s own shape.
 *
 * `@keep-walking/shared/session` does not export `toPersisted`/`fromPersisted` yet (tech note F04
 * section 2.6; landing in P2-X10 alongside backdating and opening hours — see this task's REPORT).
 * This is a clearly-named stand-in: it does the two things the tech note requires *now* (drop
 * `pre`/`latestSample` before writing, section 10.1; discard and start fresh rather than crash on
 * anything unexpected, section 10.2) without touching the sample-count purge (`onDeviceSamples`
 * pruning) or the `unknown_dungeon` check, both still owned by the real `fromPersisted` once it
 * exists. Replace this file's two functions with calls to the real ones then.
 */
import type { SessionState } from '@keep-walking/shared/session';
import type { KeyValueStorage, QuotaFallbackDeps } from '../storage/local-store';
import { readEnvelope, serializeEnvelope, writeWithQuotaFallback } from '../storage/local-store';

export const SESSION_SCHEMA_VERSION = 1;

export type SessionDiscardReason = 'corrupt' | 'schema_mismatch';

export type SessionLoadResult =
  | { readonly ok: true; readonly state: SessionState }
  | { readonly ok: false; readonly reason: SessionDiscardReason };

/** Structural guard, not a full schema validator (no Ajv outside tests/tools, C1-4-style
 * discipline even in client code). A value that fails this is `corrupt`, same as F04 10.2. */
function isSessionStateShape(value: unknown): value is SessionState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v['schemaVersion'] === SESSION_SCHEMA_VERSION &&
    typeof v['clock'] === 'object' &&
    typeof v['player'] === 'object' &&
    'run' in v &&
    'lastSummary' in v
  );
}

/** `packages/shared/src/run/approach.ts`'s `APPROACH_INIT` shape, inlined rather than imported:
 * `apps/client` is banned from importing `@keep-walking/shared/run` at all (ADR 0003 section 3),
 * and `ApproachState` itself is not re-exported from the `session` subpath. This is 3 constant
 * fields, not logic — nothing here can drift into a different check-in decision. */
const EMPTY_APPROACH_STATE = { chainStartAt_ms: null, lastAt_ms: null, outsideSeenAt_ms: {} };

/** Section 10.1: "toPersisted ตัด pre ทิ้ง" — `pre`/`latestSample` never reach storage (same
 * privacy class, never restored: a fresh empty approach state on load costs a few seconds of
 * re-approach at worst, F04 section 10.1 "ความเสียหายสูงสุด ... ไม่กี่วินาทีสุดท้าย"). */
function toPersistedState(state: SessionState): SessionState {
  return { ...state, pre: EMPTY_APPROACH_STATE, latestSample: null };
}

export function saveSession(
  storage: KeyValueStorage,
  key: string,
  state: SessionState,
  now_ms: number,
  deps: QuotaFallbackDeps,
): void {
  const json = serializeEnvelope(SESSION_SCHEMA_VERSION, toPersistedState(state), now_ms);
  writeWithQuotaFallback(storage, key, json, deps);
}

/** Section 10.2's read path, minus the `unknown_dungeon` check (needs the real `fromPersisted`,
 * P2-X10) and the on-device sample purge (also P2-X10/reducer). `missing` is not an error: a fresh
 * install has no `kw.p2.session` key yet. */
export function loadSession(storage: KeyValueStorage, key: string): SessionLoadResult | undefined {
  const result = readEnvelope<SessionState>(
    storage,
    key,
    SESSION_SCHEMA_VERSION,
    isSessionStateShape,
  );
  if (result.ok) {
    return { ok: true, state: result.envelope.state };
  }
  if (result.reason === 'missing') {
    return undefined;
  }
  return { ok: false, reason: result.reason };
}
