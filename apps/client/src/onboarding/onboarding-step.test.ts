// currentOnboardingStep / isShellReady / applyOnboardingEvent / isSystemTeachLocked (tech note
// docs/tech/F10-account-shell.md sections 3, 5, 9 — D-149; design/features/F10-account-shell.md
// 3.1, 3.7, section 4 transition table, section 6 edge cases A-E1..A-E7). ASCII-only test titles
// (qa privacy-copy scan) and plain fixtures, no DOM.
import { describe, expect, it } from 'vitest';
import type {
  AccountStorageV1,
  CharacterStorageV1,
  OnboardingStepInput,
  OnboardingStorage,
} from './onboarding-step';
import {
  applyOnboardingEvent,
  currentOnboardingStep,
  initialOnboardingStorage,
  isShellReady,
  isSystemTeachLocked,
} from './onboarding-step';

const NOW_MS = 1_700_000_000_000;

function baseInput(overrides: Partial<OnboardingStepInput> = {}): OnboardingStepInput {
  return {
    storage: null,
    account: null,
    character: null,
    pendingProvider: null,
    atStartThisSession: false,
    underageThisSession: false,
    locationConsent: 'unanswered',
    permissionGranted: null,
    classChosen: false,
    firstRunEntered: false,
    firstRewardDone: false,
    ...overrides,
  };
}

/** `kw.p2.onboarding` with intro, age and consent already answered — the point D-149's table
 * calls step 5 (`permission`) onward, the shape every legacy and every freshly-onboarded player
 * shares by then. */
function passedIntroAgeConsent(overrides: Partial<OnboardingStorage> = {}): OnboardingStorage {
  return {
    ...initialOnboardingStorage(NOW_MS),
    introSeen: true,
    ageGatePassed: true,
    consentAnswered: true,
    ...overrides,
  };
}

const SIGNED_IN: AccountStorageV1 = { provider: 'google', signedIn: true };
// ASCII fixture names on purpose (qa/tests/F02/privacy-copy.test.ts TC-COPY-01 bans hardcoded
// Thai-script string literals in apps/client/src outside its own allowlist): the step machine
// never reads `name`'s content, only `character !== null` / `character.storyDone`.
const NAMED_CHARACTER: CharacterStorageV1 = { name: 'Rangername', storyDone: false };
const STORY_DONE_CHARACTER: CharacterStorageV1 = { name: 'Rangername', storyDone: true };

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

