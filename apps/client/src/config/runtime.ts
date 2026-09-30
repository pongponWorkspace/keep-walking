/**
 * Loads and validates `config/app/client.json` and `config/app/privacy.json` once
 * (docs/tech/F02-map-location-spike.md sections 3, 4, 8, 10.5, 11; gps-trace-format.md 4).
 * `mapView`/`hudMeasurement` (P1-F02-T11) add the map's overzoom ceiling and the spike HUD's
 * measurement constants (FPS/battery/byte/accuracy/gap/latency windows) — still on-device
 * spike-measurement config, never balance or reward numbers. These are the client's own
 * runtime/provider-selection and on-device-privacy values, never balance or reward numbers
 * (ADR 0001 3.10.1: config/app/ must never affect a reward). Every value the code reads comes
 * from here, never a literal (CLAUDE.md "All numbers come from config").
 *
 * Namespacing (task context): this file only ever reads `config/app/privacy.json`
 * (`appPrivacyConfig`, on-device export rules). It never reads `config/balance/privacy.json`
 * (server-side PDPA values, a different file with an overlapping name) — see
 * `config/balance.ts` for the one balance file this workspace does read.
 *
 * Fails loudly: a missing or wrong-typed key throws at import time instead of silently using
 * `undefined`/`0`/`false` (config/app/client.json `_meta._note`: "null = not set yet: code must
 * fail loudly").
 */
import type { LocationProviderKind, MockSpeed } from '@keep-walking/location';
import clientConfigJson from '../../../../config/app/client.json';
import privacyConfigJson from '../../../../config/app/privacy.json';

export interface LocationWebConfig {
  readonly enableHighAccuracy: boolean;
  readonly timeout_ms: number;
  readonly maximumAge_ms: number;
}

export interface ProviderQueryConfig {
  readonly paramNames: {
    readonly provider: string;
    readonly trace: string;
    readonly speed: string;
    readonly loop: string;
    readonly hud: string;
    /** `loc=mock` only: game clock replay-start test hook (F04-dungeon-presence.md section 17). */
    readonly start: string;
    /** `loc=mock` only: RNG `runSeed` test hook (ADR 0003 section 6). */
    readonly seed: string;
    /** `loc=mock` only (tech gate P2-F05-T15 decision 6.2): dispatches a real `chooseClass` once
     * at boot, standing in for the not-yet-built class-picker screen. */
    readonly e2eClassId: string;
    /** `loc=mock` only (tech gate P2-F05-T15 decision 6.2): skips creating the F04 game loop
     * entirely, for a map-only e2e spec. */
    readonly e2eSkipF04App: string;
    /** `loc=mock` only (D-130, P2-F06-T10): makes `onboarding-flow.ts#OnboardingFlow.currentStep`
     * report `done` immediately, for the pre-existing e2e specs that boot straight into the map/
     * run screens and do not themselves test onboarding. */
    readonly e2eSkipOnboarding: string;
  };
  readonly allowedProviders: readonly LocationProviderKind[];
  readonly allowedMockSpeeds: readonly MockSpeed[];
}

export interface ProviderQueryDefaults {
  readonly provider: LocationProviderKind;
  /** Default Mock playback-speed multiplier. Renamed from `speed` (tech-lead/config-lint): the
   * URL query param itself is still named `speed` (`ProviderQueryConfig.paramNames.speed`). */
  readonly speedMult: MockSpeed;
  readonly loop: boolean;
  readonly hud: boolean;
}

export interface ProviderQueryDefaultsByMode {
  readonly development: ProviderQueryDefaults;
  readonly production: ProviderQueryDefaults;
}

export interface MapViewConfig {
  readonly maxZoom: number;
}

