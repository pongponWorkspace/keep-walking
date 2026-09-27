/**
 * `kw.p2.interest` (tech note F06 8.1, spec F06 R52 item 2/3, R53): the one thing S-09 persists —
 * a single `{ scope, areaId }` choice, on-device only, no coordinates, no free text. Overwritten
 * (never appended) every time the player confirms a new choice (F06-R53: "เปลี่ยนหรือถอนได้ตลอด").
 * `interest_registered_outside_area` (`product/telemetry-events.md`) is the caller's job, not
 * this module's — this file only owns the storage envelope.
 */
import { readEnvelope, writeWithQuotaFallback } from './local-store';
import type { KeyValueStorage, QuotaFallbackDeps } from './local-store';

export const INTEREST_STORAGE_KEY = 'kw.p2.interest';
const SCHEMA_VERSION = 1;

export interface InterestRecord {
  readonly schemaVersion: 1;
  readonly scope: 'district' | 'province';
  /** A study-districts id (`district` scope) or a province name key/id (`province` scope) — never
   * a coordinate or free text (R53). */
  readonly areaId: string;
}

function isInterestRecord(value: unknown): value is InterestRecord {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v['schemaVersion'] === 1 &&
    (v['scope'] === 'district' || v['scope'] === 'province') &&
    typeof v['areaId'] === 'string'
  );
}

/** `null` when nothing has ever been confirmed, or the stored value is missing/corrupt (fail-honest:
 * treated the same as "never registered", never a crash). */
export function loadInterest(storage: KeyValueStorage): InterestRecord | null {
  const result = readEnvelope(storage, INTEREST_STORAGE_KEY, SCHEMA_VERSION, isInterestRecord);
  return result.ok ? result.envelope.state : null;
}

/** Overwrites the single stored choice (R53: always replaces, never appends a history). */
export function saveInterest(
  storage: KeyValueStorage,
  record: InterestRecord,
  now_ms: number,
  quotaDeps: QuotaFallbackDeps,
): void {
  const value = JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    savedAt_ms: now_ms,
    state: record,
  });
  writeWithQuotaFallback(storage, INTEREST_STORAGE_KEY, value, quotaDeps);
}
