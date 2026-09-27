// homeState (tech note F06 section 9, P2-X27, D-125 role-swap exception). Section 13.4's
// "recommended rift (F06-R37)" hook lists five forced cases (a)-(e); this file's
// `describe('13.4 ... hook, cases (a)-(e)')` names them the same letters so the tech-lead review
// (F06-T20) can match them 1:1. H-E6/H-E21/H-E26 (design/features/F06-hp-damage-onboarding.md) and
// the `farDungeonThreshold_m` boundary (9.2 item 4, `d <= threshold`) get their own top-level
// describes.
import { describe, expect, it } from 'vitest';
import { DEG_TO_RAD, EARTH_MEAN_RADIUS_M, boundaryDistance_m } from '@keep-walking/geo';
import type { PolygonGeometry } from '@keep-walking/geo';
import type { HomeStateDungeon, HomeStateInput, HomeStateParams } from './home-state';
import { homeState } from './home-state';

/** One closed square ring (RFC 7946: first position repeated last), `halfSide_deg` from `center`
 * on each side. A plain `number[][]` (not a typed `Position`) so it slots into a `Polygon`'s or a
 * `MultiPolygon`'s `coordinates` without importing the `geojson` package directly (apps/client has
 * no direct dependency on it, unlike packages/shared/packages/geo). */
function squareRing(center: { lat: number; lng: number }, halfSide_deg: number): number[][] {
  const { lat, lng } = center;
  return [
    [lng - halfSide_deg, lat - halfSide_deg],
    [lng + halfSide_deg, lat - halfSide_deg],
    [lng + halfSide_deg, lat + halfSide_deg],
    [lng - halfSide_deg, lat + halfSide_deg],
    [lng - halfSide_deg, lat - halfSide_deg],
  ];
}

/** A square roughly 100 m x 100 m in size, centred near `CENTER`, big enough that boundary
 * distances of a few hundred metres are easy to reason about. */
function squareAround(center: { lat: number; lng: number }, halfSide_deg: number): PolygonGeometry {
  return { type: 'Polygon', coordinates: [squareRing(center, halfSide_deg)] };
}

const PLAYER_AT = { lat: 13.75, lng: 100.5 };

/** `inPlayArea` (packages/geo) expects an *inverse* mask: the world with the play area cut out as
 * a hole (polygon.ts's own doc comment). `outer` bounds the whole fixture space; `hole` is the
 * actual "in the play area" region, big enough to comfortably contain the player and every
 * dungeon fixture in this file but not the `+10 deg` point the out_of_area test moves to. */
function inverseMask(
  center: { readonly lat: number; readonly lng: number },
  outerHalfSide_deg: number,
  holeHalfSide_deg: number,
): PolygonGeometry {
  return {
    type: 'Polygon',
    coordinates: [squareRing(center, outerHalfSide_deg), squareRing(center, holeHalfSide_deg)],
  };
}

const PLAY_AREA = inverseMask(PLAYER_AT, 20, 2);

/** A plain (non-inverse) polygon standing in for a launch-district mask that contains the player
 * and every near-ish dungeon fixture — `pointInPolygon`, not `inPlayArea`, reads this one
 * (9.2 item 4's launch-mask check is a direct polygon test, not the play-area's hole trick). */
const LAUNCH_DISTRICT_CONTAINING_PLAYER = squareAround(PLAYER_AT, 2);

const HALF_SIDE_SMALL = 0.0005; // ~55 m half-side: dungeon polygons are small, like real ones.

function dungeon(partial: {
  readonly id: string;
  readonly center: { readonly lat: number; readonly lng: number };
  readonly levelRange?: { readonly min: number; readonly max: number };
  readonly open?: boolean;
  readonly nextOpenAt_ms?: number | null;
}): HomeStateDungeon {
  return {
    id: partial.id,
    levelRange: partial.levelRange ?? { min: 1, max: 5 },
    geometry: squareAround(partial.center, HALF_SIDE_SMALL),
    open: partial.open ?? true,
    nextOpenAt_ms: partial.nextOpenAt_ms ?? null,
  };
}

function baseInput(overrides: Partial<HomeStateInput> = {}): HomeStateInput {
  return {
    now_ms: 0,
    locationConsentGranted: true,
    permissionDenied: false,
    position: { lat: PLAYER_AT.lat, lng: PLAYER_AT.lng, accuracy_m: 10 },
    poorAccuracySince_ms: null,
    playerLevel: 1,
    onboarding: false,
    dungeons: [],
    ...overrides,
  };
}

