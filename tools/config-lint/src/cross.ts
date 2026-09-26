// Cross-file invariants (H01 + rules requested in the tech notes). Each rule names its source.
// A rule whose inputs are missing or not numbers fails loudly instead of being skipped.
import { assertRaidScheduleConsistent } from '@keep-walking/shared/config';
import { isObject, type ConfigFile, type Finding, type Json } from './types';

/** Full name `<namespace>.<file>.<path>` (ADR 0001 3.10.1). */
type FullName = string;

class MissingValue extends Error {}

export interface Lookup {
  num(name: FullName): number;
  str(name: FullName): string;
}

function makeLookup(files: readonly ConfigFile[]): Lookup {
  const byName = new Map(files.map((file) => [`${file.namespace}.${file.name}`, file]));
  const get = (name: FullName): Json => {
    const [namespace, fileName, ...rest] = name.split('.');
    const file = byName.get(`${namespace}.${fileName}`);
    if (file === undefined) throw new MissingValue(`${name}: file not found`);
    let node: Json = file.data;
    for (const segment of rest) {
      if (!isObject(node) || !(segment in node)) throw new MissingValue(`${name}: not found`);
      node = node[segment] as Json;
    }
    return node;
  };
  return {
    num(name) {
      const value = get(name);
      if (typeof value !== 'number')
        throw new MissingValue(`${name}: expected a number, got ${JSON.stringify(value)}`);
      return value;
    },
    str(name) {
      const value = get(name);
      if (typeof value !== 'string')
        throw new MissingValue(`${name}: expected a string, got ${JSON.stringify(value)}`);
      return value;
    },
  };
}

export interface CrossRule {
  readonly id: string;
  /** Config file the finding is reported against (the value most likely to be edited). */
  readonly file: string;
  readonly at: string;
  readonly source: string;
  /** Returns null when the invariant holds, otherwise the failure message. */
  readonly check: (v: Lookup) => string | null;
}

const GATE = 'balance.dungeons.movementGate';
const SAMPLES = 'app.privacy.onDeviceSamples';
const RUN_STATE = 'balance.dungeons.runState';
/** maxCount >= PRE_RUN_ANCHOR_SETS x (1 + outlierReanchorSamples) + LOCK_AND_LATEST (F04 11.1). */
const PRE_RUN_ANCHOR_SETS = 2;
const LOCK_AND_LATEST = 2;

export const CROSS_RULES: readonly CrossRule[] = [
  {
    id: 'samples-max-age-le-position-log-ttl',
    file: 'config/app/privacy.json',
    at: 'onDeviceSamples.maxAge_s',
    source: 'tech note F04 11.1; D-088; non-negotiable 7 (position_log TTL 24 h)',
    check: (v) => le(v, `${SAMPLES}.maxAge_s`, 'balance.privacy.positionLogTtl_s'),
  },
  {
    id: 'samples-max-age-le-gate-window',
    file: 'config/app/privacy.json',
    at: 'onDeviceSamples.maxAge_s',
    source: 'tech note F04 11.1; D-088 (no more than one window)',
    check: (v) => le(v, `${SAMPLES}.maxAge_s`, `${GATE}.window_s`),
  },
  {
    id: 'samples-max-age-ge-pair-gap',
    file: 'config/app/privacy.json',
    at: 'onDeviceSamples.maxAge_s',
    source: 'tech note F04 11.1 (a kept sample must still be able to pair)',
    check: (v) => le(v, `${GATE}.maxSamplePairGap_s`, `${SAMPLES}.maxAge_s`),
  },
  {
    id: 'samples-max-count-holds-anchors',
    file: 'config/app/privacy.json',
    at: 'onDeviceSamples.maxCount',
    source: 'tech note F04 11.1-11.2',
    check: (v) => {
      const maxCount = v.num(`${SAMPLES}.maxCount`);
      const reanchor = v.num(`${GATE}.outlierReanchorSamples`);
      const needed = PRE_RUN_ANCHOR_SETS * (1 + reanchor) + LOCK_AND_LATEST;
      return maxCount >= needed
        ? null
        : `${SAMPLES}.maxCount (${maxCount}) must be >= 2 x (1 + outlierReanchorSamples) + 2 = ${needed}`;
    },
  },
  {
    id: 'connection-lost-equals-suspended-max',
    file: 'config/balance/dungeons.json',
    at: 'offlineEvidence.connectionLostEndsRunAfter_s',
    source: 'tech note F04 10.3; runState._note (GDD: the same 15-minute limit)',
    check: (v) =>
      eq(
        v,
        'balance.dungeons.offlineEvidence.connectionLostEndsRunAfter_s',
        `${RUN_STATE}.suspendedMax_s`,
      ),
  },
  {
    id: 'reward-tick-interval-equals-gate-window',
    file: 'config/balance/dungeons.json',
    at: 'rewardTick.rewardTickInterval_s',
    source: 'spec F05 R04; tech note F05 section 1 (params throw on mismatch, lint checks again)',
    check: (v) => eq(v, 'balance.dungeons.rewardTick.rewardTickInterval_s', `${GATE}.window_s`),
  },
  {
    id: 'gate-window-divisible-by-cadence',
    file: 'config/balance/dungeons.json',
    at: 'movementGate.sampleCadence_s',
    source: 'ADR 0003 5.3 step 2 (window edges are grid points)',
    check: (v) => {
      const window = v.num(`${GATE}.window_s`);
      const cadence = v.num(`${GATE}.sampleCadence_s`);
      if (cadence <= 0) return `${GATE}.sampleCadence_s must be > 0, got ${cadence}`;
      return window % cadence === 0
        ? null
        : `${GATE}.window_s (${window}) must be divisible by sampleCadence_s (${cadence})`;
    },
  },
];

