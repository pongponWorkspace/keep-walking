/**
 * The C2-6 "ลบข้อมูลในเครื่อง" behaviour (config/app/privacy.json#localData, docs/tech/
 * F04-dungeon-presence.md section 10.4): removes every `kw.p2.*` key, then re-seeds the telemetry
 * ring buffer with exactly one event, `local_data_cleared` (no properties), so it is the first line
 * of the next export — proving to QA that the data disappeared on purpose, not through a storage
 * bug (`session_state_discarded` is the other, involuntary reason data can vanish).
 *
 * The button itself is P2-F06-T09's job; this module is the pure-enough (storage-only, no `fetch`,
 * no game state import) function that button calls, plus the `afterClear` step
 * (`config/app/privacy.json#localData.afterClear: "reloadToOnboarding"`) via an injected `reload`
 * so this stays unit-testable without a real page navigation.
 */
import { clearKeysWithPrefix, serializeEnvelope } from './local-store';
import type { KeyValueStorage } from './local-store';
import { createTelemetrySink } from '../telemetry/sink';
import type { TelemetrySinkDeps } from '../telemetry/sink';

export interface ClearLocalDataDeps {
  readonly storage: KeyValueStorage;
  readonly storageKeyPrefix: string;
  readonly telemetryStorageKey: string;
  readonly telemetrySchemaVersion: number;
  readonly sink: TelemetrySinkDeps;
  readonly now: () => number;
  /** `config/app/privacy.json#localData.afterClear`; defaults to a no-op so a test does not need
   * to fake `location.reload`. */
  readonly reload?: () => void;
  /** `selectCanClearLocalData(state)` (`@keep-walking/shared/session`, tech note F06 8.3,
   * F06-TG-06): "ฟังก์ชัน clearLocalData ของ client ต้องรับผลของ selector นี้และปฏิเสธเมื่อมี run
   * (กันการเรียกจากที่อื่น)" — checked fresh, synchronously, at the moment this function is called
   * (never cached), so a future second call site that skips the settings-menu row's own disabled
   * state still cannot delete a run in progress. Optional, defaulting to "always allowed", only so
   * a caller/test with no run-state concept of its own (this module's own doc comment: "pure-enough
   * ... no game state import") does not have to invent a trivial `() => true` — the one real call
   * site (`f04-app.ts`) always passes the real selector. */
  readonly canClear?: () => boolean;
}

/** Removes every `kw.p2.*` key, then writes a fresh telemetry buffer containing only
 * `local_data_cleared`, then calls `reload` (if given) — unless `deps.canClear?.()` is `false`, in
 * which case this does nothing at all (no partial clear, no telemetry write, no reload). Returns
 * nothing: the caller already has everything it needs from the deps it passed in (a UI test simply
 * asserts the storage/reload side effects). */
export function clearLocalData(deps: ClearLocalDataDeps): void {
  if (deps.canClear?.() === false) return;
  clearKeysWithPrefix(deps.storage, deps.storageKeyPrefix);
  const sink = createTelemetrySink(deps.sink);
  sink.record('local_data_cleared');
  deps.storage.setItem(
    deps.telemetryStorageKey,
    serializeEnvelope(deps.telemetrySchemaVersion, sink.snapshot(), deps.now()),
  );
  deps.reload?.();
}
