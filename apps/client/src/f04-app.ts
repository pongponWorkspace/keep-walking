/**
 * F04 integration (P2-F04-T21): wires the session engine (`session/engine.ts`), the dungeon
 * artifact (`dungeons/artifact.ts`), the telemetry sink, and every screen module in `ui/` into one
 * `onSample`/`onTick` pair `main.ts` feeds from the real `LocationProvider` and the game clock
 * (`clock/game-clock.ts`). This is the client-first F04 loop: every game decision goes through
 * `sessionStep` (`@keep-walking/shared/session`), never computed here.
 *
 * Screen priority (F04 flow, GD B-02/B-03): speed-lock overlay > run summary > run screen >
 * confirm popup > map/nav panel — matches "overlay ทับทุกอย่าง" and "summary เป็นทางออกเดียว".
 */
import { pointInPolygon, boundaryDistance_m, MS_PER_S } from '@keep-walking/geo';
import type { PolygonGeometry as GeoPolygonGeometry } from '@keep-walking/geo';
import {
  selectCanClearLocalData,
  selectOpening,
  selectPlayerView,
  selectRunView,
} from '@keep-walking/shared/session';
import type { CheckInPreview, SessionEvent, SessionState } from '@keep-walking/shared/session';
import type { LocationPermission } from '@keep-walking/location';
import { play } from '../../../art/vfx/core/vfx';
// Side-effect import: registers `run.hpLow`/`run.autoRetreat`/`run.death` (F06, art/vfx/
// hp-critical/hp-critical.ts) — this module is the one that calls `play()` for the latter two
// directly (on the run-bar and the HP-fill element respectively); `run.hpLow` is played by
// `ui/tick-toast.ts` on its own toast root, which imports the same module for the same reason.
import '../../../art/vfx/hp-critical/hp-critical';
import { createTelemetrySink } from './telemetry/sink';
import type { TelemetrySink } from './telemetry/sink';
import { KNOWN_EVENT_NAMES } from './telemetry/known-events';
import { readEnvelope, writeWithQuotaFallback } from './storage/local-store';
import type { KeyValueStorage } from './storage/local-store';
import { isTelemetryRecordArray } from './telemetry/sink';
import { speedLockTriggeredEvent } from './telemetry/f04-events';
import { appTelemetryConfig } from './config/telemetry';
import { clientConfig } from './config/runtime';
import { createSessionEngine } from './session/engine';
import type { SessionEngine } from './session/engine';
import { buildSessionParams } from './session/config';
import { loadDungeonArtifact, toMapDungeonInput, dungeonStatus } from './dungeons/artifact';
import type { ArtifactDungeon } from './dungeons/artifact';
import { formatDistanceText } from './dungeons/distance';
import { formatOpenTime } from './dungeons/open-time';
import { formatCopyText } from './copy/format';
import { getCopyText } from './copy/load';
import { getDungeonShortName, getProvinceName } from './copy/names';
import type { AssetRuntimeController } from './assets/runtime';
import { compassPointTo } from './dungeons/direction';
import { parseE2eClassIdParam, parseRunSeedParam } from './clock/query-params';
import type { PlayerClass } from '@keep-walking/shared/session';
import {
  balanceLocationConfig,
  balanceOpeningHoursConfig,
  balancePrivacyConfig,
  balanceUnlocksHomeConfig,
} from './config/balance';
import { mountDungeonConfirm } from './ui/dungeon-confirm';
import { mountRunBar } from './ui/run-bar';
import { mountSpeedLockOverlay } from './ui/speed-lock-overlay';
import { mountRunSummary } from './ui/run-summary';
import { mountNavPanel } from './ui/nav-panel';
import { mountTickToast } from './ui/tick-toast';
import { mountHpBar } from './ui/hp-bar';
import { formatCountdown } from './ui/checkin-status';
import { mountInventoryScreen } from './ui/inventory-screen';
import type { InventoryPotionCatalog } from './ui/inventory-screen';
import { mountSettingsWalkingSafety } from './ui/settings-walking-safety';
import { createIconGlyphRenderer } from './assets/icon-glyph';
import type { FetchTextLike, ParseSvgDocument } from './assets/icon-glyph';
import { createCueFeedback } from './feedback/cue-feedback';
import type { NavigatorWithVibrate } from './feedback/cue-feedback';
import { WakeLockController, isWakeLockSupported } from './feedback/wake-lock-controller';
import type {
  DocumentVisibilityLike,
  NavigatorWithWakeLock,
} from './feedback/wake-lock-controller';
import { mountPocketScreen } from './ui/pocket-screen';
import { pocketScreenPrefEnabled } from './ui/settings-walking-safety';
import { mountCueVisual } from './ui/cue-visual';
import type { DungeonSourceMap } from './map/dungeons-source';
import { createDungeonLabelCache, setDungeonsSourceData } from './map/dungeons-source';
import { HomeTracker } from './dungeons/home-tracker';
import {
  loadLaunchAreaDistrictIds,
  loadLaunchAreaMask,
  loadPlayAreaMask,
} from './dungeons/home-geometry';
import { mountHomePanel } from './ui/home-panel';
import { mountRoleInfo } from './ui/role-info';
import { mountInterestRegister } from './ui/interest-register';
import { groupedSelectableDistricts, studyAreaProvinceOptions } from './copy/districts';
import { mountIntroScreen } from './ui/intro-screen';
import { mountClassSelect } from './ui/class-select';
import { mountRunTutorialLine } from './ui/run-tutorial-line';
import { OnboardingFlow } from './onboarding-flow';
import { shouldSkipF04App } from './env';
import { mountAgeGateScreen } from './ui/age-gate-screen';
import { mountConsentLocationScreen } from './ui/consent-location-screen';
import { mountSettingsMenu } from './ui/settings-menu';
import { mountPrivacyScreen } from './ui/privacy-screen';
import { mountCredits } from './ui/credits';
import { withdrawConsent } from './privacy/withdraw-consent';
import { readLocationConsent, writeLocationConsent } from './storage/onboarding';
import { clearLocalData } from './storage/clear-local-data';

const TELEMETRY_STORAGE_KEY = 'kw.p2.telemetry';
const SECONDS_PER_MINUTE = 60;

export interface F04AppDeps {
  readonly map: DungeonSourceMap | undefined;
  readonly hudContainer: HTMLElement;
  readonly storage: KeyValueStorage;
  readonly sessionId: string;
  readonly appVersion: string;
  readonly platform: string;
  /** Widened (P2-F05-T10) to accept a full `navigator.vibrate` pattern array, not just one
   * duration — every reward-tick/drop cue in `audio/manifest.json` carries `vibration_ms` as an
   * array (the two existing single-number call sites below still work: `number` is assignable
   * wherever `number | readonly number[]` is expected). */
  readonly vibrate: (pattern_ms: number | readonly number[]) => void;
  readonly isOnline: () => boolean;
  readonly userAgent: string;
  readonly maxTouchPoints: number;
  /** P2-F06-T09 widens this from the plain icon-only `AssetRuntime` (`assets/icon-dom.ts`) to the
   * full `AssetRuntimeController` (`assets/runtime.ts`) so `home-panel.ts` can reach
   * `loadAvatarPart()` — every existing consumer of `deps.assets` only ever used the narrower
   * icon-only surface, so this is a strictly wider type, not a breaking change to them. */
  readonly assets: AssetRuntimeController;
  readonly copyToClipboard: (text: string) => Promise<boolean>;
  /** `new Audio(url).play()` (or equivalent) — the one place `assets/audio-player.ts` actually
   * starts real playback; injected so tests never touch a real `<audio>` element. */
  readonly playAudioUrl: (url: string) => void;
  /** The game clock's own `now()` (`clock/game-clock.ts`), not a bare `Date.now()`: every
   * dispatch this module makes — including the ones triggered by a tap (confirm/exit/ack), not
   * just `onSample`/`onTick` — must share the same clock. Web's game clock already is
   * `Date.now`, so production behavior is unchanged; a Mock replay at `speed=60` is where these
   * two clocks diverge (the replayed `now_ms` races ahead of real wall time), and a tap dispatched
   * with a stale wall-clock `at_ms` at that point would look like the session clock running
   * backwards to `sessionStep` (fixed while wiring this task's own e2e, P2-F05-T10).
   */
  readonly now: () => number;
  /** `window.location.search`, read once by the caller (`main.ts`) rather than by this module
   * directly (TG-03/TG-04, tech gate P2-F05-T15): keeps `resolveRunSeed`/`resolveE2eClassId` pure
   * and directly unit-testable without touching the global `window`. */
  readonly locationSearch: string;
  /** Whether the page's own provider selection (`location/select.ts`) resolved to Mock — the one
   * gate `resolveRunSeed`/`resolveE2eClassId` check before reading `?seed=`/`?e2eClassId=` at all
   * (tech gate P2-F05-T15 TG-03/TG-04, decision 6.2: a real player on `?loc=web` must never be
   * able to pick their own RNG seed or skip class selection). */
  readonly isMockProvider: boolean;
  /** `LocationProvider#getPermission()` (`@keep-walking/location`), never `navigator.permissions`
   * directly (CLAUDE.md: "Use the LocationProvider interface only") — `onboarding-flow.ts`'s only
   * source for resolving the onboarding step machine's `permission` step (P2-F06-T10). */
  readonly getLocationPermission: () => Promise<LocationPermission>;
  /** `provider.start()` (`main.ts`'s own gate, `env.ts`'s doc comment for the whole task) — the one
   * real GPS-requesting call, reached only from `OnboardingFlow#acceptConsent()`
   * (R47/CLAUDE.md "GPS never requested without consent"). Idempotent (`main.ts`'s own
   * `startLocationNow` already guards against a double `provider.start()`). */
  readonly startLocationProvider: () => void;
  /** `provider.stop()` (`@keep-walking/location#LocationProvider`) — the withdraw-consent
   * sequence's own step 3 (docs/tech/F06-hp-damage-onboarding.md 8.4). */
  readonly stopLocationProvider: () => void;
  /** `assets/icon-glyph.ts#FetchTextLike` (P2-F06-T14, components.md 13.9): `(url) => fetch(url)`,
   * the same-origin asset fetch `createIconGlyphRenderer` uses to pull an `icon.ui.*` SVG's raw
   * text once per id per session — injected so this module (and every screen it mounts) never
   * touches the global `fetch` itself (ADR 0001 3.6). */
  readonly fetchText: FetchTextLike;
  /** `assets/icon-glyph.ts#ParseSvgDocument` — `(text) => new DOMParser().parseFromString(text,
   * 'image/svg+xml')`, injected for the same reason. */
  readonly parseSvgDocument: ParseSvgDocument;
  /** `feedback/cue-feedback.ts#NavigatorWithVibrate` and `feedback/wake-lock-controller.ts
   * #NavigatorWithWakeLock` both narrow this — the real `window.navigator` (P2-F06-T14 context:
   * "wire createCueFeedback (nav=window.navigator, ...)"), never read as a bare global from inside
   * this module. */
  readonly nav: NavigatorWithVibrate & NavigatorWithWakeLock;
  /** `feedback/wake-lock-controller.ts#DocumentVisibilityLike` — the real `window.document`. */
  readonly documentVisibility: DocumentVisibilityLike;
}

