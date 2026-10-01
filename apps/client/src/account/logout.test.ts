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

  // BUG-P2-006: `dungeon_exited{exit_reason: manual_exit}` (via `exitRun`) and `account_logout`
  // must land on the identical instant (product/telemetry-events.md "เวลาเดียวกันเสมอ") even with a
  // clock that advances on every call -- the exact shape of the original flake.
  it('BUG-P2-006: exitRun and the account_logout record share one atMs, even with an advancing clock', () => {
    let t = 1_000;
    const exitAtMs: number[] = [];
    let recordAtMs: number | undefined;
    const deps: LogoutDeps = {
      hasActiveRun: () => true,
      exitRun: (now_ms) => exitAtMs.push(now_ms),
      stopLocationProvider: () => undefined,
      dropQueuedSamples: () => undefined,
      signOut: () => undefined,
      record: (_name, _properties, atMs) => {
        recordAtMs = atMs;
      },
      now: () => {
        t += 1;
        return t;
      },
    };

    logout(deps);

    expect(exitAtMs[0]).toBeDefined();
    expect(exitAtMs[0]).toBe(recordAtMs);
  });
});
