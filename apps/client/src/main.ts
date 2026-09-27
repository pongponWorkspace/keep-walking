import './app.css';
import {
  readBuildProfile,
  readMapEnv,
  withTestEnvOverrides,
  hasRuntimeMapEnv,
  shouldSkipF04App,
} from './env';
import type { createMap, CreateMapResult } from './map';
import { clientConfig, appPrivacyConfig } from './config/runtime';
import {
  balanceLocationConfig,
  balanceCheckInConfig,
  balanceMovementGateConfig,
} from './config/balance';
import { GpsStatusTracker } from './location/gps-status';
import { selectProvider } from './location/select';
import { createLocationProvider, wireProvider } from './location/session';
import type { LocationProvider } from '@keep-walking/location';
import { windowNetworkStatus } from './location/network-status';
import { mountGpsUi } from './ui/gps-ui';
import type { createLocationLayerController, LocationLayerController } from './map/location-layer';
import type { loadGameGeoSources } from './map/geo-sources';
import type { registerRiftCrackImage } from './map/runtime-images';
import { installSpikeHook, removeSpikeHook, sampleToSpikePosition } from './debug/spike-hook';
import type { HudPanel } from './debug/hud-panel';
import { getCopyText } from './copy/load';
import { createF04App } from './f04-app';
import { createGameClock } from './clock/game-clock';
import { resolveReplayStartMs } from './clock/query-params';
import { balanceOpeningHoursConfig } from './config/balance';
import { createAssetRuntime } from './assets/runtime';
import { injectFontFaces } from './assets/fonts';

/** The four functions `loadMapModules` hands back, typed purely from `import type` (never a value
 * import — `@typescript-eslint/consistent-type-imports` forbids `import()` type annotations, and a
 * value import here would defeat the whole point of this task: pulling `maplibre-gl` back into the
 * initial static chunk). */
interface MapModules {
  readonly createMap: typeof createMap;
  readonly createLocationLayerController: typeof createLocationLayerController;
  readonly loadGameGeoSources: typeof loadGameGeoSources;
  readonly registerRiftCrackImage: typeof registerRiftCrackImage;
}

/**
 * P2-F04-T10 (ADR 0003 section 10): `maplibre-gl` (and everything that touches it — `./map`,
 * `./map/location-layer`, `./map/geo-sources`, `./map/runtime-images`, and its own CSS) is loaded
 * only from here, `await import(...)`-ed once real map env is configured (`hasRuntimeMapEnv`,
 * checked *before* this runs so an unconfigured build never even fetches the chunk). Everything
 * this file needs from those modules crosses through this one function, so there is exactly one
 * place `main.ts` decides to pay for the maplibre bundle — never a second static import that would
 * silently pull it back into the initial chunk.
 */
async function loadMapModules(): Promise<MapModules> {
  const [mapModule, locationLayerModule, geoSourcesModule, runtimeImagesModule] = await Promise.all(
    [
      import('./map'),
      import('./map/location-layer'),
      import('./map/geo-sources'),
      import('./map/runtime-images'),
      import('maplibre-gl/dist/maplibre-gl.css'),
    ],
  );
  return {
    createMap: mapModule.createMap,
    createLocationLayerController: locationLayerModule.createLocationLayerController,
    loadGameGeoSources: geoSourcesModule.loadGameGeoSources,
    registerRiftCrackImage: runtimeImagesModule.registerRiftCrackImage,
  };
}

/** `VITE_KW_PROFILE`/`VITE_KW_COMMIT` (TL B-10, P2-F04-T25): read once at module load, from build
 * time only. `commit` replaces the old `APP_VERSION_PLACEHOLDER = 'dev'` (P1-F02-T10's own
 * handoff to tech-lead/devops-engineer for a `VITE_APP_VERSION` define) — the CSV's `app_version`
 * column and the on-page build badge now report the real short SHA once the deploy workflow
 * (P2-F05-T14) sets it, and honestly fall back to "dev" (not a literal that looks like a real
 * build id) when it does not. */
/** tech note F04 section 12.2: `session_id` is `crypto.randomUUID()` truncated to 8 hex chars. */
const TELEMETRY_SESSION_ID_HEX_LENGTH = 8;
const buildProfile = readBuildProfile(import.meta.env);
const appVersion = buildProfile.commit ?? 'dev';

const container = document.getElementById('map');
if (container === null) {
  throw new Error('client shell: #map element missing from index.html');
}
const hud = document.getElementById('hud');
if (hud === null) {
  throw new Error('client shell: #hud element missing from index.html');
}
const buildBadge = document.getElementById('build-badge');
if (buildBadge !== null) {
  // playtest builds always show it (tech note F04 section 17: "แสดง version + short SHA"); a dev
  // build only shows it once a real commit is set, so a bare `pnpm dev` stays uncluttered.
  if (buildProfile.profile === 'playtest' || buildProfile.commit !== undefined) {
    buildBadge.textContent = `${buildProfile.profile} ${appVersion}`;
  }
}

const env = withTestEnvOverrides(readMapEnv(import.meta.env), window.location.search);

