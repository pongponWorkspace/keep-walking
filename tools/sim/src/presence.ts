// Reference implementation of presence, run state, check-in, speed lock, time gates and opening
// hours (spec F04 R07-R31, tech note F04 sections 4-8, P2-F05-T20). Batch form over a list of
// samples; the engine (packages/shared/src/run) is incremental but must reach the same settled
// result. Every threshold is a parameter; nothing here is a balance value.
import { MS_PER_S, filterSamples, pairSpeed_kmh } from './gate';
import type { GateParams, Sample } from './gate';

export interface PresenceSample extends Sample {
  /** Distance to the polygon boundary in metres (geo boundaryDistance_m). */
  boundaryDistance_m: number;
}

export interface HysteresisParams {
  edgeHysteresisSamples: number;
  edgeHysteresis_m: number;
}

export type Side = 'in' | 'out';

/**
 * Edge hysteresis, the reading confirmed in P2-F05-T20 (answers A-P2-F04-T14-1 and
 * A-P2-F04-T12-2). The pending run = consecutive usable samples observed on the other side; a
 * usable sample on the confirmed side resets it. A sample counts only when it is further than
 * edgeHysteresis_m from the boundary (edgeHysteresis_m = 0: every sample counts, on-boundary
 * included); samples inside that band neither count nor reset. The change
 * is confirmed when edgeHysteresisSamples samples have counted, and takes effect at the FIRST
 * sample of the pending run (band samples included, F04 R14). Both directions use the same rule.
 */
export class Hysteresis {
  side: Side;
  firstAt_ms: number | null = null;
  counted = 0;
  constructor(
    side: Side,
    private readonly p: HysteresisParams,
  ) {
    this.side = side;
  }
  reset(): void {
    this.firstAt_ms = null;
    this.counted = 0;
  }
  /** Returns the back-dated time of a confirmed change, or null. */
  feed(s: PresenceSample): number | null {
    const obs: Side = s.inside ? 'in' : 'out';
    if (obs === this.side) {
      this.reset();
      return null;
    }
    this.firstAt_ms ??= s.t_ms;
    // A-P2-X03-3 (confirmed in P2-X13): edgeHysteresis_m = 0 means no band, so every sample on
    // the other side counts, including one exactly on the boundary (tech note F04 5.2). On-edge
    // is already inside for point-in-polygon (P2-X06), so this only matters for a return.
    if (this.p.edgeHysteresis_m === 0 || s.boundaryDistance_m > this.p.edgeHysteresis_m)
      this.counted += 1;
    if (this.counted < this.p.edgeHysteresisSamples) return null;
    const at = this.firstAt_ms;
    this.side = obs;
    this.reset();
    return at;
  }
}

export interface RunStateParams extends GateParams, HysteresisParams {
  graceMax_s: number;
  suspendedMax_s: number;
}

export type RunEvent =
  | { type: 'run_state_changed'; from: string; to: string; cause: string; at_ms: number }
  | { type: 'dungeon_exited'; exitReason: 'timeout'; at_ms: number };

export interface RunTimeline {
  events: RunEvent[];
  /** Settled status at now_ms: active | grace | suspended | ended. */
  status: string;
  /** Start of the current exit (null when active or ended). */
  exitStartedAt_ms: number | null;
  /** A pending run on the other side waits for confirmation (settled horizon held at its start). */
  pendingSince_ms: number | null;
}

/**
 * Run state over the samples after confirm (confirm = Active, F04 7.4). Samples go through step 1
 * of the gate filter (usable = kept, F04 5.1). Exits: polygon (hysteresis, back-dated) or no
 * evidence (a gap > maxSamplePairGap_s while in: exit at the last usable sample, F04 5.3). A gap
 * > maxSamplePairGap_s also drops any pending run (correction proposed in P2-F05-T20: otherwise a
 * half-built return run would hold the settled horizon across an app closure). Timers fire when
 * their first qualifying ms <= H = min(E, P) (F04 4.3), so a return back-dated before a timer
 * cancels it: Grace -> Suspended when outside time > graceMax_s, Ended timeout when outside time >
 * suspendedMax_s with endedAt = exit + suspendedMax_s (R18).
 * Return after no evidence (F04 R15 item 7, J-P2-T30-4, P2-X17): the first usable sample after a
 * no_evidence exit is judged once, after the timers settle to its time. Inside (inner band
 * included) = Active at that sample, no hysteresis. Outside = a real exit: exitStartedAt_ms stays
 * at the last usable sample before the gap and a later return needs the full hysteresis run.
 * Outside time > suspendedMax_s before it = Ended timeout either way (the sample is not fed).
 */
