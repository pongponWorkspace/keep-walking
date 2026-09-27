/**
 * Wires the pure onboarding step machine (`onboarding/onboarding-step.ts`, P2-X28, never edited by
 * this task) into the real client: persists `OnboardingStorage` under `kw.p2.onboarding`
 * (`storage/onboarding.ts`), reads/writes `kw.p2.consent.location`, resolves the live browser
 * geolocation permission through `navigator.permissions` (Mock and Web alike — this is a real,
 * informational permission-status read, not one of the `?e2e*` query test hooks D-130 gates), and
 * fires the whole `onboarding_funnel_step` enum (`product/telemetry-events.md`): `intro`,
 * `age_gate_shown/passed/under_min`, `consent_location_shown/accepted/declined`,
 * `permission_browser_shown/allowed/blocked`, `map_view_reached`, `class_select_shown/selected`.
 *
 * P2-X38 replaces the previous interim assumption (dismissing the intro screen used to mark
 * `ageGatePassed`/`consentAnswered` in the same write as `introSeen`, since no real age-gate/consent
 * screen existed yet) with the real F06-R44/R45/R47/R48 sequence: `completeIntro()` now marks only
 * `introSeen`; the caller's own age-gate screen calls `confirmAge()`, and its own consent screen
 * calls `acceptConsent()`/`declineConsent()`. `mapAcknowledged` is still always `true`
 * (`onboarding-step.ts`'s own doc comment: a caller with no distinct map-reveal beat may always pass
 * `true`) — the map is what the player sees the instant the class-select sheet is not yet up, with
 * the sheet layered on top of it immediately after (acceptance order 1-2), matching R29 ("sheet
 * บังคับเลือกพลังก่อนถึงแผนที่").
 *
 * [ASSUMPTION A-P2-X38-2: there is no separate, blocking `S-00-permission-browser` screen in this
 * build — `acceptConsent()` calls `deps.startLocationProvider()` (the real, only-after-consent GPS
 * request, CLAUDE.md/R47) immediately, then resolves the passive `navigator.permissions` read in the
 * background exactly the way a returning player's session already needed to (there was never a
 * mechanism to re-run that check on a later boot before this task; it now doubles as this session's
 * one-time check right after the real request goes out). `consent.browserPriming*` copy keys stay
 * unused pending a decision from uiux-designer/game-director on whether a distinct blocking "อีกขั้น
 * เดียว" beat is required on top of this. owner: uiux-designer, handoff in this task's REPORT.]
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
import { applyOnboardingEvent, currentOnboardingStep } from './onboarding/onboarding-step';
import type { OnboardingStep, OnboardingStorage } from './onboarding/onboarding-step';
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
  private permissionGranted: boolean | null = null;
  /** R46/onboarding-step.ts's own doc comment: an underage answer writes no `kw.p2.*` key at all —
   * tracked here, in memory, for this session only. */
  private underageThisSession = false;
  private introFunnelFired = false;
  private ageGateFunnelFired = false;
  private consentFunnelFired = false;
  private mapViewFunnelFired = false;
  private classSelectShownFunnelFired = false;

  constructor(deps: OnboardingFlowDeps) {
    this.deps = deps;
    this.storageState = loadOnboardingStorage(deps.storage, deps.now());
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
   * plus the engine-owned fields the caller already has from `selectPlayerView`. Returns `'done'`
   * unconditionally under the e2e skip hook (D-130). */
  currentStep(
    view: Pick<PlayerView, 'classId' | 'firstRunEntered' | 'firstRewardDone'>,
  ): OnboardingStep {
    if (this.deps.e2eSkipOnboarding) return 'done';
    return currentOnboardingStep({
      storage: this.storageState,
      underageThisSession: this.underageThisSession,
      locationConsent: readLocationConsent(this.deps.storage),
      permissionGranted: this.permissionGranted,
      mapAcknowledged: true,
      classChosen: view.classId !== null,
      firstRunEntered: view.firstRunEntered,
      firstRewardDone: view.firstRewardDone,
    });
  }

  /** Call once, the first frame the intro screen (`S-00-intro`) is on screen. */
  markIntroShown(): void {
    if (this.introFunnelFired) return;
    this.introFunnelFired = true;
    this.recordFunnel('intro');
  }

  /** The intro screen's only interaction ("แตะที่ไหนก็ได้"): marks `introSeen` only — the age gate
   * comes next (F06-R44), never bundled with it. */
  completeIntro(): void {
    if (this.storageState.introSeen) return;
    this.storageState = applyOnboardingEvent(this.storageState, { type: 'introSeen' });
    this.persist();
  }

  /** Call once, the first frame the age gate (`S-00-age-gate`) is on screen. */
  markAgeGateShown(): void {
    if (this.ageGateFunnelFired) return;
    this.ageGateFunnelFired = true;
    this.recordFunnel('age_gate_shown');
  }

  /** The age gate's confirm button: `birthYear` is whichever year the player picked from the list
   * (never typed, F06-R45). Returns whether they passed, so the caller can decide what to render
   * next without re-deriving the same computation. A passing answer persists `ageGatePassed`; a
   * failing one writes nothing (R46 — `underageThisSession` stays in memory only, `returnFromUnderage`
   * is the only way back). */
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
      this.recordFunnel('age_gate_passed');
    } else {
      this.underageThisSession = true;
      this.recordFunnel('age_gate_under_min');
    }
    return passed;
  }

  /** The under-min screen's one button ("กลับหน้าแรก", F06-R46): clears the in-memory underage
   * flag so `currentStep()` returns to `'age'` (a fresh attempt), never re-showing `'underage'` on
   * its own. */
  returnFromUnderage(): void {
    this.underageThisSession = false;
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
   * fires the funnel step, then — and only then — requests the real GPS start (R47/CLAUDE.md: "GPS
   * never requested without consent") and kicks off the passive permission-status read. */
  acceptConsent(): void {
    writeLocationConsent(this.deps.storage, 'granted', this.deps.now(), this.deps.quotaDeps);
    if (!this.storageState.consentAnswered) {
      this.storageState = applyOnboardingEvent(this.storageState, { type: 'consentAnswered' });
      this.persist();
    }
    this.recordFunnel('consent_location_accepted');
    this.deps.startLocationProvider();
    this.resolvePermission();
  }

  /** Consent declined: `kw.p2.consent = declined`, home state becomes `unknown`, class selection
   * still proceeds (R48). Never touches the LocationProvider. */
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

  /** Call once, the first frame the class-select sheet (`S-00-class-select`) is shown. Also fires
   * `map_view_reached` the first time (the map itself has no distinct reveal beat, `mapAcknowledged`
   * is always `true` — see this module's own doc comment). */
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
