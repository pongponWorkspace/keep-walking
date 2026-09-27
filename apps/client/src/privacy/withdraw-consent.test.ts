import { describe, expect, it } from 'vitest';
import { withdrawConsent } from './withdraw-consent';
import type { WithdrawConsentDeps } from './withdraw-consent';

function makeDeps(
  hasActiveRun: boolean,
  calls: string[],
): WithdrawConsentDeps & { readonly records: { name: string; properties: unknown }[] } {
  const records: { name: string; properties: unknown }[] = [];
  return {
    hasActiveRun: () => hasActiveRun,
    exitRun: () => calls.push('exitRun'),
    stopLocationProvider: () => calls.push('stopLocationProvider'),
    purgeLocation: () => calls.push('purgeLocation'),
    writeConsentWithdrawn: () => calls.push('writeConsentWithdrawn'),
    setLocationWithdrawn: () => calls.push('setLocationWithdrawn'),
    record: (name, properties) => {
      calls.push('record');
      records.push({ name, properties });
    },
    now: () => 1000,
    records,
  };
}

describe('withdrawConsent', () => {
  it('with an active run: flag -> exit -> stop provider -> purge -> write consent -> telemetry, during_run true', () => {
    const calls: string[] = [];
    const deps = makeDeps(true, calls);

    const duringRun = withdrawConsent(deps);

    expect(duringRun).toBe(true);
    expect(calls).toEqual([
      'setLocationWithdrawn',
      'exitRun',
      'stopLocationProvider',
      'purgeLocation',
      'writeConsentWithdrawn',
      'record',
    ]);
    expect(deps.records).toEqual([
      { name: 'location_consent_withdrawn', properties: { during_run: true } },
    ]);
  });

  it('with no active run: flag set, exitRun never called, during_run false', () => {
    const calls: string[] = [];
    const deps = makeDeps(false, calls);

    const duringRun = withdrawConsent(deps);

    expect(duringRun).toBe(false);
    expect(calls).toEqual([
      'setLocationWithdrawn',
      'stopLocationProvider',
      'purgeLocation',
      'writeConsentWithdrawn',
      'record',
    ]);
    expect(deps.records).toEqual([
      { name: 'location_consent_withdrawn', properties: { during_run: false } },
    ]);
  });

  it('sets the in-memory flag before anything else, even before checking hasActiveRun', () => {
    const order: string[] = [];
    const deps: WithdrawConsentDeps = {
      hasActiveRun: () => {
        order.push('hasActiveRun');
        return false;
      },
      exitRun: () => order.push('exitRun'),
      stopLocationProvider: () => order.push('stopLocationProvider'),
      purgeLocation: () => order.push('purgeLocation'),
      writeConsentWithdrawn: () => order.push('writeConsentWithdrawn'),
      setLocationWithdrawn: () => order.push('setLocationWithdrawn'),
      record: () => order.push('record'),
      now: () => 0,
    };

    withdrawConsent(deps);

    expect(order[0]).toBe('setLocationWithdrawn');
  });
});