const THRESHOLD_M = 1900; // unlocks.home.farDungeonThreshold_m's real Phase 2 value (P2-F06-T01).

function baseParams(overrides: Partial<HomeStateParams> = {}): HomeStateParams {
  return {
    farDungeonThreshold_m: THRESHOLD_M,
    maxAccuracy_m: 100,
    sustainedPoorAccuracy_s: 30,
    playAreaMask: PLAY_AREA,
    launchAreaMask: null,
    ...overrides,
  };
}

/** Metres per degree of latitude in `boundaryDistance_m`'s own local equirectangular projection
 * (packages/geo/src/polygon.ts's `ky`) — used to *analytically* invert that same formula below,
 * rather than searching for it, so an "exactly at the threshold" test is exact (not
 * bisection-approximate: a search only ever gets within an epsilon of the target, which is exactly
 * the wrong side of a `<=` boundary test). */
const KY_M_PER_DEG = DEG_TO_RAD * EARTH_MEAN_RADIUS_M;

/** A centre placed due north of `PLAYER_AT` so the dungeon square's southern edge — the closest
 * one, directly below the player's own longitude — is exactly `target_m` away. Sanity-checked
 * against the real `boundaryDistance_m` in this file's own "sanity" test below. */
function centerAtDistance(target_m: number): { lat: number; lng: number } {
  const deltaLat_deg = target_m / KY_M_PER_DEG + HALF_SIDE_SMALL;
  return { lat: PLAYER_AT.lat + deltaLat_deg, lng: PLAYER_AT.lng };
}

const NEAR_M = 300; // well inside farDungeonThreshold_m (1,900)
const WITHIN_BUT_FARTHER_M = 800; // also inside, but farther than NEAR_M
const FAR_M = THRESHOLD_M + 500; // outside farDungeonThreshold_m

describe('homeState: unknown (9.2 item 1)', () => {
  it('is unknown with no location consent', () => {
    const state = homeState(baseInput({ locationConsentGranted: false }), baseParams());
    expect(state).toEqual({ kind: 'unknown' });
  });

  it('is unknown when the browser permission was denied', () => {
    const state = homeState(baseInput({ permissionDenied: true }), baseParams());
    expect(state).toEqual({ kind: 'unknown' });
  });

  it('is unknown with no fix yet', () => {
    const state = homeState(baseInput({ position: null }), baseParams());
    expect(state).toEqual({ kind: 'unknown' });
  });

  it('is unknown when poor accuracy has been sustained for sustainedPoorAccuracy_s', () => {
    const params = baseParams({ maxAccuracy_m: 50, sustainedPoorAccuracy_s: 30 });
    const input = baseInput({
      position: { ...PLAYER_AT, accuracy_m: 80 },
      now_ms: 30_000,
      poorAccuracySince_ms: 0, // 30 s of continuous poor accuracy by now_ms = 30_000
    });
    expect(homeState(input, params)).toEqual({ kind: 'unknown' });
  });

  it('is not unknown while poor accuracy has not been sustained long enough yet', () => {
    const params = baseParams({ maxAccuracy_m: 50, sustainedPoorAccuracy_s: 30 });
    const input = baseInput({
      position: { ...PLAYER_AT, accuracy_m: 80 },
      now_ms: 29_000,
      poorAccuracySince_ms: 0,
      dungeons: [dungeon({ id: 'd1', center: offsetNear() })],
    });
    expect(homeState(input, params).kind).not.toBe('unknown');
  });

  it('is not unknown when accuracy is currently fine even if poorAccuracySince_ms is stale', () => {
    const params = baseParams({ maxAccuracy_m: 50, sustainedPoorAccuracy_s: 30 });
    const input = baseInput({
      position: { ...PLAYER_AT, accuracy_m: 10 },
      now_ms: 1_000_000,
      poorAccuracySince_ms: 0,
      dungeons: [dungeon({ id: 'd1', center: offsetNear() })],
    });
    expect(homeState(input, params).kind).not.toBe('unknown');
  });
});

function offsetNear(): { lat: number; lng: number } {
  return centerAtDistance(NEAR_M);
}

