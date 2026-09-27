// currentOnboardingStep / applyOnboardingEvent / isSystemTeachLocked (tech note
// F06-hp-damage-onboarding.md sections 4, 8; design/features/F06-hp-damage-onboarding.md 3.8-3.9,
// R36, R42, R44-R49). ASCII-only test titles (qa privacy-copy scan) and plain fixtures, no DOM.
import { describe, expect, it } from 'vitest';
import type { OnboardingStepInput, OnboardingStorage } from './onboarding-step';
import {
  applyOnboardingEvent,
  currentOnboardingStep,
  initialOnboardingStorage,
  isSystemTeachLocked,
} from './onboarding-step';

const NOW_MS = 1_700_000_000_000;

function baseInput(overrides: Partial<OnboardingStepInput> = {}): OnboardingStepInput {
  return {
    storage: null,
    underageThisSession: false,
    locationConsent: 'unanswered',
    permissionGranted: null,
    mapAcknowledged: true,
    classChosen: false,
    firstRunEntered: false,
    firstRewardDone: false,
    ...overrides,
  };
}

function passedIntroAndAge(overrides: Partial<OnboardingStorage> = {}): OnboardingStorage {
  return {
    ...initialOnboardingStorage(NOW_MS),
    introSeen: true,
    ageGatePassed: true,
    ...overrides,
  };
}

describe('initialOnboardingStorage', () => {
  it('starts every flag false at the injected clock value', () => {
    expect(initialOnboardingStorage(NOW_MS)).toEqual({
      schemaVersion: 1,
      introSeen: false,
      ageGatePassed: false,
      consentAnswered: false,
      firstOpenAt_ms: NOW_MS,
    });
  });
});

describe('applyOnboardingEvent', () => {
  it('flips introSeen from false to true', () => {
    const before = initialOnboardingStorage(NOW_MS);
    const after = applyOnboardingEvent(before, { type: 'introSeen' });
    expect(after.introSeen).toBe(true);
    expect(after).not.toBe(before);
  });

  it('flips ageGatePassed from false to true without touching other fields', () => {
    const before = initialOnboardingStorage(NOW_MS);
    const after = applyOnboardingEvent(before, { type: 'ageGatePassed' });
    expect(after).toEqual({ ...before, ageGatePassed: true });
  });

  it('flips consentAnswered from false to true', () => {
    const before = initialOnboardingStorage(NOW_MS);
    const after = applyOnboardingEvent(before, { type: 'consentAnswered' });
    expect(after.consentAnswered).toBe(true);
  });

  it('is a no-op (same reference) when the flag is already true', () => {
    const before = { ...initialOnboardingStorage(NOW_MS), introSeen: true };
    const after = applyOnboardingEvent(before, { type: 'introSeen' });
    expect(after).toBe(before);
  });

  it('replaying the same event twice yields the same result (idempotent retry)', () => {
    const once = applyOnboardingEvent(initialOnboardingStorage(NOW_MS), {
      type: 'consentAnswered',
    });
    const twice = applyOnboardingEvent(once, { type: 'consentAnswered' });
    expect(twice).toEqual(once);
  });
});

