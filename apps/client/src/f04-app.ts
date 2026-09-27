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
import { selectOpening, selectPlayerView, selectRunView } from '@keep-walking/shared/session';
import type { SessionEvent, SessionState } from '@keep-walking/shared/session';
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
import type { AssetRuntime } from './assets/icon-dom';
import { compassPointTo } from './dungeons/direction';
import { parseE2eClassIdParam, parseRunSeedParam } from './clock/query-params';
import type { PlayerClass } from '@keep-walking/shared/session';
import {
  balanceLocationConfig,
  balanceOpeningHoursConfig,
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
import { createAudioPlayer } from './assets/audio-player';
import type { DungeonSourceMap } from './map/dungeons-source';
import { createDungeonLabelCache, setDungeonsSourceData } from './map/dungeons-source';

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
  readonly assets: AssetRuntime;
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
      ...(e2eClassId !== undefined ? { testForceClassId: e2eClassId } : {}),
    },
    deps.now(),
  );

  const labelCache = createDungeonLabelCache();
  function refreshMapDungeons(now_ms: number): void {
    if (deps.map === undefined) return;
    const inputs = artifact.dungeons.map((d) => toMapDungeonInput(d, params, now_ms));
    setDungeonsSourceData(deps.map, inputs, labelCache);
  }
  refreshMapDungeons(deps.now());

  // Reward-tick sound + vibration (F05 flow Flow A5, audio/cue-list.md section 4's single
  // priority-queue channel — the safety cues F06-T14 adds later share this exact same instance,
  // never a second queue): `assets/audio.ts`'s pure queue driven by real playback/timers here.
  const audioPlayer = createAudioPlayer({
    assets: deps.assets,
    vibrate: deps.vibrate,
    playUrl: deps.playAudioUrl,
    now: Date.now,
    setTimer: (run, delay_ms) => window.setTimeout(run, delay_ms),
    clearTimer: (handle) => window.clearTimeout(handle),
  });

  // --- Screens (F04 flow priority: speed-lock > summary > run > confirm > map/nav) ---
  const confirmPopup = mountDungeonConfirm(deps.hudContainer, {
    onEnter: (dungeonId) => {
      const events = engine.dispatch(
        {
          type: 'confirm',
          dungeonId,
          runSeed: resolveRunSeed(deps.locationSearch, deps.isMockProvider),
        },
        deps.now(),
      );
      handleSessionEvents(events);
    },
    onCancel: () => confirmPopup.hide(),
  });
  const runBar = mountRunBar(deps.hudContainer, {
    onExitConfirmed: () => handleSessionEvents(engine.dispatch({ type: 'exit' }, deps.now())),
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
  const settingsWalkingSafety = mountSettingsWalkingSafety(deps.hudContainer, {
    storage: deps.storage,
    autoRetreatThresholdPct: params.config.hpSafety.autoRetreatThreshold_pct,
    onSetAutoRetreat: (enabled) => {
      handleSessionEvents(engine.dispatch({ type: 'setAutoRetreat', enabled }, deps.now()));
      settingsWalkingSafety.setAutoRetreatEnabled(engine.getState().player.autoRetreatEnabled);
    },
    onClose: closeRouteScreen,
  });
  const navPanel = mountNavPanel(deps.hudContainer, {
    externalOpenTimeout_ms: clientConfig.navigation.externalOpenTimeout_ms,
    onNavigationLinkOpened: () => undefined,
    isOnline: deps.isOnline,
    userAgent: deps.userAgent,
    maxTouchPoints: deps.maxTouchPoints,
    copyToClipboard: deps.copyToClipboard,
  });

  // --- S-22/S-11 route screens (ia.md: the gear icon/inventory shortcut are reachable from every
  // state, NN-7 — never gated behind a run/consent/unlock check) ---
  // `#/settings...` also matches `speedLockOverlay`'s own `onSettings` hash; `#/inventory...` is
  // the one this task adds for `S-11-inventory`. Both route screens fully take over the display
  // while open (`render()`'s own top guard below) — the real `S-22-settings` home menu and its
  // `settings.walkingSafetyLink`/`inventory.homeShortcut` entry points are P2-F06-T09's build
  // (`ui/settings-walking-safety.ts`/`ui/inventory-screen.ts`'s own doc comments); this hash is a
  // stand-in front door onto the exact same screens until that chrome exists.
  type RouteScreen = 'main' | 'settingsWalkingSafety' | 'inventory';
  function routeFromHash(): RouteScreen {
    const hash = window.location.hash;
    if (hash.startsWith('#/settings')) return 'settingsWalkingSafety';
    if (hash.startsWith('#/inventory')) return 'inventory';
    return 'main';
  }
  let currentRoute: RouteScreen = 'main';
  function syncRouteScreens(): void {
    currentRoute = routeFromHash();
    settingsWalkingSafety.hide();
    inventoryScreen.hide();
    if (currentRoute === 'settingsWalkingSafety') {
      settingsWalkingSafety.setAutoRetreatEnabled(engine.getState().player.autoRetreatEnabled);
      settingsWalkingSafety.show();
    } else if (currentRoute === 'inventory') {
      renderInventoryScreen();
      inventoryScreen.show();
    }
    render(engine.getState(), deps.now());
  }
  window.addEventListener('hashchange', syncRouteScreens);

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
      const preview = engine.previewCheckIn(confirmPopupDungeonId, now_ms);
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
    for (const event of events) {
      if (event.type === 'dungeon_entered') {
        runBar.hideClosingSoonWarning();
        lastHitHp = undefined;
      } else if (event.type === 'dungeon_closing_soon') {
        const minutes = Math.max(1, Math.ceil(event.closesIn_s / SECONDS_PER_MINUTE));
        runBar.showClosingSoonWarning(
          formatCopyText('unit.minutes', { value: minutes }),
          deps.vibrate,
          clientConfig.vibration.closingSoonWarning_ms,
        );
      } else if (event.type === 'dungeon_exited') {
        runBar.hideClosingSoonWarning();
      } else if (event.type === 'run_state_changed') {
        // C-12 (copy gate P2-X37): a short toast confirming the run came back from Grace/Suspended
        // to Active — never a client re-derivation of "did presence return", just this event.
        if (event.cause === 'returned' && event.to === 'active') {
          tickToast.showStateResumed(event.at_ms);
        }
      } else if (event.type === 'run_tick_granted') {
        // F05 flow Flow A1/A2/A4: the toast is the one place icon/effect/sound/vibration for a
        // granted tick come together — `event` already carries everything `sessionStep` decided
        // (loot, firstEver, levelBefore/After), never recomputed here.
        tickToast.showGranted({
          loot: event.loot,
          firstEver: event.firstEver,
          levelBefore: event.levelBefore,
          levelAfter: event.levelAfter,
          at_ms: event.at_ms,
        });
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
      runSummary.show(state.lastSummary);
      return;
    }
    const inRun = renderRun(state, now_ms);
    if (inRun) {
      confirmPopup.hide();
      navPanel.root.hidden = true;
      return;
    }
    const showingConfirm = renderConfirmIfNeeded(state, now_ms);
    if (!showingConfirm) {
      renderNearbyNav(state, now_ms);
    } else {
      navPanel.root.hidden = true;
    }
  }

  // Applies whatever route the page loaded with (e.g. a returning player's own bookmark/reload of
  // `#/settings`), and renders once so the very first frame is already correct.
  syncRouteScreens();

  return {
    telemetry,
    engine,
    onSample(lat, lng, accuracy_m, t_ms) {
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
        if (stateAfter.lock.locked) {
          deps.vibrate(clientConfig.vibration.speedLockEnter_ms);
        }
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
