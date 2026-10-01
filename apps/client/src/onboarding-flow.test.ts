import { describe, expect, it, vi } from 'vitest';
import { createMemoryStorage } from './storage/local-store';
import { readLocationConsent } from './storage/onboarding';
import { loadAccount } from './storage/account';
import { loadCharacter } from './storage/character';
import type { KeyValueStorage } from './storage/local-store';
import { OnboardingFlow } from './onboarding-flow';
import type { OnboardingFlowDeps } from './onboarding-flow';

const NOOP_QUOTA = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };
const MIN_AGE_YR = 15;

function makeFlow(overrides: Partial<OnboardingFlowDeps> = {}): {
  flow: OnboardingFlow;
  records: { name: string; properties: Record<string, unknown>; atMs: number | undefined }[];
  storage: KeyValueStorage;
  startLocationProvider: ReturnType<typeof vi.fn>;
} {
  const records: { name: string; properties: Record<string, unknown>; atMs: number | undefined }[] =
    [];
  const storage = overrides.storage ?? createMemoryStorage();
  const startLocationProvider = vi.fn();
  const flow = new OnboardingFlow({
    quotaDeps: NOOP_QUOTA,
    now: () => 1_000_000,
    record: (name, properties, atMs) => records.push({ name, properties, atMs }),
    minAge_yr: MIN_AGE_YR,
    minAgeComparison: 'greaterThanOrEqual',
    startLocationProvider,
    e2eSkipOnboarding: false,
    filterRejectCountBuckets: {
      upperBoundsInclusive: [0, 2, 5],
      labels: ['0', '1-2', '3-5', '6+'],
    },
    ...overrides,
    storage,
  });
  return { flow, records, storage, startLocationProvider };
}

const FRESH_VIEW = { classId: null, firstRunEntered: false, firstRewardDone: false } as const;
const NOW_YEAR = new Date(1_000_000).getFullYear();
const PASSING_BIRTH_YEAR = NOW_YEAR - MIN_AGE_YR - 5;
const UNDERAGE_BIRTH_YEAR = NOW_YEAR - 5;

/** Drives a flow all the way to the `character` step (login -> age -> consent -> permission),
 * the common setup every test past `login` needs — picking `google` each time. */
function advanceToCharacter(flow: OnboardingFlow): void {
  flow.completeIntro();
  flow.chooseLoginMethod('google');
  flow.confirmAge(PASSING_BIRTH_YEAR);
  flow.acceptConsent();
  flow.confirmBrowserPriming();
}