export const CROSS_RULES_EXTRA: readonly CrossRule[] = [
  {
    id: 'gate-accuracy-not-stricter-than-check-in',
    file: 'config/balance/dungeons.json',
    at: 'movementGate.maxSampleAccuracy_m',
    source: 'spec F05 section 8 (gate never stricter than check-in)',
    check: (v) => le(v, 'balance.anticheat.checkIn.maxAccuracy_m', `${GATE}.maxSampleAccuracy_m`),
  },
  {
    id: 'pair-gap-below-grace',
    file: 'config/balance/dungeons.json',
    at: 'movementGate.maxSamplePairGap_s',
    source: 'GD B-04; tech note F04 10.3 (no-evidence limit shorter than Grace)',
    check: (v) => lt(v, `${GATE}.maxSamplePairGap_s`, `${RUN_STATE}.graceMax_s`),
  },
  {
    id: 'grace-below-suspended',
    file: 'config/balance/dungeons.json',
    at: 'runState.graceMax_s',
    source: 'GDD run states (Grace <= 3 min, Suspended 3-15 min)',
    check: (v) => lt(v, `${RUN_STATE}.graceMax_s`, `${RUN_STATE}.suspendedMax_s`),
  },
  {
    id: 'raid-schedule-end-matches-duration',
    file: 'config/balance/raid.json',
    at: 'schedule.endLocalTime',
    source: 'P1-H03 (loader check repeated in lint); raid.json _note',
    check: (v) => {
      try {
        assertRaidScheduleConsistent({
          startLocalTime: v.str('balance.raid.schedule.startLocalTime'),
          endLocalTime: v.str('balance.raid.schedule.endLocalTime'),
          durationTicks: v.num('balance.raid.schedule.durationTicks'),
          raidTick_s: v.num('balance.raid.schedule.raidTick_s'),
        });
        return null;
      } catch (error) {
        if (error instanceof MissingValue) throw error;
        return error instanceof Error ? error.message : String(error);
      }
    },
  },
];

function le(v: Lookup, small: FullName, large: FullName): string | null {
  const a = v.num(small);
  const b = v.num(large);
  return a <= b ? null : `${small} (${a}) must be <= ${large} (${b})`;
}

function lt(v: Lookup, small: FullName, large: FullName): string | null {
  const a = v.num(small);
  const b = v.num(large);
  return a < b ? null : `${small} (${a}) must be < ${large} (${b})`;
}

function eq(v: Lookup, left: FullName, right: FullName): string | null {
  const a = v.num(left);
  const b = v.num(right);
  return a === b ? null : `${left} (${a}) must equal ${right} (${b})`;
}

export function checkCrossFile(
  files: readonly ConfigFile[],
  rules: readonly CrossRule[] = [...CROSS_RULES, ...CROSS_RULES_EXTRA],
): Finding[] {
  const lookup = makeLookup(files);
  const findings: Finding[] = [];
  for (const rule of rules) {
    let message: string | null;
    try {
      message = rule.check(lookup);
    } catch (error) {
      if (!(error instanceof MissingValue)) throw error;
      message = `cannot evaluate: ${error.message}`;
    }
    if (message !== null) {
      findings.push({
        level: 'error',
        rule: 'cross-file',
        file: rule.file,
        at: rule.at,
        message: `[${rule.id}] ${message} (${rule.source})`,
      });
    }
  }
  return findings;
}
