import { describe, expect, it } from 'vitest';
import { checkInStatusView, formatCountdown } from './checkin-status';

describe('checkInStatusView', () => {
  it('throws when the preview is ready (no status row to show)', () => {
    expect(() => checkInStatusView({ ok: true }, false)).toThrow();
  });

  it('maps speed_lock (R08 priority 1)', () => {
    expect(
      checkInStatusView({ ok: false, reason: 'speed_lock', readyIn_s: null }, false).copyKey,
    ).toBe('dungeon.checkinSpeedLocked');
  });

  it('maps poor_accuracy (R08 priority 2)', () => {
    expect(
      checkInStatusView({ ok: false, reason: 'poor_accuracy', readyIn_s: null }, false).copyKey,
    ).toBe('dungeon.checkinPoorAccuracy');
  });

  it('maps not_enough_trace with a countdown when readyIn_s is known', () => {
    const view = checkInStatusView({ ok: false, reason: 'not_enough_trace', readyIn_s: 65 }, false);
    expect(view.copyKey).toBe('dungeon.checkinNotEnoughTrace');
    expect(view.countdownText).toBe('01:05');
  });

  it('maps not_enough_trace with readyIn_s null to checkinNotEnoughTraceWaiting (C-06: no raw {countdown})', () => {
    const view = checkInStatusView(
      { ok: false, reason: 'not_enough_trace', readyIn_s: null },
      false,
    );
    expect(view.copyKey).toBe('dungeon.checkinNotEnoughTraceWaiting');
    expect(view.countdownText).toBeUndefined();
  });

  it('maps no_approach_from_outside to the normal message when not out of range', () => {
    expect(
      checkInStatusView({ ok: false, reason: 'no_approach_from_outside', readyIn_s: null }, false)
        .copyKey,
    ).toBe('dungeon.checkinNoApproach');
  });

  it('maps no_approach_from_outside to dungeon.outOfRangeTitle when out of range now (B5/B-07)', () => {
    expect(
      checkInStatusView({ ok: false, reason: 'no_approach_from_outside', readyIn_s: null }, true)
        .copyKey,
    ).toBe('dungeon.outOfRangeTitle');
  });

  it('maps run_active (B6) and unsupported_mode (B4/N-06)', () => {
    expect(
      checkInStatusView({ ok: false, reason: 'run_active', readyIn_s: null }, false).copyKey,
    ).toBe('dungeon.alreadyActive');
    expect(
      checkInStatusView({ ok: false, reason: 'unsupported_mode', readyIn_s: null }, false).copyKey,
    ).toBe('dungeon.closedEmergencyBody');
  });
});

describe('formatCountdown', () => {
  it('formats mm:ss', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(5)).toBe('00:05');
    expect(formatCountdown(65)).toBe('01:05');
    expect(formatCountdown(600)).toBe('10:00');
  });

  it('clamps a negative value at 00:00 rather than going negative (T27 N-03)', () => {
    expect(formatCountdown(-5)).toBe('00:00');
  });
});