describe('OnboardingFlow.currentStep', () => {
  it('starts at intro for a brand-new player', () => {
    const { flow } = makeFlow();
    expect(flow.currentStep(FRESH_VIEW)).toBe('intro');
  });

  it('goes to login once intro completes', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    expect(flow.currentStep(FRESH_VIEW)).toBe('login');
  });

  it('choosing a login method holds the provider in memory only, writes nothing yet', () => {
    const { flow, storage } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    expect(loadAccount(storage)).toBeNull();
  });

  it('goes to age once a login method is chosen', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('apple');
    expect(flow.currentStep(FRESH_VIEW)).toBe('age');
  });

  it('writes kw.p2.account with the chosen provider only once the age gate passes', () => {
    const { flow, storage } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('apple');
    expect(loadAccount(storage)).toBeNull();
    flow.confirmAge(PASSING_BIRTH_YEAR);
    expect(loadAccount(storage)).toEqual({ provider: 'apple', signedIn: true });
  });

  it('email sub-screens all map to the email provider', () => {
    for (const method of ['email_login', 'email_register', 'email_forgot'] as const) {
      const { flow, storage } = makeFlow();
      flow.completeIntro();
      flow.chooseLoginMethod(method);
      flow.confirmAge(PASSING_BIRTH_YEAR);
      expect(loadAccount(storage)).toEqual({ provider: 'email', signedIn: true });
    }
  });

  it('goes to underage on a failing birth year, without ever persisting ageGatePassed or an account', () => {
    const { flow, storage } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    expect(flow.confirmAge(UNDERAGE_BIRTH_YEAR)).toBe(false);
    expect(flow.currentStep(FRESH_VIEW)).toBe('underage');
    const saved = JSON.parse(storage.getItem('kw.p2.onboarding') ?? '{}');
    expect(saved.state.ageGatePassed).toBe(false);
    expect(loadAccount(storage)).toBeNull();
  });

  it('returnFromUnderage goes back to intro (a fresh provider pick is required, flow B2)', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    flow.confirmAge(UNDERAGE_BIRTH_YEAR);
    flow.returnFromUnderage();
    expect(flow.currentStep(FRESH_VIEW)).toBe('intro');
  });

  it('completeIntro clears atStartThisSession, resuming the login step normally', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    flow.confirmAge(UNDERAGE_BIRTH_YEAR);
    flow.returnFromUnderage();
    flow.completeIntro();
    expect(flow.currentStep(FRESH_VIEW)).toBe('login');
  });

  it('goes to consent on a passing birth year', () => {
    const { flow } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    expect(flow.confirmAge(PASSING_BIRTH_YEAR)).toBe(true);
    expect(flow.currentStep(FRESH_VIEW)).toBe('consent');
  });

  it('a returning player whose age gate already passed writes the account immediately on chooseLoginMethod', () => {
    const { flow, storage } = makeFlow();
    // Simulate "ageGatePassed already true" (migration/relogin) by going through the gate once,
    // then picking a login method again on a fresh instance sharing the same storage.
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    flow.confirmAge(PASSING_BIRTH_YEAR);
    const { flow: second } = makeFlow({ storage, now: () => 1_050_000 });
    second.chooseLoginMethod('apple');
    expect(loadAccount(storage)).toEqual({ provider: 'apple', signedIn: true });
  });

  it('accepting consent alone does not start the LocationProvider yet — it reports permission first (flow F06 A4)', () => {
    const { flow, startLocationProvider } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.acceptConsent();
    expect(startLocationProvider).not.toHaveBeenCalled();
    expect(flow.currentStep(FRESH_VIEW)).toBe('permission');
  });

  it('confirmBrowserPriming (the S-00-permission-browser continue button) starts the LocationProvider and proceeds to character (permission resolves synchronously with no query dep)', () => {
    const { flow, startLocationProvider } = makeFlow();
    advanceToCharacter(flow);
    expect(startLocationProvider).toHaveBeenCalledTimes(1);
    expect(flow.currentStep(FRESH_VIEW)).toBe('character');
  });

  it('declining consent never starts the LocationProvider, still proceeds to character (R48)', () => {
    const { flow, startLocationProvider, storage } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.declineConsent();
    expect(startLocationProvider).not.toHaveBeenCalled();
    expect(flow.currentStep(FRESH_VIEW)).toBe('character');
    expect(readLocationConsent(storage)).toBe('declined');
  });

  it('reports character still, once a class is chosen but no kw.p2.character exists yet (P2-F10-T15 builds that write)', () => {
    const { flow } = makeFlow();
    advanceToCharacter(flow);
    expect(flow.currentStep({ ...FRESH_VIEW, classId: 'tanker' })).toBe('character');
  });

  it('always reports done under the e2e skip hook, even for a brand-new player', () => {
    const { flow } = makeFlow({ e2eSkipOnboarding: true });
    expect(flow.currentStep(FRESH_VIEW)).toBe('done');
  });

  it('reports login under the e2e skip hook when the seeded account has been signed out', () => {
    const storage = createMemoryStorage();
    const { flow: first } = makeFlow({ storage, e2eSkipOnboarding: true });
    void first;
    storage.setItem(
      'kw.p2.account',
      JSON.stringify({
        schemaVersion: 1,
        savedAt_ms: 1,
        state: { provider: 'google', signedIn: false },
      }),
    );
    const { flow: second } = makeFlow({ storage, e2eSkipOnboarding: true });
    expect(second.currentStep(FRESH_VIEW)).toBe('login');
  });

  it('a relogin tap under the e2e skip hook writes the account immediately and reports done again (section 9.1 item 2, P2-F10-T17)', () => {
    const storage = createMemoryStorage();
    const { flow: first } = makeFlow({ storage, e2eSkipOnboarding: true });
    void first;
    storage.setItem(
      'kw.p2.account',
      JSON.stringify({
        schemaVersion: 1,
        savedAt_ms: 1,
        state: { provider: 'google', signedIn: false },
      }),
    );
    const { flow: second } = makeFlow({ storage, e2eSkipOnboarding: true });
    expect(second.currentStep(FRESH_VIEW)).toBe('login');
    second.chooseLoginMethod('apple');
    expect(loadAccount(storage)).toEqual({ provider: 'apple', signedIn: true });
    expect(second.currentStep(FRESH_VIEW)).toBe('done');
  });

  it('resumes at character on a fresh instance once login/age/consent/permission were already persisted', () => {
    const storage = createMemoryStorage();
    const { flow: first } = makeFlow({ storage });
    advanceToCharacter(first);
    const { flow: second } = makeFlow({ storage, now: () => 1_100_000 });
    expect(second.currentStep(FRESH_VIEW)).toBe('character');
  });
});