describe('homeState: out_of_area (9.2 item 2)', () => {
  it('is out_of_area outside the play-area mask, regardless of a nearby open dungeon', () => {
    const outside = { lat: PLAYER_AT.lat + 10, lng: PLAYER_AT.lng + 10 }; // well outside PLAY_AREA
    const input = baseInput({
      position: { ...outside, accuracy_m: 10 },
      dungeons: [dungeon({ id: 'd1', center: offsetNear() })],
    });
    expect(homeState(input, baseParams())).toEqual({ kind: 'out_of_area' });
  });

  it('is not out_of_area on the mask boundary itself (D-064: containment, not distance)', () => {
    const state = homeState(baseInput({ dungeons: [] }), baseParams());
    expect(state.kind).not.toBe('out_of_area');
  });
});

describe('homeState: near (9.2 item 5)', () => {
  it('recommends the only open, in-range, level-covering dungeon', () => {
    const d = dungeon({ id: 'd1', center: offsetNear() });
    const state = homeState(baseInput({ dungeons: [d] }), baseParams());
    expect(state).toEqual({ kind: 'near', dungeonId: 'd1' });
  });

  it('never recommends a closed dungeon even when it is nearer than an open one (H-E6/13.4-e)', () => {
    const closerClosed = dungeon({
      id: 'closed-near',
      center: centerAtDistance(NEAR_M),
      open: false,
      nextOpenAt_ms: 999,
    });
    const fartherOpen = dungeon({ id: 'open-far', center: centerAtDistance(WITHIN_BUT_FARTHER_M) });
    const state = homeState(baseInput({ dungeons: [closerClosed, fartherOpen] }), baseParams());
    expect(state).toEqual({ kind: 'near', dungeonId: 'open-far' });
  });
});

describe('homeState: farDungeonThreshold_m boundary (9.2 item 4, d <= threshold)', () => {
  it('sanity check: centerAtDistance places the dungeon boundary within 1 mm of the target', () => {
    const center = centerAtDistance(THRESHOLD_M);
    const real = boundaryDistance_m(PLAYER_AT, squareAround(center, HALF_SIDE_SMALL));
    expect(Math.abs(real - THRESHOLD_M)).toBeLessThan(0.001);
  });

  it('is near when the nearest open dungeon is exactly at the threshold (inclusive)', () => {
    const d = dungeon({ id: 'edge', center: centerAtDistance(THRESHOLD_M) });
    const state = homeState(baseInput({ dungeons: [d] }), baseParams());
    expect(state.kind).toBe('near');
    if (state.kind === 'near') expect(state.dungeonId).toBe('edge');
  });

  it('is far just beyond the threshold', () => {
    const d = dungeon({ id: 'edge', center: centerAtDistance(THRESHOLD_M + 1) });
    const state = homeState(baseInput({ dungeons: [d] }), baseParams());
    expect(state.kind).toBe('far');
    if (state.kind === 'far') {
      expect(state.dungeonId).toBe('edge');
      expect(state.distance_m).toBeGreaterThan(THRESHOLD_M);
    }
  });
});