export interface HudMeasurementConfig {
  readonly accuracyWarmup_s: number;
  readonly sampleGap_s: number;
  readonly gateWindowStep_s: number;
  readonly fpsMaxFrameGap_ms: number;
  readonly fpsLowPercentile: number;
  readonly accuracyHighPercentile: number;
  readonly latencyHighPercentile: number;
  readonly batteryNormalizeWindow_s: number;
  readonly batteryMinSegment_s: number;
  readonly bytesPerMegabyte: number;
}

export interface EngineConfig {
  /** Client tick timer interval (ADR 0003 3.2 item 5); the reducer itself has no timer. */
  readonly tickInterval_ms: number;
}

export interface StorageRuntimeConfig {
  /** Throttle for `kw.p2.session` writes when the last step returned no event (F04 section 10.1). */
  readonly sessionPersistInterval_s: number;
}

export interface NavigationConfig {
  readonly coordinateDecimals: number;
  readonly externalOpenTimeout_ms: number;
}

/** HUD probe constants (P2-F04-T10, F-17): never a literal in `debug/vibrate.ts`/`hud-panel.ts`. */
export interface ProbeConfig {
  readonly vibrateTestPattern_ms: number;
}

/**
 * `bundle.*` (P2-F04-T10, ADR 0003 section 10): the JS-transfer budgets `apps/client/scripts/
 * measure-bundle.ts` checks `dist/`'s Vite manifest against. `initialJsBudget_bytes` covers the
 * entry chunk + everything it statically imports (S5 ≤ 1.0 MB); `mapLazyJsBudget_bytes` covers
 * maplibre-gl + its worker, loaded only via the `await import(...)` in `main.ts`'s
 * `loadMapModules` — a separate budget because it is never paid by a build with no map env
 * configured (`hasRuntimeMapEnv`).
 */
export interface BundleConfig {
  readonly initialJsBudget_bytes: number;
  readonly mapLazyJsBudget_bytes: number;
}

/** `client.json#vibration` (P2-F04-T21, F04 flow Flow D1 / section 6): the two gameplay vibrate
 * call sites outside the HUD probe (`ProbeConfig.vibrateTestPattern_ms`, a different button). */
export interface VibrationConfig {
  readonly speedLockEnter_ms: number;
  readonly closingSoonWarning_ms: number;
}

/** `client.json#toast` (P2-F05-T10, F05 flow Flow A): the tick-feedback toast's own screen-time
 * knobs — never a game decision (the movement gate/drop table already decided everything this
 * toast shows; this is only how long it stays up and how many loot icons it draws at once). */
export interface ToastConfig {
  readonly tickHoldDurationMs: number;
  readonly tickMaxIconsShown: number;
  /** `client.json#toast.hpLowHoldDurationMs` (P2-F06-T08, F06 flow Flow C2): `run.hpLow`'s own,
   * longer hold time — its canon sentence is much longer than a tick toast's. */
  readonly hpLowHoldDurationMs: number;
  /** `client.json#toast.screenLockNoticeHoldDurationMs` (F06 copy gate C6-03, P2-X41; flow F06
   * Flow E ข้อ E2): `run.screenLockNotice`'s own auto-fade hold, read by `ui/pocket-screen.ts`. */
  readonly screenLockNoticeHoldDurationMs: number;
}

/** `client.json#feedback` (F06-TG-11, P2-X47): `assets/audio.ts`'s cue-priority-queue config —
 * how long a non-safety cue may wait past its own event time before it is dropped instead of
 * played late, and the safety cues (cue-list.md 4.1/4.2) that never get dropped as stale. Moved
 * out of `audio.ts`'s own in-code literals so cue-list.md and this value cannot drift apart
 * silently. */
export interface FeedbackConfig {
  readonly cueStaleAfter_ms: number;
  readonly safetyCueIds: readonly string[];
}

/** `client.json#onboarding` (P2-F06-T10, GDD N-3): the one tutorial-line screen-time knob outside
 * `toast.*` (a different overlay, `ui/run-tutorial-line.ts`, never a game decision). */
export interface OnboardingConfig {
  readonly tutorialLineHoldDurationMs: number;
}