describe('OnboardingFlow telemetry', () => {
  it('fires each funnel step exactly once, in order, across the whole sequence', () => {
    const { flow, records } = makeFlow();
    flow.markIntroShown();
    flow.markIntroShown();
    flow.completeIntro();
    flow.markLoginShown();
    flow.markLoginShown();
    flow.chooseLoginMethod('google');
    flow.markAgeGateShown();
    flow.markAgeGateShown();
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.markConsentShown();
    flow.markConsentShown();
    flow.acceptConsent();
    flow.markPermissionShown();
    flow.markPermissionShown();
    flow.confirmBrowserPriming();
    flow.markCharacterCreateShown();
    flow.markCharacterCreateShown();
    flow.recordClassSelected('ranged');
    const steps = records.map((r) => r.properties['step']).filter((s) => s !== undefined);
    expect(steps).toEqual([
      'intro',
      'login_shown',
      'login_method_chosen',
      'age_gate_shown',
      'age_gate_passed',
      'consent_location_shown',
      'consent_location_accepted',
      'permission_browser_shown',
      'permission_browser_allowed',
      'map_view_reached',
      'class_select_shown',
      'character_create_shown',
      'class_selected',
    ]);
    const classSelectedRecord = records.find((r) => r.properties['step'] === 'class_selected');
    expect(classSelectedRecord?.properties['class_selected']).toBe('ranged');
    expect(classSelectedRecord?.properties['funnel_bucket']).toBe('0-1');
  });

  it('fires account_login_shown with context first_time for a brand-new player', () => {
    const { flow, records } = makeFlow();
    flow.completeIntro();
    flow.markLoginShown();
    const event = records.find((r) => r.name === 'account_login_shown');
    expect(event?.properties).toEqual({ context: 'first_time' });
  });

  it('fires account_login_shown with context relogin for a signed-out account', () => {
    const storage = createMemoryStorage();
    const { flow: first } = makeFlow({ storage });
    advanceToCharacter(first);
    storage.setItem(
      'kw.p2.account',
      JSON.stringify({
        schemaVersion: 1,
        savedAt_ms: 1,
        state: { provider: 'google', signedIn: false },
      }),
    );
    const { flow: second, records } = makeFlow({ storage, now: () => 1_200_000 });
    second.markLoginShown();
    const event = records.find((r) => r.name === 'account_login_shown');
    expect(event?.properties).toEqual({ context: 'relogin' });
  });

  it('fires account_login_method_chosen with the exact method, before writing the account', () => {
    const { flow, records, storage } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('email_register');
    const event = records.find((r) => r.name === 'account_login_method_chosen');
    expect(event?.properties).toEqual({ method: 'email_register' });
    // Not written yet (age gate has not passed): proves the event really fired before the write.
    expect(loadAccount(storage)).toBeNull();
  });

  it('fires age_gate_under_min (not age_gate_passed) on a failing birth year', () => {
    const { flow, records } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    flow.confirmAge(UNDERAGE_BIRTH_YEAR);
    const funnelSteps = records
      .filter((r) => r.name === 'onboarding_funnel_step')
      .map((r) => r.properties['step']);
    expect(funnelSteps).toEqual(['login_method_chosen', 'age_gate_under_min']);
  });

  it('fires consent_location_declined on decline', () => {
    const { flow, records } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    flow.confirmAge(PASSING_BIRTH_YEAR);
    flow.declineConsent();
    const funnelSteps = records
      .filter((r) => r.name === 'onboarding_funnel_step')
      .map((r) => r.properties['step']);
    expect(funnelSteps).toEqual([
      'login_method_chosen',
      'age_gate_passed',
      'consent_location_declined',
    ]);
  });
});

describe('OnboardingFlow permission resolution', () => {
  it('defaults permissionGranted to true (fail-open) when the Permissions API is unavailable', () => {
    const { flow } = makeFlow();
    advanceToCharacter(flow);
    // No queryGeolocationPermission dep supplied: resolved synchronously, no async gap.
    expect(flow.currentStep({ ...FRESH_VIEW })).toBe('character');
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
    flow.chooseLoginMethod('google');
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
    expect(flow.currentStep(FRESH_VIEW)).toBe('character');
  });
});