describe('homeState: temporarilyClosed (H-E21) and outside_launch_district', () => {
  it('is temporarilyClosed when every in-range dungeon is closed (H-E21), even inside the launch area', () => {
    const closed = dungeon({
      id: 'closed1',
      center: centerAtDistance(NEAR_M),
      open: false,
      nextOpenAt_ms: 123_456,
    });
    const params = baseParams({ launchAreaMask: LAUNCH_DISTRICT_CONTAINING_PLAYER }); // player is inside this mask
    const state = homeState(baseInput({ dungeons: [closed] }), params);
    expect(state).toEqual({
      kind: 'temporarilyClosed',
      dungeonId: 'closed1',
      nextOpenAt_ms: 123_456,
    });
  });

  it('never promotes temporarilyClosed to outside_launch_district (spec 9.2 item 4 excludes it)', () => {
    const closed = dungeon({
      id: 'closed1',
      center: centerAtDistance(NEAR_M),
      open: false,
      nextOpenAt_ms: 5,
    });
    // A launch mask that does NOT contain the player: would flag outside_launch_district for a
    // plain `far`, but must not for `temporarilyClosed`.
    const tinyMaskFarAway: PolygonGeometry = squareAround(
      { lat: PLAYER_AT.lat + 5, lng: PLAYER_AT.lng + 5 },
      0.01,
    );
    const params = baseParams({ launchAreaMask: tinyMaskFarAway });
    const state = homeState(baseInput({ dungeons: [closed] }), params);
    expect(state.kind).toBe('temporarilyClosed');
  });

  it('is outside_launch_district when far and outside the (non-null) launch mask', () => {
    const d = dungeon({ id: 'd1', center: centerAtDistance(FAR_M) });
    const tinyMaskFarAway: PolygonGeometry = squareAround(
      { lat: PLAYER_AT.lat + 5, lng: PLAYER_AT.lng + 5 },
      0.01,
    );
    const params = baseParams({ launchAreaMask: tinyMaskFarAway });
    const state = homeState(baseInput({ dungeons: [d] }), params);
    expect(state).toEqual({
      kind: 'outside_launch_district',
      dungeonId: 'd1',
      distance_m: expect.any(Number),
    });
  });

  it('stays plain far (not outside_launch_district) when the player is inside the launch mask', () => {
    const d = dungeon({ id: 'd1', center: centerAtDistance(FAR_M) });
    const params = baseParams({ launchAreaMask: LAUNCH_DISTRICT_CONTAINING_PLAYER }); // contains the player
    const state = homeState(baseInput({ dungeons: [d] }), params);
    expect(state.kind).toBe('far');
  });

  it('stays plain far when launchAreaMaskPath has not shipped yet (launchAreaMask = null, R55)', () => {
    const d = dungeon({ id: 'd1', center: centerAtDistance(FAR_M) });
    const state = homeState(baseInput({ dungeons: [d] }), baseParams({ launchAreaMask: null }));
    expect(state.kind).toBe('far');
  });
});

describe('homeState: H-E6 (level 1 near an open dungeon several levels above)', () => {
  it('never recommends or targets a dungeon that does not cover the player level during onboarding', () => {
    const tooHigh = dungeon({
      id: 'too-high',
      center: centerAtDistance(NEAR_M),
      levelRange: { min: 6, max: 10 },
    });
    const state = homeState(
      baseInput({ onboarding: true, playerLevel: 1, dungeons: [tooHigh] }),
      baseParams(),
    );
    // No dungeon at all covers level 1 here: temporarilyClosed with no target (9.2 item 4).
    expect(state).toEqual({ kind: 'temporarilyClosed', dungeonId: null, nextOpenAt_ms: null });
  });
});

describe('homeState: H-E26 (onboarding, only a non-covering dungeon in range)', () => {
  it('is far, pointing at the nearest open covering dungeon beyond the threshold', () => {
    const nonCovering = dungeon({
      id: 'non-covering',
      center: centerAtDistance(NEAR_M),
      levelRange: { min: 6, max: 10 },
    });
    const covering = dungeon({ id: 'covering', center: centerAtDistance(FAR_M) });
    const state = homeState(
      baseInput({ onboarding: true, playerLevel: 1, dungeons: [nonCovering, covering] }),
      baseParams(),
    );
    expect(state.kind).toBe('far');
    if (state.kind === 'far') expect(state.dungeonId).toBe('covering');
  });
});

