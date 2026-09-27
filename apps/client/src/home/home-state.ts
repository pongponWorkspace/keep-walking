/**
 * Home-screen status: unknown position, out of the play area, far (including "temporarily
 * closed"), outside the launch district, or near (tech note F06 section 9, R50-R55, D-064,
 * D-073). Display only — never decides a reward (ADR 0003 3.3 item 2, `unlocks.home._note`) — and
 * a **pure** function: no DOM, no config/asset loading, no `@keep-walking/shared/session` (or any
 * other engine subpath) dependency, so it is trivially unit-testable (tech note F06 13.4).
 *
 * Written by backend-programmer under the D-125 role-swap exception (studio/decisions/
 * decision-log.md, "swap rule 10": a pure module in a new `apps/client` folder, tech-lead review
 * in F06-T20). gameplay-programmer wires this in P2-F06-T09: resolves each dungeon's `open` /
 * `nextOpenAt_ms` via `selectOpening` (`@keep-walking/shared/session`), the play-area / launch-area
 * mask geometry from `data/map/*.geojson` (already fetched as assets elsewhere, `map/geo-sources.ts`
 * pattern), and the config numbers from `config/balance/{location,unlocks}.json`, then calls
 * `homeState` below on every re-evaluation (app open, `reevaluateDistance_m` of movement, or an
 * `selectOpening` change, tech note F06 9.2 last bullet).
 *
 * `district-name` note (P2-H20, game-director option kh): this module never names a place. It
 * returns only the state and a dungeon *id* (never a district or dungeon name) plus a raw
 * `distance_m`; naming is copy's job, never engine data.
 *
 * Section 9.2's decision order, first match wins:
 *   1. `unknown` - no consent/permission/fix, or accuracy has been worse than `maxAccuracy_m` for
 *      at least `sustainedPoorAccuracy_s` continuously.
 *   2. `out_of_area` - outside the play-area mask (`inPlayArea`, a distance never substitutes for
 *      this, D-064).
 *   3. Candidate set for items 4-5: during onboarding (`input.onboarding`), only dungeons whose
 *      `levelRange` covers `input.playerLevel` (F06-R37); after onboarding, every dungeon.
 *   4. `far` (+ `temporarilyClosed` / `outside_launch_district`) - no candidate is both open and
 *      within `farDungeonThreshold_m`.
 *   5. `near` - otherwise; the recommended id prefers a level-covering candidate (F04-R33), with
 *      no fallback to a non-covering one while `input.onboarding` (F06-R37, K-11, D-116).
 */
import type { LatLng, PolygonGeometry } from '@keep-walking/geo';
import { MS_PER_S, boundaryDistance_m, inPlayArea, pointInPolygon } from '@keep-walking/geo';

export interface HomeStateDungeon {
  readonly id: string;
  readonly levelRange: { readonly min: number; readonly max: number };
  readonly geometry: PolygonGeometry;
  /** Resolved by the caller, one `selectOpening(id, now_ms, params).open` per dungeon (tech note
   * F06 9.1 "dungeon" row) — kept out of this module so it never needs a `SessionParams`/config
   * shape, only plain data. */
  readonly open: boolean;
  /** `selectOpening(...).changesAt_ms` when `open` is `false` (the next time it opens); `null`
   * while `open` or while genuinely unknown. Unused when `open` is `true`. */
  readonly nextOpenAt_ms: number | null;
}

export interface HomeStatePosition {
  readonly lat: number;
  readonly lng: number;
  readonly accuracy_m: number;
}

