/**
 * Turns the in-device telemetry ring buffer (`telemetry/sink.ts`) into a downloaded `.jsonl` file
 * (C2-2, D-088, `config/app/telemetry.json#export`, `product/telemetry-events.md` section 8): the
 * settings menu's "export" row (`ui/settings-menu.ts`, P2-X50) is the one caller. Playtest
 * participants have no other way to get their telemetry off the device — there is no server and no
 * auto-upload (D-088, C2-1).
 *
 * Same `Blob` + anchor pattern `debug/hud-panel.ts`'s own `downloadTextFile` already uses for the
 * summary CSV / raw-trace debug exports; kept as its own tiny copy here rather than shared, since
 * that module is dev/QA-only (`hud=1`) and this one is a player-facing settings row — two different
 * call sites that happen to need the same four lines of DOM glue, not a shared abstraction worth
 * the indirection.
 *
 * All the privacy-bearing work (no wall-clock time, no coordinate, no forbidden property name) is
 * `buildTelemetryExport`'s job (`telemetry/export.ts`, already unit-tested on its own); this module
 * only wires that pure function's output into an actual file download and never inspects the
 * records itself.
 */
import { buildTelemetryExport, exportFileName } from './export';
import type { TelemetryRecord } from './sink';
import type { CoordinateLikeNumberGuardConfig } from '../config/telemetry';

export interface DownloadTelemetryExportDeps {
  readonly records: readonly TelemetryRecord[];
  readonly forbiddenPropertyNames: readonly string[];
  readonly coordinateGuard: CoordinateLikeNumberGuardConfig;
  readonly fileNamePrefix: string;
  readonly mimeType: string;
}

/** Builds the JSONL text, names the file (`config/app/telemetry.json#export.fileNamePrefix`, a
 * random 8-hex suffix, no date and no session id — `exportFileName`'s own doc comment), and
 * triggers the browser's normal download UI. Returns the file name actually used, so a caller (or
 * a test) can assert on it without re-deriving the naming scheme. */
export function downloadTelemetryExport(deps: DownloadTelemetryExportDeps): string {
  const result = buildTelemetryExport(
    deps.records,
    deps.forbiddenPropertyNames,
    deps.coordinateGuard,
  );
  const fileName = exportFileName(deps.fileNamePrefix);
  const blob = new Blob([result.jsonl], { type: deps.mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
  return fileName;
}
