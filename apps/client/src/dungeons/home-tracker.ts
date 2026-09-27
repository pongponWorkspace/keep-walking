/**
 * Wires `home/home-state.ts`'s pure `homeState()` (P2-X27, never edited by this task) into the
 * real client: resolves each dungeon's `open`/`nextOpenAt_ms` through `selectOpening`
 * (`@keep-walking/shared/session`), carries the two mask geometries (`home-geometry.ts`) and the
 * `unlocks.home.*`/`location.homeState.*` config numbers, and keeps the two pieces of memory-only
 * state `homeState()` itself declares external (tech note F06 9.1/9.2, this module's own doc
 * comment cross-references its counterpart, `home/home-state.ts`'s doc comment):
 *
 * - `poorAccuracySince_ms`: the instant the *current, unbroken* streak of `accuracy_m >
 *   maxAccuracy_m` began; reset to `null` the moment a sample is accurate enough again.
 * - the re-evaluation throttle (9.2's last bullet): recompute on the very first call, whenever the
 *   position has moved more than `reevaluateDistance_m` (haversine) since the point last committed,
 *   or whenever any dungeon's `selectOpening(...).open` flips relative to the last commit — every
 *   other call just replays the last committed `HomeState`, so GPS jitter alone never flickers the
 *   panel between `near`/`far`/`temporarilyClosed`.
 */
import { haversine_m } from '@keep-walking/geo';
import type { LatLng, PolygonGeometry } from '@keep-walking/geo';
import { selectOpening } from '@keep-walking/shared/session';
import type { SessionParams } from '@keep-walking/shared/session';
import type { ArtifactDungeon } from './artifact';
import type {
  HomeState,
  HomeStateDungeon,
  HomeStateInput,
  HomeStateParams,
} from '../home/home-state';
import { homeState } from '../home/home-state';

export interface HomeTrackerDungeonSource {
  readonly dungeons: readonly ArtifactDungeon[];
  readonly sessionParams: SessionParams;
}

export interface HomeTrackerConfig {
  readonly farDungeonThreshold_m: number;
  readonly maxAccuracy_m: number;
  readonly sustainedPoorAccuracy_s: number;
  readonly reevaluateDistance_m: number;
  readonly playAreaMask: PolygonGeometry;
  readonly launchAreaMask: PolygonGeometry | null;
}

export interface HomeTrackerInput {
  readonly now_ms: number;
  readonly locationConsentGranted: boolean;
  readonly permissionDenied: boolean;
  readonly position: {
    readonly lat: number;
    readonly lng: number;
    readonly accuracy_m: number;
  } | null;
  readonly playerLevel: number;
  /** `!selectPlayerView(...).firstRewardDone` (tech note F06 9.1). */
  readonly onboarding: boolean;
}

/**
 * D-127's tie-break ("ระยะเท่ากัน → เลือกแห่งที่เปิดเร็วกว่า → ยังเท่ากันอีก → เรียงตาม dungeon_id"):
 * `home-state.ts#nearest` keeps the *first* candidate on an exact `distance_m` tie (stable), so
 * pre-sorting the array this function hands to `homeState()` by (opening time ascending, id
 * ascending) is enough to make every `nearest()` call in that module resolve ties this way,
 * without `home-state.ts` itself needing to know about opening times at all — it never sees
 * anything but `HomeStateDungeon`, and this ordering is invisible to its own tie-keeping logic.
 * `nextOpenAt_ms === null` (already open, or genuinely unknown) sorts last: "opens sooner" is only
 * a meaningful comparison between two closed dungeons.
 */