describe('OnboardingFlow.createCharacter / completeStory / skipStory (P2-F10-T15)', () => {
  it('writes kw.p2.character, fires character_created + the paired funnel step, and advances to story', () => {
    const { flow, records, storage } = makeFlow();
    advanceToCharacter(flow);
    flow.createCharacter({
      classId: 'magic',
      name: 'somchai',
      nameSource: 'typed',
      filterRejectCount: 0,
    });
    expect(loadCharacter(storage)).toEqual({ name: 'somchai', storyDone: false });
    expect(flow.currentStep({ ...FRESH_VIEW, classId: 'magic' })).toBe('story');
    const created = records.find((r) => r.name === 'character_created');
    expect(created?.properties).toEqual({
      class_id: 'magic',
      name_source: 'typed',
      filter_reject_count: '0',
    });
    const funnelSteps = records.map((r) => r.properties['step']);
    const createdIndex = records.indexOf(created as (typeof records)[number]);
    expect(funnelSteps[createdIndex + 1]).toBe('character_create_done');
  });

  it('buckets filter_reject_count against the injected config, never a hardcoded table', () => {
    const { flow, records } = makeFlow({
      filterRejectCountBuckets: { upperBoundsInclusive: [0, 1], labels: ['none', 'some', 'lots'] },
    });
    advanceToCharacter(flow);
    flow.createCharacter({
      classId: 'tanker',
      name: 'ab',
      nameSource: 'random',
      filterRejectCount: 5,
    });
    const created = records.find((r) => r.name === 'character_created');
    expect(created?.properties['filter_reject_count']).toBe('lots');
  });

  it('completeStory marks storyDone, fires story_completed + paired story_done with slides_viewed_count', () => {
    const { flow, records, storage } = makeFlow();
    advanceToCharacter(flow);
    flow.createCharacter({
      classId: 'ranged',
      name: 'ab',
      nameSource: 'typed',
      filterRejectCount: 0,
    });
    flow.completeStory(3);
    expect(loadCharacter(storage)).toEqual({ name: 'ab', storyDone: true });
    expect(flow.currentStep({ ...FRESH_VIEW, classId: 'ranged' })).not.toBe('story');
    const completed = records.find((r) => r.name === 'story_completed');
    expect(completed?.properties).toEqual({ slides_viewed_count: 3 });
    const funnelSteps = records.map((r) => r.properties['step']);
    const completedIndex = records.indexOf(completed as (typeof records)[number]);
    expect(funnelSteps[completedIndex + 1]).toBe('story_done');
  });

  it('skipStory marks storyDone the same way, firing story_skipped + paired story_done instead', () => {
    const { flow, records, storage } = makeFlow();
    advanceToCharacter(flow);
    flow.createCharacter({
      classId: 'support',
      name: 'ab',
      nameSource: 'typed',
      filterRejectCount: 0,
    });
    flow.skipStory(2);
    expect(loadCharacter(storage)).toEqual({ name: 'ab', storyDone: true });
    const skipped = records.find((r) => r.name === 'story_skipped');
    expect(skipped?.properties).toEqual({ slide_index_at_skip: 2 });
    expect(records.some((r) => r.name === 'story_completed')).toBe(false);
    const funnelSteps = records.map((r) => r.properties['step']);
    const skippedIndex = records.indexOf(skipped as (typeof records)[number]);
    expect(funnelSteps[skippedIndex + 1]).toBe('story_done');
  });

  it('markStoryShown fires story_shown exactly once', () => {
    const { flow, records } = makeFlow();
    advanceToCharacter(flow);
    flow.markStoryShown();
    flow.markStoryShown();
    expect(records.filter((r) => r.properties['step'] === 'story_shown')).toHaveLength(1);
  });
});