// --- P1-F02-T10: LocationProvider wired to the map (Web/Mock/Capacitor via ?loc=). ---
// Takes `hudElement`/`mapResult` as parameters (rather than closing over module scope) so their
// types stay narrowed to what the caller already checked: TS does not carry a `const`'s narrowing
// from an outer `if`/`await` across a function boundary.
async function initLocation(
  hudElement: HTMLElement,
  mapResult: CreateMapResult | undefined,
  mapModules: Awaited<ReturnType<typeof loadMapModules>> | undefined,
): Promise<void> {
  const selection = selectProvider(window.location.search, clientConfig, import.meta.env.MODE);
  const spikeHook = selection.hud ? installSpikeHook(selection.provider) : undefined;
  if (!selection.hud) {
    removeSpikeHook();
  }
  if (spikeHook !== undefined && mapResult !== undefined) {
    spikeHook.map = mapResult.map;
  }

  // Dynamically imported only behind hud=1 so the production JS bundle (the default, hud off)
  // never pays for it (P1-F02-T11 acceptance: "ถ้าเกิน [S5] ลอง code-splitting / lazy HUD").
  let hudPanel: HudPanel | undefined;
  if (selection.hud) {
    const { mountHudPanel } = await import('./debug/hud-panel');
    hudPanel = mountHudPanel(hudElement, {
      map: mapResult?.map,
      hudMeasurement: clientConfig.hudMeasurement,
      movementGate: balanceMovementGateConfig,
      checkIn: balanceCheckInConfig,
      sessionId: crypto.randomUUID(),
      appVersion,
      tilesetId: mapResult?.tilesetId,
      rawTraceTrim_m: appPrivacyConfig.rawTraceExport.rawTraceTrim_m,
      coordinateDecimals: appPrivacyConfig.rawTraceExport.coordinateDecimals,
      vibrateTestPattern_ms: clientConfig.probe.vibrateTestPattern_ms,
      onUpdate: (row) => {
        if (spikeHook !== undefined) {
          spikeHook.hud = row;
        }
      },
    });
    mapResult?.map.on('load', () => hudPanel?.recordMapLoaded());
  }

  const gpsUi = mountGpsUi(hudElement);
  const tracker = new GpsStatusTracker({
    maxAccuracy_m: balanceLocationConfig.homeState.maxAccuracy_m,
    sustainedPoorAccuracy_s: balanceLocationConfig.homeState.sustainedPoorAccuracy_s,
  });
  tracker.onDisplayChange((display) => {
    gpsUi.setDisplay(display);
    if (spikeHook !== undefined) {
      spikeHook.gpsDisplay = display;
    }
  });
  tracker.onToast((toast) => gpsUi.showToast(toast));

  const network = windowNetworkStatus();
  gpsUi.setOffline(!network.isOnline());
  network.subscribe((online) => gpsUi.setOffline(!online));

  let layerController: LocationLayerController | undefined;
  if (mapResult !== undefined && mapModules !== undefined) {
    // `kw-self` (and every other `kw-*` source) is already declared, empty, by
    // kw-light.style.json (map-style.md section 6) — no `addSource`/`addLayer` call needed here —
    // but MapLibre still only makes sources queryable once the style has finished loading.
    mapResult.map.on('load', () => {
      layerController = mapModules.createLocationLayerController(mapResult.map, true);
      void mapModules.loadGameGeoSources(mapResult.map);
      void mapModules.registerRiftCrackImage(mapResult.map);
    });
    gpsUi.onFollowToggle((enabled) => layerController?.setFollowMode(enabled));
  }

  let provider: LocationProvider;
  try {
    provider = await createLocationProvider(selection, clientConfig, appPrivacyConfig);
  } catch (error: unknown) {
    // Dev-facing only (e.g. an unknown ?trace= id): never a raw-coordinate log (tech note section 4).
    console.error('client: failed to create the location provider', error);
    return;
  }
  if (spikeHook !== undefined) {
    spikeHook.provider = provider.kind;
  }

  // F04 (P2-F04-T21): the session engine + every F04 screen, wired to this same provider's
  // samples and to a game-clock-driven tick (ADR 0003 3.2 item 3 — Mock replays x10/x60 without
  // changing tick/hit timing relative to trace time, tech note F04 section 17).
  // Built lazily on a fresh macrotask (`setTimeout(0)`), not inline here: `createF04App` does
  // real synchronous work (parses the whole balance subset, builds the drop/exp params, mounts 5
  // DOM screens) that must never share a call stack with the map's own `load` dispatch — sharing
  // one delayed a slow device's `load` event past its test timeout (observed on the
  // `android-chrome` Playwright device profile). `onSample` below no-ops until this is ready.
  let f04App: ReturnType<typeof createF04App> | undefined;
  // Asset manifest (docs/tech/asset-delivery.md 6.1): fetched once per session, before the first
  // icon/font it gates — `load()` is fire-and-forget (never blocks boot; a slow/failed fetch just
  // leaves every icon/font on its §6.4 fallback for this session).
  const assetRuntime = createAssetRuntime(
    (input, init) => fetch(input, init),
    window.devicePixelRatio,
    buildProfile.profile,
  );
  void assetRuntime.load().then(() => {
    const manifest = assetRuntime.getManifest();
    if (manifest !== undefined) {
      injectFontFaces(document, manifest);
    }
  });
  // `e2eSkipF04App=1` (P2-H03/P2-F05-T10): a map-only spec that injects its own dungeon source
  // data must never race against this task's own periodic `refreshMapDungeons` (below) silently
  // overwriting it — skip building `f04App` and its tick interval entirely rather than adding a
  // per-spec workaround. Everything else in this function (the provider itself, the HUD, the map
  // layers) still wires up normally; `f04App` simply stays `undefined`, and every call site below
  // already reads it through `f04App?.` for exactly this reason.
  if (!shouldSkipF04App(window.location.search)) {
    setTimeout(() => {
      const gameClock = createGameClock(
        provider,
        resolveReplayStartMs(
          window.location.search,
          clientConfig.providerQuery.paramNames.start,
          balanceOpeningHoursConfig.utcOffsetMin,
        ),
      );
      f04App = createF04App({
        map: mapResult?.map,
        hudContainer: hudElement,
        storage: window.localStorage,
        sessionId: crypto.randomUUID().slice(0, TELEMETRY_SESSION_ID_HEX_LENGTH),
        appVersion,
        platform: 'web',
        vibrate: (pattern_ms) => {
          if (typeof pattern_ms === 'number') {
            navigator.vibrate?.(pattern_ms);
          } else {
            navigator.vibrate?.([...pattern_ms]);
          }
        },
        isOnline: () => navigator.onLine,
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
        assets: assetRuntime,
        copyToClipboard: async (text) => {
          try {
            await navigator.clipboard.writeText(text);
            return true;
          } catch {
            return false;
          }
        },
        // `assets/audio-player.ts`'s only real-playback call site (docs/tech/asset-delivery.md
        // section 8, F05 flow Flow A): a fresh `Audio` element per cue, fire-and-forget — a
        // rejected `play()` (autoplay policy, missing file) never blocks or throws (visual
        // feedback is the guaranteed baseline regardless, audio/cue-list.md 4.4).
        playAudioUrl: (url) => {
          const audio = new Audio(url);
          void audio.play().catch(() => undefined);
        },
        // Same clock `onTick` below already uses (`gameClock.now()`) — a tap dispatched through
        // `Date.now()` instead would drift from the replayed `now_ms` under a Mock trace at
        // `speed=60` (P2-F05-T10); `createWebGameClock` is `Date.now` itself, so production (`loc=
        // web`) behavior is byte-for-byte the same as before this change.
        now: () => gameClock.now(),
      });
      window.setInterval(
        () => f04App?.onTick(gameClock.now()),
        clientConfig.engine.tickInterval_ms,
      );
    }, 0);
  }

  wireProvider(provider, {
    onStateChange: (state) => {
      tracker.handleProviderState(state);
      if (spikeHook !== undefined) {
        spikeHook.state = state;
      }
    },
    onError: (error) => tracker.handleError(error),
    onSample: (sample) => {
      tracker.handleSample(sample);
      layerController?.update(sample);
      hudPanel?.recordSample(sample);
      f04App?.onSample(sample.lat, sample.lng, sample.accuracy, sample.timestamp);
      if (spikeHook !== undefined) {
        spikeHook.position = sampleToSpikePosition(sample);
      }
    },
  });

  if (selection.provider === 'web') {
    gpsUi.showStartButton(() => {
      hudPanel?.recordProviderStart();
      void provider.start();
    });
  } else {
    hudPanel?.recordProviderStart();
    void provider.start();
  }
}

