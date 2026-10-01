/**
 * Wires the pure onboarding step machine (`onboarding/onboarding-step.ts`, D-149) into the real
 * client: persists `OnboardingStorage` (`kw.p2.onboarding`), `AccountStorageV1` (`kw.p2.account`,
 * `storage/account.ts`) and `CharacterStorageV1` (`kw.p2.character`, `storage/character.ts`),
 * reads/writes `kw.p2.consent.location`, resolves the live browser geolocation permission through
 * `navigator.permissions` (Mock and Web alike — a real, informational permission-status read, not
 * one of the `?e2e*` query test hooks D-130 gates), and fires the `onboarding_funnel_step` enum
 * this module owns plus the two direct F10 account events it is responsible for
 * (`account_login_shown`, `account_login_method_chosen`, tech note docs/tech/F10-account-shell.md
 * section 8).
 *
 * P2-F10-T14 replaces the previous F06-only step sequence (`intro -> age -> underage -> consent ->
 * permission -> class -> first_run -> first_reward -> done`) with D-149's: a `login` step (and its
 * in-memory `pendingProvider`/`age` sub-wait) now sits between `intro` and `age`, and the old named
 * `class` step is gone — `onboarding/onboarding-step.ts`'s own doc comment explains why in full.
 * This task wires login/age/consent/permission completely; the `character`/`story` steps that
 * follow `permission` do not yet have their own real screens (P2-F10-T15's build) — `f04-app.ts`
 * still shows the pre-F10 class-select sheet for the `character` step as an interim placeholder
 * (see that module's own doc comment on the `character` branch), and nothing here writes
 * `kw.p2.character` on its own.
 */
import type { PlayerClass, PlayerView } from '@keep-walking/shared/session';
import type { LocationPermission } from '@keep-walking/location';
import type { KeyValueStorage, QuotaFallbackDeps } from './storage/local-store';
import {
  loadOnboardingStorage,
  readLocationConsent,
  saveOnboardingStorage,
  writeLocationConsent,
} from './storage/onboarding';
import { loadAccount, saveAccount } from './storage/account';
import { loadCharacter } from './storage/character';
import { seedE2eSkipOnboardingAccount } from './onboarding/e2e-skip-seed';
import { applyOnboardingEvent, currentOnboardingStep } from './onboarding/onboarding-step';
import type {
  AccountStorageV1,
  CharacterStorageV1,
  OnboardingStep,
  OnboardingStorage,
} from './onboarding/onboarding-step';
import { ageGatePassed } from './age-gate';
import type { GateComparison } from './config/balance';

const MS_PER_MIN = 60_000;
type FunnelBucket = '0-1' | '1-3' | '3-6' | '6-8' | '8-10';
// Bucket edges are the literal enum boundaries product/telemetry-events.md names for
// `funnel_bucket` (CLAUDE.md's own "10 นาทีแรก" minute ranges), not a tunable balance value — same
// convention `telemetry/f04-events.ts`'s own bucket-edge constants already use.
const EDGE_1_MIN = 1;
const EDGE_3_MIN = 3;
const EDGE_6_MIN = 6;
const EDGE_8_MIN = 8;
const BUCKET_EDGES: readonly (readonly [number, FunnelBucket])[] = [
  [EDGE_1_MIN, '0-1'],
  [EDGE_3_MIN, '1-3'],
  [EDGE_6_MIN, '3-6'],
  [EDGE_8_MIN, '6-8'],
];

function funnelBucket(elapsedMin: number): FunnelBucket {
  for (const [edge, label] of BUCKET_EDGES) {
    if (elapsedMin <= edge) return label;
  }
  return '8-10';
}

/** The login screen's five confirm buttons (tech note section 8's `account_login_method_chosen.
 * method`) — `google`/`apple` map straight to the matching `AccountStorageV1.provider`; all three
 * email sub-screens (login/register/forgot) share the single `'email'` provider (tech note section
 * 2.1: "email_login, email_register, email_forgot all -> 'email'"). */
export type LoginMethod = 'google' | 'apple' | 'email_login' | 'email_register' | 'email_forgot';

