/**
 * `kw.p2.account` (tech note docs/tech/F10-account-shell.md section 2.1, R13/R41/R43/R49): the
 * one thing Phase 2's bypass login writes — which button the player last confirmed and whether
 * they are currently signed in. No email, password, token, birth year or any other value a real
 * provider would hand back (R12) — `provider` is a label on the button pressed, never a real
 * identity (section 1: "ทุกปุ่มยืนยันของ login เป็น bypass").
 *
 * `isAccountStorage` rejects an object with *extra* keys (not just the wrong shape) — tech note
 * section 2.1's own "ไม่มี field อื่นใน state (reader ปฏิเสธ object ที่มี key เกิน เพื่อกันโค้ด
 * อนาคตแอบเติม)" — so a future call site that starts stuffing an email in here fails this reader
 * (and `currentOnboardingStep` sees "no account", fail-honest) instead of silently persisting.
 */
import { readEnvelope, writeWithQuotaFallback } from './local-store';
import type { KeyValueStorage, QuotaFallbackDeps } from './local-store';
import type { AccountStorageV1 } from '../onboarding/onboarding-step';

export const ACCOUNT_STORAGE_KEY = 'kw.p2.account';
const ACCOUNT_SCHEMA_VERSION = 1;
const ACCOUNT_STATE_KEYS = ['provider', 'signedIn'] as const;

function isAccountStorage(value: unknown): value is AccountStorageV1 {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const keys = Object.keys(v);
  if (keys.length !== ACCOUNT_STATE_KEYS.length) return false;
  if (!keys.every((k) => (ACCOUNT_STATE_KEYS as readonly string[]).includes(k))) return false;
  return (
    (v['provider'] === 'google' || v['provider'] === 'apple' || v['provider'] === 'email') &&
    typeof v['signedIn'] === 'boolean'
  );
}

/** `null` before the first write, or when the stored value is corrupt/wrong-schema/has extra keys
 * (fail-honest: the step machine treats this exactly like "no account yet", never a crash). */
export function loadAccount(storage: KeyValueStorage): AccountStorageV1 | null {
  const result = readEnvelope(
    storage,
    ACCOUNT_STORAGE_KEY,
    ACCOUNT_SCHEMA_VERSION,
    isAccountStorage,
  );
  return result.ok ? result.envelope.state : null;
}

export function saveAccount(
  storage: KeyValueStorage,
  state: AccountStorageV1,
  now_ms: number,
  quotaDeps: QuotaFallbackDeps,
): void {
  const value = JSON.stringify({
    schemaVersion: ACCOUNT_SCHEMA_VERSION,
    savedAt_ms: now_ms,
    state,
  });
  writeWithQuotaFallback(storage, ACCOUNT_STORAGE_KEY, value, quotaDeps);
}

/** Flow F10 section 7 F3 / tech note section 4.3 item 3 (R41, D-158): logout only ever flips
 * `signedIn` to `false` on whatever `provider` is already stored — it never deletes the key (that
 * would make this player look "never signed in" instead of "signed out", and
 * `account_login_shown`'s own `context` depends on telling those two apart, tech note section 5) and
 * never changes `provider` (no screen reads it, but there is no reason to touch it either). A
 * caller with no account yet (`loadAccount` returned `null`) has nothing to sign out of — this is a
 * no-op in that case, never a crash or a freshly-invented `provider`. */
export function signOut(
  storage: KeyValueStorage,
  now_ms: number,
  quotaDeps: QuotaFallbackDeps,
): void {
  const current = loadAccount(storage);
  if (current === null || !current.signedIn) return;
  saveAccount(storage, { provider: current.provider, signedIn: false }, now_ms, quotaDeps);
}
