import { describe, expect, it } from 'vitest';
import { RaidScheduleMismatchError, assertRaidScheduleConsistent } from './raid-schedule';

describe('assertRaidScheduleConsistent (H03)', () => {
  it('accepts the GDD schedule: 16:00 + 720 x 10 s = 18:00', () => {
    expect(() =>
      assertRaidScheduleConsistent({
        startLocalTime: '16:00',
        endLocalTime: '18:00',
        durationTicks: 720,
        raidTick_s: 10,
      }),
    ).not.toThrow();
  });

  it('rejects an endLocalTime that does not match the computed end', () => {
    expect(() =>
      assertRaidScheduleConsistent({
        startLocalTime: '16:00',
        endLocalTime: '18:01',
        durationTicks: 720,
        raidTick_s: 10,
      }),
    ).toThrow(RaidScheduleMismatchError);
  });

  it('rejects a duration that is not a whole number of minutes', () => {
    expect(() =>
      assertRaidScheduleConsistent({
        startLocalTime: '16:00',
        endLocalTime: '18:00',
        durationTicks: 719,
        raidTick_s: 10,
      }),
    ).toThrow(RaidScheduleMismatchError);
  });

  it('wraps past midnight', () => {
    expect(() =>
      assertRaidScheduleConsistent({
        startLocalTime: '23:30',
        endLocalTime: '00:30',
        durationTicks: 6,
        raidTick_s: 600,
      }),
    ).not.toThrow();
  });

  it('rejects a malformed HH:mm string', () => {
    expect(() =>
      assertRaidScheduleConsistent({
        startLocalTime: '16:00',
        endLocalTime: '6pm',
        durationTicks: 720,
        raidTick_s: 10,
      }),
    ).toThrow();
  });
});
