import { describe, expect, it } from 'vitest';
import { checkCrossFile } from '../src/cross';
import type { ConfigFile, JsonObject } from '../src/types';
import { file } from './helpers';

interface Values {
  window_s: number;
  sampleCadence_s: number;
  maxSamplePairGap_s: number;
  maxSampleAccuracy_m: number;
  outlierReanchorSamples: number;
  rewardTickInterval_s: number;
  graceMax_s: number;
  suspendedMax_s: number;
  connectionLostEndsRunAfter_s: number;
  checkInMaxAccuracy_m: number;
  positionLogTtl_s: number;
  maxAge_s: number;
  maxCount: number;
  endLocalTime: string;
}

const base: Values = {
  window_s: 300,
  sampleCadence_s: 5,
  maxSamplePairGap_s: 30,
  maxSampleAccuracy_m: 30,
  outlierReanchorSamples: 5,
  rewardTickInterval_s: 300,
  graceMax_s: 180,
  suspendedMax_s: 900,
  connectionLostEndsRunAfter_s: 900,
  checkInMaxAccuracy_m: 30,
  positionLogTtl_s: 86400,
  maxAge_s: 300,
  maxCount: 16,
  endLocalTime: '18:00',
};

function files(v: Values): ConfigFile[] {
  const dungeons: JsonObject = {
    movementGate: {
      window_s: v.window_s,
      sampleCadence_s: v.sampleCadence_s,
      maxSamplePairGap_s: v.maxSamplePairGap_s,
      maxSampleAccuracy_m: v.maxSampleAccuracy_m,
      outlierReanchorSamples: v.outlierReanchorSamples,
    },
    rewardTick: { rewardTickInterval_s: v.rewardTickInterval_s },
    runState: { graceMax_s: v.graceMax_s, suspendedMax_s: v.suspendedMax_s },
    offlineEvidence: { connectionLostEndsRunAfter_s: v.connectionLostEndsRunAfter_s },
  };
  return [
    file('balance', 'dungeons', dungeons),
    file('balance', 'anticheat', { checkIn: { maxAccuracy_m: v.checkInMaxAccuracy_m } }),
    file('balance', 'privacy', { positionLogTtl_s: v.positionLogTtl_s }),
    file('balance', 'raid', {
      schedule: {
        startLocalTime: '16:00',
        endLocalTime: v.endLocalTime,
        durationTicks: 720,
        raidTick_s: 10,
      },
    }),
    file('app', 'privacy', { onDeviceSamples: { maxAge_s: v.maxAge_s, maxCount: v.maxCount } }),
  ];
}

const ids = (v: Values): string[] =>
  checkCrossFile(files(v)).map((f) => /^\[([^\]]+)\]/.exec(f.message)?.[1] ?? f.message);

describe('cross-file rules (H01, tech notes F04 10.3 / 11.1, F05 R04, ADR 0003 5.3)', () => {
  it('passes the current values', () => {
    expect(ids(base)).toEqual([]);
  });

  it.each([
    ['samples-max-age-le-position-log-ttl', { positionLogTtl_s: 200 }],
    ['samples-max-age-le-gate-window', { maxAge_s: 301 }],
    ['samples-max-age-ge-pair-gap', { maxAge_s: 29 }],
    ['samples-max-count-holds-anchors', { maxCount: 13 }],
    ['connection-lost-equals-suspended-max', { connectionLostEndsRunAfter_s: 600 }],
    ['reward-tick-interval-equals-gate-window', { rewardTickInterval_s: 240 }],
    ['gate-window-divisible-by-cadence', { sampleCadence_s: 7 }],
    ['gate-accuracy-not-stricter-than-check-in', { maxSampleAccuracy_m: 20 }],
    ['pair-gap-below-grace', { maxSamplePairGap_s: 180 }],
    ['grace-below-suspended', { graceMax_s: 900 }],
    ['raid-schedule-end-matches-duration', { endLocalTime: '18:30' }],
  ] as const)('fails %s when violated', (id, change) => {
    expect(ids({ ...base, ...change })).toContain(id);
  });

  it('accepts the boundary values', () => {
    expect(ids({ ...base, maxAge_s: 30, maxCount: 14 })).toEqual([]);
  });

  it('fails loudly when an input value is missing or not a number', () => {
    const broken = files(base).map((f) =>
      f.name === 'privacy' && f.namespace === 'app'
        ? file('app', 'privacy', { onDeviceSamples: { maxAge_s: '300' } })
        : f,
    );
    const messages = checkCrossFile(broken).map((f) => f.message);
    expect(messages.some((m) => m.includes('cannot evaluate'))).toBe(true);
  });
});