describe('currentOnboardingStep, D-149 table 3.1 order (intro -> login -> age/underage -> consent -> permission -> character -> story -> first_run -> first_reward -> done)', () => {
  it('step intro: no storage yet at all', () => {
    expect(currentOnboardingStep(baseInput({ storage: null }))).toBe('intro');
  });

  it('step intro: storage exists but introSeen is still false', () => {
    const storage = initialOnboardingStorage(NOW_MS);
    expect(currentOnboardingStep(baseInput({ storage }))).toBe('intro');
  });

  it('step intro: atStartThisSession re-arms intro even though introSeen is true (R14 back button)', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true };
    const step = currentOnboardingStep(baseInput({ storage, atStartThisSession: true }));
    expect(step).toBe('intro');
  });

  it('step login: intro passed, no account yet, no provider pressed this session', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true };
    expect(currentOnboardingStep(baseInput({ storage }))).toBe('login');
  });

  it('row 2a, step age: a login button was pressed this session (pendingProvider set), age gate not yet passed', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true };
    const step = currentOnboardingStep(baseInput({ storage, pendingProvider: 'google' }));
    expect(step).toBe('age');
  });

  it('row 2a, step underage: this session already answered the age gate below the threshold', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true };
    const step = currentOnboardingStep(
      baseInput({ storage, pendingProvider: 'apple', underageThisSession: true }),
    );
    expect(step).toBe('underage');
  });

  it('step login: a legacy player has ageGatePassed already true but no account yet (section 5 migration)', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true, ageGatePassed: true };
    expect(currentOnboardingStep(baseInput({ storage }))).toBe('login');
  });

  it('step age: kw.p2.onboarding corrupt/missing ageGatePassed even though account already exists (fail-closed, tech note section 3.2 item 3)', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true };
    const step = currentOnboardingStep(baseInput({ storage, account: SIGNED_IN }));
    expect(step).toBe('age');
  });

  it('step consent: intro, age (and account) passed, consent not yet answered', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true, ageGatePassed: true };
    const step = currentOnboardingStep(baseInput({ storage, account: SIGNED_IN }));
    expect(step).toBe('consent');
  });

  it('step permission: consent granted, browser permission not yet resolved', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({
        storage,
        account: SIGNED_IN,
        locationConsent: 'granted',
        permissionGranted: null,
      }),
    );
    expect(step).toBe('permission');
  });

  it('step character: consent declined skips permission straight to character (F10-R03/F06-R48)', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({ storage, account: SIGNED_IN, locationConsent: 'declined' }),
    );
    expect(step).toBe('character');
  });

  it('step character: consent granted, permission resolved, no class/character yet', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({
        storage,
        account: SIGNED_IN,
        locationConsent: 'granted',
        permissionGranted: false,
      }),
    );
    expect(step).toBe('character');
  });

  it('step character: class chosen but kw.p2.character not written yet (mid-A7, tech note section 2.2)', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({ storage, account: SIGNED_IN, locationConsent: 'declined', classChosen: true }),
    );
    expect(step).toBe('character');
  });

  it('step story: class and kw.p2.character both set, storyDone still false', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({
        storage,
        account: SIGNED_IN,
        locationConsent: 'declined',
        classChosen: true,
        character: NAMED_CHARACTER,
      }),
    );
    expect(step).toBe('story');
  });

  it('step first_run: story finished, dungeon never entered (engine-sourced, unchanged from F06)', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({
        storage,
        account: SIGNED_IN,
        locationConsent: 'declined',
        classChosen: true,
        character: STORY_DONE_CHARACTER,
      }),
    );
    expect(step).toBe('first_run');
  });

  it('step first_reward: first run entered, lifetime tick not yet granted', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({
        storage,
        account: SIGNED_IN,
        locationConsent: 'declined',
        classChosen: true,
        character: STORY_DONE_CHARACTER,
        firstRunEntered: true,
      }),
    );
    expect(step).toBe('first_reward');
  });

  it('step done: first reward granted (R39-R40, even if that run later ends in death)', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({
        storage,
        account: SIGNED_IN,
        locationConsent: 'declined',
        classChosen: true,
        character: STORY_DONE_CHARACTER,
        firstRunEntered: true,
        firstRewardDone: true,
      }),
    );
    expect(step).toBe('done');
  });
});

describe('currentOnboardingStep, consent fail-closed variants (unchanged from F06 8.2)', () => {
  it('withdrawn consent behaves like declined: skips permission, nothing asked again', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({ storage, account: SIGNED_IN, locationConsent: 'withdrawn' }),
    );
    expect(step).toBe('character');
  });

  it('an impossible "unanswered" consent this far in is treated fail-closed, same as declined', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({ storage, account: SIGNED_IN, locationConsent: 'unanswered' }),
    );
    expect(step).toBe('character');
  });
});

