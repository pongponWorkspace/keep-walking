/**
 * Onboarding step machine (tech note docs/tech/F10-account-shell.md sections 3, 5, 9 — D-149,
 * replacing F06-hp-damage-onboarding.md 8.2 in full, section 3.1's own words: "ใหม่แทน F06 8.2").
 * A **pure** selector, no DOM, no config/asset loading, no coordinates, no
 * `@keep-walking/shared/session` (or any other engine subpath) dependency — same shape as the
 * sibling `home/home-state.ts` (P2-X27): plain data in, one of a fixed set of steps out.
 *
 * Written by backend-programmer under the D-125 role-swap exception (studio/decisions/
 * decision-log.md, "swap rule 10": a pure module in a new `apps/client` folder, tech-lead review
 * in F06-T20 and F10-T18). gameplay-programmer wires this (P2-F10-T14/T15): persists
 * `OnboardingStorage` under `kw.p2.onboarding` (unchanged v1 shape, tech note F10 section 2.3),
 * `AccountStorageV1` under `kw.p2.account` and `CharacterStorageV1` under `kw.p2.character`
 * (`storage/account.ts`, `storage/character.ts`, tech note sections 2.1/2.2), reads
 * `kw.p2.consent.location` for `locationConsent`, checks `navigator.permissions` (Mock-provider-
 * gated per D-130) for `permissionGranted`, and reads `classId`, `firstRunEntered`,
 * `firstRewardDone` off `selectPlayerView` (`@keep-walking/shared/session`) rather than storing
 * them again here (same reasoning F06 8.2 already used: "ขั้นที่ engine รู้อยู่แล้วไม่ถูกเก็บซ้ำ").
 *
 * D-149 replaces F06's `O-map -> O-class` pair with a single `character` step (class is chosen
 * through the same create-character screen as the name, tech note F10 section 3.1: "`class` รวม
 * เข้า `character`") and adds three steps F06 never had: `login` (account, R10/R13), `character`'s
 * own name/story companion `story` (slides, R27-R30), and — between `login` and `age` — an in-
 * memory-only `age` sub-wait while a `pendingProvider` is held (section 3.1 row `2a`). `map` and
 * `class` as *named steps* no longer exist; `mapAcknowledged` is gone with them (D-149 made the
 * map/class reveal moot: the character screen is a full screen before the first map view, not a
 * sheet layered over it, tech note F10 section 3.1).
 *
 * Four inputs are deliberately **not** part of any persisted storage shape:
 * - `pendingProvider` / `atStartThisSession` (R13/R14): the login screen's in-memory choice while
 *   the age gate has not resolved it yet, and the underage screen's own "back" button re-arming
 *   the intro step. Neither survives a reload (tech note F10 section 2.1 "ไม่เขียนเมื่อ ... reload
 *   ระหว่าง login กับ age").
 * - `underageThisSession` (R46, unchanged from F06): an underage answer writes no `kw.p2.*` key
 *   at all, so the next app open asks the age gate again.
 * - `permissionGranted` (unchanged from F06 8.2): the browser/OS permission has no flag of its
 *   own; it is asked live once `locationConsent === 'granted'`.
 *
 * `character` cannot be skipped (R29, carried over from F06's `class`) and `no_class` fails a
 * check-in closed (tech note F06 6.3, D-120: the engine's own `no_class` rejection is what forces
 * the create-character screen open if a caller ever lets a run start before this step machine
 * says `'character'` is done).
 */

/** `kw.p2.onboarding` (tech note F06 8.1). Every field the client itself has answered; `class`,
 * `first_run_entered`, and `first_reward` come from the engine instead (8.2) and are not stored
 * here. */
export interface OnboardingStorage {
  readonly schemaVersion: 1;
  readonly introSeen: boolean;
  readonly ageGatePassed: boolean;
  /** Answered, whichever way (R48) — the granted/declined value itself lives in `kw.p2.consent`,
   * a different key this module does not own. */
  readonly consentAnswered: boolean;
  /** Used only to bucket `onboarding_first_reward_granted`'s `minutes_since_first_open_bucket`
   * (tech note F06 8.1) — never read back as a real timestamp by this module. */
  readonly firstOpenAt_ms: number;
}

/** A fresh `kw.p2.onboarding` record for a brand-new player. `now_ms` is an injected clock value
 * (ADR 0003 C1-3), never read from `Date.now()` here. */
export function initialOnboardingStorage(now_ms: number): OnboardingStorage {
  return {
    schemaVersion: 1,
    introSeen: false,
    ageGatePassed: false,
    consentAnswered: false,
    firstOpenAt_ms: now_ms,
  };
}

