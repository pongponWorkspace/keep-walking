// Reads the same balance config the run engine (packages/shared/src/run, src/reward) is built
// against, so the QA engine-level tests in this folder move with config the same way
// tools/traces/src/config.ts keeps the synthetic corpus in sync (no balance value is hardcoded
// here, CLAUDE.md non-negotiable 3). Node-only (reads files directly): never imported by
// apps/client or packages/*.
import { readFileSync } from 'node:fs';
import { REPO_ROOT } from './qa-builder';

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
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${file}#${path} must be a finite number`);
  }
  return value;
}

function bool(root: JsonObject, file: string, path: string): boolean {
  const value = pick(root, file, path);
  if (typeof value !== 'boolean') throw new Error(`${file}#${path} must be a boolean`);
  return value;
}

const DUNGEONS_FILE = 'config/balance/dungeons.json';
const ANTICHEAT_FILE = 'config/balance/anticheat.json';

/** Every field `checkInBatch` needs (CheckInParams & GateFilterParams & SpeedLockParams, see
 * packages/shared/src/run/check-in.ts). */
export interface QaEngineParams {
  readonly minContinuousApproach_s: number;
  readonly maxAccuracy_m: number;
  readonly teleportIntoPolygonAllowed: boolean;
  readonly maxSampleAccuracy_m: number;
  readonly outlierSpeed_kmh: number;
  readonly outlierReanchorSamples: number;
  readonly speedLock_kmh: number;
  readonly lockSustained_s: number;
  readonly unlockSustained_s: number;
  readonly maxSamplePairGap_s: number;
  readonly edgeHysteresisSamples: number;
  readonly edgeHysteresis_m: number;
  readonly graceMax_s: number;
  readonly suspendedMax_s: number;
  readonly utcOffset_min: number;
  readonly closingSoonNotice_s: number;
}

export function loadQaEngineParams(): QaEngineParams {
  const dungeons = readJson(DUNGEONS_FILE);
  const anticheat = readJson(ANTICHEAT_FILE);
  return {
    minContinuousApproach_s: num(anticheat, ANTICHEAT_FILE, 'checkIn.minContinuousApproach_s'),
    maxAccuracy_m: num(anticheat, ANTICHEAT_FILE, 'checkIn.maxAccuracy_m'),
    teleportIntoPolygonAllowed: bool(
      anticheat,
      ANTICHEAT_FILE,
      'checkIn.teleportIntoPolygonAllowed',
    ),
    maxSampleAccuracy_m: num(dungeons, DUNGEONS_FILE, 'movementGate.maxSampleAccuracy_m'),
    outlierSpeed_kmh: num(dungeons, DUNGEONS_FILE, 'movementGate.outlierSpeed_kmh'),
    outlierReanchorSamples: num(dungeons, DUNGEONS_FILE, 'movementGate.outlierReanchorSamples'),
    speedLock_kmh: num(anticheat, ANTICHEAT_FILE, 'speedLock.speedLock_kmh'),
    lockSustained_s: num(anticheat, ANTICHEAT_FILE, 'speedLock.lockSustained_s'),
    unlockSustained_s: num(anticheat, ANTICHEAT_FILE, 'speedLock.unlockSustained_s'),
    maxSamplePairGap_s: num(dungeons, DUNGEONS_FILE, 'movementGate.maxSamplePairGap_s'),
    edgeHysteresisSamples: num(dungeons, DUNGEONS_FILE, 'runState.edgeHysteresisSamples'),
    edgeHysteresis_m: num(dungeons, DUNGEONS_FILE, 'runState.edgeHysteresis_m'),
    graceMax_s: num(dungeons, DUNGEONS_FILE, 'runState.graceMax_s'),
    suspendedMax_s: num(dungeons, DUNGEONS_FILE, 'runState.suspendedMax_s'),
    utcOffset_min: num(dungeons, DUNGEONS_FILE, 'openingHours.utcOffset_min'),
    closingSoonNotice_s: num(dungeons, DUNGEONS_FILE, 'openingHours.closingSoonNotice_s'),
  };
}