export interface HomeStateInput {
  readonly now_ms: number;
  /** `kw.p2.consent` (tech note F06 9.1); `false` for anything other than a granted, current
   * location consent. */
  readonly locationConsentGranted: boolean;
  /** The browser/OS geolocation permission itself, separate from in-game consent (9.2 item 1
   * lists both as independent `unknown` triggers). */
  readonly permissionDenied: boolean;
  /** Latest `LocationSample`, memory-only (never persisted, tech note F06 9.1); `null` = no fix
   * yet. */
  readonly position: HomeStatePosition | null;
  /** `t_ms` the current continuous streak of `accuracy_m > params.maxAccuracy_m` began; `null`
   * while the latest fix is accurate enough. Externalized memory the same way `SpeedLockState`
   * externalizes its own pending-run timer — the caller tracks this across evaluations so this
   * function stays a pure function of its arguments alone. */
  readonly poorAccuracySince_ms: number | null;
  readonly playerLevel: number;
  /** `!selectPlayerView(...).firstRewardDone` (tech note F06 9.1, 8.2: same source as the
   * `first_reward` onboarding step, `player.lifetimeTicksGranted === 0`). */
  readonly onboarding: boolean;
  readonly dungeons: readonly HomeStateDungeon[];
}

export interface HomeStateParams {
  /** `unlocks.home.farDungeonThreshold_m`. */
  readonly farDungeonThreshold_m: number;
  /** `location.homeState.maxAccuracy_m`. */
  readonly maxAccuracy_m: number;
  /** `location.homeState.sustainedPoorAccuracy_s`. */
  readonly sustainedPoorAccuracy_s: number;
  /** Parsed `unlocks.home.outOfAreaMaskPath` geometry (`data/map/playarea-mask.geojson`) — always
   * present (D-064), unlike the launch-area mask below. */
  readonly playAreaMask: PolygonGeometry;
  /** Parsed `unlocks.home.launchAreaMaskPath` geometry (`data/map/launch-area.geojson`); `null` =
   * "not shipped yet" (R55): every `far` here stays plain `far`, never `outside_launch_district`.
   * R55 also has the wiring layer show district-scoped interest registration for plain `far` in
   * that case — a copy/UI choice this module does not encode. */
  readonly launchAreaMask: PolygonGeometry | null;
}

export type HomeState =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'out_of_area' }
  | {
      readonly kind: 'temporarilyClosed';
      /** Nearest level-covering-but-closed dungeon during onboarding, or nearest
       * within-`farDungeonThreshold_m`-but-closed dungeon after onboarding (9.2 item 4). `null`
       * only when no dungeon in the whole set covers the player's level at all — a data/build bug
       * (level 1 should always be covered), not a game state. */
      readonly dungeonId: string | null;
      readonly nextOpenAt_ms: number | null;
    }
  | {
      readonly kind: 'far';
      /** Navigation/distance target only (F04-R34-R38) — never a recommendation. A recommendation
       * (a card the player is nudged toward) exists only for `near`, below (H-E26). */
      readonly dungeonId: string;
      readonly distance_m: number;
    }
  | {
      readonly kind: 'outside_launch_district';
      readonly dungeonId: string;
      readonly distance_m: number;
    }
  | {
      readonly kind: 'near';
      /** The recommended dungeon (9.2 item 5) — the only `kind` that is a recommendation. */
      readonly dungeonId: string;
    };

function coversLevel(
  range: { readonly min: number; readonly max: number },
  level: number,
): boolean {
  return range.min <= level && level <= range.max;
}

interface WithDistance extends HomeStateDungeon {
  readonly distance_m: number;
}

function distanceTo(pt: LatLng, geometry: PolygonGeometry): number {
  return pointInPolygon(pt, geometry) ? 0 : boundaryDistance_m(pt, geometry);
}

/** First of `items` with the smallest `distance_m`, ties keeping the earlier item (stable). Never
 * called on an empty array — every call site checks `.length > 0` first. */
function nearest(items: readonly WithDistance[]): WithDistance {
  const first = items[0];
  if (first === undefined) throw new Error('nearest: items must not be empty');
  let best = first;
  for (const item of items) {
    if (item.distance_m < best.distance_m) best = item;
  }
  return best;
}

function farOrOutsideLaunchDistrict(
  target: WithDistance,
  params: HomeStateParams,
  pt: LatLng,
): HomeState {
  if (params.launchAreaMask !== null && !pointInPolygon(pt, params.launchAreaMask)) {
    return { kind: 'outside_launch_district', dungeonId: target.id, distance_m: target.distance_m };
  }
  return { kind: 'far', dungeonId: target.id, distance_m: target.distance_m };
}