function providerForMethod(method: LoginMethod): AccountStorageV1['provider'] {
  if (method === 'google') return 'google';
  if (method === 'apple') return 'apple';
  return 'email';
}

export interface OnboardingFlowDeps {
  readonly storage: KeyValueStorage;
  readonly quotaDeps: QuotaFallbackDeps;
  readonly now: () => number;
  readonly record: (
    name: string,
    properties: Readonly<Record<string, string | number | boolean | null>>,
  ) => void;
  /** `config/balance/privacy.json#minAge_yr`/`#minAgeComparison` (`config/balance.ts#
   * balancePrivacyConfig`) — `confirmAge()`'s own gate, never a second hardcoded copy. */
  readonly minAge_yr: number;
  readonly minAgeComparison: GateComparison;
  /** `LocationProvider#getPermission()` (`@keep-walking/location`) — never `navigator.permissions`
   * directly (CLAUDE.md: "Use the LocationProvider interface only"). `undefined` (no provider
   * wired yet) is treated the same as an immediate `'granted'` resolution: fail-open, since the
   * native `getCurrentPosition`/`watchPosition` prompt, not this status read, is what actually
   * asks the player. */
  readonly queryGeolocationPermission?: () => Promise<LocationPermission>;
  /** Called once the async permission query resolves, so the caller can re-render with the now-
   * current step. Never called synchronously from the constructor. */
  readonly onPermissionResolved?: () => void;
  /** The real, GPS-request-triggering call (`main.ts`'s own `provider.start()`, wired through
   * `f04-app.ts`'s `deps.startLocationProvider`) — called exactly once, by `acceptConsent()`, never
   * by anything else in this module (R47/CLAUDE.md: "GPS never requested without consent"). */
  readonly startLocationProvider: () => void;
  /** D-130: only ever `true` under `?loc=mock&e2eSkipOnboarding=1` — `main.ts`/`f04-app.ts` decide
   * this the same way every other `?e2e*` hook does (`env.ts#shouldSkipF04App`'s own gate), never
   * read from `window.location` by this module directly. */
  readonly e2eSkipOnboarding: boolean;
}

export class OnboardingFlow {
  private readonly deps: OnboardingFlowDeps;
  private storageState: OnboardingStorage;
  private accountState: AccountStorageV1 | null;
  private characterState: CharacterStorageV1 | null;
  private permissionGranted: boolean | null = null;
  /** R13/tech note section 3.2: the login screen's chosen button while the age gate has not
   * resolved it yet, in memory only — spent (`null`) the instant `kw.p2.account` is actually
   * written, either by `confirmAge()` (a fresh player) or immediately by `chooseLoginMethod()`
   * itself (a returning player whose age gate already passed). */
  private pendingProvider: 'google' | 'apple' | 'email' | null = null;
  /** R14/tech note section 3.2: set only by the underage screen's own "back" button
   * (`returnFromUnderage()`), cleared the instant the intro screen's single button is pressed
   * again (`completeIntro()`). */
  private atStartThisSession = false;
  /** R46/onboarding-step.ts's own doc comment: an underage answer writes no `kw.p2.*` key at all —
   * tracked here, in memory, for this session only. */
  private underageThisSession = false;
  private introFunnelFired = false;
  private loginFunnelFired = false;
  private ageGateFunnelFired = false;
  private consentFunnelFired = false;
  private permissionFunnelShownFired = false;
  private mapViewFunnelFired = false;
  private classSelectShownFunnelFired = false;

  constructor(deps: OnboardingFlowDeps) {
    this.deps = deps;
    this.storageState = loadOnboardingStorage(deps.storage, deps.now());
    if (deps.e2eSkipOnboarding) {
      seedE2eSkipOnboardingAccount(deps.storage, deps.now(), deps.quotaDeps);
    }
    this.accountState = loadAccount(deps.storage);
    this.characterState = loadCharacter(deps.storage);
    // A returning player whose consent was already granted in an earlier session boots with
    // `permissionGranted` reset to `null` (it is never persisted, this module's own doc comment) —
    // without this, `currentStep()` would report `'permission'` forever on every future boot, since
    // nothing else re-triggers the check once onboarding itself is already `'done'`. This never
    // calls `deps.startLocationProvider()` (that stays `acceptConsent()`'s own, one-time job,
    // R47/CLAUDE.md "GPS never requested without consent") — `main.ts` already starts the real
    // provider on boot whenever consent is granted, independently of this class; this is only the
    // passive `navigator.permissions` status read `resolvePermission()` always was.
    if (readLocationConsent(deps.storage) === 'granted') {
      this.resolvePermission();
    }
  }

