// Step 1 of ADR 0003 5.3: drop outliers only. No smoothing, no minimum step, no Kalman: small
// jitter passes untouched, so a bench still earns distance and a table earns only what its
// (tiny) jitter really is.
import { pairSpeed_kmh } from './haversine';
import { requirePositive, requirePositiveInteger } from './params';
import type { GeoSample } from './types';

export interface GateFilterParams {
  /** Drop a fix whose accuracy radius is worse than this (equal is kept). Config key of the same name. */
  readonly maxSampleAccuracy_m: number;
  /** Drop a fix whose speed from the anchor is above this (impossible for a walker). */
  readonly outlierSpeed_kmh: number;
  /** Consecutive, mutually consistent speed drops after which the latest becomes the new anchor. */
  readonly outlierReanchorSamples: number;
}

export type DropReason = 'accuracy' | 'speed' | 'time_order';

/** Serializable filter state (ADR 0003 5.4): the anchor and the speed drops waiting to re-anchor. */
export interface GateFilterState<S extends GeoSample = GeoSample> {
  readonly anchor: S | null;
  readonly pending: readonly S[];
}

export type FilterVerdict =
  /** `breakBefore`: the pair (previous kept, this) must add no distance (first fix or re-anchor). */
  | { readonly kept: true; readonly breakBefore: boolean; readonly reanchored: boolean }
  | { readonly kept: false; readonly reason: DropReason };

export interface KeptSample<S extends GeoSample = GeoSample> {
  readonly sample: S;
  readonly breakBefore: boolean;
}

export interface DroppedSample<S extends GeoSample = GeoSample> {
  readonly sample: S;
  readonly index: number;
  readonly reason: DropReason;
}

export function validateGateFilterParams(p: GateFilterParams): void {
  requirePositive('maxSampleAccuracy_m', p.maxSampleAccuracy_m);
  requirePositive('outlierSpeed_kmh', p.outlierSpeed_kmh);
  requirePositiveInteger('outlierReanchorSamples', p.outlierReanchorSamples);
}

export function gateFilterInit<S extends GeoSample = GeoSample>(): GateFilterState<S> {
  return { anchor: null, pending: [] };
}

/** Feeds one fix (in time order) through the outlier filter. Pure: returns the next state. */
export function gateFilterStep<S extends GeoSample>(
  state: GateFilterState<S>,
  sample: S,
  p: GateFilterParams,
): { readonly state: GateFilterState<S>; readonly verdict: FilterVerdict } {
  if (!(sample.accuracy_m <= p.maxSampleAccuracy_m)) {
    // Accuracy drops are invisible to the re-anchor count: they neither extend nor reset it.
    return { state, verdict: { kept: false, reason: 'accuracy' } };
  }
  const last = state.pending.at(-1) ?? state.anchor;
  if (last !== null && sample.t_ms <= last.t_ms) {
    return { state, verdict: { kept: false, reason: 'time_order' } };
  }
  if (state.anchor === null) {
    return {
      state: { anchor: sample, pending: [] },
      verdict: { kept: true, breakBefore: true, reanchored: false },
    };
  }
  if (pairSpeed_kmh(state.anchor, sample) <= p.outlierSpeed_kmh) {
    return {
      state: { anchor: sample, pending: [] },
      verdict: { kept: true, breakBefore: false, reanchored: false },
    };
  }
  const prev = state.pending.at(-1);
  const consistent = prev === undefined || pairSpeed_kmh(prev, sample) <= p.outlierSpeed_kmh;
  const pending = consistent ? [...state.pending, sample] : [sample];
  if (pending.length >= p.outlierReanchorSamples) {
    // The position really moved (e.g. GPS back after a building): restart from here. The jump
    // itself adds 0 because the next pair is marked as a break.
    return {
      state: { anchor: sample, pending: [] },
      verdict: { kept: true, breakBefore: true, reanchored: true },
    };
  }
  return { state: { anchor: state.anchor, pending }, verdict: { kept: false, reason: 'speed' } };
}

/** Batch form of step 1 (HUD, tests): kept fixes in order plus every dropped fix with its reason. */
export function filterGateSamples<S extends GeoSample>(
  samples: readonly S[],
  p: GateFilterParams,
): { readonly kept: KeptSample<S>[]; readonly dropped: DroppedSample<S>[] } {
  validateGateFilterParams(p);
  let state = gateFilterInit<S>();
  const kept: KeptSample<S>[] = [];
  const dropped: DroppedSample<S>[] = [];
  samples.forEach((sample, index) => {
    const r = gateFilterStep(state, sample, p);
    state = r.state;
    if (r.verdict.kept) kept.push({ sample, breakBefore: r.verdict.breakBefore });
    else dropped.push({ sample, index, reason: r.verdict.reason });
  });
  return { kept, dropped };
}
