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
import { selectOpening } from '@keep-walking/shared/session';
import type { SessionEvent, SessionState } from '@keep-walking/shared/session';
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
import { displayDistance } from './dungeons/distance';
import { formatCopyText } from './copy/format';
import type { AssetRuntime } from './assets/icon-dom';
import { compassPointTo } from './dungeons/direction';
import { E2E_CLASS_ID_PARAM, parseE2eClassIdParam, parseRunSeedParam } from './clock/query-params';
import { mountDungeonConfirm } from './ui/dungeon-confirm';
import { mountRunBar } from './ui/run-bar';
import { mountSpeedLockOverlay } from './ui/speed-lock-overlay';
import { mountRunSummary } from './ui/run-summary';
import { mountNavPanel } from './ui/nav-panel';
import { mountTickToast } from './ui/tick-toast';
import { createAudioPlayer } from './assets/audio-player';
import type { DungeonSourceMap } from './map/dungeons-source';
import { createDungeonLabelCache, setDungeonsSourceData } from './map/dungeons-source';

const TELEMETRY_STORAGE_KEY = 'kw.p2.telemetry';
const SECONDS_PER_MINUTE = 60;
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

  const e2eClassId = parseE2eClassIdParam(window.location.search, E2E_CLASS_ID_PARAM);
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
        { type: 'confirm', dungeonId, runSeed: resolveRunSeed() },
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
    onExit: () => engine.dispatch({ type: 'exit' }, deps.now()),
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
        dungeonStatus(d, params, now_ms) === 'open' &&
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
      const preview = engine.previewCheckIn(confirmPopupDungeonId, now_ms);
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
    const opening = selectOpening(nearest.id, now_ms, params);
    const closed = !opening.open;
    const openTime = closed ? opening.changesAt_ms : undefined;
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

  /** `dungeon_closing_soon` (F04-R29, P2-X10): the run bar's closing-soon warning is driven only by
   * this event, never by a client-side re-derivation of `closesIn_s` (`selectRunView` exists for
   * display, but the *decision* that a notice is due is the engine's, tech note F04 8.3). Every
   * `run_state_changed`/`dungeon_entered` also resets the banner so a later run never starts with a
   * previous run's warning still "seen" (`run-bar.ts`'s own `wasHidden` bookkeeping). */
  function handleSessionEvents(events: readonly SessionEvent[]): void {
    for (const event of events) {
      if (event.type === 'dungeon_entered') {
        runBar.hideClosingSoonWarning();
      } else if (event.type === 'dungeon_closing_soon') {
        const minutes = Math.max(1, Math.ceil(event.closesIn_s / SECONDS_PER_MINUTE));
        runBar.showClosingSoonWarning(
          formatCopyText('unit.minutes', { value: minutes }),
          deps.vibrate,
          clientConfig.vibration.closingSoonWarning_ms,
        );
      } else if (event.type === 'dungeon_exited') {
        runBar.hideClosingSoonWarning();
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
      }
    }
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