function buildDungeons(
  source: HomeTrackerDungeonSource,
  now_ms: number,
): readonly HomeStateDungeon[] {
  const built = source.dungeons.map((d) => {
    const opening = selectOpening(d.id, now_ms, source.sessionParams);
    return {
      id: d.id,
      levelRange: d.level_range,
      geometry: d.geometry as unknown as PolygonGeometry,
      open: opening.open,
      nextOpenAt_ms: opening.changesAt_ms,
    };
  });
  return [...built].sort((a, b) => {
    const aOpen = a.nextOpenAt_ms ?? Number.POSITIVE_INFINITY;
    const bOpen = b.nextOpenAt_ms ?? Number.POSITIVE_INFINITY;
    if (aOpen !== bOpen) return aOpen - bOpen;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

function openSnapshot(dungeons: readonly HomeStateDungeon[]): string {
  // A cheap fingerprint of "which dungeons are open right now", sorted so member order never
  // matters — good enough to detect an open/closed flip without keeping a full Map around.
  return dungeons
    .map((d) => `${d.id}:${d.open ? '1' : '0'}`)
    .sort()
    .join(',');
}

export class HomeTracker {
  private readonly dungeonSource: HomeTrackerDungeonSource;
  private readonly config: HomeTrackerConfig;

  private poorAccuracySince_ms: number | null = null;
  private lastEvalPoint: LatLng | undefined;
  private lastOpenSnapshot: string | undefined;
  private lastResult: HomeState | undefined;

  constructor(dungeonSource: HomeTrackerDungeonSource, config: HomeTrackerConfig) {
    this.dungeonSource = dungeonSource;
    this.config = config;
  }

  /** The latest committed `HomeState` without recomputing anything (e.g. for a render pass that
   * runs between two real `evaluate()` calls, such as a route-screen close). `undefined` before
   * the first `evaluate()` call. */
  get current(): HomeState | undefined {
    return this.lastResult;
  }

  evaluate(input: HomeTrackerInput): HomeState {
    const position = input.position;
    if (position !== null) {
      if (position.accuracy_m > this.config.maxAccuracy_m) {
        this.poorAccuracySince_ms ??= input.now_ms;
      } else {
        this.poorAccuracySince_ms = null;
      }
    }

    const dungeons = buildDungeons(this.dungeonSource, input.now_ms);
    const snapshot = openSnapshot(dungeons);
    const point: LatLng | undefined =
      position === null ? undefined : { lat: position.lat, lng: position.lng };
    const movedEnough =
      this.lastEvalPoint === undefined ||
      point === undefined ||
      haversine_m(this.lastEvalPoint, point) > this.config.reevaluateDistance_m;
    const openingChanged =
      this.lastOpenSnapshot !== undefined && this.lastOpenSnapshot !== snapshot;
    // A live "poor accuracy" streak is time-sensitive on its own (9.2 item 1's `sustainedPoorAccuracy_s`
    // threshold can be crossed by the clock alone, with no new sample and no movement at all) — never
    // let the position/opening throttle below hide that crossing.
    const accuracyWatchPending = this.poorAccuracySince_ms !== null;

    if (this.lastResult !== undefined && !movedEnough && !openingChanged && !accuracyWatchPending) {
      return this.lastResult;
    }

    const stateInput: HomeStateInput = {
      now_ms: input.now_ms,
      locationConsentGranted: input.locationConsentGranted,
      permissionDenied: input.permissionDenied,
      position,
      poorAccuracySince_ms: this.poorAccuracySince_ms,
      playerLevel: input.playerLevel,
      onboarding: input.onboarding,
      dungeons,
    };
    const params: HomeStateParams = {
      farDungeonThreshold_m: this.config.farDungeonThreshold_m,
      maxAccuracy_m: this.config.maxAccuracy_m,
      sustainedPoorAccuracy_s: this.config.sustainedPoorAccuracy_s,
      playAreaMask: this.config.playAreaMask,
      launchAreaMask: this.config.launchAreaMask,
    };
    const result = homeState(stateInput, params);
    this.lastResult = result;
    this.lastOpenSnapshot = snapshot;
    if (point !== undefined) this.lastEvalPoint = point;
    return result;
  }
}
