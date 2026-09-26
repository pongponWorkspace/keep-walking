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
import { pointInPolygon, boundaryDistance_m } from '@keep-walking/geo';
import type { PolygonGeometry as GeoPolygonGeometry } from '@keep-walking/geo';
import type { SessionState } from '@keep-walking/shared/session';
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
import { nextOpenAt } from './dungeons/opening-hours-display';
import { displayDistance } from './dungeons/distance';
import { compassPointTo } from './dungeons/direction';
import { parseRunSeedParam } from './clock/query-params';
import { mountDungeonConfirm } from './ui/dungeon-confirm';
import { mountRunBar } from './ui/run-bar';
import { mountSpeedLockOverlay } from './ui/speed-lock-overlay';
import { mountRunSummary } from './ui/run-summary';
import { mountNavPanel } from './ui/nav-panel';
import type { DungeonSourceMap } from './map/dungeons-source';
import { createDungeonLabelCache, setDungeonsSourceData } from './map/dungeons-source';

const TELEMETRY_STORAGE_KEY = 'kw.p2.telemetry';
const DISTANCE_STEPS = [
  { upTo_m: 1000, step_m: 50 },
  { upTo_m: 10000, step_m: 100 },
  { upTo_m: null, step_m: 1000 },
];

export interface F04AppDeps {
  readonly map: DungeonSourceMap | undefined;
  readonly hudContainer: HTMLElement;
  readonly storage: KeyValueStorage;
  readonly sessionId: string;
  readonly appVersion: string;
  readonly platform: string;
  readonly vibrate: (pattern_ms: number) => void;
  readonly isOnline: () => boolean;
  readonly userAgent: string;
  readonly maxTouchPoints: number;
  readonly copyToClipboard: (text: string) => Promise<boolean>;
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
 * only, `clock/query-params.ts`), otherwise `crypto.getRandomValues` — never `Math.random` (ADR
 * 0003 3.2, this workspace's own ban on non-seeded RNG in anything gameplay-adjacent). */
function resolveRunSeed(): number {
  const fromQuery = parseRunSeedParam(
    window.location.search,
    clientConfig.providerQuery.paramNames.seed,
  );
  if (fromQuery !== undefined) return fromQuery;
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] ?? 0;
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
    },
    Date.now(),
  );

  const labelCache = createDungeonLabelCache();
  function refreshMapDungeons(now_ms: number): void {
    if (deps.map === undefined) return;
    const inputs = artifact.dungeons.map((d) =>
      toMapDungeonInput(d, params.config.openingHours.utcOffset_min, now_ms),
    );
    setDungeonsSourceData(deps.map, inputs, labelCache);
  }
  refreshMapDungeons(Date.now());

  // --- Screens (F04 flow priority: speed-lock > summary > run > confirm > map/nav) ---
  const confirmPopup = mountDungeonConfirm(deps.hudContainer, {
    onEnter: (dungeonId) => {
      engine.dispatch({ type: 'confirm', dungeonId, runSeed: resolveRunSeed() }, Date.now());
    },
    onCancel: () => confirmPopup.hide(),
  });
  const runBar = mountRunBar(deps.hudContainer, {
    onExitConfirmed: () => engine.dispatch({ type: 'exit' }, Date.now()),
  });
  const speedLockOverlay = mountSpeedLockOverlay(deps.hudContainer, {
    onSettings: () => {
      window.location.hash = '#/settings';
    },
    onExit: () => engine.dispatch({ type: 'exit' }, Date.now()),
    vibrate: deps.vibrate,
    vibrateOnEnterPattern_ms: clientConfig.vibration.speedLockEnter_ms,
  });
  const runSummary = mountRunSummary(deps.hudContainer, () => {
    engine.dispatch({ type: 'ackSummary' }, Date.now());
    runSummary.hide();
  });
  const navPanel = mountNavPanel(deps.hudContainer, {
    externalOpenTimeout_ms: clientConfig.navigation.externalOpenTimeout_ms,
    onNavigationLinkOpened: () => undefined,
    isOnline: deps.isOnline,
    userAgent: deps.userAgent,
    maxTouchPoints: deps.maxTouchPoints,
    copyToClipboard: deps.copyToClipboard,
  });

  let confirmPopupDungeonId: string | undefined;
  let lastPlayer: { lat: number; lng: number } | undefined;

  /** Every open dungeon whose polygon contains the player right now (F04-R03 B2 overlap). */
  function openDungeonsContaining(lat: number, lng: number, now_ms: number): ArtifactDungeon[] {
    return artifact.dungeons.filter(
      (d) =>
        dungeonStatus(d, params.config.openingHours.utcOffset_min, now_ms) === 'open' &&
        pointInPolygon({ lat, lng }, geoPolygon(d.geometry)),
    );
  }

  function renderConfirmIfNeeded(state: SessionState, now_ms: number): boolean {
    if (state.run !== null || lastPlayer === undefined) {
      confirmPopupDungeonId = undefined;
      confirmPopup.hide();
      return false;
    }
    const inside = openDungeonsContaining(lastPlayer.lat, lastPlayer.lng, now_ms);
    if (inside.length === 0) {
      confirmPopupDungeonId = undefined;
      confirmPopup.hide();
      return false;
    }
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
      const preview = engine.previewCheckIn(confirmPopupDungeonId, 1, now_ms);
      const dungeon = byId.get(confirmPopupDungeonId);
      const outOfRange =
        dungeon !== undefined &&
        !pointInPolygon({ lat: lastPlayer.lat, lng: lastPlayer.lng }, geoPolygon(dungeon.geometry));
      confirmPopup.update(preview, outOfRange, false);
    }
    return true;
  }

  function renderRun(state: SessionState): boolean {
    if (state.run === null) {
      runBar.hide();
      return false;
    }
    runBar.show();
    runBar.setStatus(state.run.status, {});
    runBar.setTick(state.run.status, undefined);
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
    navPanel.setDistance(`${displayDistance(nearestDistance_m, DISTANCE_STEPS)} ${'m'}`, false);
    navPanel.setDirection(compassPointTo(lastPlayer, pointOf(nearest)));
    const status = dungeonStatus(nearest, params.config.openingHours.utcOffset_min, now_ms);
    const closed = status === 'closed';
    const openTime = closed
      ? nextOpenAt(nearest.opening_hours, params.config.openingHours.utcOffset_min, now_ms)
      : undefined;
    navPanel.setClosed(
      closed,
      openTime === null || openTime === undefined ? undefined : String(openTime),
    );
    navPanel.setDestination({
      lat: pointOf(nearest).lat,
      lng: pointOf(nearest).lng,
      searchNameKey: nearest.search_name_key,
    });
  }

  function render(state: SessionState, now_ms: number): void {
    speedLockOverlay.hide();
    runSummary.hide();
    if (state.lock.locked) {
      speedLockOverlay.show(state.run !== null);
      return;
    }
    if (state.lastSummary !== null) {
      runSummary.show(state.lastSummary);
      return;
    }
    const inRun = renderRun(state);
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

  return {
    telemetry,
    engine,
    onSample(lat, lng, accuracy_m, t_ms) {
      lastPlayer = { lat, lng };
      const wasLocked = engine.getState().lock.locked;
      engine.dispatch({ type: 'sample', sample: { t_ms, lat, lng, accuracy_m } }, t_ms);
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
      engine.dispatch({ type: 'tick' }, now_ms);
      refreshMapDungeons(now_ms);
      render(engine.getState(), now_ms);
    },
  };
}
