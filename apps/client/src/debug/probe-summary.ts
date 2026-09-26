/**
 * Builds the HUD's "probe summary" export (P2-F04-T10, F-17): Wake Lock / vibrate / page-hidden /
 * battery results in one small, coordinate-free text file a human tester downloads and pastes into
 * `qa/playtest/results/<date>-probe-<device>.md` (P2-F04-T11). Separate from
 * `debug/csv-export.ts`'s fixed-column `summary-<session_id>.csv` (gps-trace-format.md 4.1 already
 * locks that column list; this is not one more column bolted on, it is the F-17 probe's own export)
 * — same "no coordinates, timestamps relative" rule (D-088), enforced here by construction: every
 * timestamp in `ProbeSummaryInput` is pre-computed relative to the probe's own start, never a raw
 * epoch ms or a lat/lng.
 */
import type { WakeLockState } from './wake-lock';
import type { BatterySource } from './battery';

export interface WakeLockEventLog {
  readonly atRelativeMs: number;
  readonly state: WakeLockState;
  readonly detail: string | undefined;
}

export interface ProbeSummaryInput {
  readonly sessionId: string;
  readonly wakeLockSupported: boolean;
  readonly wakeLockEvents: readonly WakeLockEventLog[];
  readonly vibrateSupported: boolean | undefined;
  readonly vibrateTriggered: boolean | undefined;
  readonly hiddenTotalS: number;
  readonly samplesWhileHidden: number;
  readonly samplesWhileVisible: number;
  readonly batteryStartPct: number | undefined;
  readonly batteryEndPct: number | undefined;
  readonly batterySource: BatterySource;
  readonly elapsedS: number;
}

function line(label: string, value: string | number | boolean | undefined): string {
  return `${label}: ${value ?? ''}`;
}

function formatSupport(supported: boolean | undefined): string {
  if (supported === undefined) {
    return 'not tested';
  }
  return supported ? 'supported' : 'unsupported';
}

/** Plain text, LF-only (same convention as `csv-export.ts`'s `buildSummaryCsv`). */
export function buildProbeSummaryText(input: ProbeSummaryInput): string {
  const lines: string[] = [
    line('session_id', input.sessionId),
    line('elapsed_s', input.elapsedS),
    line('wake_lock_supported', input.wakeLockSupported),
    ...input.wakeLockEvents.map((event) =>
      line(
        `wake_lock_event_at_${event.atRelativeMs}ms`,
        `${event.state}${event.detail !== undefined ? ` (${event.detail})` : ''}`,
      ),
    ),
    line('vibrate', formatSupport(input.vibrateSupported)),
    ...(input.vibrateSupported === true ? [line('vibrate_triggered', input.vibrateTriggered)] : []),
    line('hidden_total_s', input.hiddenTotalS),
    line('samples_while_hidden', input.samplesWhileHidden),
    line('samples_while_visible', input.samplesWhileVisible),
    line('battery_start_pct', input.batteryStartPct),
    line('battery_end_pct', input.batteryEndPct),
    line('battery_source', input.batterySource),
  ];
  return lines.join('\n');
}
