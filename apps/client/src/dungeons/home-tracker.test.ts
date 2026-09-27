import { describe, expect, it } from 'vitest';
import type { PolygonGeometry } from '@keep-walking/geo';
import { loadDungeonArtifact } from './artifact';
import type { ArtifactDungeon } from './artifact';
import { buildSessionParams } from '../session/config';
import { HomeTracker } from './home-tracker';
import type { HomeTrackerConfig, HomeTrackerInput } from './home-tracker';

const artifact = loadDungeonArtifact();
const params = buildSessionParams(artifact.dungeons);
const firstDungeon = artifact.dungeons[0];
if (firstDungeon === undefined) throw new Error('fixture: artifact has no dungeons');
// `typeof firstDungeon` above would still be `ArtifactDungeon | undefined` (a `typeof` type query
// reads the declared type, not the narrowing this `if` just proved) — a fresh, explicitly-typed
// `const` is what actually carries the narrowed type into every closure below.
const real: ArtifactDungeon = firstDungeon;

const PLAYER_AT = { lat: 13.75, lng: 100.5 };

function squareAround(center: { lat: number; lng: number }, half_deg: number): PolygonGeometry {
  const { lat, lng } = center;
  return {
    type: 'Polygon',
    coordinates: [
      [
        [lng - half_deg, lat - half_deg],
        [lng + half_deg, lat - half_deg],
        [lng + half_deg, lat + half_deg],
        [lng - half_deg, lat + half_deg],
        [lng - half_deg, lat - half_deg],
      ],
    ],
  };
}

// A huge inverse mask (outer ring around the world, hole around the player) so every fixture point
// below is comfortably "in the play area" (home-state.test.ts's own `PLAY_AREA` pattern).
const PLAY_AREA: PolygonGeometry = {
  type: 'Polygon',
  coordinates: [
    squareAround(PLAYER_AT, 20).coordinates[0] as never,
    squareAround(PLAYER_AT, 2).coordinates[0] as never,
  ],
};

function nearDungeonFixture(): ArtifactDungeon {
  return { ...real, geometry: squareAround(PLAYER_AT, 0.0005) as never };
}

function config(overrides: Partial<HomeTrackerConfig> = {}): HomeTrackerConfig {
  return {
    farDungeonThreshold_m: 1900,
    maxAccuracy_m: 100,
    sustainedPoorAccuracy_s: 30,
    reevaluateDistance_m: 200,
    playAreaMask: PLAY_AREA,
    launchAreaMask: null,
    ...overrides,
  };
}

function input(overrides: Partial<HomeTrackerInput> = {}): HomeTrackerInput {
  return {
    now_ms: 0,
    locationConsentGranted: true,
    permissionDenied: false,
    position: { lat: PLAYER_AT.lat, lng: PLAYER_AT.lng, accuracy_m: 10 },
    playerLevel: 1,
    onboarding: false,
    ...overrides,
  };
}

describe('HomeTracker', () => {
  it('is unknown with no location consent', () => {
    const tracker = new HomeTracker(
      { dungeons: [nearDungeonFixture()], sessionParams: params },
      config(),
    );
    expect(tracker.evaluate(input({ locationConsentGranted: false })).kind).toBe('unknown');
  });

  it('recommends the near dungeon by id when one is open in range', () => {
    const tracker = new HomeTracker(
      { dungeons: [nearDungeonFixture()], sessionParams: params },
      config(),
    );
    const state = tracker.evaluate(input());
    expect(['near', 'temporarilyClosed']).toContain(state.kind);
  });

  it('tracks poorAccuracySince_ms across calls: unknown only once sustained', () => {
    const tracker = new HomeTracker(
      { dungeons: [nearDungeonFixture()], sessionParams: params },
      config(),
    );
    const bad = { lat: PLAYER_AT.lat, lng: PLAYER_AT.lng, accuracy_m: 500 };
    const first = tracker.evaluate(input({ now_ms: 0, position: bad }));
    expect(first.kind).not.toBe('unknown');
    const later = tracker.evaluate(input({ now_ms: 31_000, position: bad }));
    expect(later.kind).toBe('unknown');
  });

  it('resets poorAccuracySince_ms once accuracy is good again', () => {
    const tracker = new HomeTracker(
      { dungeons: [nearDungeonFixture()], sessionParams: params },
      config(),
    );
    const bad = { lat: PLAYER_AT.lat, lng: PLAYER_AT.lng, accuracy_m: 500 };
    tracker.evaluate(input({ now_ms: 0, position: bad }));
    tracker.evaluate(input({ now_ms: 5_000 }));
    const later = tracker.evaluate(input({ now_ms: 40_000, position: bad }));
    expect(later.kind).not.toBe('unknown');
  });

  it('throttles recomputation: a tiny move keeps the previously committed result', () => {
    const dungeon = nearDungeonFixture();
    const tracker = new HomeTracker({ dungeons: [dungeon], sessionParams: params }, config());
    const first = tracker.evaluate(input({ now_ms: 0 }));
    const moved = tracker.evaluate(
      input({
        now_ms: 1000,
        position: { lat: PLAYER_AT.lat + 0.0000001, lng: PLAYER_AT.lng, accuracy_m: 10 },
      }),
    );
    expect(moved).toBe(first);
  });

  it('recomputes once the position moves past reevaluateDistance_m', () => {
    const dungeon = nearDungeonFixture();
    const tracker = new HomeTracker({ dungeons: [dungeon], sessionParams: params }, config());
    tracker.evaluate(input({ now_ms: 0 }));
    const far = tracker.evaluate(
      input({
        now_ms: 1000,
        position: { lat: PLAYER_AT.lat + 10, lng: PLAYER_AT.lng + 10, accuracy_m: 10 },
      }),
    );
    expect(far.kind).toBe('out_of_area');
  });

  it('current reflects the last committed HomeState', () => {
    const tracker = new HomeTracker(
      { dungeons: [nearDungeonFixture()], sessionParams: params },
      config(),
    );
    expect(tracker.current).toBeUndefined();
    const state = tracker.evaluate(input());
    expect(tracker.current).toBe(state);
  });
});