describe('currentOnboardingStep, R44 order (intro -> age -> consent -> permission -> map -> class -> first_run -> first_reward -> done)', () => {
  it('step intro: no storage yet at all', () => {
    expect(currentOnboardingStep(baseInput({ storage: null }))).toBe('intro');
  });

  it('step intro: storage exists but introSeen is still false', () => {
    const storage = initialOnboardingStorage(NOW_MS);
    expect(currentOnboardingStep(baseInput({ storage }))).toBe('intro');
  });

  it('step age: intro passed, age gate not yet answered', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true };
    expect(currentOnboardingStep(baseInput({ storage }))).toBe('age');
  });

  it('step underage: this session answered the age gate below the threshold (R46, nothing stored)', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true };
    const step = currentOnboardingStep(baseInput({ storage, underageThisSession: true }));
    expect(step).toBe('underage');
  });

  it('step consent: intro and age passed, consent not yet answered', () => {
    const storage = passedIntroAndAge();
    expect(currentOnboardingStep(baseInput({ storage }))).toBe('consent');
  });

  it('step permission: consent granted, browser permission not yet resolved', () => {
    const storage = passedIntroAndAge({ consentAnswered: true });
    const step = currentOnboardingStep(
      baseInput({ storage, locationConsent: 'granted', permissionGranted: null }),
    );
    expect(step).toBe('permission');
  });

  it('step map: consent declined skips permission straight to map (R48)', () => {
    const storage = passedIntroAndAge({ consentAnswered: true });
    const step = currentOnboardingStep(
      baseInput({ storage, locationConsent: 'declined', mapAcknowledged: false }),
    );
    expect(step).toBe('map');
  });

  it('step map: consent granted and permission resolved, map not yet acknowledged', () => {
    const storage = passedIntroAndAge({ consentAnswered: true });
    const step = currentOnboardingStep(
      baseInput({
        storage,
        locationConsent: 'granted',
        permissionGranted: false,
        mapAcknowledged: false,
      }),
    );
    expect(step).toBe('map');
  });

  it('step class: map acknowledged, no class chosen yet', () => {
    const storage = passedIntroAndAge({ consentAnswered: true });
    const step = currentOnboardingStep(
      baseInput({ storage, locationConsent: 'declined', mapAcknowledged: true }),
    );
    expect(step).toBe('class');
  });

  it('step first_run: class chosen, dungeon never entered (engine-sourced, R36)', () => {
    const storage = passedIntroAndAge({ consentAnswered: true });
    const step = currentOnboardingStep(
      baseInput({ storage, locationConsent: 'declined', classChosen: true }),
    );
    expect(step).toBe('first_run');
  });

  it('step first_reward: first run entered, lifetime tick not yet granted', () => {
    const storage = passedIntroAndAge({ consentAnswered: true });
    const step = currentOnboardingStep(
      baseInput({
        storage,
        locationConsent: 'declined',
        classChosen: true,
        firstRunEntered: true,
      }),
    );
    expect(step).toBe('first_reward');
  });

  it('step done: first reward granted (R39-R40, even if that run later ends in death)', () => {
    const storage = passedIntroAndAge({ consentAnswered: true });
    const step = currentOnboardingStep(
      baseInput({
        storage,
        locationConsent: 'declined',
        classChosen: true,
        firstRunEntered: true,
        firstRewardDone: true,
      }),
    );
    expect(step).toBe('done');
  });
});

describe('currentOnboardingStep, resumption (R36: never restarts from intro)', () => {
  it('reopening after intro and age passed resumes at consent, not intro', () => {
    const storage = passedIntroAndAge();
    expect(currentOnboardingStep(baseInput({ storage }))).toBe('consent');
  });

  it('a stale underageThisSession flag from a prior session has no effect once ageGatePassed is true', () => {
    const storage = passedIntroAndAge({ consentAnswered: true });
    const step = currentOnboardingStep(
      baseInput({ storage, underageThisSession: true, locationConsent: 'declined' }),
    );
    expect(step).toBe('class');
  });

  it('withdrawn consent (R48) behaves like declined: skips permission, no data requested again', () => {
    const storage = passedIntroAndAge({ consentAnswered: true });
    const step = currentOnboardingStep(baseInput({ storage, locationConsent: 'withdrawn' }));
    expect(step).toBe('class');
  });

  it('unanswered consent value is treated fail-closed, same as declined', () => {
    const storage = passedIntroAndAge({ consentAnswered: true });
    const step = currentOnboardingStep(baseInput({ storage, locationConsent: 'unanswered' }));
    expect(step).toBe('class');
  });
});

describe('isSystemTeachLocked (R42, pillars 6.2 U1-U8 and the NPC shop)', () => {
  const LOCKED = { lockedSystemIds: ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'NPC'] };

  it('locks a listed system while the first reward has not been granted', () => {
    const locked = isSystemTeachLocked('U1', { firstRewardDone: false }, LOCKED);
    expect(locked).toBe(true);
  });

  it('unlocks a listed system once the first reward has been granted', () => {
    const locked = isSystemTeachLocked('U1', { firstRewardDone: true }, LOCKED);
    expect(locked).toBe(false);
  });

  it('never locks a system id absent from the config-sourced list', () => {
    const locked = isSystemTeachLocked('statAllocation', { firstRewardDone: false }, LOCKED);
    expect(locked).toBe(false);
  });

  it('locks the NPC shop the same way even though it carries no U-number', () => {
    const locked = isSystemTeachLocked('NPC', { firstRewardDone: false }, LOCKED);
    expect(locked).toBe(true);
  });
});