/** `client.json#pocketScreen` (P2-F06-T14, components.md 12.1 rule 2): the swipe-up-hold exit
 * gesture's two thresholds — `apps/client/src/ui/pocket-screen.ts#shouldTriggerPocketExit`'s only
 * config-driven numbers. */
export interface PocketScreenConfig {
  readonly swipeUpHoldMinDuration_ms: number;
  /** Fraction (0-1) of `window.innerHeight` the pointer must move upward — a viewport-relative
   * ratio, not a fixed px count, so the gesture threshold scales across real device screen sizes
   * (resolved to real px by `ui/pocket-screen.ts` at mount time). */
  readonly swipeUpMinDistanceRatio: number;
}

export interface ClientRuntimeConfig {
  readonly locationWeb: LocationWebConfig;
  readonly providerQuery: ProviderQueryConfig;
  readonly providerQueryDefaultsByMode: ProviderQueryDefaultsByMode;
  readonly mapView: MapViewConfig;
  readonly hudMeasurement: HudMeasurementConfig;
  readonly engine: EngineConfig;
  readonly storage: StorageRuntimeConfig;
  readonly navigation: NavigationConfig;
  readonly probe: ProbeConfig;
  readonly bundle: BundleConfig;
  readonly vibration: VibrationConfig;
  readonly toast: ToastConfig;
  readonly feedback: FeedbackConfig;
  readonly onboarding: OnboardingConfig;
  readonly pocketScreen: PocketScreenConfig;
}

export interface RawTraceExportConfig {
  readonly rawTraceTrim_m: number;
  readonly coordinateDecimals: number;
  readonly relativeTimeOnly: boolean;
  readonly requiresExplicitOptIn: boolean;
  readonly autoUploadAllowed: boolean;
}

export interface SummaryExportConfig {
  readonly isDefaultExport: boolean;
  readonly includesCoordinates: boolean;
}

/** `config/app/privacy.json#localData` (F06-TG-04, tech note F06 8.1/8.3): the one storage-key
 * prefix `storage/clear-local-data.ts#clearLocalData` and every `kw.p2.*` constant in this codebase
 * must agree with — parsed here (rather than left as an unread subtree) so a future change to the
 * prefix is a config edit, not a multi-file find-and-replace the config file itself cannot enforce. */
export interface LocalDataConfig {
  readonly storageKeyPrefix: string;
  readonly clearScope: string;
  readonly afterClear: string;
}

export interface AppPrivacyConfig {
  readonly rawTraceExport: RawTraceExportConfig;
  readonly summaryExport: SummaryExportConfig;
  readonly localData: LocalDataConfig;
}

type Json = Record<string, unknown>;

function fail(path: string, reason: string): never {
  throw new Error(`config/app: ${path} ${reason}`);
}

function obj(value: unknown, path: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return fail(path, 'must be an object');
  }
  return value as Json;
}

function num(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fail(path, 'must be a finite number');
  }
  return value;
}

function bool(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    return fail(path, 'must be a boolean');
  }
  return value;
}

function str(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    return fail(path, 'must be a non-empty string');
  }
  return value;
}

function arr(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length === 0) {
    return fail(path, 'must be a non-empty array');
  }
  return value;
}

const PROVIDER_KINDS: readonly LocationProviderKind[] = ['web', 'mock', 'capacitor'];
/** The only speeds the spike UI offers (packages/location `MockSpeed`), spelled out as named
 * constants because a bare array literal is not exempt from `no-magic-numbers`. */
const MOCK_SPEED_10X = 10;
const MOCK_SPEED_60X = 60;
const MOCK_SPEEDS: readonly MockSpeed[] = [1, MOCK_SPEED_10X, MOCK_SPEED_60X];

function providerKind(value: unknown, path: string): LocationProviderKind {
  const kind = str(value, path);
  if (!(PROVIDER_KINDS as readonly string[]).includes(kind)) {
    return fail(path, `must be one of: ${PROVIDER_KINDS.join(', ')}`);
  }
  return kind as LocationProviderKind;
}