/** The only three flags this module ever flips (R36's client-owned steps: `intro`, `age`,
 * `consent`). Reaching an already-true flag again is a no-op (CLAUDE.md: every mutation is
 * idempotent — the caller may retry or re-send an event safely). There is deliberately no event
 * for "age gate answered underage": R46 says that answer writes no key at all. */
export type OnboardingEvent =
  | { readonly type: 'introSeen' }
  | { readonly type: 'ageGatePassed' }
  | { readonly type: 'consentAnswered' };

export function applyOnboardingEvent(
  storage: OnboardingStorage,
  event: OnboardingEvent,
): OnboardingStorage {
  switch (event.type) {
    case 'introSeen':
      return storage.introSeen ? storage : { ...storage, introSeen: true };
    case 'ageGatePassed':
      return storage.ageGatePassed ? storage : { ...storage, ageGatePassed: true };
    case 'consentAnswered':
      return storage.consentAnswered ? storage : { ...storage, consentAnswered: true };
    /* c8 ignore next 4 -- exhaustiveness guard, no other `OnboardingEvent` variant exists */
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

/** `kw.p2.account` (tech note F10 section 2.1, R13/R41/R43/R49). `provider` is a label on the
 * button the player pressed, never a real identity (Phase 2 has no backend auth, R10/R12). */
export interface AccountStorageV1 {
  readonly provider: 'google' | 'apple' | 'email';
  readonly signedIn: boolean;
}

/** `kw.p2.character` (tech note F10 section 2.2, R21/R22/R27/R30/R49). `name` is already
 * `validateCharacterName`'s `normalized` output; never re-validated or re-normalized by this
 * module. `storyDone` is `true` once slide 5 is finished or the story is skipped (R27). */
export interface CharacterStorageV1 {
  readonly name: string;
  readonly storyDone: boolean;
}

/** The ordered steps of D-149 (tech note F10 section 3.1 table), replacing F06 8.2 in full. */
export type OnboardingStep =
  | 'intro'
  | 'login'
  | 'age'
  | 'underage'
  | 'consent'
  | 'permission'
  | 'character'
  | 'story'
  | 'first_run'
  | 'first_reward'
  | 'done';

export interface OnboardingStepInput {
  /** `null` before the very first write to `kw.p2.onboarding` (equivalent to
   * `initialOnboardingStorage`'s all-`false` shape, but a caller need not construct it just to
   * ask "what step is this?"). */
  readonly storage: OnboardingStorage | null;
  /** `kw.p2.account`, `null` before the first write (tech note F10 section 2.1). */
  readonly account: AccountStorageV1 | null;
  /** `kw.p2.character`, `null` before the first write (tech note F10 section 2.2). */
  readonly character: CharacterStorageV1 | null;
  /** The login screen's chosen button while the age gate has not resolved it yet, in memory only
   * (R13, tech note F10 section 3.2). `null` once there is nothing pending — either the player has
   * not pressed a login button yet this session, or `account` was just written and the choice is
   * spent. */
  readonly pendingProvider: 'google' | 'apple' | 'email' | null;
  /** Set by the underage screen's own "back" button only (R14): re-arms `'intro'` for one more
   * pass at login without actually clearing `kw.p2.onboarding.introSeen`. Memory only. */
  readonly atStartThisSession: boolean;
  /** This session's age-gate answer, in memory only (see the module doc comment) — `true` only
   * once the player has answered "underage" *this* session; irrelevant once `storage.ageGatePassed`. */
  readonly underageThisSession: boolean;
  /** `kw.p2.consent.location`, a key this module does not own. `'declined'`, `'withdrawn'` and
   * `'unanswered'` all skip `permission` straight to `character` (R48: withdrawing is not
   * re-asked automatically either; fail-closed on an impossible `'unanswered'` this far in). */
  readonly locationConsent: 'granted' | 'declined' | 'withdrawn' | 'unanswered';
  /** The live browser/OS permission (never stored, unchanged from F06 8.2). `null` = not yet
   * resolved this session; irrelevant once `locationConsent !== 'granted'`. */
  readonly permissionGranted: boolean | null;
  /** `selectPlayerView(state, now_ms, params).classId !== null` (`@keep-walking/shared/session`,
   * unchanged from F06 8.2). */
  readonly classChosen: boolean;
  /** `selectPlayerView(...).firstRunEntered`. */
  readonly firstRunEntered: boolean;
  /** `selectPlayerView(...).firstRewardDone` (`player.lifetimeTicksGranted > 0`, R39-R40 — stays
   * `true` even if that first run later ends in `death`). */
  readonly firstRewardDone: boolean;
}

/** First step not yet passed, in the fixed decision order of D-149 (tech note F10 section 3.2
 * "ลำดับตัดสิน (ข้อแรกที่จริงชนะ)", items 1-8). Reopening the app mid-onboarding resumes here — it
 * never restarts from `'intro'` (R36), and a legacy player with some `kw.p2.onboarding` flags
 * already set resumes at the first step *this* table has not passed yet (tech note F10 section 5
 * migration table — no separate migration code path). */
export function currentOnboardingStep(input: OnboardingStepInput): OnboardingStep {
  if (input.storage === null || !input.storage.introSeen || input.atStartThisSession) {
    return 'intro';
  }
  if (input.account === null || !input.account.signedIn) {
    if (input.storage.ageGatePassed) return 'login';
    if (input.pendingProvider === null) return 'login';
    return input.underageThisSession ? 'underage' : 'age';
  }
  if (!input.storage.ageGatePassed) return 'age';
  if (!input.storage.consentAnswered) return 'consent';
  if (input.locationConsent === 'granted' && input.permissionGranted === null) return 'permission';
  if (!input.classChosen || input.character === null) return 'character';
  if (!input.character.storyDone) return 'story';
  if (!input.firstRunEntered) return 'first_run';
  if (!input.firstRewardDone) return 'first_reward';
  return 'done';
}

/** `true` once the map, bottom nav, Setting and every onboarded route (tech note F10 section 4)
 * may show: steps 1-7 of the D-149 table are all done. `first_run`/`first_reward` are **not**
 * shell-blocking (tech note F10 section 3.1: "nav ขึ้นตั้งแต่ถึงแผนที่ครั้งแรก") — only
 * `isSystemTeachLocked` below still gates individual systems during those two. */
const SHELL_BLOCKING_STEPS: ReadonlySet<OnboardingStep> = new Set([
  'intro',
  'login',
  'age',
  'underage',
  'consent',
  'permission',
  'character',
  'story',
]);

export function isShellReady(input: OnboardingStepInput): boolean {
  return isShellReadyForStep(currentOnboardingStep(input));
}

/** Same predicate as `isShellReady` above, for a caller that has already computed the step itself
 * (`OnboardingFlow#currentStep`, P2-F10-T17) and would otherwise have to rebuild a whole
 * `OnboardingStepInput` a second time just to ask this question — `f04-app.ts`'s own route guard
 * (`nav/routes.ts#resolveRoute`'s `shellReady` input) is exactly that caller. */
export function isShellReadyForStep(step: OnboardingStep): boolean {
  return !SHELL_BLOCKING_STEPS.has(step);
}

/**
 * Guard for design/features/F06-hp-damage-onboarding.md R42 / F06-R38 / F06-R42 ("no path to any
 * U1-U8 screen or the NPC shop inside minutes 0-10", pillars 6.2) and R33/R42 (levelling up never
 * points at the stat-allocation screen while still onboarding).
 *
 * A pure function never loads `config/balance/unlocks.json` itself (ADR 0003 C1-2: no `fetch`/
 * `fs` in the game core, and this module stays consistent with that even though apps/client is
 * not itself Worker-bound) — the caller reads that file once (already done for the systems that
 * legitimately gate on it, `apps/client/src/config/balance.ts`) and passes the `unlockId` of every
 * entry that must stay locked during onboarding as `params.lockedSystemIds`:
 * `Object.values(unlocksJson).filter((v) => typeof v === 'object' && v !== null && 'unlockId' in
 * v).map((v) => v.unlockId)` — every `unlocks.<system>.unlockId` in the file today (`U1`-`U8` and
 * the permanent `NPC` id, `unlocks.json` `_meta`/`npcShop._note`) belongs on this list; only
 * `unlocks.parentalConsent` has no `unlockId` and is not a "system", so it is naturally excluded.
 */
export interface OnboardingLockGuardParams {
  readonly lockedSystemIds: readonly string[];
}

/** `true` while `systemId` must not be shown yet: still onboarding (`!firstRewardDone`, the same
 * source as the `first_reward` step, R39-R40) **and** `systemId` is one of the locked ids. A
 * system's *actual* level/run-count unlock (evaluated elsewhere, `unlocks.<system>.minLevel` etc.)
 * is irrelevant here — this guard only enforces "never during the first 10 minutes", on top of,
 * not instead of, that real unlock check. */
export function isSystemTeachLocked(
  systemId: string,
  input: Pick<OnboardingStepInput, 'firstRewardDone'>,
  params: OnboardingLockGuardParams,
): boolean {
  return !input.firstRewardDone && params.lockedSystemIds.includes(systemId);
}