describe('currentOnboardingStep, reload mid-onboarding (design/features/F10-account-shell.md A-E2..A-E7: never restarts from intro)', () => {
  it('A-E2: reload at the login screen (no pendingProvider in memory) resumes at login, not intro', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true };
    expect(currentOnboardingStep(baseInput({ storage }))).toBe('login');
  });

  it('A-E3: reload at the age-confirm screen loses pendingProvider (memory only) and resumes at login', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true };
    // pendingProvider is gone after reload (never persisted, tech note F10 section 2.1 "ไม่เขียน
    // เมื่อ ... reload ระหว่าง login กับ age"): the caller rebuilds input with pendingProvider null.
    expect(currentOnboardingStep(baseInput({ storage, pendingProvider: null }))).toBe('login');
  });

  it('A-E4: reload at consent/permission keeps the account (no re-login) and resumes at that step', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true, ageGatePassed: true };
    const step = currentOnboardingStep(baseInput({ storage, account: SIGNED_IN }));
    expect(step).toBe('consent');
  });

  it('A-E5: reload at create-character resumes at character (class/name not persisted until A7)', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({ storage, account: SIGNED_IN, locationConsent: 'declined' }),
    );
    expect(step).toBe('character');
  });

  it('A-E6: reload mid-story resumes at story with the character already intact (R30)', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(
      baseInput({
        storage,
        account: SIGNED_IN,
        locationConsent: 'declined',
        classChosen: true,
        character: NAMED_CHARACTER,
      }),
    );
    expect(step).toBe('story');
    expect(
      isShellReady(
        baseInput({
          storage,
          account: SIGNED_IN,
          locationConsent: 'declined',
          classChosen: true,
          character: NAMED_CHARACTER,
        }),
      ),
    ).toBe(false);
  });

  it('A-E7: reload at the map (shell ready) stays shell-ready, no onboarding step replayed', () => {
    const storage = passedIntroAgeConsent();
    const input = baseInput({
      storage,
      account: SIGNED_IN,
      locationConsent: 'declined',
      classChosen: true,
      character: STORY_DONE_CHARACTER,
      firstRunEntered: true,
      firstRewardDone: true,
    });
    expect(currentOnboardingStep(input)).toBe('done');
    expect(isShellReady(input)).toBe(true);
  });
});

describe('currentOnboardingStep, logout / relogin (F10-R41/R43, A9/A10)', () => {
  const SHELL_READY_STORAGE = passedIntroAgeConsent();
  const SIGNED_OUT: AccountStorageV1 = { provider: 'google', signedIn: false };

  it('A9: signing out (signedIn false) sends an otherwise shell-ready player back to login', () => {
    const step = currentOnboardingStep(
      baseInput({
        storage: SHELL_READY_STORAGE,
        account: SIGNED_OUT,
        locationConsent: 'declined',
        classChosen: true,
        character: STORY_DONE_CHARACTER,
        firstRunEntered: true,
        firstRewardDone: true,
      }),
    );
    expect(step).toBe('login');
  });

  it('A10: a fresh saveAccount({signedIn: true}) after logout goes straight to done, skipping steps 3-7 (F10-R43)', () => {
    const step = currentOnboardingStep(
      baseInput({
        storage: SHELL_READY_STORAGE,
        account: { provider: 'apple', signedIn: true },
        locationConsent: 'declined',
        classChosen: true,
        character: STORY_DONE_CHARACTER,
        firstRunEntered: true,
        firstRewardDone: true,
      }),
    );
    expect(step).toBe('done');
  });
});