function mockSpeed(value: unknown, path: string): MockSpeed {
  const speed = num(value, path);
  if (!(MOCK_SPEEDS as readonly number[]).includes(speed)) {
    return fail(path, `must be one of: ${MOCK_SPEEDS.join(', ')}`);
  }
  return speed as MockSpeed;
}

function parseLocationWeb(root: Json, path: string): LocationWebConfig {
  const node = obj(root['locationWeb'], path);
  return {
    enableHighAccuracy: bool(node['enableHighAccuracy'], `${path}/enableHighAccuracy`),
    timeout_ms: num(node['timeout_ms'], `${path}/timeout_ms`),
    maximumAge_ms: num(node['maximumAge_ms'], `${path}/maximumAge_ms`),
  };
}

function parseProviderQuery(root: Json, path: string): ProviderQueryConfig {
  const node = obj(root['providerQuery'], path);
  const names = obj(node['paramNames'], `${path}/paramNames`);
  const allowedProviders = arr(node['allowedProviders'], `${path}/allowedProviders`).map(
    (value, i) => providerKind(value, `${path}/allowedProviders/${i}`),
  );
  const allowedMockSpeeds = arr(node['allowedMockSpeeds'], `${path}/allowedMockSpeeds`).map(
    (value, i) => mockSpeed(value, `${path}/allowedMockSpeeds/${i}`),
  );
  return {
    paramNames: {
      provider: str(names['provider'], `${path}/paramNames/provider`),
      trace: str(names['trace'], `${path}/paramNames/trace`),
      speed: str(names['speed'], `${path}/paramNames/speed`),
      loop: str(names['loop'], `${path}/paramNames/loop`),
      hud: str(names['hud'], `${path}/paramNames/hud`),
      start: str(names['start'], `${path}/paramNames/start`),
      seed: str(names['seed'], `${path}/paramNames/seed`),
      e2eClassId: str(names['e2eClassId'], `${path}/paramNames/e2eClassId`),
      e2eSkipF04App: str(names['e2eSkipF04App'], `${path}/paramNames/e2eSkipF04App`),
      e2eSkipOnboarding: str(names['e2eSkipOnboarding'], `${path}/paramNames/e2eSkipOnboarding`),
    },
    allowedProviders,
    allowedMockSpeeds,
  };
}

function parseDefaults(node: Json, path: string): ProviderQueryDefaults {
  return {
    provider: providerKind(node['provider'], `${path}/provider`),
    speedMult: mockSpeed(node['speedMult'], `${path}/speedMult`),
    loop: bool(node['loop'], `${path}/loop`),
    hud: bool(node['hud'], `${path}/hud`),
  };
}

function parseProviderQueryDefaultsByMode(root: Json, path: string): ProviderQueryDefaultsByMode {
  const node = obj(root['providerQueryDefaultsByMode'], path);
  return {
    development: parseDefaults(
      obj(node['development'], `${path}/development`),
      `${path}/development`,
    ),
    production: parseDefaults(obj(node['production'], `${path}/production`), `${path}/production`),
  };
}

function parseMapView(root: Json, path: string): MapViewConfig {
  const node = obj(root['mapView'], path);
  return { maxZoom: num(node['maxZoom'], `${path}/maxZoom`) };
}

