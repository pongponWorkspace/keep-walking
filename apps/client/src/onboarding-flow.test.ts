import { describe, expect, it, vi } from 'vitest';
import { createMemoryStorage } from './storage/local-store';
import { OnboardingFlow } from './onboarding-flow';
import type { OnboardingFlowDeps } from './onboarding-flow';

const NOOP_QUOTA = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };

function makeFlow(overrides: Partial<OnboardingFlowDeps> = {}) {
  const records: { name: string; properties: Record<string, unknown> }[] = [];
  const flow = new OnboardingFlow({
    storage: createMemoryStorage(),
    quotaDeps: NOOP_QUOTA,
    now: () => 1_000_000,
    record: (name, properties) => records.push({ name, properties }),
    e2eSkipOnboarding: false,
    ...overrides,
  });
  return { flow, records };
}

const FRESH_VIEW = { classId: null, firstRunEntered: false, firstRewardDone: false } as const;

describe('OnboardingFlow.currentStep', () => {
  it('starts at intro for a brand-new player', () => {
    const { flow } = makeFlow();
    expect(flow.currentStep(FRESH_VIEW)).toBe('intro');
  });

  it('goes straight to class once intro completes (age/consent auto-pass, map always acknowledged)', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    expect(flow.currentStep(FRESH_VIEW)).toBe('class');
  });

  it('reports first_run once a class is chosen but no run has started', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    expect(flow.currentStep({ ...FRESH_VIEW, classId: 'tanker' })).toBe('first_run');
  });

  it('reports first_reward, then done, following firstRunEntered/firstRewardDone', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    expect(
      flow.currentStep({ classId: 'tanker', firstRunEntered: true, firstRewardDone: false }),
    ).toBe('first_reward');
    expect(
      flow.currentStep({ classId: 'tanker', firstRunEntered: true, firstRewardDone: true }),
    ).toBe('done');
  });

  it('always reports done under the e2e skip hook, even for a brand-new player', () => {
    const { flow } = makeFlow({ e2eSkipOnboarding: true });
    expect(flow.currentStep(FRESH_VIEW)).toBe('done');
  });

  it('resumes at class on a fresh instance once intro/age/consent were already persisted', () => {
    const storage = createMemoryStorage();
    const first = new OnboardingFlow({
      storage,
      quotaDeps: NOOP_QUOTA,
      now: () => 1_000_000,
      record: () => undefined,
      e2eSkipOnboarding: false,
    });
    first.completeIntro();
    const second = new OnboardingFlow({
      storage,
      quotaDeps: NOOP_QUOTA,
      now: () => 1_100_000,
      record: () => undefined,
      e2eSkipOnboarding: false,
    });
    expect(second.currentStep(FRESH_VIEW)).toBe('class');
  });
});

describe('OnboardingFlow telemetry', () => {
  it('fires each funnel step exactly once even across repeated calls', () => {
    const { flow, records } = makeFlow();
    flow.markIntroShown();
    flow.markIntroShown();
    flow.completeIntro();
    flow.markClassSelectShown();
    flow.markClassSelectShown();
    flow.recordClassSelected('ranged');
    const steps = records.map((r) => r.properties['step']);
    expect(steps).toEqual(['intro', 'map_view_reached', 'class_select_shown', 'class_selected']);
    const classSelectedRecord = records.find((r) => r.properties['step'] === 'class_selected');
    expect(classSelectedRecord?.properties['class_selected']).toBe('ranged');
    expect(classSelectedRecord?.properties['funnel_bucket']).toBe('0-1');
    const introRecord = records[0];
    expect(introRecord?.properties['class_selected']).toBeNull();
  });
});

describe('OnboardingFlow permission resolution', () => {
  it('defaults permissionGranted to true (fail-open) when the Permissions API is unavailable', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    // No queryGeolocationPermission dep supplied: resolved synchronously, no async gap.
    expect(flow.currentStep({ ...FRESH_VIEW })).toBe('class');
  });

  it('calls onPermissionResolved once the injected query settles, and reads its result', async () => {
    const onPermissionResolved = vi.fn();
    let resolveQuery: (
      state: 'granted' | 'denied' | 'prompt' | 'unknown' | 'unsupported',
    ) => void = () => undefined;
    const { flow } = makeFlow({
      queryGeolocationPermission: () =>
        new Promise((resolve) => {
          resolveQuery = resolve;
        }),
      onPermissionResolved,
    });
    flow.completeIntro();
    expect(onPermissionResolved).not.toHaveBeenCalled();
    resolveQuery('denied');
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(onPermissionResolved).toHaveBeenCalledTimes(1);
    // permissionGranted resolved (non-null) is enough to move past 'permission' regardless of
    // the actual granted/denied value (onboarding-step.ts's own semantics, this module's doc
    // comment) — the home-state screen (F06-T09) is what shows the real consequence of a denial.
    expect(flow.currentStep(FRESH_VIEW)).toBe('class');
  });
});