  private persist(): void {
    saveOnboardingStorage(
      this.deps.storage,
      this.storageState,
      this.deps.now(),
      this.deps.quotaDeps,
    );
  }

  private recordFunnel(step: string, classSelected: PlayerClass | null = null): void {
    const elapsedMin = (this.deps.now() - this.storageState.firstOpenAt_ms) / MS_PER_MIN;
    this.deps.record('onboarding_funnel_step', {
      step,
      funnel_bucket: funnelBucket(elapsedMin),
      class_selected: classSelected,
    });
  }

  /** `apps/client/src/onboarding/onboarding-step.ts#currentOnboardingStep`, fed with real storage
   * plus the engine-owned fields the caller already has from `selectPlayerView`. Under the e2e skip
   * hook (D-130) this reports `'done'` unconditionally, with the one exception tech note section
   * 9.1 item 2 carves out: a seeded-then-signed-out account (`accountState.signedIn === false`,
   * e.g. a logout e2e spec using the same hook) reports `'login'` instead, so a relogin tap still
   * has something real to press. */
  currentStep(
    view: Pick<PlayerView, 'classId' | 'firstRunEntered' | 'firstRewardDone'>,
  ): OnboardingStep {
    if (this.deps.e2eSkipOnboarding) {
      if (this.accountState !== null && !this.accountState.signedIn) return 'login';
      return 'done';
    }
    return currentOnboardingStep({
      storage: this.storageState,
      account: this.accountState,
      character: this.characterState,
      pendingProvider: this.pendingProvider,
      atStartThisSession: this.atStartThisSession,
      underageThisSession: this.underageThisSession,
      locationConsent: readLocationConsent(this.deps.storage),
      permissionGranted: this.permissionGranted,
      classChosen: view.classId !== null,
      firstRunEntered: view.firstRunEntered,
      firstRewardDone: view.firstRewardDone,
    });
  }

  /** Call once, the first frame the intro screen (`S-00-intro`/`S-00-start`) is on screen. */
  markIntroShown(): void {
    if (this.introFunnelFired) return;
    this.introFunnelFired = true;
    this.recordFunnel('intro');
  }

  /** The intro screen's only interaction ("เริ่มเกม", D-144): marks `introSeen` and always clears
   * `atStartThisSession` (tech note section 3.3 event A1) — the login screen comes next (F06-R44's
   * old "age gate comes next" is now one step later), never bundled with it. */
  completeIntro(): void {
    this.atStartThisSession = false;
    if (this.storageState.introSeen) return;
    this.storageState = applyOnboardingEvent(this.storageState, { type: 'introSeen' });
    this.persist();
  }

  /** Call once, the first frame the login screen (`S-00-login`) is on screen (not its email/
   * register/forgot sub-screens, tech note section 8: "ไม่ยิงซ้ำเมื่อกลับจากจอย่อย email"). `context`
   * (tech note section 5) is `'relogin'` only for a player who has an account key and is currently
   * signed out (a real logout, or a seeded-signed-out e2e fixture); every other case — a brand-new
   * player or a pre-F10 legacy one who has never had an account key at all — is `'first_time'`. */
  markLoginShown(): void {
    if (this.loginFunnelFired) return;
    this.loginFunnelFired = true;
    const context: 'first_time' | 'relogin' =
      this.accountState !== null && !this.accountState.signedIn ? 'relogin' : 'first_time';
    this.deps.record('account_login_shown', { context });
    this.recordFunnel('login_shown');
  }