function parseHudMeasurement(root: Json, path: string): HudMeasurementConfig {
  const node = obj(root['hudMeasurement'], path);
  return {
    accuracyWarmup_s: num(node['accuracyWarmup_s'], `${path}/accuracyWarmup_s`),
    sampleGap_s: num(node['sampleGap_s'], `${path}/sampleGap_s`),
    gateWindowStep_s: num(node['gateWindowStep_s'], `${path}/gateWindowStep_s`),
    fpsMaxFrameGap_ms: num(node['fpsMaxFrameGap_ms'], `${path}/fpsMaxFrameGap_ms`),
    fpsLowPercentile: num(node['fpsLowPercentile'], `${path}/fpsLowPercentile`),
    accuracyHighPercentile: num(node['accuracyHighPercentile'], `${path}/accuracyHighPercentile`),
    latencyHighPercentile: num(node['latencyHighPercentile'], `${path}/latencyHighPercentile`),
    batteryNormalizeWindow_s: num(
      node['batteryNormalizeWindow_s'],
      `${path}/batteryNormalizeWindow_s`,
    ),
    batteryMinSegment_s: num(node['batteryMinSegment_s'], `${path}/batteryMinSegment_s`),
    bytesPerMegabyte: num(node['bytesPerMegabyte'], `${path}/bytesPerMegabyte`),
  };
}

function parseEngine(root: Json, path: string): EngineConfig {
  const node = obj(root['engine'], path);
  return {
    tickInterval_ms: num(node['tickInterval_ms'], `${path}/tickInterval_ms`),
  };
}

function parseStorage(root: Json, path: string): StorageRuntimeConfig {
  const node = obj(root['storage'], path);
  return {
    sessionPersistInterval_s: num(
      node['sessionPersistInterval_s'],
      `${path}/sessionPersistInterval_s`,
    ),
  };
}

function parseNavigation(root: Json, path: string): NavigationConfig {
  const node = obj(root['navigation'], path);
  return {
    coordinateDecimals: num(node['coordinateDecimals'], `${path}/coordinateDecimals`),
    externalOpenTimeout_ms: num(node['externalOpenTimeout_ms'], `${path}/externalOpenTimeout_ms`),
  };
}

function parseProbe(root: Json, path: string): ProbeConfig {
  const node = obj(root['probe'], path);
  return {
    vibrateTestPattern_ms: num(node['vibrateTestPattern_ms'], `${path}/vibrateTestPattern_ms`),
  };
}

function parseVibration(root: Json, path: string): VibrationConfig {
  const node = obj(root['vibration'], path);
  return {
    speedLockEnter_ms: num(node['speedLockEnter_ms'], `${path}/speedLockEnter_ms`),
    closingSoonWarning_ms: num(node['closingSoonWarning_ms'], `${path}/closingSoonWarning_ms`),
  };
}

function parseToast(root: Json, path: string): ToastConfig {
  const node = obj(root['toast'], path);
  return {
    tickHoldDurationMs: num(node['tickHoldDurationMs'], `${path}/tickHoldDurationMs`),
    tickMaxIconsShown: num(node['tickMaxIconsShown'], `${path}/tickMaxIconsShown`),
    hpLowHoldDurationMs: num(node['hpLowHoldDurationMs'], `${path}/hpLowHoldDurationMs`),
    screenLockNoticeHoldDurationMs: num(
      node['screenLockNoticeHoldDurationMs'],
      `${path}/screenLockNoticeHoldDurationMs`,
    ),
  };
}

function parseFeedback(root: Json, path: string): FeedbackConfig {
  const node = obj(root['feedback'], path);
  const safetyCueIds = arr(node['safetyCueIds'], `${path}/safetyCueIds`).map((value, i) =>
    str(value, `${path}/safetyCueIds/${i}`),
  );
  return {
    cueStaleAfter_ms: num(node['cueStaleAfter_ms'], `${path}/cueStaleAfter_ms`),
    safetyCueIds,
  };
}

function parseOnboarding(root: Json, path: string): OnboardingConfig {
  const node = obj(root['onboarding'], path);
  return {
    tutorialLineHoldDurationMs: num(
      node['tutorialLineHoldDurationMs'],
      `${path}/tutorialLineHoldDurationMs`,
    ),
  };
}

