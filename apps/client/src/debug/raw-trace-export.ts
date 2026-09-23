/**
 * Builds the opt-in `field-<session_id>.trace.json` raw trace (docs/tech/gps-trace-format.md
 * section 4.2): trims both ends by distance, shifts to relative time, rounds coordinates, and
 * refuses to hand back a trace that fails `validateTrace` — the actual gate a player must clear
 * before this workspace lets a coordinate leave the device (config/app/privacy.json
 * `rawTraceExport.requiresExplicitOptIn`/`autoUploadAllowed: false`: this only ever produces a
 * value for a caller to offer as a file *download*, never anything this codebase transmits).
 *
 * Pure (no DOM, no fetch): `debug/hud-panel.ts` does the actual opt-in prompt and file download.
 */
import { validateTrace, TRACE_FORMAT } from '@keep-walking/shared';
import type { GpsTrace, TraceEnvironment, TraceSample } from '@keep-walking/shared';
import { at, haversineMeters } from './stats';
import type { HudSample } from './stats';

const DECIMAL_BASE = 10;

export interface RawTraceExportOptions {
  readonly rawTraceTrim_m: number;
  readonly coordinateDecimals: number;
  readonly sessionId: string;
  readonly environment?: TraceEnvironment;
}

export type SanitizeRawTraceResult =
  { readonly ok: true; readonly trace: GpsTrace } | { readonly ok: false; readonly reason: string };

interface TrimResult {
  readonly cutCount: number;
  readonly trimmed_m: number;
}

/** Walks cumulative distance from one end until it exceeds `trimTarget_m`, and reports exactly how
 * far that cut point is (never less than `trimTarget_m`, so `validateTrace`'s `minTrim_m` check
 * always sees the real trimmed distance, not just the configured target). */
function cumulativeTrim(
  samples: readonly HudSample[],
  trimTarget_m: number,
  fromStart: boolean,
): TrimResult {
  const ordered = fromStart ? samples : [...samples].reverse();
  let cumulative = 0;
  for (let i = 1; i < ordered.length; i++) {
    cumulative += haversineMeters(at(ordered, i - 1), at(ordered, i));
    if (cumulative > trimTarget_m) {
      return { cutCount: i, trimmed_m: cumulative };
    }
  }
  return { cutCount: ordered.length, trimmed_m: cumulative };
}

function roundCoordinate(value: number, decimals: number): number {
  const factor = DECIMAL_BASE ** decimals;
  return Math.round(value * factor) / factor;
}

const MIN_SAMPLES_TO_EXPORT = 2;

/** Trims, rounds, and relativizes `samples` into a `kind: "field"` `GpsTrace`, then runs it through
 * `validateTrace` (the same function the Mock provider and, from Phase 3, the server use) before
 * handing it back — a trace this function returns `ok: true` for is one the tech gate accepts. */
export function sanitizeRawTrace(
  samples: readonly HudSample[],
  options: RawTraceExportOptions,
): SanitizeRawTraceResult {
  if (samples.length < MIN_SAMPLES_TO_EXPORT) {
    return { ok: false, reason: 'not enough samples to export a trace' };
  }

  const startTrim = cumulativeTrim(samples, options.rawTraceTrim_m, true);
  const afterStart = samples.slice(startTrim.cutCount);
  if (afterStart.length < MIN_SAMPLES_TO_EXPORT) {
    return { ok: false, reason: 'walked distance is too short to trim safely at both ends' };
  }
  const endTrim = cumulativeTrim(afterStart, options.rawTraceTrim_m, false);
  const kept = afterStart.slice(0, afterStart.length - endTrim.cutCount);
  if (kept.length < MIN_SAMPLES_TO_EXPORT) {
    return { ok: false, reason: 'walked distance is too short to trim safely at both ends' };
  }

  const firstTimestamp = at(kept, 0).timestamp;
  const traceSamples: TraceSample[] = kept.map((s) => ({
    t: s.timestamp - firstTimestamp,
    lat: roundCoordinate(s.lat, options.coordinateDecimals),
    lng: roundCoordinate(s.lng, options.coordinateDecimals),
    accuracy: s.accuracy,
  }));

  const trace: GpsTrace = {
    format: TRACE_FORMAT.name,
    formatVersion: TRACE_FORMAT.version,
    meta: {
      id: `field-${options.sessionId}`,
      kind: 'field',
      timeBase: 'relative-ms',
      sanitized: {
        trimStart_m: startTrim.trimmed_m,
        trimEnd_m: endTrim.trimmed_m,
        coordinateDecimals: options.coordinateDecimals,
      },
      ...(options.environment !== undefined ? { environment: options.environment } : {}),
    },
    samples: traceSamples,
  };

  const result = validateTrace(trace, { minTrim_m: options.rawTraceTrim_m });
  if (!result.ok) {
    return {
      ok: false,
      reason: result.errors.map((e) => `${e.path}: ${e.message}`).join('; '),
    };
  }
  return { ok: true, trace };
}
