/**
 * Onboarding step machine (tech note F06-hp-damage-onboarding.md sections 4, 8; design/features/
 * F06-hp-damage-onboarding.md 3.8-3.9, R36, R44-R49; state diagram section 4: `O-intro -> O-age ->
 * (O-underage, terminal) / O-consent -> O-permission -> O-map -> O-class -> ... -> O-first-run ->
 * O-done`). A **pure** selector, no DOM, no config/asset loading, no coordinates, no
 * `@keep-walking/shared/session` (or any other engine subpath) dependency — same shape as the
 * sibling `home/home-state.ts` (P2-X27): plain data in, one of a fixed set of steps out.
 *
 * Written by backend-programmer under the D-125 role-swap exception (studio/decisions/
 * decision-log.md, "swap rule 10": a pure module in a new `apps/client` folder, tech-lead review
 * in F06-T20). gameplay-programmer wires this in P2-F06-T09/T10: persists `OnboardingStorage`
 * under `kw.p2.onboarding` (tech note F06 8.1), reads `kw.p2.consent.location` for
 * `locationConsent`, checks `navigator.permissions` (Mock-provider-gated per D-130) for
 * `permissionGranted`, and reads `classId`, `firstRunEntered`, `firstRewardDone` off
 * `selectPlayerView` (`@keep-walking/shared/session`) rather than storing them again here (tech
 * note F06 8.2: "ขั้นที่ engine รู้อยู่แล้วไม่ถูกเก็บซ้ำใน kw.p2.onboarding").
 *
 * Three inputs are deliberately **not** part of `OnboardingStorage` and never persisted:
 * - `underageThisSession` (R46): an underage answer writes no `kw.p2.*` key at all, so the next
 *   app open asks the age gate again. The caller tracks this in memory for the current session
 *   only.
 * - `permissionGranted` (tech note F06 8.2): the browser/OS permission has no flag of its own;
 *   it is asked live once `locationConsent === 'granted'`.
 * - `mapAcknowledged`: `O-map` and `O-class` share no stored flag either (the class sheet is
 *   shown "ทับแผนที่", layered on the map, R29) — this in-memory marker lets a caller that wants
 *   a brief, non-blocking map reveal before the sheet mounts represent that as its own step; a
 *   caller with no such reveal can pass `true` always and never observe `'map'`.
 *
 * `class` cannot be skipped (R29) and `no_class` fails a check-in closed (tech note F06 6.3,
 * D-120: the engine's own `no_class` rejection is what forces the class sheet open if a caller
 * ever lets a run start before this step machine says `'class'` is done).
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

/** The ordered steps of R44 / state-diagram section 4, minus `O-nearest` / `O-home` (those are
 * `home/home-state.ts`'s job, tech note F06 8.2: "ไม่มี state ของตัวเอง" — this machine only
 * needs to know whether a class has been chosen, not where the recommended rift is). */
export type OnboardingStep =
  | 'intro'
  | 'age'
  | 'underage'
  | 'consent'
  | 'permission'
  | 'map'
  | 'class'
  | 'first_run'
  | 'first_reward'
  | 'done';

export interface OnboardingStepInput {
  /** `null` before the very first write to `kw.p2.onboarding` (equivalent to
   * `initialOnboardingStorage`'s all-`false` shape, but a caller need not construct it just to
   * ask "what step is this?"). */
  readonly storage: OnboardingStorage | null;
  /** This session's age-gate answer, in memory only (see the module doc comment) — `true` only
   * once the player has answered "underage" *this* session; irrelevant once `ageGatePassed`. */
  readonly underageThisSession: boolean;
  /** `kw.p2.consent.location`, a key this module does not own. `'declined'` and `'withdrawn'`
   * both skip `permission` straight to `map` at the unknown-location status (R48: withdrawing is
   * not re-asked automatically either). `'unanswered'` is treated the same as `'declined'`
   * (fail-closed: never block on a consent screen this machine has already marked answered). */
  readonly locationConsent: 'granted' | 'declined' | 'withdrawn' | 'unanswered';
  /** The live browser/OS permission (never stored, tech note F06 8.2). `null` = not yet resolved
   * this session; irrelevant once `locationConsent !== 'granted'`. */
  readonly permissionGranted: boolean | null;
  /** See the module doc comment; a caller with no map-reveal beat may always pass `true`. */
  readonly mapAcknowledged: boolean;
  /** `selectPlayerView(state, now_ms, params).classId !== null` (`@keep-walking/shared/session`,
   * tech note F06 8.2). */
  readonly classChosen: boolean;
  /** `selectPlayerView(...).firstRunEntered`. */
  readonly firstRunEntered: boolean;
  /** `selectPlayerView(...).firstRewardDone` (`player.lifetimeTicksGranted > 0`, R39-R40 — stays
   * `true` even if that first run later ends in `death`). */
  readonly firstRewardDone: boolean;
}

/** First step not yet passed, in the fixed order of R44 (state diagram section 4). Reopening the
 * app mid-onboarding resumes here — it never restarts from `'intro'` (R36). */
export function currentOnboardingStep(input: OnboardingStepInput): OnboardingStep {
  if (input.storage === null || !input.storage.introSeen) return 'intro';
  if (!input.storage.ageGatePassed) return input.underageThisSession ? 'underage' : 'age';
  if (!input.storage.consentAnswered) return 'consent';
  if (input.locationConsent === 'granted' && input.permissionGranted === null) return 'permission';
  if (!input.classChosen) return input.mapAcknowledged ? 'class' : 'map';
  if (!input.firstRunEntered) return 'first_run';
  if (!input.firstRewardDone) return 'first_reward';
  return 'done';
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