describe('currentOnboardingStep, migration for legacy (pre-F10) players (tech note F10 section 5, design/features/F10-account-shell.md 3.7 R45-R48)', () => {
  it('row 1: legacy player with intro/age/consent passed and a class already chosen resumes at login, then character with the class locked by the caller (classChosen stays true)', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(baseInput({ storage, classChosen: true }));
    expect(step).toBe('login');
    // After A2 writes kw.p2.account (ageGatePassed already true, tech note section 3.3 row A2):
    // the very next step is character, with classChosen already true (R47: class shown locked).
    const afterLogin = currentOnboardingStep(
      baseInput({ storage, account: SIGNED_IN, locationConsent: 'declined', classChosen: true }),
    );
    expect(afterLogin).toBe('character');
  });

  it('row 2: legacy player with intro/age/consent passed but no class yet resumes exactly like a new player (login -> character, unlocked)', () => {
    const storage = passedIntroAgeConsent();
    const afterLogin = currentOnboardingStep(
      baseInput({ storage, account: SIGNED_IN, locationConsent: 'declined', classChosen: false }),
    );
    expect(afterLogin).toBe('character');
  });

  it('row 3: legacy player past age but not yet consent (A-E22) resumes at consent before login ever re-asks it (decision-order item 2 before item 4)', () => {
    const storage = { ...initialOnboardingStorage(NOW_MS), introSeen: true, ageGatePassed: true };
    const step = currentOnboardingStep(baseInput({ storage, account: SIGNED_IN }));
    expect(step).toBe('consent');
  });

  it('row 4: a pending run is the caller\'s job (R48 "run comes first always", section 3.2) -- the step machine itself is run-agnostic and still reports the pre-run-check step', () => {
    const storage = passedIntroAgeConsent();
    const step = currentOnboardingStep(baseInput({ storage, classChosen: true }));
    expect(step).toBe('login');
  });

  it('legacy kw.p2.session/HP/inventory data is outside this module entirely: migration never touches them, only intro/account/character flags decide the step', () => {
    const storage = passedIntroAgeConsent();
    const legacyUntouchedInput = baseInput({
      storage,
      account: SIGNED_IN,
      locationConsent: 'declined',
      classChosen: true,
      character: STORY_DONE_CHARACTER,
      firstRunEntered: true,
      firstRewardDone: true,
    });
    expect(currentOnboardingStep(legacyUntouchedInput)).toBe('done');
    expect(isShellReady(legacyUntouchedInput)).toBe(true);
  });
});

describe('isShellReady (tech note F10 section 3.2: step not in {intro..story})', () => {
  it('is false for every one of the 8 onboarding-blocking steps', () => {
    const blockingCases: OnboardingStepInput[] = [
      baseInput({ storage: null }), // intro
      baseInput({ storage: { ...initialOnboardingStorage(NOW_MS), introSeen: true } }), // login
      baseInput({
        storage: { ...initialOnboardingStorage(NOW_MS), introSeen: true },
        pendingProvider: 'google',
      }), // age
      baseInput({
        storage: { ...initialOnboardingStorage(NOW_MS), introSeen: true },
        pendingProvider: 'google',
        underageThisSession: true,
      }), // underage
      baseInput({
        storage: { ...initialOnboardingStorage(NOW_MS), introSeen: true, ageGatePassed: true },
        account: SIGNED_IN,
      }), // consent
      baseInput({
        storage: passedIntroAgeConsent(),
        account: SIGNED_IN,
        locationConsent: 'granted',
        permissionGranted: null,
      }), // permission
      baseInput({
        storage: passedIntroAgeConsent(),
        account: SIGNED_IN,
        locationConsent: 'declined',
      }), // character
      baseInput({
        storage: passedIntroAgeConsent(),
        account: SIGNED_IN,
        locationConsent: 'declined',
        classChosen: true,
        character: NAMED_CHARACTER,
      }), // story
    ];
    for (const input of blockingCases) {
      expect(
        isShellReady(input),
        `step ${currentOnboardingStep(input)} should not be shell-ready`,
      ).toBe(false);
    }
  });

  it('is true for first_run, first_reward and done (nav shows from the first map view onward)', () => {
    const storage = passedIntroAgeConsent();
    const readyCases: OnboardingStepInput[] = [
      baseInput({
        storage,
        account: SIGNED_IN,
        locationConsent: 'declined',
        classChosen: true,
        character: STORY_DONE_CHARACTER,
      }), // first_run
      baseInput({
        storage,
        account: SIGNED_IN,
        locationConsent: 'declined',
        classChosen: true,
        character: STORY_DONE_CHARACTER,
        firstRunEntered: true,
      }), // first_reward
      baseInput({
        storage,
        account: SIGNED_IN,
        locationConsent: 'declined',
        classChosen: true,
        character: STORY_DONE_CHARACTER,
        firstRunEntered: true,
        firstRewardDone: true,
      }), // done
    ];
    for (const input of readyCases) {
      expect(
        isShellReady(input),
        `step ${currentOnboardingStep(input)} should be shell-ready`,
      ).toBe(true);
    }
  });
});

describe('isSystemTeachLocked (R42, pillars 6.2 U1-U8 and the NPC shop; unaffected by D-149)', () => {
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
