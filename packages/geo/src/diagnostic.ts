// gateDiagnosticWindows (ADR 0003 5.1): sliding windows for the HUD measurement only. Never
// decides a reward, never lives in the session, never goes to a server (F05-R01).
import type { GateFilterParams } from './filter';
import { filterGateSamples } from './filter';
import type { GridParams, GridPoint } from './grid';
import { gridPairCounts, resampleOnGrid, timeFromOrigin, validateGridParams } from './grid';
import { haversine_m, passesGate } from './haversine';
import { requirePositive } from './params';
import type { GateComparison, GeoSample } from './types';
import { MS_PER_S } from './units';

export interface DiagnosticParams extends GateFilterParams, GridParams {
  /** Config `movementGate.window_s`. */
  readonly window_s: number;
  /** Config `app.client.hudMeasurement.gateWindowStep_s`. */
  readonly windowStep_s: number;
  /** Config `movementGate.minDistancePerWindow_m`. */
  readonly minDistancePerWindow_m: number;
  /** Config `movementGate.comparison`. */
  readonly comparison: GateComparison;
}

export interface DiagnosticWindow {
  /** Window start, ms after the first fix of the segment. The window is [start, start + window]. */
  readonly start_ms: number;
  /** Raw: haversine over consecutive fixes with both ends inside the window, no filtering. */
  readonly rawDistance_m: number;
  readonly rawPass: boolean;
  /** Filtered: steps 1-3 of ADR 0003 5.3, the same pipeline as rewardWindow. */
  readonly filteredDistance_m: number;
  readonly filteredPass: boolean;
}

function rawDistance(samples: readonly GeoSample[], from_ms: number, to_ms: number): number {
  let total = 0;
  for (let k = 1; k < samples.length; k += 1) {
    const a = samples[k - 1] as GeoSample;
    const b = samples[k] as GeoSample;
    if (a.t_ms >= from_ms && b.t_ms <= to_ms) total += haversine_m(a, b);
  }
  return total;
}

function filteredDistance(points: readonly GridPoint[], from_ms: number, to_ms: number): number {
  let total = 0;
  for (let k = 1; k < points.length; k += 1) {
    const a = points[k - 1] as GridPoint;
    const b = points[k] as GridPoint;
    if (a.tau_ms >= from_ms && b.tau_ms <= to_ms && gridPairCounts(a, b)) {
      total += haversine_m(a, b);
    }
  }
  return total;
}

/**
 * Windows of `window_s` from the first fix, sliding by `windowStep_s`, while the window fits in
 * the segment. `samples` must be one segment in time order (the HUD keeps window_s of history in
 * memory only, ADR 0003 5.4).
 */
export function gateDiagnosticWindows(
  samples: readonly GeoSample[],
  p: DiagnosticParams,
): DiagnosticWindow[] {
  requirePositive('window_s', p.window_s);
  requirePositive('windowStep_s', p.windowStep_s);
  requirePositive('minDistancePerWindow_m', p.minDistancePerWindow_m);
  validateGridParams(p);
  const first = samples[0];
  const lastSample = samples.at(-1);
  if (first === undefined || lastSample === undefined) return [];
  const t0 = first.t_ms;
  const rel = samples.map((s) => ({ ...s, t_ms: s.t_ms - t0 }));
  const { kept } = filterGateSamples(rel, p);
  const points = resampleOnGrid(timeFromOrigin(kept, 0), p);
  const window_ms = p.window_s * MS_PER_S;
  const step_ms = p.windowStep_s * MS_PER_S;
  const end_ms = lastSample.t_ms - t0;
  const out: DiagnosticWindow[] = [];
  for (let start = 0; start + window_ms <= end_ms; start += step_ms) {
    const raw = rawDistance(rel, start, start + window_ms);
    const filtered = filteredDistance(points, start, start + window_ms);
    out.push({
      start_ms: start,
      rawDistance_m: raw,
      rawPass: passesGate(raw, p.minDistancePerWindow_m, p.comparison),
      filteredDistance_m: filtered,
      filteredPass: passesGate(filtered, p.minDistancePerWindow_m, p.comparison),
    });
  }
  return out;
}
