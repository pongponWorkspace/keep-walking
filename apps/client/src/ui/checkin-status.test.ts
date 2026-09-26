import { describe, expect, it } from 'vitest';
import { checkInStatusView } from './checkin-status';

describe('checkInStatusView', () => {
  it('throws when the preview is ready (no status row to show)', () => {
    expect(() => checkInStatusView({ ready: true }, false)).toThrow();
  });

  it('maps speed_lock (R08 priority 1)', () => {
    expect(checkInStatusView({ ready: false, reason: 'speed_lock' }, false).copyKey).toBe(
      'dungeon.checkinSpeedLocked',
    );
  });

  it('maps poor_accuracy (R08 priority 2)', () => {
    expect(checkInStatusView({ ready: false, reason: 'poor_accuracy' }, false).copyKey).toBe(
      'dungeon.checkinPoorAccuracy',
    );
  });

  it('maps not_enough_trace with hasCountdown true (R08 priority 3)', () => {
    const view = checkInStatusView({ ready: false, reason: 'not_enough_trace' }, false);
    expect(view.copyKey).toBe('dungeon.checkinNotEnoughTrace');
    expect(view.hasCountdown).toBe(true);
  });

  it('maps no_approach_from_outside to the normal message when not out of range', () => {
    expect(
      checkInStatusView({ ready: false, reason: 'no_approach_from_outside' }, false).copyKey,
    ).toBe('dungeon.checkinNoApproach');
  });

  it('maps no_approach_from_outside to dungeon.outOfRangeTitle when out of range now (B5/B-07)', () => {
    expect(
      checkInStatusView({ ready: false, reason: 'no_approach_from_outside' }, true).copyKey,
    ).toBe('dungeon.outOfRangeTitle');
  });

  it('maps run_active (B6) and unsupported_mode (B4/N-06)', () => {
    expect(checkInStatusView({ ready: false, reason: 'run_active' }, false).copyKey).toBe(
      'dungeon.alreadyActive',
    );
    expect(checkInStatusView({ ready: false, reason: 'unsupported_mode' }, false).copyKey).toBe(
      'dungeon.closedEmergencyBody',
    );
  });
});