export interface F04App {
  onSample(lat: number, lng: number, accuracy_m: number, t_ms: number): void;
  onTick(now_ms: number): void;
  readonly telemetry: TelemetrySink;
  readonly engine: SessionEngine;
}

/** `ArtifactDungeon.geometry` (`map/dungeons-source.ts`'s readonly `DungeonGeometry`) and
 * `@keep-walking/geo`'s `PolygonGeometry` (plain `geojson` `Polygon`/`MultiPolygon`) describe the
 * identical committed artifact shape with two different TS strictness levels (readonly tuples vs
 * `geojson`'s mutable `Position[]`) — cast, not a data transform. */
function geoPolygon(geometry: ArtifactDungeon['geometry']): GeoPolygonGeometry {
  return geometry as unknown as GeoPolygonGeometry;
}

/** A fresh uint32 `runSeed` (ADR 0003 section 6): the `seed` query test hook when set (`loc=mock`
 * only — `isMockProvider` gates this, tech gate P2-F05-T15 TG-03, decision 6.2), otherwise
 * `crypto.getRandomValues` — never `Math.random` (ADR 0003 3.2, this workspace's own ban on
 * non-seeded RNG in anything gameplay-adjacent). Exported for a direct unit test proving the Web
 * provider never reads `?seed=` (TG-03's own acceptance). */
export function resolveRunSeed(search: string, isMockProvider: boolean): number {
  if (isMockProvider) {
    const fromQuery = parseRunSeedParam(search, clientConfig.providerQuery.paramNames.seed);
    if (fromQuery !== undefined) return fromQuery;
  }
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] ?? 0;
}

/** `?e2eClassId=` (`clock/query-params.ts#parseE2eClassIdParam`), read only under the Mock
 * provider (tech gate P2-F05-T15 TG-04, decision 6.2 — same rule as `resolveRunSeed`). Exported
 * for a direct unit test proving the Web provider never reads it. */
export function resolveE2eClassId(
  search: string,
  isMockProvider: boolean,
): PlayerClass | undefined {
  if (!isMockProvider) return undefined;
  return parseE2eClassIdParam(search, clientConfig.providerQuery.paramNames.e2eClassId);
}

function pointOf(dungeon: ArtifactDungeon): { readonly lat: number; readonly lng: number } {
  const [lng, lat] = dungeon.nav_destination.point;
  return { lat, lng };
}

/** Distance is always measured to the polygon edge (F04-R34), never to `nav_destination` — the
 * arrow's target and the distance's target are intentionally different points (J-5). */
function edgeDistance_m(playerLat: number, playerLng: number, dungeon: ArtifactDungeon): number {
  return boundaryDistance_m({ lat: playerLat, lng: playerLng }, geoPolygon(dungeon.geometry));
}

/** `kw.p2.consent.location === 'granted'` — but a *missing* key (nobody has ever answered) also
 * reads as granted, see this function's own call site's doc comment (P2-F06-T09 interim default,
 * no consent screen built yet). Only an explicit, successfully-read `'declined'`/`'withdrawn'`
 * value denies it. */
function locationConsentGranted(storage: KeyValueStorage): boolean {
  const result = readEnvelope(
    storage,
    'kw.p2.consent',
    1,
    (v): v is { readonly location: string } =>
      typeof v === 'object' &&
      v !== null &&
      typeof (v as { location?: unknown }).location === 'string',
  );
  return !result.ok || result.envelope.state.location === 'granted';
}