describe('BUG-P2-006 — paired direct event + funnel step share one client_ts_ms-equivalent `atMs`', () => {
  // A clock that advances on every single call (the exact shape of the original flake: two
  // independent `deps.now()` reads straddling a millisecond-clock tick) -- every pair this module
  // promises "เวลาเดียวกันเสมอ" for must still land on the identical captured instant.
  function advancingClock(): () => number {
    let t = 1_000_000;
    return () => {
      t += 1;
      return t;
    };
  }

  it('character_created and its paired character_create_done funnel step share one atMs', () => {
    const { flow, records } = makeFlow({ now: advancingClock() });
    advanceToCharacter(flow);
    flow.createCharacter({
      classId: 'magic',
      name: 'somchai',
      nameSource: 'typed',
      filterRejectCount: 0,
    });
    const created = records.find((r) => r.name === 'character_created');
    const funnelDone = records.find((r) => r.properties['step'] === 'character_create_done');
    expect(created?.atMs).toBeDefined();
    expect(created?.atMs).toBe(funnelDone?.atMs);
  });

  it('story_completed and its paired story_done funnel step share one atMs', () => {
    const { flow, records } = makeFlow({ now: advancingClock() });
    advanceToCharacter(flow);
    flow.createCharacter({
      classId: 'ranged',
      name: 'ab',
      nameSource: 'typed',
      filterRejectCount: 0,
    });
    flow.completeStory(3);
    const completed = records.find((r) => r.name === 'story_completed');
    const funnelDone = records.filter((r) => r.properties['step'] === 'story_done')[0];
    expect(completed?.atMs).toBeDefined();
    expect(completed?.atMs).toBe(funnelDone?.atMs);
  });

  it('story_skipped and its paired story_done funnel step share one atMs', () => {
    const { flow, records } = makeFlow({ now: advancingClock() });
    advanceToCharacter(flow);
    flow.createCharacter({
      classId: 'support',
      name: 'ab',
      nameSource: 'typed',
      filterRejectCount: 0,
    });
    flow.skipStory(2);
    const skipped = records.find((r) => r.name === 'story_skipped');
    const funnelDone = records.filter((r) => r.properties['step'] === 'story_done')[0];
    expect(skipped?.atMs).toBeDefined();
    expect(skipped?.atMs).toBe(funnelDone?.atMs);
  });

  it('account_login_shown and its paired login_shown funnel step share one atMs', () => {
    const { flow, records } = makeFlow({ now: advancingClock() });
    flow.completeIntro();
    flow.markLoginShown();
    const shown = records.find((r) => r.name === 'account_login_shown');
    const funnelShown = records.find((r) => r.properties['step'] === 'login_shown');
    expect(shown?.atMs).toBeDefined();
    expect(shown?.atMs).toBe(funnelShown?.atMs);
  });

  it('account_login_method_chosen and its paired login_method_chosen funnel step share one atMs', () => {
    const { flow, records } = makeFlow({ now: advancingClock() });
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    const chosen = records.find((r) => r.name === 'account_login_method_chosen');
    const funnelChosen = records.find((r) => r.properties['step'] === 'login_method_chosen');
    expect(chosen?.atMs).toBeDefined();
    expect(chosen?.atMs).toBe(funnelChosen?.atMs);
  });
});

describe('OnboardingFlow.logout (P2-F10-T17)', () => {
  const DONE_VIEW = { classId: 'tanker', firstRunEntered: true, firstRewardDone: true } as const;

  it('flips signedIn to false without deleting the account key, reports login on the next call', () => {
    const { flow, storage } = makeFlow();
    flow.completeIntro();
    flow.chooseLoginMethod('google');
    flow.confirmAge(PASSING_BIRTH_YEAR);
    expect(loadAccount(storage)).toEqual({ provider: 'google', signedIn: true });

    flow.logout();

    expect(loadAccount(storage)).toEqual({ provider: 'google', signedIn: false });
    expect(flow.currentStep(DONE_VIEW)).toBe('login');
  });

  it('never deletes kw.p2.character or kw.p2.onboarding (R41)', () => {
    const { flow, storage } = makeFlow();
    advanceToCharacter(flow);
    flow.createCharacter({
      classId: 'tanker',
      name: 'ab',
      nameSource: 'typed',
      filterRejectCount: 0,
    });
    flow.completeStory(1);

    flow.logout();

    expect(loadCharacter(storage)).toEqual({ name: 'ab', storyDone: true });
    expect(readLocationConsent(storage)).toBe('granted');
  });

  it('resets the login-shown funnel flag so a relogin fires account_login_shown again with context relogin', () => {
    const { flow, records } = makeFlow();
    flow.completeIntro();
    flow.markLoginShown();
    flow.chooseLoginMethod('google');
    flow.confirmAge(PASSING_BIRTH_YEAR);

    flow.logout();
    flow.markLoginShown();

    const shown = records.filter((r) => r.name === 'account_login_shown');
    expect(shown).toHaveLength(2);
    expect(shown[1]?.properties).toEqual({ context: 'relogin' });
  });

  it('is a no-op on an account that was never signed in (nothing to log out of)', () => {
    const { flow, storage } = makeFlow();
    expect(loadAccount(storage)).toBeNull();
    flow.logout();
    expect(loadAccount(storage)).toBeNull();
  });
});