function parsePocketScreen(root: Json, path: string): PocketScreenConfig {
  const node = obj(root['pocketScreen'], path);
  return {
    swipeUpHoldMinDuration_ms: num(
      node['swipeUpHoldMinDuration_ms'],
      `${path}/swipeUpHoldMinDuration_ms`,
    ),
    swipeUpMinDistanceRatio: num(
      node['swipeUpMinDistance_ratio'],
      `${path}/swipeUpMinDistance_ratio`,
    ),
  };
}

function parseBundle(root: Json, path: string): BundleConfig {
  const node = obj(root['bundle'], path);
  return {
    initialJsBudget_bytes: num(node['initialJsBudget_bytes'], `${path}/initialJsBudget_bytes`),
    mapLazyJsBudget_bytes: num(node['mapLazyJsBudget_bytes'], `${path}/mapLazyJsBudget_bytes`),
  };
}

/** Pure so tests can pass a fixture without touching the real JSON import (env.ts convention). */
export function parseClientConfig(input: unknown): ClientRuntimeConfig {
  const root = obj(input, '/');
  return {
    locationWeb: parseLocationWeb(root, '/locationWeb'),
    providerQuery: parseProviderQuery(root, '/providerQuery'),
    providerQueryDefaultsByMode: parseProviderQueryDefaultsByMode(
      root,
      '/providerQueryDefaultsByMode',
    ),
    mapView: parseMapView(root, '/mapView'),
    hudMeasurement: parseHudMeasurement(root, '/hudMeasurement'),
    engine: parseEngine(root, '/engine'),
    storage: parseStorage(root, '/storage'),
    navigation: parseNavigation(root, '/navigation'),
    probe: parseProbe(root, '/probe'),
    bundle: parseBundle(root, '/bundle'),
    vibration: parseVibration(root, '/vibration'),
    toast: parseToast(root, '/toast'),
    feedback: parseFeedback(root, '/feedback'),
    onboarding: parseOnboarding(root, '/onboarding'),
    pocketScreen: parsePocketScreen(root, '/pocketScreen'),
  };
}

export function parsePrivacyConfig(input: unknown): AppPrivacyConfig {
  const root = obj(input, '/');
  const rawTraceExport = obj(root['rawTraceExport'], '/rawTraceExport');
  const summaryExport = obj(root['summaryExport'], '/summaryExport');
  return {
    rawTraceExport: {
      rawTraceTrim_m: num(rawTraceExport['rawTraceTrim_m'], '/rawTraceExport/rawTraceTrim_m'),
      coordinateDecimals: num(
        rawTraceExport['coordinateDecimals'],
        '/rawTraceExport/coordinateDecimals',
      ),
      relativeTimeOnly: bool(
        rawTraceExport['relativeTimeOnly'],
        '/rawTraceExport/relativeTimeOnly',
      ),
      requiresExplicitOptIn: bool(
        rawTraceExport['requiresExplicitOptIn'],
        '/rawTraceExport/requiresExplicitOptIn',
      ),
      autoUploadAllowed: bool(
        rawTraceExport['autoUploadAllowed'],
        '/rawTraceExport/autoUploadAllowed',
      ),
    },
    summaryExport: {
      isDefaultExport: bool(summaryExport['isDefaultExport'], '/summaryExport/isDefaultExport'),
      includesCoordinates: bool(
        summaryExport['includesCoordinates'],
        '/summaryExport/includesCoordinates',
      ),
    },
    localData: parseLocalData(root, '/localData'),
  };
}

function parseLocalData(root: Json, path: string): LocalDataConfig {
  const node = obj(root['localData'], path);
  return {
    storageKeyPrefix: str(node['storageKeyPrefix'], `${path}/storageKeyPrefix`),
    clearScope: str(node['clearScope'], `${path}/clearScope`),
    afterClear: str(node['afterClear'], `${path}/afterClear`),
  };
}

// Fails loudly at import time (module load), not on first use, per config/app/*.json _meta._note.
export const clientConfig: ClientRuntimeConfig = parseClientConfig(clientConfigJson);
export const appPrivacyConfig: AppPrivacyConfig = parsePrivacyConfig(privacyConfigJson);