export function createF04App(deps: F04AppDeps): F04App {
  const artifact = loadDungeonArtifact();
  const params = buildSessionParams(artifact.dungeons);
  const byId = new Map(artifact.dungeons.map((d) => [d.id, d] as const));

  const telemetry = createTelemetrySink({
    config: appTelemetryConfig.localSink,
    forbiddenPropertyNames: appTelemetryConfig.export.forbiddenPropertyNames,
    coordinateGuard: appTelemetryConfig.export.coordinateLikeNumberGuard,
    knownEventNames: KNOWN_EVENT_NAMES,
    sessionId: deps.sessionId,
    platform: deps.platform,
    appVersion: deps.appVersion,
    now: Date.now,
  });
  const restored = readEnvelope(deps.storage, TELEMETRY_STORAGE_KEY, 1, isTelemetryRecordArray);
  if (restored.ok) {
    telemetry.restore(restored.envelope.state);
  }
  function persistTelemetry(): void {
    writeWithQuotaFallback(deps.storage, TELEMETRY_STORAGE_KEY, telemetry.serialize(), {
      trimTelemetryHalf: () => telemetry.trimHalf(),
      clearTelemetryAll: () => telemetry.clear(),
    });
  }

  // Screen Wake Lock (design gate A 4.4, components.md 12.2): constructed before `engine` on
  // purpose — the boot-time catch-up `tick` inside `createSessionEngine` can itself produce a
  // `dungeon_exited` event (a run that timed out while the app was closed) and `session/engine.ts`
  // reads `getRunClientStats()` synchronously for every `dungeon_exited`, including that one.
  // `deps.now` (not `Date.now`) so a sped-up Mock replay also sees sped-up held/hidden totals (tech
  // note F06 10.2 Q-T17-3). `onStateChange`'s own `engine.getState()` read is safe despite `engine`
  // being declared below: the callback only ever runs later (on a real request's async
  // resolution, or from an explicit `start()` call `handleSessionEvents` makes long after this
  // whole function returns) — never synchronously during construction.
  const wakeLockController = new WakeLockController({
    nav: deps.nav,
    doc: deps.documentVisibility,
    now: deps.now,
    onStateChange: (state) => {
      telemetry.record('wake_lock_state_changed', {
        state,
        dungeon_id: engine.getState().run?.dungeonId ?? null,
      });
      persistTelemetry();
    },
  });

  const e2eClassId = resolveE2eClassId(deps.locationSearch, deps.isMockProvider);
  const engine = createSessionEngine(
    params,
    {
      storage: deps.storage,
      quotaDeps: {
        trimTelemetryHalf: () => telemetry.trimHalf(),
        clearTelemetryAll: () => telemetry.clear(),
      },
      record: (name, properties) => {
        telemetry.record(name, properties as Record<string, string | number | boolean | null>);
        persistTelemetry();
      },
      // P2-F06-T14 (tech note F06 10.2 Q-T17-3): a live peek at this run's Wake Lock/page-hidden
      // totals, read only for `dungeon_exited` (`session/engine.ts#persistAndMap`'s own guard) —
      // `WakeLockRunTotals`'s field names (`heldMs`/`hiddenMs`/`supported`) are renamed to
      // `RunClientStats`'s (`wakeLockHeldMs`/`pageHiddenMs`/`wakeLockSupported`) here rather than
      // in either module, since neither owns the other's vocabulary.
      getRunClientStats: () => {
        const totals = wakeLockController.snapshot();
        return {
          pageHiddenMs: totals.hiddenMs,
          wakeLockHeldMs: totals.heldMs,
          wakeLockSupported: totals.supported,
        };
      },
      ...(e2eClassId !== undefined ? { testForceClassId: e2eClassId } : {}),
    },
    deps.now(),
  );

  // P2-X38 (docs/tech/F06-hp-damage-onboarding.md 8.4 step 1): flipped by `withdrawConsentNow`
  // below, checked first thing in `onSample` — a `LocationProvider` sample callback already queued
  // when the player withdraws must still be dropped, never reach `sessionStep`/the HUD.
  let locationWithdrawn = false;
  // P2-X38: the consent screen reopened for a returning player who declined/withdrew earlier
  // (R48 "ปุ่มเดียวกลับไปให้ใหม่", `home.unknownCta`/`privacy.locationStatusNotGranted`'s own button) —
  // `true` only while that manual re-entry is on screen; the onboarding step machine's own
  // `'consent'` step (fresh players) never touches this flag at all.
  let manualConsentScreenOpen = false;
  function openManualConsentScreen(): void {
    manualConsentScreenOpen = true;
    if (window.location.hash !== '') window.location.hash = '';
    render(engine.getState(), deps.now());
  }

  // --- P2-F06-T10/P2-X38: onboarding step machine wiring (tech note F06 section 8, R36/R44-R49) ---
  const onboarding = new OnboardingFlow({
    storage: deps.storage,
    quotaDeps: {
      trimTelemetryHalf: () => telemetry.trimHalf(),
      clearTelemetryAll: () => telemetry.clear(),
    },
    now: deps.now,
    record: (name, properties) => {
      telemetry.record(name, properties);
      persistTelemetry();
    },
    minAge_yr: balancePrivacyConfig.minAge_yr,
    minAgeComparison: balancePrivacyConfig.minAgeComparison,
    // R47/CLAUDE.md "GPS never requested without consent": the one and only call site this reaches
    // is `OnboardingFlow#acceptConsent()`, itself only ever called from `consentLocationScreen`'s
    // own accept handler below.
    startLocationProvider: deps.startLocationProvider,
    queryGeolocationPermission: deps.getLocationPermission,
    onPermissionResolved: () => render(engine.getState(), deps.now()),
    e2eSkipOnboarding: shouldSkipF04App(
      deps.locationSearch,
      clientConfig.providerQuery.paramNames.e2eSkipOnboarding,
      deps.isMockProvider,
    ),
  });
  const introScreen = mountIntroScreen(deps.hudContainer, () => {
    onboarding.completeIntro();
    render(engine.getState(), deps.now());
  });
  const ageGateScreen = mountAgeGateScreen(deps.hudContainer, {
    minAge_yr: balancePrivacyConfig.minAge_yr,
    now: deps.now,
    onConfirm: (birthYear) => {
      onboarding.confirmAge(birthYear);
      render(engine.getState(), deps.now());
    },
    onUnderageBack: () => {
      onboarding.returnFromUnderage();
      render(engine.getState(), deps.now());
    },
  });
  const consentLocationScreen = mountConsentLocationScreen(deps.hudContainer, {
    onAccept: () => {
      onboarding.acceptConsent();
      manualConsentScreenOpen = false;
      render(engine.getState(), deps.now());
    },
    onDecline: () => {
      onboarding.declineConsent();
      manualConsentScreenOpen = false;
      render(engine.getState(), deps.now());
    },
  });
  const classSelect = mountClassSelect(
    deps.hudContainer,
    (classId) => {
      const events = engine.dispatch({ type: 'chooseClass', classId }, deps.now());
      handleSessionEvents(events);
      // Only the real `class_chosen` event (never `class_choice_rejected`, e.g. a double-tap after
      // the sheet already closed) counts as the funnel's `class_selected` step.
      if (events.some((event) => event.type === 'class_chosen')) {
        onboarding.recordClassSelected(classId);
      }
      render(engine.getState(), deps.now());
    },
    deps.assets,
  );
  const runTutorialLine = mountRunTutorialLine(
    deps.hudContainer,
    clientConfig.onboarding.tutorialLineHoldDurationMs,
  );
  // D-120 table 1.3 (P2-H20): the *only* two `checkin_rejected` reasons that route to this status-
  // row override — `selectCheckInPreview` never returns either (`checkInStatusView`'s own doc
  // comment) — cleared the instant the underlying condition is no longer true (class chosen / HP
  // recovered), checked fresh on every render, never a fixed timeout.
  let confirmRejectOverride:
    { readonly dungeonId: string; readonly reason: 'no_class' | 'no_hp' } | undefined;

  const labelCache = createDungeonLabelCache();
  function refreshMapDungeons(now_ms: number): void {
    if (deps.map === undefined) return;
    const inputs = artifact.dungeons.map((d) => toMapDungeonInput(d, params, now_ms));
    setDungeonsSourceData(deps.map, inputs, labelCache);
  }
  refreshMapDungeons(deps.now());

  // `setIconGlyph` (P2-F06-T14, components.md 13.9): one renderer, shared by every screen that
  // needs a colour-tinted `icon.ui.*` glyph (run-state pill, closed chip) — a single in-memory SVG-
  // text cache per session, not one per call site.
  const iconGlyph = createIconGlyphRenderer({
    runtime: deps.assets,
    fetchText: deps.fetchText,
    parseSvgDocument: deps.parseSvgDocument,
  });

  // Fire-together cue coordinator (F05 flow Flow A5, audio/cue-list.md section 4's single
  // priority-queue channel — every cue below, plus F06's safety cues, share this exact same
  // instance, never a second queue): `createCueFeedback` (P2-X29) wraps `assets/audio-player.ts`'s
  // queue+audio+vibration with the visual leg (`cuePulse.pulse`, `ui/cue-visual.ts`) fired at the
  // instant the queue actually promotes a cue to playing — never at `submit()` time, which could be
  // earlier than a lower-priority cue's real turn (cue-feedback.ts's own doc comment). The detailed,
  // per-event toasts (`tickToast`, `run.autoRetreat`/`run.death` vfx below) stay exactly as they
  // were; this pulse is the supplementary, always-synced visual the fire-together contract itself
  // asks for on top of them (context: "nav=window.navigator, playUrl=Audio, showVisual=toast/banner").
  const cuePulse = mountCueVisual(deps.hudContainer);
  const cueFeedback = createCueFeedback({
    assets: deps.assets,
    nav: deps.nav,
    showVisual: () => cuePulse.pulse(),
    playUrl: deps.playAudioUrl,
    now: Date.now,
    setTimer: (run, delay_ms) => window.setTimeout(run, delay_ms),
    clearTimer: (handle) => window.clearTimeout(handle),
  });
  const audioPlayer = cueFeedback;

  // Pocket screen (design gate A 4.4, components.md 12.1): `wakeLockController` itself is
  // constructed above `engine` (see that construction's own doc comment) — requested on every
  // `dungeon_entered` and released on every exit path, `handleSessionEvents` below.
  const pocketScreen = mountPocketScreen(deps.hudContainer, {
    storage: deps.storage,
    now: deps.now,
    setTimer: (run, delay_ms) => window.setTimeout(run, delay_ms),
    clearTimer: (handle) => window.clearTimeout(handle),
    gesture: clientConfig.pocketScreen,
    onExit: () => {
      pocketScreen.hideOverlay();
      pocketScreen.showEnterButton();
    },
    onEnterRequested: () => {
      pocketScreen.hideEnterButton();
      pocketScreen.showOverlay();
    },
  });

  // --- Screens (F04 flow priority: speed-lock > summary > run > confirm > map/nav) ---
  const confirmPopup = mountDungeonConfirm(deps.hudContainer, {
    onEnter: (dungeonId) => {
      const at_ms = deps.now();
      const events = engine.dispatch(
        {
          type: 'confirm',
          dungeonId,
          runSeed: resolveRunSeed(deps.locationSearch, deps.isMockProvider),
        },
        at_ms,
      );
      handleSessionEvents(events);
      // Swap rule 8 fix (P2-X37 finding): this dispatch alone never re-rendered — the popup stayed
      // up (still showing the pre-confirm preview) until the next `onSample`/`onTick` call caught
      // up, which qa's own e2e (`f04-checkin-confirm-flow.spec.ts`, "Active again (returned)")
      // caught as a popup that does not hide on the very click that entered the run. `render()` is
      // a function declaration (hoisted), so calling it here — before its own definition further
      // down this closure — is safe: this callback only ever runs later, on a real tap.
      render(engine.getState(), at_ms);
    },
    onCancel: () => confirmPopup.hide(),
  });
  const runBar = mountRunBar(deps.hudContainer, {
    onExitConfirmed: () => handleSessionEvents(engine.dispatch({ type: 'exit' }, deps.now())),
    iconGlyph,
  });
  const speedLockOverlay = mountSpeedLockOverlay(deps.hudContainer, {
    onSettings: () => {
      window.location.hash = '#/settings';
    },
    // TG-10 (tech gate P2-F05-T15): forward the returned events the same way `runBar.onExitConfirmed`
    // already does (below) — the exit dispatched from here previously discarded its own
    // `dungeon_exited` event, so the closing-soon warning banner never cleared on this exit path.
    onExit: () => handleSessionEvents(engine.dispatch({ type: 'exit' }, deps.now())),
    vibrate: deps.vibrate,
    vibrateOnEnterPattern_ms: clientConfig.vibration.speedLockEnter_ms,
  });
  const runSummary = mountRunSummary(
    deps.hudContainer,
    () => {
      engine.dispatch({ type: 'ackSummary' }, deps.now());
      runSummary.hide();
    },
    {
      assets: deps.assets,
      autoRetreatThresholdPct: params.config.hpSafety.autoRetreatThreshold_pct,
    },
  );
  const tickToast = mountTickToast(deps.hudContainer, {
    assets: deps.assets,
    audio: audioPlayer,
    holdDurationMs: clientConfig.toast.tickHoldDurationMs,
    maxIconsShown: clientConfig.toast.tickMaxIconsShown,
    hpLowHoldDurationMs: clientConfig.toast.hpLowHoldDurationMs,
    // P2-H39 (design/ux/components.md 15.4): the toast/vfx stay hidden under the pocket screen's
    // own dark overlay, but audio/vibration always fires — `tick-toast.ts`'s own doc comment.
    isPocketOverlayShowing: () => !pocketScreen.overlayRoot.hidden,
  });
  // F06 flow section 4.1 (C1): permanent on `S-03-run` in every run status — shown/hidden
  // together with `runBar` (`renderRun` below), never on its own.
  const hpBar = mountHpBar(deps.hudContainer);

  // F06 override item 8 / C8: the HP potion ids come straight from config (never a literal
  // `'hpSmall'`/`'revive'` in this module) — `economy.autoPotion.defaultPotionOrder` for the
  // regular potions, and whichever `economy.potions.<id>` entry actually has `reviveToHp_pct` for
  // the revive one (there is exactly one in Phase 2's config; `undefined` here would just mean the
  // revive button never renders, a fail-honest empty state, not a crash).
  const potionCatalog: InventoryPotionCatalog = {
    hpPotionIds: [...params.config.economy.autoPotion.defaultPotionOrder],
    reviveItemId: Object.entries(params.config.economy.potions).find(
      ([, def]) => def.reviveToHp_pct !== undefined,
    )?.[0],
  };
  function closeRouteScreen(): void {
    window.location.hash = '';
  }
  const inventoryScreen = mountInventoryScreen(deps.hudContainer, {
    assets: deps.assets,
    potions: potionCatalog,
    onUsePotion: (itemId) => {
      handleSessionEvents(engine.dispatch({ type: 'usePotion', itemId }, deps.now()));
      renderInventoryScreen();
    },
    onUseRevivePotion: (itemId) => {
      handleSessionEvents(engine.dispatch({ type: 'usePotion', itemId }, deps.now()));
      renderInventoryScreen();
    },
    onClose: closeRouteScreen,
  });
  function renderInventoryScreen(): void {
    const state = engine.getState();
    const view = selectPlayerView(state, deps.now(), params);
    inventoryScreen.render({
      inventory: view.inventory,
      hp: view.hp,
      maxHp: view.maxHp,
      recovering: view.recovering,
      hasRun: state.run !== null,
    });
  }
  // `#/settings` subpages close back up to the `S-22-settings` menu itself, one level at a time —
  // never all the way out to the main app in one tap (only the menu's own close button does that,
  // `settingsMenu` below).
  function closeSettingsSubpage(): void {
    window.location.hash = '#/settings';
  }
  const settingsWalkingSafety = mountSettingsWalkingSafety(deps.hudContainer, {
    storage: deps.storage,
    autoRetreatThresholdPct: params.config.hpSafety.autoRetreatThreshold_pct,
    onSetAutoRetreat: (enabled) => {
      handleSessionEvents(engine.dispatch({ type: 'setAutoRetreat', enabled }, deps.now()));
      settingsWalkingSafety.setAutoRetreatEnabled(engine.getState().player.autoRetreatEnabled);
    },
    onClose: closeSettingsSubpage,
  });
  const creditsScreen = mountCredits(deps.hudContainer, closeSettingsSubpage);
  const settingsMenu = mountSettingsMenu(deps.hudContainer, {
    selectCanClearLocalData: () => selectCanClearLocalData(engine.getState()),
    onOpenWalkingSafety: () => {
      window.location.hash = '#/settings/walking-safety';
    },
    onOpenCredits: () => {
      window.location.hash = '#/settings/credits';
    },
    onOpenPrivacy: () => {
      window.location.hash = '#/settings/privacy';
    },
    onClearLocalDataConfirmed: () => {
      clearLocalData({
        storage: deps.storage,
        // `config/app/privacy.json#localData.storageKeyPrefix` — `AppPrivacyConfig`
        // (`config/runtime.ts`) does not parse this subtree yet (no other client code reads it at
        // runtime either; every `kw.p2.<name>` storage key elsewhere in this codebase already
        // hardcodes the same prefix as its own literal, e.g. `storage/onboarding.ts`'s
        // `ONBOARDING_STORAGE_KEY`) — matches that same established convention rather than adding a
        // new config-parsing surface for one call site. owner: tech-lead, a real
        // `appPrivacyConfig.localData.storageKeyPrefix` accessor replaces this literal with no
        // other change (handoff in this task's REPORT).
        storageKeyPrefix: 'kw.p2.',
        telemetryStorageKey: TELEMETRY_STORAGE_KEY,
        telemetrySchemaVersion: 1,
        sink: {
          config: appTelemetryConfig.localSink,
          forbiddenPropertyNames: appTelemetryConfig.export.forbiddenPropertyNames,
          coordinateGuard: appTelemetryConfig.export.coordinateLikeNumberGuard,
          knownEventNames: KNOWN_EVENT_NAMES,
          sessionId: deps.sessionId,
          platform: deps.platform,
          appVersion: deps.appVersion,
          now: Date.now,
        },
        now: deps.now,
        reload: () => window.location.reload(),
      });
    },
    onClose: closeRouteScreen,
  });
  const privacyScreen = mountPrivacyScreen(deps.hudContainer, {
    hasActiveRun: () => engine.getState().run !== null,
    onRequestReconsent: openManualConsentScreen,
    onWithdrawConfirmed: () => {
      withdrawConsent({
        hasActiveRun: () => engine.getState().run !== null,
        exitRun: (now_ms) => {
          handleSessionEvents(engine.dispatch({ type: 'exit' }, now_ms));
        },
        stopLocationProvider: deps.stopLocationProvider,
        purgeLocation: () => engine.purgeLocation(),
        writeConsentWithdrawn: () =>
          writeLocationConsent(deps.storage, 'withdrawn', deps.now(), {
            trimTelemetryHalf: () => telemetry.trimHalf(),
            clearTelemetryAll: () => telemetry.clear(),
          }),
        setLocationWithdrawn: () => {
          locationWithdrawn = true;
        },
        record: (name, properties) => {
          telemetry.record(name, properties as Record<string, string | number | boolean | null>);
          persistTelemetry();
        },
        now: deps.now,
      });
      // Tech note F06 8.4 step 5: leaves the settings route entirely (never just "up" to the
      // settings menu, `closeSettingsSubpage`) — `render()`'s own top-level guard needs
      // `currentRoute === 'main'` to show the run summary this may have just produced (or, with no
      // run, the home panel's now-`unknown` state) instead of the settings chrome hiding it.
      window.location.hash = '';
    },
    onClearLocalDataShortcut: closeSettingsSubpage,
    onClose: closeSettingsSubpage,
  });
  const navPanel = mountNavPanel(deps.hudContainer, {
    externalOpenTimeout_ms: clientConfig.navigation.externalOpenTimeout_ms,
    onNavigationLinkOpened: () => undefined,
    isOnline: deps.isOnline,
    userAgent: deps.userAgent,
    maxTouchPoints: deps.maxTouchPoints,
    copyToClipboard: deps.copyToClipboard,
    iconGlyph,
  });

  // --- P2-F06-T09: home-state wiring (tech note F06 section 9, spec F06 R50-R58) ---
  // Both mask geometries load async (`fetch`, `home-geometry.ts`); `homeTracker` stays `undefined`
  // until they resolve, and `render()` below simply defers to the pre-existing `renderNearbyNav`
  // behaviour (unchanged) while that is the case — never a guess at "far"/"out_of_area" from
  // incomplete data.
  let homeTracker: HomeTracker | undefined;
  let launchDistrictIds: ReadonlySet<string> = new Set();
  void Promise.all([
    loadPlayAreaMask(),
    loadLaunchAreaMask(balanceUnlocksHomeConfig.launchAreaMaskPath),
    loadLaunchAreaDistrictIds(),
  ]).then(([playAreaMask, launchAreaMask, excludedIds]) => {
    homeTracker = new HomeTracker(
      { dungeons: artifact.dungeons, sessionParams: params },
      {
        farDungeonThreshold_m: balanceUnlocksHomeConfig.farDungeonThreshold_m,
        maxAccuracy_m: balanceLocationConfig.homeState.maxAccuracy_m,
        sustainedPoorAccuracy_s: balanceLocationConfig.homeState.sustainedPoorAccuracy_s,
        reevaluateDistance_m: balanceUnlocksHomeConfig.reevaluateDistance_m,
        playAreaMask,
        launchAreaMask,
      },
    );
    launchDistrictIds = excludedIds;
    render(engine.getState(), deps.now());
  });

  // --- S-22/S-23/S-26/S-11 route screens (ia.md: the gear icon/inventory shortcut are reachable
  // from every state, NN-7 — never gated behind a run/consent/unlock check) ---
  // `#/settings` is `S-22-settings`'s own real home menu (P2-X38, replacing the previous "stand-in
  // front door onto the walking-safety subpage directly" `settingsWalkingSafety`'s own doc comment
  // used to describe) — `#/settings/walking-safety`, `#/settings/privacy`, `#/settings/credits` are
  // its three subpages, `#/inventory` is `S-11-inventory`. Every route screen fully takes over the
  // display while open (`render()`'s own top guard below).
  type RouteScreen =
    | 'main'
    | 'settingsMenu'
    | 'settingsWalkingSafety'
    | 'settingsPrivacy'
    | 'settingsCredits'
    | 'inventory';
  function routeFromHash(): RouteScreen {
    const hash = window.location.hash;
    if (hash.startsWith('#/settings/walking-safety')) return 'settingsWalkingSafety';
    if (hash.startsWith('#/settings/privacy')) return 'settingsPrivacy';
    if (hash.startsWith('#/settings/credits')) return 'settingsCredits';
    if (hash.startsWith('#/settings')) return 'settingsMenu';
    if (hash.startsWith('#/inventory')) return 'inventory';
    return 'main';
  }
  let currentRoute: RouteScreen = 'main';
  function syncRouteScreens(): void {
    currentRoute = routeFromHash();
    settingsMenu.hide();
    settingsWalkingSafety.hide();
    privacyScreen.hide();
    creditsScreen.hide();
    inventoryScreen.hide();
    if (currentRoute === 'settingsMenu') {
      settingsMenu.show();
    } else if (currentRoute === 'settingsWalkingSafety') {
      settingsWalkingSafety.setAutoRetreatEnabled(engine.getState().player.autoRetreatEnabled);
      settingsWalkingSafety.show();
    } else if (currentRoute === 'settingsPrivacy') {
      privacyScreen.render(readLocationConsent(deps.storage));
      privacyScreen.show();
    } else if (currentRoute === 'settingsCredits') {
      creditsScreen.show();
    } else if (currentRoute === 'inventory') {
      renderInventoryScreen();
      inventoryScreen.show();
    }
    render(engine.getState(), deps.now());
  }
  window.addEventListener('hashchange', syncRouteScreens);

  // --- P2-F06-T09: role info (S-05), interest registration (S-09), and the home-state panel
  // itself (Flow F). `emptyScreenAcknowledged` backs `onboarding_empty_screen_abandoned`'s own
  // "without pressing any button" clause (product/telemetry-events.md) — any of these shortcuts,
  // or the register/navigate/consent CTAs below, counts as "not abandoned".
  let emptyScreenAcknowledged = false;
  const roleInfoScreen = mountRoleInfo(deps.hudContainer, () => roleInfoScreen.hide(), deps.assets);
  const interestRegisterScreen = mountInterestRegister(deps.hudContainer, {
    storage: deps.storage,
    now: deps.now,
    quotaDeps: {
      trimTelemetryHalf: () => telemetry.trimHalf(),
      clearTelemetryAll: () => telemetry.clear(),
    },
    onConfirmed: (record) => {
      telemetry.record('interest_registered_outside_area', {
        scope: record.scope,
        area_name: record.areaId,
      });
      persistTelemetry();
    },
    onClose: () => interestRegisterScreen.hide(),
  });
  const homePanel = mountHomePanel(deps.hudContainer, {
    assets: deps.assets,
    utcOffsetMin: balanceOpeningHoursConfig.utcOffsetMin,
    distanceDisplaySteps_m: balanceUnlocksHomeConfig.distanceDisplaySteps_m,
    onOpenRoleInfo: () => {
      emptyScreenAcknowledged = true;
      roleInfoScreen.show();
    },
    onOpenInventory: () => {
      emptyScreenAcknowledged = true;
      window.location.hash = '#/inventory';
    },
    onOpenRecentRuns: () => {
      emptyScreenAcknowledged = true;
      const summary = engine.getState().lastSummary;
      if (summary === null) {
        homePanel.setRecentRunDetail(getCopyText('home.recentRunsEmpty'));
      } else {
        const dungeonName = getDungeonShortName(byId.get(summary.dungeonId)?.name_key ?? '');
        const endedAt = formatOpenTime(
          summary.endedAt_ms,
          deps.now(),
          balanceOpeningHoursConfig.utcOffsetMin,
        );
        homePanel.setRecentRunDetail(`${dungeonName} — ${endedAt}`);
      }
    },
    onRegisterDistrict: () => {
      emptyScreenAcknowledged = true;
      // P2-H32: a real Thai province heading per group (`copy/names.ts#getProvinceName`), not the
      // bare `provinceIso` this stood in for before `names.th.json#province.*` existed.
      const groups = groupedSelectableDistricts(launchDistrictIds).map((g) => ({
        groupKey: g.provinceIso,
        groupLabel: getProvinceName(g.provinceIso),
        options: g.districts.map((d) => ({ id: d.id, label: d.name })),
      }));
      interestRegisterScreen.show('district', groups);
    },
    onRegisterProvince: () => {
      emptyScreenAcknowledged = true;
      const options = studyAreaProvinceOptions().map((p) => ({ id: p.id, label: p.name }));
      interestRegisterScreen.show('province', [{ groupKey: 'all', options }]);
    },
    onRequestConsent: () => {
      emptyScreenAcknowledged = true;
      // P2-X38 (flow F06 F6, R48): reopens `S-00-consent-location` directly, never `S-22-settings`
      // (the previous interim wiring, `openManualConsentScreen`'s own doc comment).
      openManualConsentScreen();
    },
  });

  type EmptyScreenReason = 'far' | 'out_of_area' | 'outside_launch_district';
  // `onboarding_empty_screen_abandoned.seconds_before_close_bucket` (product/telemetry-events.md):
  // the enum's own literal bucket edges, not a config value (they define the enum itself).
  const ABANDON_BUCKET_EDGE_10_S = 10;
  const ABANDON_BUCKET_EDGE_30_S = 30;
  const ABANDON_BUCKET_EDGE_60_S = 60;
  function secondsBeforeCloseBucket(seconds: number): '0-10' | '10-30' | '30-60' | '60+' {
    if (seconds <= ABANDON_BUCKET_EDGE_10_S) return '0-10';
    if (seconds <= ABANDON_BUCKET_EDGE_30_S) return '10-30';
    if (seconds <= ABANDON_BUCKET_EDGE_60_S) return '30-60';
    return '60+';
  }
  let emptyScreenReason: EmptyScreenReason | undefined;
  let emptyScreenShownAt_ms: number | undefined;
  /** `onboarding_empty_screen_abandoned` (product/telemetry-events.md): "closed the app or
   * switched away ... without pressing any button" — called both on a reason change (below) and
   * on a real tab/app close (`visibilitychange`, further down). */
  function abandonIfNeeded(now_ms: number): void {
    if (emptyScreenReason === undefined || emptyScreenShownAt_ms === undefined) return;
    if (!emptyScreenAcknowledged) {
      telemetry.record('onboarding_empty_screen_abandoned', {
        reason: emptyScreenReason,
        seconds_before_close_bucket: secondsBeforeCloseBucket(
          (now_ms - emptyScreenShownAt_ms) / MS_PER_S,
        ),
      });
      persistTelemetry();
    }
  }
  /** Called on every `render()` pass with the *current* reason (`undefined` = not an empty
   * screen right now) — a no-op unless the reason actually changed since the last call. */
  function recordEmptyScreenTransition(
    reason: EmptyScreenReason | undefined,
    now_ms: number,
  ): void {
    if (reason === emptyScreenReason) return;
    abandonIfNeeded(now_ms);
    emptyScreenReason = reason;
    emptyScreenAcknowledged = false;
    emptyScreenShownAt_ms = reason === undefined ? undefined : now_ms;
    if (reason !== undefined) {
      telemetry.record('onboarding_empty_screen_shown', { reason });
      persistTelemetry();
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') abandonIfNeeded(deps.now());
  });

  let confirmPopupDungeonId: string | undefined;
  /** BUG-P2-003 fix: tracked separately from `confirmPopupDungeonId` so the two popup "modes"
   * (normal confirm vs B4 closed) never fight over one flag — only one of the two is ever
   * non-undefined at a time (`renderConfirmIfNeeded` clears the other whenever it takes over). */
  let closedPopupDungeonId: string | undefined;
  let lastPlayer: { lat: number; lng: number } | undefined;
  /** C-09 (copy gate P2-X37): the latest sample's own accuracy, so `renderNearbyNav` can pass a
   * real `approximate` flag to `nav.distanceApprox` instead of always `false`. */
  let lastAccuracy_m: number | undefined;

  /** Every open dungeon whose polygon contains the player right now (F04-R03 B2 overlap). */
  function openDungeonsContaining(lat: number, lng: number, now_ms: number): ArtifactDungeon[] {
    return artifact.dungeons.filter(
      (d) =>
        dungeonStatus(d, params, now_ms) === 'open' &&
        pointInPolygon({ lat, lng }, geoPolygon(d.geometry)),
    );
  }

  /** Every *closed* dungeon whose polygon contains the player right now (BUG-P2-003, flow F04 B4
   * "เกิดได้...ตอนเดินเข้าเขตครั้งแรก"). Deliberately the same shape as `openDungeonsContaining`
   * — the two are mutually exclusive per dungeon (`dungeonStatus` is either 'open' or 'closed'). */
  function closedDungeonsContaining(lat: number, lng: number, now_ms: number): ArtifactDungeon[] {
    return artifact.dungeons.filter(
      (d) =>
        dungeonStatus(d, params, now_ms) === 'closed' &&
        pointInPolygon({ lat, lng }, geoPolygon(d.geometry)),
    );
  }

  /** BUG-P2-003: walking into a closed dungeon's polygon (with no open dungeon overlapping it)
   * shows the same full-screen B4 closed popup a mid-confirm `dungeon_closed` rejection would
   * (flow F04 B4) — `showClosed()` (`ui/dungeon-confirm.ts`) previously had no real call site.
   * `emergency` (no known next-open time) is the only case reachable here; `unsupported_mode`
   * only ever surfaces from a `confirm` rejection (handled by P2-F06-T10 per D-120), never from
   * this walk-in check. */
  function renderClosedIfNeeded(player: { lat: number; lng: number }, now_ms: number): boolean {
    const closed = closedDungeonsContaining(player.lat, player.lng, now_ms);
    if (closed.length === 0) {
      if (closedPopupDungeonId !== undefined) {
        closedPopupDungeonId = undefined;
        confirmPopup.hide();
      }
      return false;
    }
    const dungeon = closed[0];
    if (dungeon !== undefined && closedPopupDungeonId !== dungeon.id) {
      closedPopupDungeonId = dungeon.id;
      const opening = selectOpening(dungeon.id, now_ms, params);
      const openTime =
        opening.changesAt_ms === null
          ? undefined
          : formatOpenTime(opening.changesAt_ms, now_ms, balanceOpeningHoursConfig.utcOffsetMin);
      confirmPopup.showClosed(openTime, opening.changesAt_ms === null);
    }
    return true;
  }

  function renderConfirmIfNeeded(state: SessionState, now_ms: number): boolean {
    if (state.run !== null || lastPlayer === undefined) {
      confirmPopupDungeonId = undefined;
      closedPopupDungeonId = undefined;
      confirmPopup.hide();
      return false;
    }
    const inside = openDungeonsContaining(lastPlayer.lat, lastPlayer.lng, now_ms);
    if (inside.length === 0) {
      confirmPopupDungeonId = undefined;
      return renderClosedIfNeeded(lastPlayer, now_ms);
    }
    closedPopupDungeonId = undefined;
    if (
      confirmPopupDungeonId === undefined ||
      !inside.some((d) => d.id === confirmPopupDungeonId)
    ) {
      confirmPopupDungeonId = inside[0]?.id;
      confirmPopup.show(
        inside.map((d) => ({
          dungeonId: d.id,
          nameKey: d.name_key,
          levelMin: d.level_range.min,
          levelMax: d.level_range.max,
        })),
      );
    }
    if (confirmPopupDungeonId !== undefined) {
      const livePreview = engine.previewCheckIn(confirmPopupDungeonId, now_ms);
      // D-120 table 1.3: override the status row with the real `confirm` rejection
      // (`selectCheckInPreview` never returns `no_class`/`no_hp` itself) for exactly as long as
      // the underlying condition still holds — checked fresh here every render, not a timeout.
      const overrideStillActive =
        confirmRejectOverride !== undefined &&
        confirmRejectOverride.dungeonId === confirmPopupDungeonId &&
        (confirmRejectOverride.reason === 'no_class'
          ? selectPlayerView(state, now_ms, params).classId === null
          : selectPlayerView(state, now_ms, params).hp <= 0);
      if (confirmRejectOverride !== undefined && !overrideStillActive) {
        confirmRejectOverride = undefined;
      }
      const preview: CheckInPreview = overrideStillActive
        ? {
            ok: false,
            reason: (confirmRejectOverride as NonNullable<typeof confirmRejectOverride>).reason,
            readyIn_s: null,
          }
        : livePreview;
      const dungeon = byId.get(confirmPopupDungeonId);
      const outOfRange =
        dungeon !== undefined &&
        !pointInPolygon({ lat: lastPlayer.lat, lng: lastPlayer.lng }, geoPolygon(dungeon.geometry));
      // C-11 (copy gate P2-X37): `dungeon.closingSoonTag`'s own `{timeLeft}`, from `selectOpening`
      // — never a client re-derivation of the closing decision itself (that stays `sessionStep`'s
      // job once a run exists; this popup is pre-run, R28).
      const opening = selectOpening(confirmPopupDungeonId, now_ms, params);
      const closingSoonTimeLeftText =
        opening.closingSoon && opening.changesAt_ms !== null
          ? formatCopyText('unit.minutes', {
              value: Math.max(
                1,
                Math.ceil((opening.changesAt_ms - now_ms) / MS_PER_S / SECONDS_PER_MINUTE),
              ),
            })
          : undefined;
      confirmPopup.update(preview, outOfRange, false, closingSoonTimeLeftText);
    }
    return true;
  }

  function renderRun(state: SessionState, now_ms: number): boolean {
    if (state.run === null) {
      runBar.hide();
      hpBar.root.hidden = true;
      runTutorialLine.hide();
      pocketScreen.hideOverlay();
      pocketScreen.hideEnterButton();
      return false;
    }
    runBar.show();
    hpBar.root.hidden = false;
    const view = selectRunView(state, now_ms, params);
    // C-05 (copy gate P2-X37): `run.stateSuspended`'s own `{timeLeft}` — `selectRunView`'s
    // `suspendedRemaining_s` (F04 N-11), never a client-derived countdown.
    const bannerVars: Readonly<Record<string, string>> =
      state.run.status === 'suspended' && view !== null && view.suspendedRemaining_s !== null
        ? { timeLeft: formatCountdown(view.suspendedRemaining_s) }
        : {};
    runBar.setStatus(state.run.status, bannerVars);
    if (view !== null) {
      // F06-R11: `view.hp` is `selectRunView`'s own read of the engine's HP, never computed here.
      // `nextTickIn_s` (F04 N-11) only has a live countdown to show while Active — Grace/Suspended
      // use the paused label instead (`tickTimerCopyKey`), same as before this task.
      runBar.setTick(
        state.run.status,
        state.run.status === 'active' && view.nextTickIn_s !== null
          ? formatCountdown(view.nextTickIn_s)
          : undefined,
      );
      hpBar.update({
        hp: view.hp.hp,
        maxHp: view.hp.maxHp,
        hpRatio: view.hp.hpRatio,
        belowWarningLine: view.hp.belowWarningLine,
        autoRetreatEnabled: view.hp.autoRetreatEnabled,
      });
      // Pocket screen (components.md 12.1): same two numbers as the pill/HP bar above, mirrored
      // onto the dark overlay whenever it happens to be showing — `showOverlay()`/`hideOverlay()`
      // (dungeon_entered/exited below, plus the swipe-out gesture) decide *whether* it is visible;
      // this only keeps its two live numbers current while it is.
      pocketScreen.setHp(view.hp.hpRatio);
      pocketScreen.setTick(
        state.run.status === 'active' && view.nextTickIn_s !== null
          ? formatCountdown(view.nextTickIn_s)
          : undefined,
      );
    }
    return true;
  }

  function renderNearbyNav(state: SessionState, now_ms: number): void {
    if (state.run !== null || confirmPopupDungeonId !== undefined || lastPlayer === undefined) {
      navPanel.root.hidden = true;
      return;
    }
    let nearest: ArtifactDungeon | undefined;
    let nearestDistance_m = Number.POSITIVE_INFINITY;
    for (const d of artifact.dungeons) {
      const distance_m = edgeDistance_m(lastPlayer.lat, lastPlayer.lng, d);
      if (distance_m < nearestDistance_m) {
        nearestDistance_m = distance_m;
        nearest = d;
      }
    }
    if (nearest === undefined) {
      navPanel.root.hidden = true;
      return;
    }
    navPanel.root.hidden = false;
    // C-03: `unit.m`/`unit.km`, never a literal `'m'`. C-09: `approximate` reflects the real GPS
    // accuracy of the latest sample against `homeState.maxAccuracy_m` (`gps.lowAccuracy`'s own
    // threshold), never always `false`.
    const approximate =
      lastAccuracy_m !== undefined &&
      lastAccuracy_m > balanceLocationConfig.homeState.maxAccuracy_m;
    navPanel.setDistance(
      formatDistanceText(nearestDistance_m, balanceUnlocksHomeConfig.distanceDisplaySteps_m),
      approximate,
    );
    navPanel.setDirection(compassPointTo(lastPlayer, pointOf(nearest)));
    const opening = selectOpening(nearest.id, now_ms, params);
    const closed = !opening.open;
    navPanel.setClosed(
      closed,
      // C-04: formatted local time, never a raw epoch-ms string.
      closed && opening.changesAt_ms !== null
        ? formatOpenTime(opening.changesAt_ms, now_ms, balanceOpeningHoursConfig.utcOffsetMin)
        : undefined,
    );
    navPanel.setDestination({
      lat: pointOf(nearest).lat,
      lng: pointOf(nearest).lng,
      searchNameKey: nearest.search_name_key,
      nameKey: nearest.name_key,
    });
  }

  // F06 Flow C4/C6: `run_auto_retreat`/`run_death` each get one short, real animation on the run
  // screen (a nudge on the run-bar / a hard-cut + grayscale on the HP fill, `art/vfx/hp-critical`)
  // before the screen swaps to the summary — this flag freezes `render()`'s summary reveal for
  // exactly as long as that animation's own `PlayHandle` promise takes to settle (never a
  // hardcoded delay), so the player who is actually looking at the screen at that instant sees the
  // effect play out on the still-visible run screen instead of an instant cut to the summary.
  let exitAnimationInFlight = false;
  // The last `run_hit`'s own HP numbers (server-authoritative, never recomputed): `run_auto_retreat`/
  // `run_death` carry no HP field of their own, so this is what forces the HP bar to its true final
  // reading before the animation starts (the hard-cut/last-value-stays-put rule in `hp-bar.md` still
  // needs *a* value to hold at — the stale pre-hit one would be dishonest for the instant the
  // animation is playing over).
  let lastHitHp: { readonly hp: number; readonly maxHp: number } | undefined;

  /** `dungeon_closing_soon` (F04-R29, P2-X10): the run bar's closing-soon warning is driven only by
   * this event, never by a client-side re-derivation of `closesIn_s` (`selectRunView` exists for
   * display, but the *decision* that a notice is due is the engine's, tech note F04 8.3). Every
   * `run_state_changed`/`dungeon_entered` also resets the banner so a later run never starts with a
   * previous run's warning still "seen" (`run-bar.ts`'s own `wasHidden` bookkeeping). */
  function handleSessionEvents(events: readonly SessionEvent[]): void {
    // H34 fix (flow F05 A2b): a `run_tick_granted` that lands in the very same dispatch batch as a
    // `dungeon_exited` (e.g. the tick that also crosses the closing-time/auto-retreat boundary)
    // never gets its own toast/audio/vibrate/effect below — the run is already over by the time
    // anyone could see it, and the run-summary screen takes over on this very same render pass.
    const exitsInSameBatch = events.some((event) => event.type === 'dungeon_exited');
    for (const event of events) {
      if (event.type === 'dungeon_entered') {
        runBar.hideClosingSoonWarning();
        lastHitHp = undefined;
        // F06 flow A9/E1, N-3: the single tutorial line of the whole game, every run while
        // `!firstRewardDone` (R36/R38 — not merely "the first run ever", tech note F06 8.2).
        const showingTutorial = !selectPlayerView(engine.getState(), event.at_ms, params)
          .firstRewardDone;
        if (showingTutorial) {
          runTutorialLine.show();
        }
        // Wake Lock + pocket screen (design gate A 4.4, components.md 12.2): requested on every
        // `dungeon_entered`, regardless of the pocket-screen preference (12.4 — "ปิดแล้วยัง request
        // Wake Lock เหมือนเดิม", turning the toggle off only changes whether the dark overlay shows,
        // never whether the lock is held). Flow F06 E1's own "ขอสำเร็จ" is defined as passing
        // `'wakeLock' in navigator` feature detection alone, not waiting on the async request's
        // resolution — the overlay switches in immediately (after the tutorial line, if shown),
        // never blocked on a promise.
        wakeLockController.start();
        const wakeLockSupported = isWakeLockSupported(deps.nav);
        if (!wakeLockSupported) {
          // Path B (12.3): normal run screen, once-per-device toast.
          pocketScreen.showFallbackNoticeOnce();
        }
        if (wakeLockSupported && pocketScreenPrefEnabled(deps.storage)) {
          if (showingTutorial) {
            window.setTimeout(
              () => pocketScreen.showOverlay(),
              clientConfig.onboarding.tutorialLineHoldDurationMs,
            );
          } else {
            pocketScreen.showOverlay();
          }
        }
      } else if (event.type === 'checkin_rejected') {
        // D-120 table 1.3 (P2-H20): `confirm` (never `selectCheckInPreview`) is the only source of
        // `no_class`/`no_hp` — `no_class`'s main path is opening the class sheet immediately (it
        // should already be open per R29, this is the fail-safe); `no_hp` overrides the status row
        // until HP recovers (checked fresh every render, `renderConfirmIfNeeded`).
        if (event.reason === 'no_class' || event.reason === 'no_hp') {
          confirmRejectOverride = { dungeonId: event.dungeonId, reason: event.reason };
          if (event.reason === 'no_class') classSelect.show();
        }
      } else if (event.type === 'dungeon_closing_soon') {
        const minutes = Math.max(1, Math.ceil(event.closesIn_s / SECONDS_PER_MINUTE));
        runBar.showClosingSoonWarning(
          formatCopyText('unit.minutes', { value: minutes }),
          deps.vibrate,
          clientConfig.vibration.closingSoonWarning_ms,
        );
      } else if (event.type === 'dungeon_exited') {
        runBar.hideClosingSoonWarning();
        // The engine already mapped this event's telemetry (including
        // `page_hidden_total_s_bucket`/`wake_lock_engaged_share_bucket`, read from
        // `deps.getRunClientStats`/`wakeLockController.snapshot()` — session/engine.ts's own
        // wiring) synchronously *before* `dispatch()` returned these events, so calling `stop()`
        // here (a moment later, same run) only needs to do its other job: release the sentinel and
        // stop listening for the next run.
        wakeLockController.stop();
        pocketScreen.hideOverlay();
        pocketScreen.hideEnterButton();
      } else if (event.type === 'run_state_changed') {
        // C-12 (copy gate P2-X37): a short toast confirming the run came back from Grace/Suspended
        // to Active — never a client re-derivation of "did presence return", just this event.
        if (event.cause === 'returned' && event.to === 'active') {
          tickToast.showStateResumed(event.at_ms);
        }
      } else if (event.type === 'run_tick_granted') {
        // F05 flow Flow A1/A2/A4: the toast is the one place icon/effect/sound/vibration for a
        // granted tick come together — `event` already carries everything `sessionStep` decided
        // (loot, firstEver, levelBefore/After), never recomputed here. H34: skipped entirely when
        // `exitsInSameBatch` (see this function's own doc comment above).
        if (!exitsInSameBatch) {
          tickToast.showGranted({
            loot: event.loot,
            firstEver: event.firstEver,
            levelBefore: event.levelBefore,
            levelAfter: event.levelAfter,
            at_ms: event.at_ms,
          });
        }
      } else if (event.type === 'run_tick_denied') {
        tickToast.showDenied({ at_ms: event.at_ms });
      } else if (event.type === 'run_hit') {
        lastHitHp = { hp: event.hpAfter, maxHp: event.maxHp };
      } else if (event.type === 'run_hp_low') {
        // F06-R14/R16: HP-low and auto-retreat never fire together on the player's screen (the
        // engine itself only ever emits one of `run_hp_low`/`run_auto_retreat` for a given hit —
        // R14's own "not on the hit that also ends the run" rule), so there is no ordering issue
        // to resolve here between the two.
        tickToast.showHpLow(event.at_ms);
      } else if (event.type === 'run_potion_auto_used') {
        tickToast.showAutoPotionUsed(event.itemId, event.at_ms);
      } else if (event.type === 'run_auto_retreat') {
        if (lastHitHp !== undefined) {
          hpBar.update(
            {
              hp: lastHitHp.hp,
              maxHp: lastHitHp.maxHp,
              hpRatio: lastHitHp.hp / lastHitHp.maxHp,
              belowWarningLine: true,
              autoRetreatEnabled: true,
            },
            { instant: true },
          );
        }
        exitAnimationInFlight = true;
        audioPlayer.submit('run.autoRetreat', event.at_ms);
        void play('run.autoRetreat', runBar.root).then(() => {
          exitAnimationInFlight = false;
          render(engine.getState(), event.at_ms);
        });
      } else if (event.type === 'run_death') {
        if (lastHitHp !== undefined) {
          hpBar.update(
            {
              hp: 0,
              maxHp: lastHitHp.maxHp,
              hpRatio: 0,
              belowWarningLine: true,
              autoRetreatEnabled: false,
            },
            { instant: true },
          );
        }
        exitAnimationInFlight = true;
        audioPlayer.submit('run.death', event.at_ms);
        // `run.death`'s own effect (hp-critical.ts) hard-cuts `.hp-fill` to 0 and grayscales it —
        // the same element `hpBar.fillElement` exposes, never a second/duplicate DOM node.
        void play('run.death', hpBar.fillElement).then(() => {
          exitAnimationInFlight = false;
          render(engine.getState(), event.at_ms);
        });
      } else if (event.type === 'auto_retreat_setting_changed') {
        settingsWalkingSafety.setAutoRetreatEnabled(event.enabled);
      } else if (event.type === 'potion_used') {
        // P2-H18: `inventory.potionUsed` (normal HP potion) / `inventory.reviveUsed` (revive) —
        // both already have a real audio/vibration cue (`audio/manifest.json`); no vfx effect and
        // no toast of its own (the inventory screen's own re-render is the visible feedback,
        // `renderInventoryScreen` at each of its two call sites).
        audioPlayer.submit(
          event.revived ? 'inventory.reviveUsed' : 'inventory.potionUsed',
          event.at_ms,
        );
      }
    }
  }

  function render(state: SessionState, now_ms: number): void {
    if (currentRoute !== 'main') {
      // ia.md section 5 item 5: the gear icon (and this task's inventory shortcut) are reachable
      // from every state, unconditionally — the route screen fully owns the display while open.
      speedLockOverlay.hide();
      runSummary.hide();
      runBar.hide();
      hpBar.root.hidden = true;
      confirmPopup.hide();
      navPanel.root.hidden = true;
      homePanel.hide();
      introScreen.hide();
      ageGateScreen.hide();
      consentLocationScreen.hide();
      classSelect.hide();
      runTutorialLine.hide();
      // P2-F06-T14: the pocket screen's own dark overlay must never linger behind (or block
      // pointer events for) a route screen (`#/settings`/`#/inventory`) that fully takes over the
      // display the same way this whole guard already does for every other run-screen element.
      pocketScreen.hideOverlay();
      pocketScreen.hideEnterButton();
      return;
    }
    if (state.lastSummary !== null && exitAnimationInFlight) {
      // Freeze the run screen exactly as it last rendered (HP bar mid hard-cut/grayscale, or the
      // run-bar mid nudge) until the animation's own promise resolves and re-renders — see
      // `exitAnimationInFlight`'s own doc comment above.
      return;
    }
    speedLockOverlay.hide();
    runSummary.hide();
    if (state.lock.locked) {
      introScreen.hide();
      ageGateScreen.hide();
      consentLocationScreen.hide();
      classSelect.hide();
      runTutorialLine.hide();
      speedLockOverlay.show(state.run !== null);
      return;
    }
    if (state.lastSummary !== null) {
      // `S-04-run-summary` is the one screen that replaces everything at the end of a run (F04
      // flow priority, this file's header comment) — every other screen this app owns must be
      // explicitly hidden here too, the same way the `currentRoute !== 'main'` branch above does
      // for its own takeover, rather than relying on a previous render pass having already hidden
      // them (found via qa's e2e: without this, `.run-bar`/`.hp-bar` stayed `hidden=false` from
      // the run that just ended, visible underneath the summary for one frame and still reachable
      // by a stray query for as long as the summary stayed up).
      runBar.hide();
      hpBar.root.hidden = true;
      confirmPopup.hide();
      navPanel.root.hidden = true;
      homePanel.hide();
      introScreen.hide();
      ageGateScreen.hide();
      consentLocationScreen.hide();
      classSelect.hide();
      runTutorialLine.hide();
      pocketScreen.hideOverlay();
      pocketScreen.hideEnterButton();
      runSummary.show(state.lastSummary);
      return;
    }
    // --- P2-F06-T10/P2-X38: onboarding gate (acceptance order: intro -> age gate -> consent ->
    // (permission, no screen of its own) -> map + opening text -> the class sheet layered on top of
    // it, F06-R44) — takes over before the confirm popup/nav/home panel, but never before a route
    // screen, the speed-lock overlay, or the run summary (checked above already). Steps other than
    // `intro`/`age`/`underage`/`consent`/`class` (`permission`, `map`, `first_run`, `first_reward`,
    // `done`) need no distinct screen of their own here: `permission` resolves itself in the
    // background (`onboarding-flow.ts`, A-P2-X38-2), and `first_run`/`first_reward` are satisfied
    // entirely by the normal run screen (N-3's tutorial line, `run.tickGrantedFirst`/
    // `run.continueCta`, GD B-07 — no separate onboarding code path for either).
    const onboardingStep = onboarding.currentStep(selectPlayerView(state, now_ms, params));
    if (onboardingStep === 'intro') {
      onboarding.markIntroShown();
      classSelect.hide();
      ageGateScreen.hide();
      consentLocationScreen.hide();
      introScreen.show();
      confirmPopup.hide();
      navPanel.root.hidden = true;
      homePanel.hide();
      return;
    }
    introScreen.hide();
    if (onboardingStep === 'age' || onboardingStep === 'underage') {
      onboarding.markAgeGateShown();
      classSelect.hide();
      consentLocationScreen.hide();
      if (onboardingStep === 'underage') {
        ageGateScreen.showUnderage();
      } else {
        ageGateScreen.showGate();
      }
      confirmPopup.hide();
      navPanel.root.hidden = true;
      homePanel.hide();
      return;
    }
    ageGateScreen.hide();
    // R48 "ปุ่มเดียวกลับไปให้ใหม่": `manualConsentScreenOpen` reopens this exact same screen for a
    // returning player who declined/withdrew earlier — outside the pure step machine entirely (it
    // has already reported `'done'` for that player), so it is checked here as its own condition,
    // never folded into `onboardingStep`.
    if (onboardingStep === 'consent' || manualConsentScreenOpen) {
      onboarding.markConsentShown();
      classSelect.hide();
      consentLocationScreen.show();
      confirmPopup.hide();
      navPanel.root.hidden = true;
      homePanel.hide();
      return;
    }
    consentLocationScreen.hide();
    if (onboardingStep === 'class') {
      onboarding.markClassSelectShown();
      classSelect.show();
      confirmPopup.hide();
      navPanel.root.hidden = true;
      homePanel.hide();
      return;
    }
    classSelect.hide();

    const inRun = renderRun(state, now_ms);
    if (inRun) {
      confirmPopup.hide();
      navPanel.root.hidden = true;
      homePanel.hide();
      recordEmptyScreenTransition(undefined, now_ms);
      return;
    }
    const showingConfirm = renderConfirmIfNeeded(state, now_ms);
    if (showingConfirm) {
      navPanel.root.hidden = true;
      homePanel.hide();
      recordEmptyScreenTransition(undefined, now_ms);
      return;
    }
    const homeState = homeTracker?.evaluate({
      now_ms,
      // Interim default (P2-F06-T09, no age-gate/consent screen built yet — that is P2-F06-T10's
      // own onboarding flow): a *missing* `kw.p2.consent` key (nobody has ever answered) reads as
      // granted, so every existing trace/e2e keeps behaving exactly as before this task. An
      // explicit `declined`/`withdrawn` (only possible once T10's consent screen — or a direct
      // storage seed, tech note F06 13.4's own e2e hook — writes the key) is the only way to see
      // `unknown` from this input.
      locationConsentGranted: locationConsentGranted(deps.storage),
      permissionDenied: false,
      position:
        lastPlayer === undefined ? null : { ...lastPlayer, accuracy_m: lastAccuracy_m ?? 0 },
      playerLevel: selectPlayerView(state, now_ms, params).level,
      onboarding: !selectPlayerView(state, now_ms, params).firstRewardDone,
    });
    const emptyScreenReason =
      homeState?.kind === 'far' ||
      homeState?.kind === 'out_of_area' ||
      homeState?.kind === 'outside_launch_district'
        ? homeState.kind
        : undefined;
    recordEmptyScreenTransition(emptyScreenReason, now_ms);
    if (homeState === undefined || homeState.kind === 'near') {
      homePanel.hide();
      renderNearbyNav(state, now_ms);
    } else {
      navPanel.root.hidden = true;
      homePanel.render(homeState, now_ms);
    }
  }

  // Applies whatever route the page loaded with (e.g. a returning player's own bookmark/reload of
  // `#/settings`), and renders once so the very first frame is already correct.
  syncRouteScreens();

  return {
    telemetry,
    engine,
    onSample(lat, lng, accuracy_m, t_ms) {
      // P2-X38 (docs/tech/F06-hp-damage-onboarding.md 8.4 step 1, FH-17): a `LocationProvider`
      // sample callback already queued when the player withdrew consent must be dropped here,
      // before it touches `lastPlayer`/the engine/the HUD — never stored, never dispatched.
      if (locationWithdrawn) return;
      lastPlayer = { lat, lng };
      lastAccuracy_m = accuracy_m;
      const wasLocked = engine.getState().lock.locked;
      const events = engine.dispatch(
        { type: 'sample', sample: { t_ms, lat, lng, accuracy_m } },
        t_ms,
      );
      handleSessionEvents(events);
      const stateAfter = engine.getState();
      // `SessionEvent` has no speed-lock variant of its own (tech note F04 section 2.5 lists the
      // lock/unlock transitions as engine-internal, not a client-facing event) — detected here by
      // comparing `lock.locked` before/after the step, the same signal the speed-lock overlay uses.
      if (stateAfter.lock.locked !== wasLocked) {
        const mapped = speedLockTriggeredEvent(
          stateAfter.lock.locked ? 'enter' : 'exit',
          stateAfter.run !== null,
          stateAfter.run?.dungeonId ?? null,
        );
        telemetry.record(
          mapped.name,
          mapped.properties as Record<string, string | number | boolean | null>,
        );
        persistTelemetry();
        // O-2 fix (F04-R23): vibrate exactly once on entering the lock — `speed-lock-overlay.ts`'s
        // own `show()` already vibrates the instant it transitions from hidden to shown (the exact
        // same `stateAfter.lock.locked` edge this block just detected, since `render()` calls
        // `speedLockOverlay.show(...)` a few lines below whenever `state.lock.locked` is true), so
        // a second `deps.vibrate(...)` here double-fired the pattern every time the lock engaged.
        // The overlay is the one and only call site now — it also covers the one case this block
        // cannot (a page reload that resumes with the lock already engaged, no sample transition to
        // detect at all).
      }
      // `refreshMapDungeons` is deliberately not called here: it rebuilds two whole GeoJSON
      // `FeatureCollection`s (13+ dungeons, one label-point cache lookup each), which is far more
      // work than a per-sample callback can afford — a mock trace at high replay speed delivers
      // samples fast enough (tens of Hz) that doing this on every one starved MapLibre's own tile
      // decoding of main-thread time and its `load` event never fired (found via the qa e2e
      // regression this task's own verification pass caught, `f02-map-fixture-tile.spec.ts`).
      // `onTick` (once per `engine.tickInterval_ms`, ~1 Hz) is by far frequent enough: a dungeon's
      // open/closed status only ever changes at its own opening/closing minute.
      render(stateAfter, t_ms);
    },
    onTick(now_ms) {
      handleSessionEvents(engine.dispatch({ type: 'tick' }, now_ms));
      refreshMapDungeons(now_ms);
      render(engine.getState(), now_ms);
    },
  };
}