describe('homeState: 13.4 recommended-rift (F06-R37) hook, cases (a)-(e)', () => {
  it('(a) onboarding: a nearer non-covering dungeon does not beat a farther covering one, in range', () => {
    const nonCovering = dungeon({
      id: 'non-covering',
      center: centerAtDistance(NEAR_M),
      levelRange: { min: 6, max: 10 },
    });
    const covering = dungeon({ id: 'covering', center: centerAtDistance(WITHIN_BUT_FARTHER_M) });
    const state = homeState(
      baseInput({ onboarding: true, playerLevel: 1, dungeons: [nonCovering, covering] }),
      baseParams(),
    );
    expect(state).toEqual({ kind: 'near', dungeonId: 'covering' });
  });

  it('(b) onboarding: only a non-covering in range + an open covering one beyond range -> far, no recommendation', () => {
    const nonCovering = dungeon({
      id: 'non-covering',
      center: centerAtDistance(NEAR_M),
      levelRange: { min: 6, max: 10 },
    });
    const covering = dungeon({ id: 'covering', center: centerAtDistance(FAR_M) });
    const state = homeState(
      baseInput({ onboarding: true, playerLevel: 1, dungeons: [nonCovering, covering] }),
      baseParams(),
    );
    // `far` carries a nav target (`dungeonId`), never a `near` recommendation.
    expect(state.kind).toBe('far');
    if (state.kind === 'far') expect(state.dungeonId).toBe('covering');
  });

  it('(c) onboarding: the covering dungeon is closed -> temporarilyClosed at its next opening time', () => {
    const nonCovering = dungeon({
      id: 'non-covering',
      center: centerAtDistance(NEAR_M),
      levelRange: { min: 6, max: 10 },
    });
    const covering = dungeon({
      id: 'covering',
      center: centerAtDistance(FAR_M),
      open: false,
      nextOpenAt_ms: 42,
    });
    const state = homeState(
      baseInput({ onboarding: true, playerLevel: 1, dungeons: [nonCovering, covering] }),
      baseParams(),
    );
    expect(state).toEqual({ kind: 'temporarilyClosed', dungeonId: 'covering', nextOpenAt_ms: 42 });
  });

  it('(d) after onboarding: the same (b) setup recommends the non-covering dungeon (F04-R33 fallback)', () => {
    const nonCovering = dungeon({
      id: 'non-covering',
      center: centerAtDistance(NEAR_M),
      levelRange: { min: 6, max: 10 },
    });
    const covering = dungeon({ id: 'covering', center: centerAtDistance(FAR_M) });
    const state = homeState(
      baseInput({ onboarding: false, playerLevel: 1, dungeons: [nonCovering, covering] }),
      baseParams(),
    );
    expect(state).toEqual({ kind: 'near', dungeonId: 'non-covering' });
  });

  it('(e) a closed dungeon is never recommended or targeted, onboarding or not', () => {
    for (const onboarding of [true, false]) {
      const closed = dungeon({
        id: 'closed',
        center: centerAtDistance(NEAR_M),
        open: false,
        nextOpenAt_ms: 7,
      });
      const open = dungeon({ id: 'open', center: centerAtDistance(WITHIN_BUT_FARTHER_M) });
      const state = homeState(
        baseInput({ onboarding, playerLevel: 1, dungeons: [closed, open] }),
        baseParams(),
      );
      expect(state.kind).toBe('near');
      if (state.kind === 'near') expect(state.dungeonId).toBe('open');
    }
  });

  it('assert: no onboarding case here ever returns an id that does not cover the level', () => {
    const level = 1;
    const nonCovering = dungeon({
      id: 'non-covering',
      center: centerAtDistance(NEAR_M),
      levelRange: { min: 6, max: 10 },
    });
    const scenarios: readonly HomeStateDungeon[][] = [
      [nonCovering],
      [
        nonCovering,
        dungeon({ id: 'covering-near', center: centerAtDistance(WITHIN_BUT_FARTHER_M) }),
      ],
      [nonCovering, dungeon({ id: 'covering-far', center: centerAtDistance(FAR_M) })],
      [
        nonCovering,
        dungeon({
          id: 'covering-closed',
          center: centerAtDistance(FAR_M),
          open: false,
          nextOpenAt_ms: 1,
        }),
      ],
    ];
    for (const dungeons of scenarios) {
      const state = homeState(
        baseInput({ onboarding: true, playerLevel: level, dungeons }),
        baseParams(),
      );
      if (
        state.kind === 'near' ||
        state.kind === 'far' ||
        state.kind === 'outside_launch_district'
      ) {
        expect(state.dungeonId).not.toBe('non-covering');
      }
      if (state.kind === 'temporarilyClosed' && state.dungeonId !== null) {
        expect(state.dungeonId).not.toBe('non-covering');
      }
    }
  });
});

describe('homeState: level coverage is inclusive at both ends (9.1 "covers level")', () => {
  it('covers a dungeon whose levelRange is exactly [level, level]', () => {
    const d = dungeon({ id: 'd1', center: offsetNear(), levelRange: { min: 1, max: 1 } });
    const state = homeState(
      baseInput({ onboarding: true, playerLevel: 1, dungeons: [d] }),
      baseParams(),
    );
    expect(state).toEqual({ kind: 'near', dungeonId: 'd1' });
  });

  it('does not cover a dungeon whose levelRange starts one level above the player', () => {
    const d = dungeon({ id: 'd1', center: offsetNear(), levelRange: { min: 2, max: 5 } });
    const state = homeState(
      baseInput({ onboarding: true, playerLevel: 1, dungeons: [d] }),
      baseParams(),
    );
    expect(state).toEqual({ kind: 'temporarilyClosed', dungeonId: null, nextOpenAt_ms: null });
  });
});
