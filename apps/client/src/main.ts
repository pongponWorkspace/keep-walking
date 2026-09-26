import 'maplibre-gl/dist/maplibre-gl.css';
import './app.css';
import { readBuildProfile, readMapEnv, withTestEnvOverrides } from './env';
import { createMap } from './map';
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
import { createLocationLayerController } from './map/location-layer';
import type { LocationLayerController } from './map/location-layer';
import { loadGameGeoSources } from './map/geo-sources';
import { registerRiftCrackImage } from './map/runtime-images';
import { installSpikeHook, removeSpikeHook, sampleToSpikePosition } from './debug/spike-hook';
import type { HudPanel } from './debug/hud-panel';

/** `VITE_KW_PROFILE`/`VITE_KW_COMMIT` (TL B-10, P2-F04-T25): read once at module load, from build
 * time only. `commit` replaces the old `APP_VERSION_PLACEHOLDER = 'dev'` (P1-F02-T10's own
 * handoff to tech-lead/devops-engineer for a `VITE_APP_VERSION` define) — the CSV's `app_version`
 * column and the on-page build badge now report the real short SHA once the deploy workflow
 * (P2-F05-T14) sets it, and honestly fall back to "dev" (not a literal that looks like a real
 * build id) when it does not. */
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
  mapResult: Awaited<ReturnType<typeof createMap>>,
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
  if (mapResult !== undefined) {
    // `kw-self` (and every other `kw-*` source) is already declared, empty, by
    // kw-light.style.json (map-style.md section 6) — no `addSource`/`addLayer` call needed here —
    // but MapLibre still only makes sources queryable once the style has finished loading.
    mapResult.map.on('load', () => {
      layerController = createLocationLayerController(mapResult.map, true);
      void loadGameGeoSources(mapResult.map);
      void registerRiftCrackImage(mapResult.map);
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
  const mapResult = await createMap(mapContainer, env, clientConfig);
  if (mapResult === undefined) {
    // No copy.th.json key exists yet for this dev-only configuration state, so fall back to the
    // key-shaped placeholder text itself (TL-N06), same convention P1-F02-T10 uses for real
    // gps.* status copy. This only shows up when one of the three VITE_* values is unset, never in
    // a real deployed build (Cloudflare Pages always sets all three, D-008). #hud is a sibling of
    // #map, so it survives this fallback (index.html P1-F02-T10 comment).
    mapContainer.classList.add('map-shell--empty');
    mapContainer.textContent = 'client.mapSpike.tilesUrlMissing';
  }
  await initLocation(hudElement, mapResult);
}

void main(container, hud);
