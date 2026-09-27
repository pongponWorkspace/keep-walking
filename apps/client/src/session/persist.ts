/**
 * `kw.p2.session` read/write (tech note F04 sections 10-11, D-088, C1-5, GD B-08): a thin
 * storage-only wrapper around the real `toPersisted`/`fromPersisted` (`@keep-walking/shared/session`,
 * landed in P2-X10). This file owns only the `localStorage` I/O (`JSON.parse`/`stringify` and the
 * quota-exceeded fallback chain, `storage/local-store.ts`); every shape decision (dropping `pre`,
 * the `corrupt`/`schema_mismatch`/`unknown_dungeon` checks) is `fromPersisted`'s own — never
 * reimplemented here (CLAUDE.md "never fork the logic"). This replaces the P2-F04-T21 stand-in
 * (see that task's REPORT) now that P2-X10 has landed the real functions.
 */
import { fromPersisted, toPersisted } from '@keep-walking/shared/session';
import type {
  FromPersistedRejectReason,
  SessionParams,
  SessionState,
} from '@keep-walking/shared/session';
import type { KeyValueStorage, QuotaFallbackDeps } from '../storage/local-store';
import { writeWithQuotaFallback } from '../storage/local-store';

export type SessionDiscardReason = FromPersistedRejectReason;

export type SessionLoadResult =
  | { readonly ok: true; readonly state: SessionState }
  | { readonly ok: false; readonly reason: SessionDiscardReason };

export function saveSession(
  storage: KeyValueStorage,
  key: string,
  state: SessionState,
  now_ms: number,
  deps: QuotaFallbackDeps,
): void {
  const json = JSON.stringify(toPersisted(state, now_ms));
  writeWithQuotaFallback(storage, key, json, deps);
}

/** `missing` (a fresh install has no `kw.p2.session` key yet) is not an error: returns `undefined`,
 * distinct from a discarded-value `{ ok: false }`. A `JSON.parse` failure is this function's own
 * `corrupt` case (tech note F04 10.2) — it never reaches `fromPersisted`, which only ever sees
 * already-parsed data. */
export function loadSession(
  storage: KeyValueStorage,
  key: string,
  params: SessionParams,
): SessionLoadResult | undefined {
  const raw = storage.getItem(key);
  if (raw === null) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
  const result = fromPersisted(parsed, params);
  if (result.ok) {
    return { ok: true, state: result.state };
  }
  return { ok: false, reason: result.reason };
}
