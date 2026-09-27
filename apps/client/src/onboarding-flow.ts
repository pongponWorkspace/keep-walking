/**
 * Wires the pure onboarding step machine (`onboarding/onboarding-step.ts`, P2-X28, never edited by
 * this task) into the real client: persists `OnboardingStorage` under `kw.p2.onboarding`
 * (`storage/onboarding.ts`), reads `kw.p2.consent.location`, resolves the live browser geolocation
 * permission through `navigator.permissions` (Mock and Web alike — this is a real, informational
 * permission-status read, not one of the `?e2e*` query test hooks D-130 gates), and fires the
 * onboarding-only slice of `onboarding_funnel_step` (product/telemetry-events.md) this task's own
 * screens cover: `intro`, `map_view_reached`, `class_select_shown`, `class_selected`. The age-gate/
 * consent-screen steps of the funnel enum (`age_gate_*`, `consent_location_*`,
 * `permission_browser_*`) are P2-X38's own screens to build later (out of this task's scope, per
 * its brief) — never emitted here, so no false telemetry claims a screen that does not exist yet.
 *
 * Interim assumption (documented, same convention `f04-app.ts#locationConsentGranted` already
 * established for "no consent screen built yet"): dismissing the intro screen marks `ageGatePassed`
 * and `consentAnswered` true in the same write as `introSeen`, since P2-X38 has not built the real
 * age-gate/consent screens this task would otherwise have to block on. `mapAcknowledged` is always
 * `true` (`onboarding-step.ts`'s own doc comment: a caller with no distinct map-reveal beat may
 * always pass `true`) — the map is what the player sees the instant intro dismisses, with the
 * class-select sheet layered on top of it immediately after (acceptance order 1-2), matching R29
 * ("sheet บังคับเลือกพลังก่อนถึงแผนที่").
 */
import type { PlayerClass, PlayerView } from '@keep-walking/shared/session';
import type { LocationPermission } from '@keep-walking/location';
import type { KeyValueStorage, QuotaFallbackDeps } from './storage/local-store';
import {
  loadOnboardingStorage,
  readLocationConsent,
  saveOnboardingStorage,
} from './storage/onboarding';
import { applyOnboardingEvent, currentOnboardingStep } from './onboarding/onboarding-step';
import type { OnboardingStep, OnboardingStorage } from './onboarding/onboarding-step';

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
  /** `LocationProvider#getPermission()` (`@keep-walking/location`) — never `navigator.permissions`
   * directly (CLAUDE.md: "Use the LocationProvider interface only"). `undefined` (no provider
   * wired yet) is treated the same as an immediate `'granted'` resolution: fail-open, since the
   * native `getCurrentPosition`/`watchPosition` prompt, not this status read, is what actually
   * asks the player. */
  readonly queryGeolocationPermission?: () => Promise<LocationPermission>;
  /** Called once the async permission query resolves, so the caller can re-render with the now-
   * current step. Never called synchronously from the constructor. */
  readonly onPermissionResolved?: () => void;
  /** D-130: only ever `true` under `?loc=mock&e2eSkipOnboarding=1` — `main.ts`/`f04-app.ts` decide
   * this the same way every other `?e2e*` hook does (`env.ts#shouldSkipF04App`'s own gate), never
   * read from `window.location` by this module directly. */
  readonly e2eSkipOnboarding: boolean;
}

export class OnboardingFlow {
  private readonly deps: OnboardingFlowDeps;
  private storageState: OnboardingStorage;
  private permissionGranted: boolean | null = null;
  private introFunnelFired = false;
  private mapViewFunnelFired = false;
  private classSelectShownFunnelFired = false;

  constructor(deps: OnboardingFlowDeps) {
    this.deps = deps;
    this.storageState = loadOnboardingStorage(deps.storage, deps.now());
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
      underageThisSession: false,
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

  /** The intro screen's only interaction ("แตะที่ไหนก็ได้"): marks `introSeen`/`ageGatePassed`/
   * `consentAnswered` (see this module's own doc comment) in one write, then kicks off the
   * (informational, non-blocking) browser permission read. */
  completeIntro(): void {
    let next = this.storageState;
    next = applyOnboardingEvent(next, { type: 'introSeen' });
    next = applyOnboardingEvent(next, { type: 'ageGatePassed' });
    next = applyOnboardingEvent(next, { type: 'consentAnswered' });
    this.storageState = next;
    this.persist();
    this.resolvePermission();
    if (!this.mapViewFunnelFired) {
      this.mapViewFunnelFired = true;
      this.recordFunnel('map_view_reached');
    }
  }

  private resolvePermission(): void {
    const query = this.deps.queryGeolocationPermission;
    if (query === undefined) {
      this.permissionGranted = true;
      return;
    }
    void query()
      .then((state: LocationPermission) => {
        this.permissionGranted = state === 'granted';
      })
      .catch(() => {
        this.permissionGranted = true;
      })
      .finally(() => this.deps.onPermissionResolved?.());
  }

  /** Call once, the first frame the class-select sheet (`S-00-class-select`) is shown. */
  markClassSelectShown(): void {
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
