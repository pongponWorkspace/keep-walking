// Reference measurements over a trace, used by the tests and by `stats` to fill the README
// table. The gate windows come from packages/geo `gateDiagnosticWindows` (P2-F04-T23, TL N-06):
// `distance_m` / `pass` are its raw side (the S12 / I1 definition in
// docs/tech/F02-map-location-spike.md section 10: unfiltered haversine, 5-minute window sliding by
// hudMeasurement.gateWindowStep_s from the first fix), `filtered*` the reward pipeline (ADR 0003
// 5.3). Expectations for QA, not the reward decision itself.
import type { GpsTrace, TraceSample } from '@keep-walking/shared';
import type { GateComparison, GeoSample } from '@keep-walking/geo';
import { MS_PER_S, gateDiagnosticWindows } from '@keep-walking/geo';
import type { TraceConfig } from './config';
import { loadTraceConfig } from './config';
import { haversine_m } from './geo';

export { MS_PER_S };
const S_PER_H = 3600;
const M_PER_KM = 1000;
/** A "gap" in the tech note is more than 10 s without a sample (S13). */
export const GAP_THRESHOLD_S = 10;

export interface GateWindow {
  readonly start_s: number;
  /** Raw haversine over pairs with both fixes inside the window (S12). */
  readonly distance_m: number;
  readonly pass: boolean;
  /** Same window through the geo filter + 5 s resample (the reward pipeline). */
  readonly filteredDistance_m: number;
  readonly filteredPass: boolean;
}

/** TraceSample (`t`, `accuracy`) → geo's GeoSample (`t_ms`, `accuracy_m`). */
export function toGeoSample(s: TraceSample): GeoSample {
  return { t_ms: s.t, lat: s.lat, lng: s.lng, accuracy_m: s.accuracy };
}

/**
 * The first-draft option shape (window, distance, comparison only). Kept so existing callers
 * (qa/tests/traces/engine-movement-gate.test.ts) compile unchanged; the filter + resample
 * parameters and the default slide then come from config via loadTraceConfig().
 * @deprecated Pass the TraceConfig from loadTraceConfig() instead.
 */
export interface GateOptions {
  readonly window_s: number;
  readonly minDistance_m: number;
  readonly comparison: GateComparison;
  readonly slide_s?: number;
}

function isTraceConfig(x: TraceConfig | GateOptions): x is TraceConfig {
  return 'gateFilter' in x;
}

function fromOptions(opts: GateOptions): TraceConfig {
  const base = loadTraceConfig();
  return {
    ...base,
    gateWindow_s: opts.window_s,
    gateMinDistance_m: opts.minDistance_m,
    gateComparison: opts.comparison,
    gateWindowStep_s: opts.slide_s ?? base.gateWindowStep_s,
  };
}

/** Sliding gate windows of a trace, every threshold from config (no copy of the geo rules). */
export function gateWindows(
  samples: readonly TraceSample[],
  cfgOrOptions: TraceConfig | GateOptions,
): GateWindow[] {
  const cfg = isTraceConfig(cfgOrOptions) ? cfgOrOptions : fromOptions(cfgOrOptions);
  return gateDiagnosticWindows(samples.map(toGeoSample), {
    ...cfg.gateFilter,
    window_s: cfg.gateWindow_s,
    windowStep_s: cfg.gateWindowStep_s,
    minDistancePerWindow_m: cfg.gateMinDistance_m,
    comparison: cfg.gateComparison,
  }).map((w) => ({
    start_s: w.start_ms / MS_PER_S,
    distance_m: w.rawDistance_m,
    pass: w.rawPass,
    filteredDistance_m: w.filteredDistance_m,
    filteredPass: w.filteredPass,
  }));
}

export interface TraceStats {
  readonly samples: number;
  readonly duration_s: number;
  readonly pathLength_m: number;
  readonly maxImpliedSpeed_kmh: number;
  readonly maxReportedSpeed_kmh: number | undefined;
  readonly accuracyMin_m: number;
  readonly accuracyMax_m: number;
  readonly accuracyMedian_m: number;
  readonly gaps: number;
  readonly maxGap_s: number;
  readonly events: number;
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

export function toKmh(speed_ms: number): number {
  return (speed_ms * S_PER_H) / M_PER_KM;
}

export function traceStats(trace: GpsTrace): TraceStats {
  const s = trace.samples;
  let path = 0;
  let maxSpeed = 0;
  let gaps = 0;
  let maxGap = 0;
  for (let i = 1; i < s.length; i += 1) {
    const a = s[i - 1] as TraceSample;
    const b = s[i] as TraceSample;
    const d = haversine_m(a, b);
    const dt = (b.t - a.t) / MS_PER_S;
    path += d;
    maxSpeed = Math.max(maxSpeed, d / dt);
    maxGap = Math.max(maxGap, dt);
    if (dt > GAP_THRESHOLD_S) {
      gaps += 1;
    }
  }
  const reported = s.flatMap((x) => (x.speed === undefined ? [] : [x.speed]));
  const acc = s.map((x) => x.accuracy);
  return {
    samples: s.length,
    duration_s: (s.at(-1)?.t ?? 0) / MS_PER_S,
    pathLength_m: path,
    maxImpliedSpeed_kmh: toKmh(maxSpeed),
    maxReportedSpeed_kmh: reported.length > 0 ? toKmh(Math.max(...reported)) : undefined,
    accuracyMin_m: Math.min(...acc),
    accuracyMax_m: Math.max(...acc),
    accuracyMedian_m: median(acc),
    gaps,
    maxGap_s: maxGap,
    events: trace.events?.length ?? 0,
  };
}
