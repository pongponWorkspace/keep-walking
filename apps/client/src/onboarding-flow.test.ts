import { describe, expect, it, vi } from 'vitest';
import { createMemoryStorage } from './storage/local-store';
import { readLocationConsent } from './storage/onboarding';
import type { KeyValueStorage } from './storage/local-store';
import { OnboardingFlow } from './onboarding-flow';
import type { OnboardingFlowDeps } from './onboarding-flow';

const NOOP_QUOTA = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };
const MIN_AGE_YR = 15;

function makeFlow(overrides: Partial<OnboardingFlowDeps> = {}): {
  flow: OnboardingFlow;
  records: { name: string; properties: Record<string, unknown> }[];
  storage: KeyValueStorage;
  startLocationProvider: ReturnType<typeof vi.fn>;
} {
  const records: { name: string; properties: Record<string, unknown> }[] = [];
  const storage = overrides.storage ?? createMemoryStorage();
  const startLocationProvider = vi.fn();
  const flow = new OnboardingFlow({
    quotaDeps: NOOP_QUOTA,
    now: () => 1_000_000,
    record: (name, properties) => records.push({ name, properties }),
    minAge_yr: MIN_AGE_YR,
    minAgeComparison: 'greaterThanOrEqual',
    startLocationProvider,
    e2eSkipOnboarding: false,
    ...overrides,
    storage,
  });
  return { flow, records, storage, startLocationProvider };
}

const FRESH_VIEW = { classId: null, firstRunEntered: false, firstRewardDone: false } as const;
const NOW_YEAR = new Date(1_000_000).getFullYear();
const PASSING_BIRTH_YEAR = NOW_YEAR - MIN_AGE_YR - 5;
const UNDERAGE_BIRTH_YEAR = NOW_YEAR - 5;

describe('OnboardingFlow.currentStep', () => {
  it('starts at intro for a brand-new player', () => {
    const { flow } = makeFlow();
    expect(flow.currentStep(FRESH_VIEW)).toBe('intro');
  });

  it('goes to age once intro completes', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    expect(flow.currentStep(FRESH_VIEW)).toBe('age');
  });

  it('goes to underage on a failing birth year, without ever persisting ageGatePassed', () => {
    const { flow, storage } = makeFlow();
    flow.completeIntro();
    expect(flow.confirmAge(UNDERAGE_BIRTH_YEAR)).toBe(false);
    expect(flow.currentStep(FRESH_VIEW)).toBe('underage');
    const saved = JSON.parse(storage.getItem('kw.p2.onboarding') ?? '{}');
    expect(saved.state.ageGatePassed).toBe(false);
  });

  it('returnFromUnderage goes back to age, not underage, on the next check', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    flow.confirmAge(UNDERAGE_BIRTH_YEAR);
    flow.returnFromUnderage();
    expect(flow.currentStep(FRESH_VIEW)).toBe('age');
  });

  it('goes to consent on a passing birth year', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    expect(flow.confirmAge(PASSING_BIRTH_YEAR)).toBe(true);
    expect(flow.currentStep(FRESH_VIEW)).toBe('consent');
  });

  it('accepting consent alone does not start the LocationProvider yet — it reports permission first (flow F06 A4)', () => {
    const { flow, startLocationProvider } = makeFlow();
    flow.completeIntro();
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.acceptConsent();
    expect(startLocationProvider).not.toHaveBeenCalled();
    expect(flow.currentStep(FRESH_VIEW)).toBe('permission');
  });

  it('confirmBrowserPriming (the S-00-permission-browser continue button) starts the LocationProvider and proceeds to class (permission resolves synchronously with no query dep)', () => {
    const { flow, startLocationProvider } = makeFlow();
    flow.completeIntro();
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.acceptConsent();
    flow.confirmBrowserPriming();
    expect(startLocationProvider).toHaveBeenCalledTimes(1);
    expect(flow.currentStep(FRESH_VIEW)).toBe('class');
  });

  it('declining consent never starts the LocationProvider, still proceeds to class (R48)', () => {
    const { flow, startLocationProvider, storage } = makeFlow();
    flow.completeIntro();
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.declineConsent();
    expect(startLocationProvider).not.toHaveBeenCalled();
    expect(flow.currentStep(FRESH_VIEW)).toBe('class');
    expect(readLocationConsent(storage)).toBe('declined');
  });

  it('reports first_run once a class is chosen but no run has started', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.acceptConsent();
    flow.confirmBrowserPriming();
    expect(flow.currentStep({ ...FRESH_VIEW, classId: 'tanker' })).toBe('first_run');
  });

  it('reports first_reward, then done, following firstRunEntered/firstRewardDone', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.acceptConsent();
    flow.confirmBrowserPriming();
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
    const { flow: first } = makeFlow({ storage });
    first.completeIntro();
    first.confirmAge(PASSING_BIRTH_YEAR);
    first.acceptConsent();
    first.confirmBrowserPriming();
    const { flow: second } = makeFlow({ storage, now: () => 1_100_000 });
    expect(second.currentStep(FRESH_VIEW)).toBe('class');
  });
});

describe('OnboardingFlow telemetry', () => {
  it('fires each funnel step exactly once, in order, across the whole sequence', () => {
    const { flow, records } = makeFlow();
    flow.markIntroShown();
    flow.markIntroShown();
    flow.completeIntro();
    flow.markAgeGateShown();
    flow.markAgeGateShown();
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.markConsentShown();
    flow.markConsentShown();
    flow.acceptConsent();
    flow.markPermissionShown();
    flow.markPermissionShown();
    flow.confirmBrowserPriming();
    flow.markClassSelectShown();
    flow.markClassSelectShown();
    flow.recordClassSelected('ranged');
    const steps = records.map((r) => r.properties['step']);
    expect(steps).toEqual([
      'intro',
      'age_gate_shown',
      'age_gate_passed',
      'consent_location_shown',
      'consent_location_accepted',
      'permission_browser_shown',
      'permission_browser_allowed',
      'map_view_reached',
      'class_select_shown',
      'class_selected',
    ]);
    const classSelectedRecord = records.find((r) => r.properties['step'] === 'class_selected');
    expect(classSelectedRecord?.properties['class_selected']).toBe('ranged');
    expect(classSelectedRecord?.properties['funnel_bucket']).toBe('0-1');
    const introRecord = records[0];
    expect(introRecord?.properties['class_selected']).toBeNull();
  });

  it('fires age_gate_under_min (not age_gate_passed) on a failing birth year', () => {
    const { flow, records } = makeFlow();
    flow.completeIntro();
    flow.confirmAge(UNDERAGE_BIRTH_YEAR);
    expect(records.map((r) => r.properties['step'])).toEqual(['age_gate_under_min']);
  });

  it('fires consent_location_declined on decline', () => {
    const { flow, records } = makeFlow();
    flow.completeIntro();
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.declineConsent();
    expect(records.map((r) => r.properties['step'])).toEqual([
      'age_gate_passed',
      'consent_location_declined',
    ]);
  });
});

describe('OnboardingFlow permission resolution', () => {
  it('defaults permissionGranted to true (fail-open) when the Permissions API is unavailable', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.acceptConsent();
    flow.confirmBrowserPriming();
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
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.acceptConsent();
    flow.confirmBrowserPriming();
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
