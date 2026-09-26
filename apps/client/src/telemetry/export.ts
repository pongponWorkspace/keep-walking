/**
 * Builds the exported `.jsonl` text (D-088, C2-2, C2-4, config/app/telemetry.json#export,
 * docs/tech/F04-dungeon-presence.md section 12.3). Pure string-building only, like
 * `debug/csv-export.ts`: the actual `Blob`/anchor download is DOM glue for a future HUD/settings
 * button (P2-F06-T09), not unit-tested at this level.
 *
 * Every line drops the absolute `client_ts_ms` in favour of `t_rel_ms` (relative to the first
 * exported record, so the file never carries a wall-clock time — C2-4) and re-runs the C2-3 guard
 * on `properties` one more time even though `telemetry/sink.ts` already sanitized them on the way
 * in: two independent passes, matching the tech note's explicit "ด่านก่อนสร้าง Blob (และ test ของ
 * P2-F04-T25)".
 */
import type { CoordinateLikeNumberGuardConfig } from '../config/telemetry';
import { sanitizeProperties } from './guard';
import type { TelemetryRecord } from './sink';

export interface ExportedLine {
  readonly event_name: string;
  readonly t_rel_ms: number;
  readonly session_id: string;
  readonly platform: string;
  readonly app_version: string;
  readonly properties: Record<string, unknown>;
}

export interface BuildExportResult {
  /** One JSON object per line, `\n`-joined, no trailing newline (same LF-only convention as
   * `debug/csv-export.ts`). Empty string when `records` is empty. */
  readonly jsonl: string;
  readonly lineCount: number;
  /** Total properties this export pass additionally redacted (should normally be 0, since
   * `telemetry/sink.ts` already sanitized on the way in; a nonzero count here would mean a record
   * reached the buffer some other way, e.g. `restore()` from an old/foreign export). */
  readonly redactedCount: number;
}

/** Builds the JSONL export text. Records are exported in the order given (oldest first, matching
 * `TelemetrySink.snapshot()`, so `t_rel_ms` is non-negative and non-decreasing). */
export function buildTelemetryExport(
  records: readonly TelemetryRecord[],
  forbiddenPropertyNames: readonly string[],
  coordinateGuard: CoordinateLikeNumberGuardConfig,
): BuildExportResult {
  if (records.length === 0) {
    return { jsonl: '', lineCount: 0, redactedCount: 0 };
  }
  const firstTs = records[0]?.client_ts_ms ?? 0;
  let redactedCount = 0;
  const lines = records.map((record) => {
    const sanitized = sanitizeProperties(
      record.properties,
      forbiddenPropertyNames,
      coordinateGuard,
    );
    redactedCount += sanitized.redactedKeys.length;
    const line: ExportedLine = {
      event_name: record.event_name,
      t_rel_ms: record.client_ts_ms - firstTs,
      session_id: record.session_id,
      platform: record.platform,
      app_version: record.app_version,
      properties: sanitized.properties,
    };
    return JSON.stringify(line);
  });
  return { jsonl: lines.join('\n'), lineCount: lines.length, redactedCount };
}

const RANDOM_ID_HEX_LENGTH = 8;

/** `kw-p2-telemetry-<8 hex>.jsonl` (no date, D-088: the file name itself must not encode a
 * timestamp). `randomHex` defaults to `crypto.randomUUID` trimmed to 8 hex characters (config/app/
 * telemetry.json#export._note); a test passes its own generator for a deterministic name. */
export function exportFileName(
  prefix: string,
  randomHex: () => string = () =>
    crypto.randomUUID().replace(/-/g, '').slice(0, RANDOM_ID_HEX_LENGTH),
): string {
  return `${prefix}-${randomHex()}.jsonl`;
}