export function runTimeline(
  samples: readonly PresenceSample[],
  confirmAt_ms: number,
  now_ms: number,
  p: RunStateParams,
): RunTimeline {
  const input = samples.filter((s) => s.t_ms >= confirmAt_ms && s.t_ms <= now_ms);
  const verdicts = filterSamples(input, p);
  const usable = input.filter((_, i) => verdicts[i]?.kept === true);
  const gap_ms = p.maxSamplePairGap_s * MS_PER_S;
  const h = new Hysteresis('in', p);
  const events: RunEvent[] = [];
  let exitAt: number | null = null;
  let suspended = false;
  let ended = false;
  let lastUsable = confirmAt_ms;
  /** The next usable sample is the first one after a no_evidence exit (R15 item 7). */
  let afterNoEvidence = false;
  const status = () => (suspended ? 'suspended' : 'grace');
  const settle = (upTo: number) => {
    if (exitAt === null || ended) return;
    const suspTrigger = exitAt + p.graceMax_s * MS_PER_S + 1;
    if (!suspended && suspTrigger <= upTo) {
      events.push({
        type: 'run_state_changed',
        from: 'grace',
        to: 'suspended',
        cause: 'grace_expired',
        at_ms: suspTrigger,
      });
      suspended = true;
    }
    const endAt = exitAt + p.suspendedMax_s * MS_PER_S;
    if (endAt + 1 <= upTo) {
      events.push({ type: 'dungeon_exited', exitReason: 'timeout', at_ms: endAt });
      ended = true;
    }
  };
  const leave = (at: number, cause: string) => {
    events.push({ type: 'run_state_changed', from: 'active', to: 'grace', cause, at_ms: at });
    exitAt = at;
    suspended = false;
  };
  for (const s of usable) {
    if (s.t_ms - lastUsable > gap_ms) {
      h.reset();
      if (h.side === 'in') {
        leave(lastUsable, 'no_evidence');
        h.side = 'out';
        afterNoEvidence = true;
      }
    }
    settle(Math.min(s.t_ms, h.firstAt_ms ?? s.t_ms));
    if (ended) break;
    if (afterNoEvidence) {
      afterNoEvidence = false;
      if (s.inside) {
        events.push({
          type: 'run_state_changed',
          from: status(),
          to: 'active',
          cause: 'returned',
          at_ms: s.t_ms,
        });
        exitAt = null;
        suspended = false;
        h.side = 'in';
        h.reset();
        lastUsable = s.t_ms;
        continue;
      }
    }
    const at = h.feed(s);
    if (at !== null && h.side === 'in') {
      settle(at);
      if (ended) break;
      events.push({
        type: 'run_state_changed',
        from: status(),
        to: 'active',
        cause: 'returned',
        at_ms: at,
      });
      exitAt = null;
      suspended = false;
    } else if (at !== null) {
      leave(at, 'left_polygon');
    }
    lastUsable = s.t_ms;
    settle(Math.min(s.t_ms, h.firstAt_ms ?? s.t_ms));
    if (ended) break;
  }
  if (!ended && now_ms - lastUsable > gap_ms) {
    h.reset();
    if (h.side === 'in') {
      leave(lastUsable, 'no_evidence');
      h.side = 'out';
    }
  }
  const E = now_ms - lastUsable <= gap_ms ? lastUsable : now_ms;
  settle(Math.min(E, h.firstAt_ms ?? E));
  let finalStatus = 'active';
  if (ended) finalStatus = 'ended';
  else if (exitAt !== null) finalStatus = status();
  return {
    events,
    status: finalStatus,
    exitStartedAt_ms: ended ? null : exitAt,
    pendingSince_ms: ended ? null : h.firstAt_ms,
  };
}

export interface SpeedLockParams {
  speedLock_kmh: number;
  lockSustained_s: number;
  unlockSustained_s: number;
  maxSampleAccuracy_m: number;
  maxSamplePairGap_s: number;
}

export interface LockTransition {
  phase: 'enter' | 'exit';
  at_ms: number;
}

/**
 * Speed lock (F04 R20-R22, tech note F04 section 6). Uses consecutive samples with accuracy <=
 * maxSampleAccuracy_m and NO outlier filter. A pair further apart than maxSamplePairGap_s gives no
 * speed and breaks both runs. Enter: consecutive pairs > speedLock_kmh spanning >= lockSustained_s
 * (last sample - first sample of the first pair), back-dated to that first sample. Exit: pairs <=
 * speedLock_kmh spanning >= unlockSustained_s, back-dated to the first sample of the slow run.
 */
