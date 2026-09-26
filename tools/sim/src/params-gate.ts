// Typed parameters of the gate / run state / check-in reference (P2-F05-T20), read from
// config/balance only. Missing or null keys throw (config.ts), the simulator never guesses.
import type { BalanceConfig } from './config';
import { getPath, num, str } from './config';
import type { GateParams, PartialTickParams } from './gate';
import type { DistanceStep } from './opening-hours';
import type { CheckInParams, RunStateParams, SpeedLockParams } from './presence';

export interface GateConfig {
  gate: GateParams;
  run: RunStateParams;
  lock: SpeedLockParams;
  checkIn: CheckInParams;
  partial: PartialTickParams;
  clockSkewTolerance_s: number;
  utcOffset_min: number;
  closingSoonNotice_s: number;
  distanceSteps: DistanceStep[];
  /** dungeons.area.minArea_m2, for the R15 hysteresis distance limit. */
  minArea_m2: number;
  /** For config consistency checks (lint rules enforced later by P2-F04-T24). */
  rewardTickInterval_s: number;
  connectionLostEndsRunAfter_s: number;
  rewardTickDuringGrace: boolean;
  rewardTickDuringSuspended: boolean;
  suspendedTimeCounts: boolean;
}

function bool(root: BalanceConfig[keyof BalanceConfig], path: string): boolean {
  const v = getPath(root, path);
  if (typeof v !== 'boolean') throw new Error(`config value is not a boolean: ${path}`);
  return v;
}

function distanceSteps(cfg: BalanceConfig): DistanceStep[] {
  const v = getPath(cfg.unlocks, 'home.distanceDisplaySteps_m');
  if (!Array.isArray(v)) throw new Error('unlocks.home.distanceDisplaySteps_m must be an array');
  return v.map((x) => {
    if (typeof x !== 'object' || x === null || Array.isArray(x)) throw new Error('bad step');
    const upTo = x['upTo_m'];
    const step = x['step_m'];
    if (typeof step !== 'number' || (upTo !== null && typeof upTo !== 'number'))
      throw new Error(
        'distanceDisplaySteps_m entries need step_m (number) and upTo_m (number|null)',
      );
    return { upTo_m: upTo, step_m: step };
  });
}

export function gateConfigFromConfig(cfg: BalanceConfig): GateConfig {
  const d = cfg.dungeons;
  const a = cfg.anticheat;
  const gate: GateParams = {
    window_s: num(d, 'movementGate.window_s'),
    minDistancePerWindow_m: num(d, 'movementGate.minDistancePerWindow_m'),
    comparison: str(d, 'movementGate.comparison'),
    sampleCadence_s: num(d, 'movementGate.sampleCadence_s'),
    maxSamplePairGap_s: num(d, 'movementGate.maxSamplePairGap_s'),
    maxSampleAccuracy_m: num(d, 'movementGate.maxSampleAccuracy_m'),
    outlierSpeed_kmh: num(d, 'movementGate.outlierSpeed_kmh'),
    outlierReanchorSamples: num(d, 'movementGate.outlierReanchorSamples'),
    speedLock_kmh: num(a, 'speedLock.speedLock_kmh'),
  };
  const lock: SpeedLockParams = {
    speedLock_kmh: gate.speedLock_kmh,
    lockSustained_s: num(a, 'speedLock.lockSustained_s'),
    unlockSustained_s: num(a, 'speedLock.unlockSustained_s'),
    maxSampleAccuracy_m: gate.maxSampleAccuracy_m,
    maxSamplePairGap_s: gate.maxSamplePairGap_s,
  };
  return {
    gate,
    lock,
    run: {
      ...gate,
      edgeHysteresisSamples: num(d, 'runState.edgeHysteresisSamples'),
      edgeHysteresis_m: num(d, 'runState.edgeHysteresis_m'),
      graceMax_s: num(d, 'runState.graceMax_s'),
      suspendedMax_s: num(d, 'runState.suspendedMax_s'),
    },
    checkIn: {
      ...gate,
      ...lock,
      minContinuousApproach_s: num(a, 'checkIn.minContinuousApproach_s'),
      maxAccuracy_m: num(a, 'checkIn.maxAccuracy_m'),
      teleportIntoPolygonAllowed: bool(a, 'checkIn.teleportIntoPolygonAllowed'),
    },
    partial: {
      window_s: gate.window_s,
      minDistancePerWindow_m: gate.minDistancePerWindow_m,
      comparison: gate.comparison,
      partialTickMinElapsed_s: num(d, 'emergencyClose.partialTickMinElapsed_s'),
    },
    clockSkewTolerance_s: num(d, 'runState.clockSkewTolerance_s'),
    utcOffset_min: num(d, 'openingHours.utcOffset_min'),
    closingSoonNotice_s: num(d, 'openingHours.closingSoonNotice_s'),
    distanceSteps: distanceSteps(cfg),
    minArea_m2: num(d, 'area.minArea_m2'),
    rewardTickInterval_s: num(d, 'rewardTick.rewardTickInterval_s'),
    connectionLostEndsRunAfter_s: num(d, 'offlineEvidence.connectionLostEndsRunAfter_s'),
    rewardTickDuringGrace: bool(d, 'runState.rewardTickDuringGrace'),
    rewardTickDuringSuspended: bool(d, 'runState.rewardTickDuringSuspended'),
    suspendedTimeCounts: bool(d, 'runState.suspendedTimeCounts'),
  };
}

/** Spec F04 R15 item 4 (game-director limits): confirmation time <= graceMax_s / 6, distance
 * <= about 1/3 of the radius of a circle of area.minArea_m2. Design limits, not balance values. */
const R15_GRACE_SHARE = 6;
const R15_RADIUS_SHARE = 3;

/** Config checks this task promises (the lint itself is P2-F04-T24). Returns failed rule names. */
export function gateConfigProblems(c: GateConfig): string[] {
  const out: string[] = [];
  if (c.rewardTickInterval_s !== c.gate.window_s) out.push('rewardTickInterval_s == window_s');
  if (c.connectionLostEndsRunAfter_s !== c.run.suspendedMax_s)
    out.push('connectionLostEndsRunAfter_s == suspendedMax_s');
  if (c.gate.window_s % c.gate.sampleCadence_s !== 0) out.push('window_s % sampleCadence_s == 0');
  if (c.gate.maxSampleAccuracy_m < c.checkIn.maxAccuracy_m)
    out.push('maxSampleAccuracy_m not stricter than checkIn.maxAccuracy_m');
  if (c.gate.outlierSpeed_kmh <= c.gate.speedLock_kmh) out.push('outlierSpeed_kmh > speedLock_kmh');
  if (c.run.edgeHysteresisSamples * c.gate.sampleCadence_s > c.run.graceMax_s / R15_GRACE_SHARE)
    out.push('edgeHysteresisSamples x sampleCadence_s <= graceMax_s / 6 (F04 R15.4)');
  if (c.run.edgeHysteresis_m > Math.sqrt(c.minArea_m2 / Math.PI) / R15_RADIUS_SHARE)
    out.push('edgeHysteresis_m <= radius(area.minArea_m2) / 3 (F04 R15.4)');
  if (c.gate.maxSamplePairGap_s >= c.run.graceMax_s) out.push('maxSamplePairGap_s < graceMax_s');
  if (c.rewardTickDuringGrace || c.rewardTickDuringSuspended || c.suspendedTimeCounts)
    out.push('Phase 2 supports only false for the three runState switches (tech note F04 5.4)');
  return out;
}
