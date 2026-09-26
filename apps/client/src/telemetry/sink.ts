/**
 * The in-device telemetry ring buffer (D-088, C2-2, config/app/telemetry.json#localSink,
 * docs/tech/F04-dungeon-presence.md section 12). No network transport exists in Phase 2
 * (`localSink.networkUploadAllowed: false`): this module only ever writes to
 * `storage/local-store.ts`'s `KeyValueStorage`, never `fetch`.
 *
 * `sessionStep` (once built) has no idea telemetry exists (ADR 0003 3.2 item 7: "engine ไม่ยิง
 * telemetry เอง"); the mapper from an engine/UI event to a `record()` call is P2-F04-T17/T21's job.
 * This module is the sink those calls land in: name-allowlist check, the C2-3 guard
 * (`telemetry/guard.ts`), and `ringBufferMaxEvents`/`ringBufferMaxChars` eviction
 * (`evictionOrder: "oldestFirst"`).
 */
import type { CoordinateLikeNumberGuardConfig } from '../config/telemetry';
import { sanitizeProperties } from './guard';
import type { TelemetryProperties } from './guard';

export interface TelemetryRecord {
  readonly event_name: string;
  readonly client_ts_ms: number;
  readonly session_id: string;
  readonly platform: string;
  readonly app_version: string;
  readonly properties: TelemetryProperties;
}

export interface TelemetrySinkConfig {
  readonly ringBufferMaxEvents: number;
  readonly ringBufferMaxChars: number;
}

export interface TelemetrySinkDeps {
  readonly config: TelemetrySinkConfig;
  readonly forbiddenPropertyNames: readonly string[];
  readonly coordinateGuard: CoordinateLikeNumberGuardConfig;
  /** Exact names from `product/telemetry-events.md` (D-088: "ชื่อที่ไม่รู้จัก = ไม่เก็บ +
   * warning ใน dev"). Passed in, not hardcoded here, so the mapper task (P2-F04-T17/T21) is the
   * one place that decides the current list as the doc evolves. */
  readonly knownEventNames: ReadonlySet<string>;
  readonly sessionId: string;
  readonly platform: string;
  readonly appVersion: string;
  readonly now: () => number;
}

export interface TelemetrySink {
  /** Records one event. A name outside `knownEventNames` is dropped with a dev console warning,
   * never stored (D-088). Every property still goes through the C2-3 guard even for a known name,
   * so a bug in the caller cannot leak a coordinate through an otherwise-legitimate event. */
  record(eventName: string, properties?: TelemetryProperties): void;
  /** Read-only snapshot, oldest first. */
  snapshot(): readonly TelemetryRecord[];
  /** Total properties dropped by the C2-3 guard since creation (for a HUD counter/test, never
   * exported itself). */
  readonly redactedCount: number;
  /** `JSON.stringify` of the current buffer, for `local-store.ts`'s envelope. */
  serialize(): string;
  /** Replaces the buffer with records reloaded from storage (`local-store.ts`'s `readEnvelope`
   * already validated the shape via `isTelemetryRecordArray`); used once at boot. */
  restore(records: readonly TelemetryRecord[]): void;
  /** Drops every event (C2-6 "ลบข้อมูลในเครื่อง"; also used by the quota fallback chain). */
  clear(): void;
  /** Drops roughly the oldest half of the buffer (F04 10.4's first quota-fallback step). */
  trimHalf(): void;
}

function recordChars(record: TelemetryRecord): number {
  return JSON.stringify(record).length;
}

function totalChars(records: readonly TelemetryRecord[]): number {
  return records.reduce((sum, r) => sum + recordChars(r), 0);
}

export function createTelemetrySink(deps: TelemetrySinkDeps): TelemetrySink {
  let records: TelemetryRecord[] = [];
  let redactedCount = 0;

  function evict(): void {
    while (
      records.length > deps.config.ringBufferMaxEvents ||
      totalChars(records) > deps.config.ringBufferMaxChars
    ) {
      if (records.shift() === undefined) {
        break;
      }
    }
  }

  return {
    record(eventName, properties = {}) {
      if (!deps.knownEventNames.has(eventName)) {
        console.warn(`telemetry: unknown event name "${eventName}"; dropped`);
        return;
      }
      const sanitized = sanitizeProperties(
        properties,
        deps.forbiddenPropertyNames,
        deps.coordinateGuard,
      );
      redactedCount += sanitized.redactedKeys.length;
      records.push({
        event_name: eventName,
        client_ts_ms: deps.now(),
        session_id: deps.sessionId,
        platform: deps.platform,
        app_version: deps.appVersion,
        properties: sanitized.properties,
      });
      evict();
    },
    snapshot() {
      return records;
    },
    get redactedCount() {
      return redactedCount;
    },
    serialize() {
      return JSON.stringify(records);
    },
    restore(loaded) {
      records = [...loaded];
      evict();
    },
    clear() {
      records = [];
    },
    trimHalf() {
      const keepFrom = Math.ceil(records.length / 2);
      records = records.slice(keepFrom);
    },
  };
}

/** Runtime type guard for `local-store.ts`'s `readEnvelope` (no Ajv outside tests, C1-4-style
 * discipline even though this module is client code, not `packages/shared`). */
export function isTelemetryRecordArray(value: unknown): value is readonly TelemetryRecord[] {
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every(
    (r) =>
      typeof r === 'object' &&
      r !== null &&
      typeof (r as TelemetryRecord).event_name === 'string' &&
      typeof (r as TelemetryRecord).client_ts_ms === 'number' &&
      typeof (r as TelemetryRecord).session_id === 'string' &&
      typeof (r as TelemetryRecord).platform === 'string' &&
      typeof (r as TelemetryRecord).app_version === 'string' &&
      typeof (r as TelemetryRecord).properties === 'object' &&
      (r as TelemetryRecord).properties !== null,
  );
}