export function speedLockTransitions(
  samples: readonly Omit<Sample, 'inside'>[],
  p: SpeedLockParams,
): LockTransition[] {
  const ok = samples.filter((s) => s.accuracy_m <= p.maxSampleAccuracy_m);
  const out: LockTransition[] = [];
  let locked = false;
  let runStart: number | null = null;
  for (let i = 1; i < ok.length; i += 1) {
    const a = ok[i - 1] as Omit<Sample, 'inside'>;
    const b = ok[i] as Omit<Sample, 'inside'>;
    if (b.t_ms - a.t_ms > p.maxSamplePairGap_s * MS_PER_S) {
      runStart = null;
      continue;
    }
    const fast = pairSpeed_kmh(a, b) > p.speedLock_kmh;
    if (fast !== locked) {
      runStart ??= a.t_ms;
      const need = (locked ? p.unlockSustained_s : p.lockSustained_s) * MS_PER_S;
      if (b.t_ms - runStart >= need) {
        out.push({ phase: locked ? 'exit' : 'enter', at_ms: runStart });
        locked = !locked;
        runStart = null;
      }
    } else runStart = null;
  }
  return out;
}

export function lockedAt(t_ms: number, transitions: readonly LockTransition[]): boolean {
  let locked = false;
  for (const tr of transitions) if (tr.at_ms <= t_ms) locked = tr.phase === 'enter';
  return locked;
}

export interface CheckInParams extends GateParams, SpeedLockParams {
  minContinuousApproach_s: number;
  maxAccuracy_m: number;
  teleportIntoPolygonAllowed: boolean;
}

export interface CheckInResult {
  ok: boolean;
  reason: string | null;
  readyIn_s: number | null;
}

/**
 * Check-in of continuous_gps (F04 R07-R08, tech note F04 7.2-7.3) at now_ms from every sample
 * received before (inside = the selected polygon). The approach run breaks on a filter drop, a
 * pair gap > maxSamplePairGap_s or a sample while locked. Reasons in R08 order.
 */
export function checkIn(
  samples: readonly Sample[],
  now_ms: number,
  p: CheckInParams,
): CheckInResult {
  const seen = samples.filter((s) => s.t_ms <= now_ms);
  const verdicts = filterSamples(seen, p);
  const locks = speedLockTransitions(seen, p);
  let chainStart: number | null = null;
  let lastAt: number | null = null;
  let outsideSeen = false;
  seen.forEach((s, i) => {
    const usable = verdicts[i]?.kept === true && !lockedAt(s.t_ms, locks);
    if (!usable) {
      chainStart = null;
      lastAt = null;
      outsideSeen = false;
      return;
    }
    if (
      chainStart === null ||
      lastAt === null ||
      s.t_ms - lastAt > p.maxSamplePairGap_s * MS_PER_S
    ) {
      chainStart = s.t_ms;
      outsideSeen = false;
    }
    lastAt = s.t_ms;
    if (!s.inside) outsideSeen = true;
  });
  const L = seen.at(-1);
  if (lockedAt(now_ms, locks)) return { ok: false, reason: 'speed_lock', readyIn_s: null };
  if (L === undefined || !(L.accuracy_m < p.maxAccuracy_m)) {
    return { ok: false, reason: 'poor_accuracy', readyIn_s: null };
  }
  const start = chainStart as number | null;
  const need_ms = p.minContinuousApproach_s * MS_PER_S;
  if (start === null || lastAt !== L.t_ms || L.t_ms - start < need_ms) {
    const readyIn_s =
      start !== null && lastAt === L.t_ms
        ? Math.ceil((need_ms - (L.t_ms - start)) / MS_PER_S)
        : null;
    return { ok: false, reason: 'not_enough_trace', readyIn_s };
  }
  if (!p.teleportIntoPolygonAllowed && (!L.inside || !outsideSeen)) {
    return { ok: false, reason: 'no_approach_from_outside', readyIn_s: null };
  }
  return { ok: true, reason: null, readyIn_s: null };
}

/** Time gate of a sample before geo (tech note F04 4.2, items 2-4). */
export function sampleTimeGate(
  t_ms: number,
  now_ms: number,
  lastSample_ms: number | null,
  settled_ms: number | null,
  clockSkewTolerance_s: number,
): string {
  if (t_ms > now_ms + clockSkewTolerance_s * MS_PER_S) return 'future';
  if (lastSample_ms !== null && t_ms <= lastSample_ms) return 'non_monotonic';
  if (settled_ms !== null && t_ms <= settled_ms) return 'late';
  return 'ok';
}

/** now_ms check (tech note F04 4.4): invalid ends the run with clock_invalid; held = time stands. */
export function clockCheck(now_ms: number, lastNow_ms: number | null, tol_s: number): string {
  if (lastNow_ms === null || now_ms >= lastNow_ms) return 'ok';
  return now_ms < lastNow_ms - tol_s * MS_PER_S ? 'invalid' : 'held';
}