async function main(mapContainer: HTMLElement, hudElement: HTMLElement): Promise<void> {
  let mapResult: CreateMapResult | undefined;
  let mapModules: Awaited<ReturnType<typeof loadMapModules>> | undefined;
  // `hasRuntimeMapEnv` is checked *before* `loadMapModules()` (P2-F04-T10, ADR 0003 section 10):
  // when any of the three `VITE_*` values is unset, the maplibre-gl chunk is never even fetched,
  // matching the honest "not configured" fallback below without paying its network cost.
  if (hasRuntimeMapEnv(env)) {
    mapModules = await loadMapModules();
    mapResult = await mapModules.createMap(mapContainer, env, clientConfig);
  }
  if (mapResult === undefined) {
    // `client.mapSpike.tilesUrlMissing` (P1-X42): read through `getCopyText`, never the key itself
    // embedded as literal Thai-shaped text (CLAUDE.md "All Thai text comes from copy.th.json
    // keys"). `getCopyText` still falls back to the key string (TL-N06) if narrative ever removes
    // it, so this path degrades the same honest way it always has. This only shows up when one of
    // the three VITE_* values is unset, never in a real deployed build (Cloudflare Pages always
    // sets all three, D-008). #hud is a sibling of #map, so it survives this fallback (index.html
    // P1-F02-T10 comment).
    mapContainer.classList.add('map-shell--empty');
    mapContainer.textContent = getCopyText('client.mapSpike.tilesUrlMissing');
  }
  await initLocation(hudElement, mapResult, mapModules);
}

void main(container, hud);
