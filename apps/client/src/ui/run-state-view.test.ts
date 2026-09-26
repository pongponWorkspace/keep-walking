import { describe, expect, it } from 'vitest';
import {
  runStatePillView,
  runSummaryHeaderKey,
  speedLockButtons,
  tickTimerCopyKey,
} from './run-state-view';

describe('runStatePillView', () => {
  it('active: success tone, no banner', () => {
    const v = runStatePillView('active');
    expect(v.tone).toBe('success');
    expect(v.bannerKey).toBeUndefined();
    expect(v.labelKey).toBe('run.stateActiveLabel');
  });
  it('grace: info tone with a banner, never danger', () => {
    const v = runStatePillView('grace');
    expect(v.tone).toBe('info');
    expect(v.bannerKey).toBe('run.stateGrace');
  });
  it('suspended: info tone (never danger — leaving is not a fault, N-02)', () => {
    const v = runStatePillView('suspended');
    expect(v.tone).toBe('info');
    expect(v.bannerKey).toBe('run.stateSuspended');
  });
  it('no status ever uses a "danger" tone', () => {
    for (const status of ['active', 'grace', 'suspended'] as const) {
      expect(runStatePillView(status).tone).not.toBe('danger');
    }
  });
});

describe('tickTimerCopyKey', () => {
  it('active shows the live countdown', () => {
    expect(tickTimerCopyKey('active')).toBe('run.tickTimer');
  });
  it('grace/suspended show the paused label', () => {
    expect(tickTimerCopyKey('grace')).toBe('run.tickPausedLabel');
    expect(tickTimerCopyKey('suspended')).toBe('run.tickPausedLabel');
  });
});

describe('runSummaryHeaderKey', () => {
  it('covers every exit_reason (F04 flow section 7)', () => {
    expect(runSummaryHeaderKey('manual_exit')).toBe('run.summary.exited');
    expect(runSummaryHeaderKey('dungeon_closed')).toBe('run.summary.dungeonClosed');
    expect(runSummaryHeaderKey('timeout')).toBe('run.summary.timeout');
    expect(runSummaryHeaderKey('death')).toBe('run.summary.died');
    expect(runSummaryHeaderKey('auto_retreat')).toBe('run.summary.autoRetreated');
    expect(runSummaryHeaderKey('clock_invalid')).toBe('run.summary.clockInvalid');
    expect(runSummaryHeaderKey('emergency_close')).toBe('run.summary.closedByModerator');
  });
});

describe('speedLockButtons', () => {
  it('settings only before any run exists (GD B-03)', () => {
    expect(speedLockButtons(false)).toEqual(['settings']);
  });
  it('settings + exit during a run', () => {
    expect(speedLockButtons(true)).toEqual(['settings', 'exit']);
  });
});