  /** Every confirm button across `S-00-login`/`-login-email`/`-register`/`-forgot` (tech note
   * section 3.3 events A2/A10, acceptance "ทุกปุ่มยืนยัน = bypass ไปขั้นถัดไป") — always bypasses,
   * never reads whatever the player typed into an email/password field (R10/R11, that stays the
   * screen's own job: never pass it in here). `account_login_method_chosen` fires *before* the
   * storage write (tech note section 8's own "ก่อนเขียน account").
   *
   * A returning/migrated player whose age gate already passed (`storageState.ageGatePassed`) writes
   * `kw.p2.account` immediately (tech note table A2/A10: "ขณะ ageGatePassed = true อยู่แล้ว" / "login
   * ใหม่หลังออกจากระบบ") — `currentStep()` then reports whatever step their *other* flags already
   * satisfy (straight to the map for a relogin, R43). A brand-new player instead only holds the
   * choice in memory (`pendingProvider`) until `confirmAge()` actually passes them. */
  chooseLoginMethod(method: LoginMethod): void {
    this.deps.record('account_login_method_chosen', { method });
    this.recordFunnel('login_method_chosen');
    const provider = providerForMethod(method);
    if (this.storageState.ageGatePassed) {
      this.accountState = { provider, signedIn: true };
      saveAccount(this.deps.storage, this.accountState, this.deps.now(), this.deps.quotaDeps);
      this.pendingProvider = null;
    } else {
      this.pendingProvider = provider;
    }
  }

  /** Call once, the first frame the age gate (`S-00-age-gate`) is on screen. */
  markAgeGateShown(): void {
    if (this.ageGateFunnelFired) return;
    this.ageGateFunnelFired = true;
    this.recordFunnel('age_gate_shown');
  }

  /** The age gate's confirm button: `birthYear` is whichever year the player picked from the list
   * (never typed, F06-R45). Returns whether they passed, so the caller can decide what to render
   * next without re-deriving the same computation. A passing answer persists `ageGatePassed` and,
   * if a login choice is still pending (tech note table A3), writes `kw.p2.account` with it right
   * away; a failing one writes nothing at all (R46 — `underageThisSession` stays in memory only,
   * `returnFromUnderage` is the only way back, and `pendingProvider` is still held in case the
   * player returns and retries without re-picking a provider... actually tech note table A4 clears
   * it, see `returnFromUnderage`). */
  confirmAge(birthYear: number): boolean {
    const nowYear = new Date(this.deps.now()).getFullYear();
    const passed = ageGatePassed(
      birthYear,
      nowYear,
      this.deps.minAge_yr,
      this.deps.minAgeComparison,
    );
    if (passed) {
      this.underageThisSession = false;
      if (!this.storageState.ageGatePassed) {
        this.storageState = applyOnboardingEvent(this.storageState, { type: 'ageGatePassed' });
        this.persist();
      }
      if (this.pendingProvider !== null) {
        this.accountState = { provider: this.pendingProvider, signedIn: true };
        saveAccount(this.deps.storage, this.accountState, this.deps.now(), this.deps.quotaDeps);
        this.pendingProvider = null;
      }
      this.recordFunnel('age_gate_passed');
    } else {
      this.underageThisSession = true;
      this.recordFunnel('age_gate_under_min');
    }
    return passed;
  }

  /** The under-min screen's one button ("กลับหน้าแรก", R14/tech note table A4): clears the in-memory
   * underage flag and the pending provider (a fresh attempt needs a fresh provider pick, flow F10
   * B2: "กลับ `S-00-start` ... ต้องเลือก provider ใหม่อีกครั้ง"), and re-arms `'intro'` for one more
   * pass (`atStartThisSession`) — never re-showing `'underage'` on its own. */
  returnFromUnderage(): void {
    this.underageThisSession = false;
    this.pendingProvider = null;
    this.atStartThisSession = true;
  }

  /** Call once, the first frame the consent screen (`S-00-consent-location`) is on screen — also
   * the re-entry path a returning player's privacy screen / home-unknown CTA reuses (R48 "ปุ่มเดียว
   * กลับไปให้ใหม่"), so this and `acceptConsent`/`declineConsent` below never assume they run only
   * once, only during first-time onboarding. */
  markConsentShown(): void {
    if (this.consentFunnelFired) return;
    this.consentFunnelFired = true;
    this.recordFunnel('consent_location_shown');
  }

