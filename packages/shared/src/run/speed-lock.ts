// Speed lock overlay (F04-R20..R24, tech note F04 section 6, D-094). Uses samples with
// accuracy <= maxSampleAccuracy_m and NO outlier-speed filter (that filter drops the very fast
// pairs a car makes, which would hide it from the lock). A pair further apart than
// maxSamplePairGap_s gives no speed and breaks the run instead of locking or unlocking on it.
import type { GeoSample } from '@keep-walking/geo';
import { MS_PER_S, pairSpeed_kmh } from '@keep-walking/geo';

export interface SpeedLockParams {
  readonly speedLock_kmh: number;
  readonly lockSustained_s: number;
  readonly unlockSustained_s: number;
  readonly maxSampleAccuracy_m: number;
  readonly maxSamplePairGap_s: number;
}

export type SpeedLockPhase = 'enter' | 'exit';

export interface SpeedLockConfirmed {
  readonly phase: SpeedLockPhase;
  readonly at_ms: number;
}

type SpeedLockSample = Pick<GeoSample, 't_ms' | 'lat' | 'lng'>;

/** Serializable state: whether locked, the run of opposite pairs waiting to confirm, and the
 * last accurate fix (needed to pair with the next one). */
export interface SpeedLockState {
  readonly locked: boolean;
  readonly runStart_ms: number | null;
  readonly lastAccurate: SpeedLockSample | null;
}

export function speedLockInit(): SpeedLockState {
  return { locked: false, runStart_ms: null, lastAccurate: null };
}

/** Feeds one fix (in time order), accurate or not. Inaccurate fixes are invisible: they neither
 * pair with anything nor reset the pending run (they simply never happened for the lock). */
export function speedLockStep(
  state: SpeedLockState,
  sample: SpeedLockSample & { readonly accuracy_m: number },
  p: SpeedLockParams,
): { readonly state: SpeedLockState; readonly confirmed: SpeedLockConfirmed | null } {
  if (!(sample.accuracy_m <= p.maxSampleAccuracy_m)) {
    return { state, confirmed: null };
  }
  const next: SpeedLockSample = { t_ms: sample.t_ms, lat: sample.lat, lng: sample.lng };
  const prev = state.lastAccurate;
  if (prev === null) {
    return { state: { ...state, lastAccurate: next }, confirmed: null };
  }
  if (next.t_ms - prev.t_ms > p.maxSamplePairGap_s * MS_PER_S) {
    return {
      state: { locked: state.locked, runStart_ms: null, lastAccurate: next },
      confirmed: null,
    };
  }
  const fast = pairSpeed_kmh(prev, next) > p.speedLock_kmh;
  if (fast === state.locked) {
    return {
      state: { locked: state.locked, runStart_ms: null, lastAccurate: next },
      confirmed: null,
    };
  }
  const runStart_ms = state.runStart_ms ?? prev.t_ms;
  const need_ms = (state.locked ? p.unlockSustained_s : p.lockSustained_s) * MS_PER_S;
  if (next.t_ms - runStart_ms >= need_ms) {
    return {
      state: { locked: !state.locked, runStart_ms: null, lastAccurate: next },
      confirmed: { phase: state.locked ? 'exit' : 'enter', at_ms: runStart_ms },
    };
  }
  return { state: { locked: state.locked, runStart_ms, lastAccurate: next }, confirmed: null };
}

/** Batch form (design/systems/test-vectors/speed-lock.json `speedLock`): every confirmed
 * enter/exit in order, both back-dated to the first sample of their confirming run. */
export function speedLockBatch(
  samples: readonly (SpeedLockSample & { readonly accuracy_m: number })[],
  p: SpeedLockParams,
): readonly SpeedLockConfirmed[] {
  let state = speedLockInit();
  const out: SpeedLockConfirmed[] = [];
  for (const sample of samples) {
    const step = speedLockStep(state, sample, p);
    state = step.state;
    if (step.confirmed !== null) out.push(step.confirmed);
  }
  return out;
}

/** Locked/unlocked at `t_ms` given the ordered list of confirmed transitions. */
export function lockedAt(t_ms: number, transitions: readonly SpeedLockConfirmed[]): boolean {
  let locked = false;
  for (const tr of transitions) {
    if (tr.at_ms <= t_ms) locked = tr.phase === 'enter';
  }
  return locked;
}
