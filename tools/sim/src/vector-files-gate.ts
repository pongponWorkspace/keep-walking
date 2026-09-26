// Builds the P2-F05-T20 vector files (movement-gate, reward-window, partial-tick, run-state,
// check-in, speed-lock, opening-hours). Serialized like the other files (2-space JSON) except that
// an object inside an array whose values are all primitives (a sample, a window, an event) is
// written on one line, so trace-sized inputs stay readable.
import type { BalanceConfig } from './config';
import { gateConfigFromConfig, gateConfigProblems } from './params-gate';
import { movementGateVectors, partialTickVectors, rewardWindowVectors } from './vectors-gate';
import type { GateVectorFile } from './vectors-gate';
import {
  checkInVectors,
  openingHoursVectors,
  runStateVectors,
  speedLockVectors,
} from './vectors-presence';

export const GATE_VECTOR_FILES = [
  'movement-gate',
  'reward-window',
  'partial-tick',
  'run-state',
  'check-in',
  'speed-lock',
  'opening-hours',
] as const;
export type GateVectorFileName = (typeof GATE_VECTOR_FILES)[number];

const INDENT = '  ';

function isLeafObject(v: unknown): v is Record<string, unknown> {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => x === null || typeof x !== 'object')
  );
}

function stringify(v: unknown, depth: number, inArray: boolean): string {
  const pad = INDENT.repeat(depth + 1);
  const end = INDENT.repeat(depth);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return `[\n${v.map((x) => pad + stringify(x, depth + 1, true)).join(',\n')}\n${end}]`;
  }
  if (v !== null && typeof v === 'object') {
    const entries = Object.entries(v);
    if (entries.length === 0) return '{}';
    if (inArray && isLeafObject(v)) {
      return `{ ${entries.map(([k, x]) => `${JSON.stringify(k)}: ${JSON.stringify(x)}`).join(', ')} }`;
    }
    const body = entries.map(
      ([k, x]) => `${pad}${JSON.stringify(k)}: ${stringify(x, depth + 1, false)}`,
    );
    return `{\n${body.join(',\n')}\n${end}}`;
  }
  return JSON.stringify(v);
}

export function serializeGateVectorFile(vf: GateVectorFile): string {
  return `${stringify(vf, 0, false)}\n`;
}

export function buildGateVectors(cfg: BalanceConfig): Record<GateVectorFileName, GateVectorFile> {
  const c = gateConfigFromConfig(cfg);
  const problems = gateConfigProblems(c);
  if (problems.length > 0) {
    throw new Error(`config consistency rules failed: ${problems.join('; ')}`);
  }
  return {
    'movement-gate': movementGateVectors(c),
    'reward-window': rewardWindowVectors(c),
    'partial-tick': partialTickVectors(c),
    'run-state': runStateVectors(c),
    'check-in': checkInVectors(c),
    'speed-lock': speedLockVectors(c),
    'opening-hours': openingHoursVectors(c),
  };
}
