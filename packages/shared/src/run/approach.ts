// Approach state of check-in (F04-R07, R11, tech note F04 7.2). Tracks only the time span of a
// continuous, usable, unlocked run of samples and, per dungeon, the time it was last seen
// outside that dungeon's polygon during the CURRENT run. No position is kept (ADR 0003 5.4).
import { MS_PER_S } from '@keep-walking/geo';

export interface ApproachState {
  /** Start of the current continuous run of usable, unlocked samples. */
  readonly chainStartAt_ms: number | null;
  readonly lastAt_ms: number | null;
  /** dungeonId -> t_ms of the last usable sample of this run seen outside that dungeon. */
  readonly outsideSeenAt_ms: Readonly<Record<string, number>>;
}

export const APPROACH_INIT: ApproachState = {
  chainStartAt_ms: null,
  lastAt_ms: null,
  outsideSeenAt_ms: {},
};

export interface ApproachSample {
  readonly t_ms: number;
  /** Passed the gate outlier filter (accuracy + speed, ADR 0003 5.3 step 1) and not speed-locked. */
  readonly usableAndUnlocked: boolean;
  /** Dungeons this sample lies outside of (only meaningful when `usableAndUnlocked`). */
  readonly outsideDungeonIds: readonly string[];
}

/**
 * One step of the approach chain. A filter drop, a speed lock, or a pair gap wider than
 * maxSamplePairGap_s breaks the chain (tech note F04 7.2): an unusable/locked sample clears
 * everything, a usable sample after too long a gap restarts the chain at itself.
 */
export function approachStep(
  pre: ApproachState,
  sample: ApproachSample,
  p: { readonly maxSamplePairGap_s: number },
): ApproachState {
  if (!sample.usableAndUnlocked) {
    return { chainStartAt_ms: null, lastAt_ms: null, outsideSeenAt_ms: {} };
  }
  const gapBroken =
    pre.lastAt_ms === null || sample.t_ms - pre.lastAt_ms > p.maxSamplePairGap_s * MS_PER_S;
  const outsideSeenAt_ms: Record<string, number> = gapBroken ? {} : { ...pre.outsideSeenAt_ms };
  for (const dungeonId of sample.outsideDungeonIds) outsideSeenAt_ms[dungeonId] = sample.t_ms;
  return {
    chainStartAt_ms: gapBroken ? sample.t_ms : pre.chainStartAt_ms,
    lastAt_ms: sample.t_ms,
    outsideSeenAt_ms,
  };
}
