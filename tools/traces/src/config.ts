// Reads the balance values the synthetic scenarios are built around. Nothing is hardcoded:
// if systems-designer changes a threshold, regenerating the traces moves them with it, and the
// "committed files match the generator" test fails until they are regenerated.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Repo root resolved from this file (tools/traces/src/config.ts). */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const SYNTHETIC_DIR = `${REPO_ROOT}data/gps-traces/synthetic/`;

export type { GateComparison } from '@keep-walking/geo';
import type { GateComparison } from '@keep-walking/geo';

export interface TraceConfig {
  /** dungeons.json#movementGate.minDistancePerWindow_m */
  readonly gateMinDistance_m: number;
  /** dungeons.json#movementGate.window_s */
  readonly gateWindow_s: number;
  /** dungeons.json#movementGate.comparison */
  readonly gateComparison: GateComparison;
  /** dungeons.json#movementGate.{sampleCadence_s, maxSamplePairGap_s, maxSampleAccuracy_m,
   *  outlierSpeed_kmh, outlierReanchorSamples}: the geo filter + resample (ADR 0003 5.3). */
  readonly gateFilter: {
    readonly sampleCadence_s: number;
    readonly maxSamplePairGap_s: number;
    readonly maxSampleAccuracy_m: number;
    readonly outlierSpeed_kmh: number;
    readonly outlierReanchorSamples: number;
  };
  /** config/app/client.json#hudMeasurement.gateWindowStep_s (tech note 10.5, S12 slide). */
  readonly gateWindowStep_s: number;
  /** dungeons.json#runState.graceMax_s */
  readonly graceMax_s: number;
  /** dungeons.json#runState.suspendedMax_s (P2-H57 suspended trace) */
  readonly suspendedMax_s: number;
  /** dungeons.json#rewardTick.rewardTickInterval_s (P2-H52 tick-denied e2e trace) */
  readonly rewardTickInterval_s: number;
  /** anticheat.json#speedLock.speedLock_kmh */
  readonly speedLock_kmh: number;
  /** anticheat.json#checkIn.maxAccuracy_m */
  readonly checkInMaxAccuracy_m: number;
  /** anticheat.json#checkIn.minContinuousApproach_s */
  readonly checkInMinApproach_s: number;
}

type JsonObject = Record<string, unknown>;

function readJson(relativePath: string): JsonObject {
  return JSON.parse(readFileSync(`${REPO_ROOT}${relativePath}`, 'utf8')) as JsonObject;
}

function pick(root: JsonObject, file: string, path: string): unknown {
  let node: unknown = root;
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null || !(key in node)) {
      throw new Error(`config path not found: ${file}#${path}`);
    }
    node = (node as JsonObject)[key];
  }
  return node;
}

function num(root: JsonObject, file: string, path: string): number {
  const value = pick(root, file, path);
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${file}#${path} must be a positive number`);
  }
  return value;
}

export function loadTraceConfig(): TraceConfig {
  const dungeonsFile = 'config/balance/dungeons.json';
  const anticheatFile = 'config/balance/anticheat.json';
  const dungeons = readJson(dungeonsFile);
  const anticheat = readJson(anticheatFile);
  const clientFile = 'config/app/client.json';
  const client = readJson(clientFile);
  const comparison = pick(dungeons, dungeonsFile, 'movementGate.comparison');
  if (comparison !== 'greaterThan' && comparison !== 'greaterThanOrEqual') {
    throw new Error(
      `${dungeonsFile}#movementGate.comparison has unknown value ${String(comparison)}`,
    );
  }
  return {
    gateMinDistance_m: num(dungeons, dungeonsFile, 'movementGate.minDistancePerWindow_m'),
    gateWindow_s: num(dungeons, dungeonsFile, 'movementGate.window_s'),
    gateComparison: comparison,
    gateFilter: {
      sampleCadence_s: num(dungeons, dungeonsFile, 'movementGate.sampleCadence_s'),
      maxSamplePairGap_s: num(dungeons, dungeonsFile, 'movementGate.maxSamplePairGap_s'),
      maxSampleAccuracy_m: num(dungeons, dungeonsFile, 'movementGate.maxSampleAccuracy_m'),
      outlierSpeed_kmh: num(dungeons, dungeonsFile, 'movementGate.outlierSpeed_kmh'),
      outlierReanchorSamples: num(dungeons, dungeonsFile, 'movementGate.outlierReanchorSamples'),
    },
    gateWindowStep_s: num(client, clientFile, 'hudMeasurement.gateWindowStep_s'),
    graceMax_s: num(dungeons, dungeonsFile, 'runState.graceMax_s'),
    suspendedMax_s: num(dungeons, dungeonsFile, 'runState.suspendedMax_s'),
    rewardTickInterval_s: num(dungeons, dungeonsFile, 'rewardTick.rewardTickInterval_s'),
    speedLock_kmh: num(anticheat, anticheatFile, 'speedLock.speedLock_kmh'),
    checkInMaxAccuracy_m: num(anticheat, anticheatFile, 'checkIn.maxAccuracy_m'),
    checkInMinApproach_s: num(anticheat, anticheatFile, 'checkIn.minContinuousApproach_s'),
  };
}