  /** Consent accepted: writes `kw.p2.consent = granted`, marks `consentAnswered` (idempotent),
   * fires the funnel step. This does not start the real GPS request or the passive permission read
   * itself — `currentStep()` now reports `'permission'` right after this call (`locationConsent ===
   * 'granted' && permissionGranted === null`), and the caller's own `S-00-permission-browser` screen
   * is what the player must tap through first; `confirmBrowserPriming()` below is the one place that
   * actually starts anything. */
  acceptConsent(): void {
    writeLocationConsent(this.deps.storage, 'granted', this.deps.now(), this.deps.quotaDeps);
    if (!this.storageState.consentAnswered) {
      this.storageState = applyOnboardingEvent(this.storageState, { type: 'consentAnswered' });
      this.persist();
    }
    this.recordFunnel('consent_location_accepted');
  }

  /** Call once, the first frame `S-00-permission-browser` is on screen (flow F06 18.1 step 5). */
  markPermissionShown(): void {
    if (this.permissionFunnelShownFired) return;
    this.permissionFunnelShownFired = true;
    this.recordFunnel('permission_browser_shown');
  }

  /** `S-00-permission-browser`'s one button ("ไปต่อ", flow F06 18.1 step 3): only now does the real,
   * GPS-requesting call go out (R47/CLAUDE.md "GPS never requested without consent" — consent
   * itself was already given, separately, at `S-00-consent-location`/`acceptConsent()` above; this
   * is the browser/OS-level request that consent unlocks) and the passive `navigator.permissions`
   * read starts. */
  confirmBrowserPriming(): void {
    this.deps.startLocationProvider();
    this.resolvePermission();
  }

  /** Consent declined: `kw.p2.consent = declined`, home state becomes `unknown`, the `character`
   * step still proceeds directly (tech note flow B3, F10-R03 — different destination than F06 used
   * to send this to, same underlying `consentAnswered` write). Never touches the LocationProvider. */
  declineConsent(): void {
    writeLocationConsent(this.deps.storage, 'declined', this.deps.now(), this.deps.quotaDeps);
    if (!this.storageState.consentAnswered) {
      this.storageState = applyOnboardingEvent(this.storageState, { type: 'consentAnswered' });
      this.persist();
    }
    this.recordFunnel('consent_location_declined');
  }

  private resolvePermission(): void {
    const query = this.deps.queryGeolocationPermission;
    if (query === undefined) {
      this.permissionGranted = true;
      this.recordFunnel('permission_browser_allowed');
      return;
    }
    void query()
      .then((state: LocationPermission) => {
        this.permissionGranted = state === 'granted';
        this.recordFunnel(
          this.permissionGranted ? 'permission_browser_allowed' : 'permission_browser_blocked',
        );
      })
      .catch(() => {
        this.permissionGranted = true;
        this.recordFunnel('permission_browser_allowed');
      })
      .finally(() => this.deps.onPermissionResolved?.());
  }

  /** Call once, the first frame the `character` step's screen is shown. Until P2-F10-T15 builds the
   * real create-character screen, `f04-app.ts` shows the pre-F10 class-select sheet here instead
   * (see that module's own doc comment) — this still fires `map_view_reached` the first time (the
   * map itself has no distinct reveal beat of its own, same reasoning the pre-F10 version of this
   * method always used) and `class_select_shown`, both pre-existing `onboarding_funnel_step` values
   * this task does not change. */
  markClassSelectShown(): void {
    if (!this.mapViewFunnelFired) {
      this.mapViewFunnelFired = true;
      this.recordFunnel('map_view_reached');
    }
    if (this.classSelectShownFunnelFired) return;
    this.classSelectShownFunnelFired = true;
    this.recordFunnel('class_select_shown');
  }

  /** `class_chosen` funnel telemetry (tech note F06 10.1's own row for this one engine event) —
   * called by the caller alongside its `chooseClass` dispatch, never a second dispatch of its own
   * (this module never calls `session/engine.ts`). */
  recordClassSelected(classId: PlayerClass): void {
    this.recordFunnel('class_selected', classId);
  }
}
