import { describe, expect, it } from 'vitest';
import { logout } from './logout';
import type { LogoutDeps } from './logout';

function makeDeps(
  hasActiveRun: boolean,
  calls: string[],
): LogoutDeps & { readonly records: { name: string; properties: unknown }[] } {
  const records: { name: string; properties: unknown }[] = [];
  return {
    hasActiveRun: () => hasActiveRun,
    exitRun: () => calls.push('exitRun'),
    stopLocationProvider: () => calls.push('stopLocationProvider'),
    dropQueuedSamples: () => calls.push('dropQueuedSamples'),
    signOut: () => calls.push('signOut'),
    record: (name, properties) => {
      calls.push('record');
      records.push({ name, properties });
    },
    now: () => 1000,
    records,
  };
}

describe('logout', () => {
  it('with an active run: drop -> exit -> stop provider -> sign out -> telemetry, during_run true', () => {
    const calls: string[] = [];
    const deps = makeDeps(true, calls);

    const duringRun = logout(deps);

    expect(duringRun).toBe(true);
    expect(calls).toEqual([
      'dropQueuedSamples',
      'exitRun',
      'stopLocationProvider',
      'signOut',
      'record',
    ]);
    expect(deps.records).toEqual([{ name: 'account_logout', properties: { during_run: true } }]);
  });

  it('with no run: only signs out and records telemetry — never touches the LocationProvider or the run', () => {
    const calls: string[] = [];
    const deps = makeDeps(false, calls);

    const duringRun = logout(deps);

    expect(duringRun).toBe(false);
    expect(calls).toEqual(['signOut', 'record']);
    expect(deps.records).toEqual([{ name: 'account_logout', properties: { during_run: false } }]);
  });
});
