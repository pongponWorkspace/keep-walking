/**
 * Builds the `summary-<session_id>.csv` file (docs/tech/gps-trace-format.md section 4.1): the
 * default export, no coordinates, downloadable straight from the HUD. Pure string-building only —
 * `debug/hud-panel.ts` does the actual `Blob`/anchor download, which needs a DOM this module (like
 * `debug/stats.ts`) deliberately avoids so it stays unit-testable (ADR 0001 3.6).
 *
 * Column list and order are fixed by the trace-format doc; this file must never add, rename, or
 * silently drop one (config/app/privacy.json#summaryExport is the guard-rail note tech-lead left for
 * this task). A missing measurement is an empty CSV cell (gps-trace-format.md 4.1: "ค่าว่าง =
 * วัดไม่ได้"), never a coordinate, a device model, or a full user agent string.
 */

export const SUMMARY_CSV_FORMAT_VERSION = 1;

/** One row of the summary CSV. Every field the doc lists; `undefined` becomes an empty cell. */
export interface SummaryRow {
  readonly sessionId: string;
  readonly appVersion: string;
  readonly tilesetId: string | undefined;
  readonly platform: 'android-chrome' | 'ios-safari' | 'other';
  readonly environment: 'park' | 'soi' | 'other';
  readonly segment: 'all' | 'screen_on' | 'pocket' | 'stationary';
  readonly localHour: number;
  readonly durationS: number;
  readonly fpsPanAvg: number | undefined;
  readonly fpsPanP5: number | undefined;
  readonly fpsFollowAvg: number | undefined;
  readonly fpsFollowP5: number | undefined;
  readonly movingTimePanS: number | undefined;
  readonly movingTimeFollowS: number | undefined;
  readonly batteryStartPct: number | undefined;
  readonly batteryEndPct: number | undefined;
  readonly batteryDrainPer30MinPct: number | undefined;
  readonly batterySource: 'api' | 'manual' | 'none';
  readonly mbJs: number | undefined;
  readonly mbStyle: number | undefined;
  readonly mbTiles: number | undefined;
  readonly mbTotal: number | undefined;
  readonly bytesMethod: 'transfer' | 'decoded';
  readonly timeToFirstMapMs: number | undefined;
  readonly sampleCount: number;
  readonly sampleIntervalMedianS: number | undefined;
  readonly ttff30mS: number | undefined;
  readonly accuracyMedianM: number | undefined;
  readonly accuracyP90M: number | undefined;
  readonly accuracyMaxM: number | undefined;
  readonly gapCount10s: number;
  readonly gapTotalS: number;
  readonly gapPct: number;
  readonly pathLengthM: number;
  readonly gateWindowsTotal: number;
  readonly gateWindowsPass: number;
  readonly gateWindowsPassPct: number;
  readonly stationary5MinAccumM: number | undefined;
  readonly latencyMedianMs: number | undefined;
  readonly latencyP90Ms: number | undefined;
}

/** Column order is the CSV header, in the exact order gps-trace-format.md 4.1 lists them. */
const COLUMNS: readonly (keyof SummaryRow)[] = [
  'appVersion',
  'tilesetId',
  'platform',
  'environment',
  'segment',
  'localHour',
  'durationS',
  'fpsPanAvg',
  'fpsPanP5',
  'fpsFollowAvg',
  'fpsFollowP5',
  'movingTimePanS',
  'movingTimeFollowS',
  'batteryStartPct',
  'batteryEndPct',
  'batteryDrainPer30MinPct',
  'batterySource',
  'mbJs',
  'mbStyle',
  'mbTiles',
  'mbTotal',
  'bytesMethod',
  'timeToFirstMapMs',
  'sampleCount',
  'sampleIntervalMedianS',
  'ttff30mS',
  'accuracyMedianM',
  'accuracyP90M',
  'accuracyMaxM',
  'gapCount10s',
  'gapTotalS',
  'gapPct',
  'pathLengthM',
  'gateWindowsTotal',
  'gateWindowsPass',
  'gateWindowsPassPct',
  'stationary5MinAccumM',
  'latencyMedianMs',
  'latencyP90Ms',
];

const HEADER_SNAKE_CASE: Readonly<Record<keyof SummaryRow, string>> = {
  sessionId: 'session_id',
  appVersion: 'app_version',
  tilesetId: 'tileset_id',
  platform: 'platform',
  environment: 'environment',
  segment: 'segment',
  localHour: 'local_hour',
  durationS: 'duration_s',
  fpsPanAvg: 'fps_pan_avg',
  fpsPanP5: 'fps_pan_p5',
  fpsFollowAvg: 'fps_follow_avg',
  fpsFollowP5: 'fps_follow_p5',
  movingTimePanS: 'moving_time_pan_s',
  movingTimeFollowS: 'moving_time_follow_s',
  batteryStartPct: 'battery_start_pct',
  batteryEndPct: 'battery_end_pct',
  batteryDrainPer30MinPct: 'battery_drain_per30min_pct',
  batterySource: 'battery_source',
  mbJs: 'mb_js',
  mbStyle: 'mb_style',
  mbTiles: 'mb_tiles',
  mbTotal: 'mb_total',
  bytesMethod: 'bytes_method',
  timeToFirstMapMs: 'time_to_first_map_ms',
  sampleCount: 'sample_count',
  sampleIntervalMedianS: 'sample_interval_median_s',
  ttff30mS: 'ttff_30m_s',
  accuracyMedianM: 'accuracy_median_m',
  accuracyP90M: 'accuracy_p90_m',
  accuracyMaxM: 'accuracy_max_m',
  gapCount10s: 'gap_count_10s',
  gapTotalS: 'gap_total_s',
  gapPct: 'gap_pct',
  pathLengthM: 'path_length_m',
  gateWindowsTotal: 'gate_windows_total',
  gateWindowsPass: 'gate_windows_pass',
  gateWindowsPassPct: 'gate_windows_pass_pct',
  stationary5MinAccumM: 'stationary_5min_accum_m',
  latencyMedianMs: 'latency_median_ms',
  latencyP90Ms: 'latency_p90_ms',
};

function cell(value: string | number | undefined): string {
  if (value === undefined) {
    return '';
  }
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds the full CSV text (header + one line per row), `\r\n`-free (LF only). Every row also
 * carries `format_version`/`session_id` (constant per session, not per-row varying columns in the
 * doc's table, but required on every line so a row is self-describing once downloaded). */
export function buildSummaryCsv(rows: readonly SummaryRow[]): string {
  const header = ['format_version', 'session_id', ...COLUMNS.map((key) => HEADER_SNAKE_CASE[key])];
  const lines = rows.map((row) =>
    [SUMMARY_CSV_FORMAT_VERSION, row.sessionId, ...COLUMNS.map((key) => row[key])]
      .map(cell)
      .join(','),
  );
  return [header.join(','), ...lines].join('\n');
}
