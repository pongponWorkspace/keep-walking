// Reference measurements over a trace, used by the tests and by `stats` to fill the README
// table. These follow the S12 / I1 definitions in docs/tech/F02-map-location-spike.md section 10
// (unfiltered haversine sum, 5-minute window sliding by 30 s). They are expectations for QA and
// for the future gate in packages/geo, not the gate itself.
import type { GpsTrace, TraceSample } from '@keep-walking/shared';
import type { GateComparison } from './config';
import { haversine_m } from './geo';

export const MS_PER_S = 1000;
const S_PER_H = 3600;
const M_PER_KM = 1000;
/** Window slide step from the tech note (S12 definition). A measurement setting, not balance. */
export const GATE_SLIDE_S = 30;
/** A "gap" in the tech note is more than 10 s without a sample (S13). */
export const GAP_THRESHOLD_S = 10;

export interface GateWindow {
  readonly start_s: number;
  readonly distance_m: number;
  readonly pass: boolean;
}

export interface GateOptions {
  readonly window_s: number;
  readonly minDistance_m: number;
  readonly comparison: GateComparison;
  readonly slide_s?: number;
}

export function passesGate(distance_m: number, minDistance_m: number, cmp: GateComparison) {
  return cmp === 'greaterThan' ? distance_m > minDistance_m : distance_m >= minDistance_m;
}

/**
 * Windows [start, start + window] (inclusive, ms) from t = 0, sliding by `slide_s`, while the
 * window fits inside the trace. Distance = sum of haversine over consecutive sample pairs whose
 * two samples both lie inside the window.
 */
export function gateWindows(samples: readonly TraceSample[], opts: GateOptions): GateWindow[] {
  const windowMs = opts.window_s * MS_PER_S;
  const slideMs = (opts.slide_s ?? GATE_SLIDE_S) * MS_PER_S;
  const lastT = samples.at(-1)?.t ?? 0;
  const out: GateWindow[] = [];
  for (let start = 0; start + windowMs <= lastT; start += slideMs) {
    const end = start + windowMs;
    let distance = 0;
    for (let i = 1; i < samples.length; i += 1) {
      const a = samples[i - 1] as TraceSample;
      const b = samples[i] as TraceSample;
      if (a.t >= start && b.t <= end) {
        distance += haversine_m(a, b);
      }
    }
    out.push({
      start_s: start / MS_PER_S,
      distance_m: distance,
      pass: passesGate(distance, opts.minDistance_m, opts.comparison),
    });
  }
  return out;
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