export function homeState(input: HomeStateInput, params: HomeStateParams): HomeState {
  // 1. unknown
  const position = input.position;
  const accuracyPoorSustained =
    position !== null &&
    position.accuracy_m > params.maxAccuracy_m &&
    input.poorAccuracySince_ms !== null &&
    input.now_ms - input.poorAccuracySince_ms >= params.sustainedPoorAccuracy_s * MS_PER_S;
  if (
    !input.locationConsentGranted ||
    input.permissionDenied ||
    position === null ||
    accuracyPoorSustained
  ) {
    return { kind: 'unknown' };
  }

  const pt: LatLng = { lat: position.lat, lng: position.lng };

  // 2. out_of_area
  if (!inPlayArea(pt, params.playAreaMask)) {
    return { kind: 'out_of_area' };
  }

  // 3. the candidate set for items 4-5
  const considered: readonly WithDistance[] = (
    input.onboarding
      ? input.dungeons.filter((d) => coversLevel(d.levelRange, input.playerLevel))
      : input.dungeons
  ).map((d) => ({ ...d, distance_m: distanceTo(pt, d.geometry) }));

  const openWithinThreshold = considered.filter(
    (d) => d.open && d.distance_m <= params.farDungeonThreshold_m,
  );

  // 4. far / temporarilyClosed / outside_launch_district
  if (openWithinThreshold.length === 0) {
    if (input.onboarding) {
      if (considered.length === 0) {
        // No dungeon in the whole set covers the player's level at all (data/build bug, 9.2 item 4).
        return { kind: 'temporarilyClosed', dungeonId: null, nextOpenAt_ms: null };
      }
      const openAnywhere = considered.filter((d) => d.open);
      if (openAnywhere.length === 0) {
        // No level-covering dungeon is open at any distance (R37 items 1-2, A-P2-X31-1): show the
        // next opening time of the nearest level-covering dungeon, whatever its distance.
        const target = nearest(considered);
        return {
          kind: 'temporarilyClosed',
          dungeonId: target.id,
          nextOpenAt_ms: target.nextOpenAt_ms,
        };
      }
      // A level-covering dungeon is open, just farther than the threshold (H-E26): point at it,
      // never at a nearer non-covering one.
      return farOrOutsideLaunchDistrict(nearest(openAnywhere), params, pt);
    }
    const withinThreshold = considered.filter((d) => d.distance_m <= params.farDungeonThreshold_m);
    if (withinThreshold.length > 0) {
      // Every dungeon within the threshold is closed (all `open` here are false, by construction
      // of `openWithinThreshold.length === 0` above): temporarily closed, not far (H-E21).
      const target = nearest(withinThreshold);
      return {
        kind: 'temporarilyClosed',
        dungeonId: target.id,
        nextOpenAt_ms: target.nextOpenAt_ms,
      };
    }
    const openAnywhere = considered.filter((d) => d.open);
    if (openAnywhere.length === 0) {
      // [ASSUMPTION A-P2-X27-1: nothing open anywhere at all, not even beyond the threshold — the
      // tech note does not cover this case explicitly. F04-R33 never recommends/points at a closed
      // dungeon, so this falls back to `temporarilyClosed` at the nearest dungeon overall rather
      // than pointing `far` at a closed one. owner: tech-lead, flagged for F06-T20 review.]
      if (considered.length === 0) {
        return { kind: 'temporarilyClosed', dungeonId: null, nextOpenAt_ms: null };
      }
      const target = nearest(considered);
      return {
        kind: 'temporarilyClosed',
        dungeonId: target.id,
        nextOpenAt_ms: target.nextOpenAt_ms,
      };
    }
    return farOrOutsideLaunchDistrict(nearest(openAnywhere), params, pt);
  }

  // 5. near — prefer a level-covering candidate; onboarding's candidate set is already
  // level-covering-only (item 3), so this tie-break only matters after onboarding (F04-R33).
  const covering = openWithinThreshold.filter((d) => coversLevel(d.levelRange, input.playerLevel));
  const chosen = covering.length > 0 ? nearest(covering) : nearest(openWithinThreshold);
  return { kind: 'near', dungeonId: chosen.id };
}
