/**
 * `kw.p2.character` (tech note docs/tech/F10-account-shell.md section 2.2, R21/R22/R27/R30/R49):
 * the player's own typed/randomised name plus whether the 5-slide story has been finished or
 * skipped. Deliberately its own key, not a field on `player`/`SessionState` — see the tech note's
 * own "เหตุผลที่แยก key ไม่ใส่ใน player" for the three reasons (never re-run on the server, PII
 * stays reachable through exactly one reader, migration needs no new session schemaVersion).
 *
 * `name` is already `validateCharacterName`'s own `normalized` output by the time it reaches
 * `saveCharacter` (`@keep-walking/shared/character`, built by P2-F10-T12) — this module never
 * validates or re-normalizes it, and never reads it back into telemetry/export/debug surfaces
 * itself (tech note section 2.2: "ห้ามอ่านชื่อจาก telemetry, debug overlay, export, error report").
 * The create-character screen that actually calls `saveCharacter` with a real name is P2-F10-T15's
 * build — this module only provides the envelope every caller (T14's step-machine wiring, T15's
 * screen, T17's migration path) shares.
 */
import { readEnvelope, writeWithQuotaFallback } from './local-store';
import type { KeyValueStorage, QuotaFallbackDeps } from './local-store';
import type { CharacterStorageV1 } from '../onboarding/onboarding-step';

export const CHARACTER_STORAGE_KEY = 'kw.p2.character';
const CHARACTER_SCHEMA_VERSION = 1;
const CHARACTER_STATE_KEYS = ['name', 'storyDone'] as const;

function isCharacterStorage(value: unknown): value is CharacterStorageV1 {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const keys = Object.keys(v);
  if (keys.length !== CHARACTER_STATE_KEYS.length) return false;
  if (!keys.every((k) => (CHARACTER_STATE_KEYS as readonly string[]).includes(k))) return false;
  return typeof v['name'] === 'string' && typeof v['storyDone'] === 'boolean';
}

/** `null` before the first write, or when the stored value is corrupt/wrong-schema/has extra keys
 * (fail-honest, same convention as `storage/account.ts#loadAccount`). */
export function loadCharacter(storage: KeyValueStorage): CharacterStorageV1 | null {
  const result = readEnvelope(
    storage,
    CHARACTER_STORAGE_KEY,
    CHARACTER_SCHEMA_VERSION,
    isCharacterStorage,
  );
  return result.ok ? result.envelope.state : null;
}

export function saveCharacter(
  storage: KeyValueStorage,
  state: CharacterStorageV1,
  now_ms: number,
  quotaDeps: QuotaFallbackDeps,
): void {
  const value = JSON.stringify({
    schemaVersion: CHARACTER_SCHEMA_VERSION,
    savedAt_ms: now_ms,
    state,
  });
  writeWithQuotaFallback(storage, CHARACTER_STORAGE_KEY, value, quotaDeps);
}

/** Flow D3/D4 (tech note section 3.3 event A8): the story screen's "ออกไปลุย!" button (slide 5) and
 * its "ข้าม" link (slides 1-4) both just flip `storyDone` — finishing and skipping count as the
 * same pass of step 7 (R27). A caller with no character yet is a programming error upstream (the
 * story screen only ever shows once `kw.p2.character` already exists, tech note table 3.1 row 7) —
 * this is a no-op rather than inventing a name, never a crash. */
export function markStoryDone(
  storage: KeyValueStorage,
  now_ms: number,
  quotaDeps: QuotaFallbackDeps,
): void {
  const current = loadCharacter(storage);
  if (current === null || current.storyDone) return;
  saveCharacter(storage, { ...current, storyDone: true }, now_ms, quotaDeps);
}
