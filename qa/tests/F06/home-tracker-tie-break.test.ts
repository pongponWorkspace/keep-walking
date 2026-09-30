/**
 * P2-F06-T21 (board handoff from P2-H20): "3A เป้าหมายเดียว + tie-break" — F06-R37 item 2.3
 * (`design/features/F06-hp-damage-onboarding.md`): when the onboarding "no level-covering dungeon
 * is open anywhere" fallback has to pick one nearest candidate among several closed dungeons at an
 * exact distance tie, the order must be deterministic: opens sooner wins first, then the lower
 * `dungeon_id` wins. `apps/client/src/dungeons/home-tracker.ts`'s own doc comment
 * (`buildDungeons`) documents this exact rule and how it pre-sorts before handing the array to
 * `home-state.ts#nearest` (which itself only promises "stable, keeps the earlier one" on a tie) —
 * this is the QA black-box case that proves the documented contract holds through the real,
 * exported `HomeTracker` class end to end, not just by reading the two files' comments. Neither
 * `apps/client/src/dungeons/home-tracker.test.ts` (dev unit test, not owned by QA) nor
 * `home-state.test.ts` names this tie-break directly.
 */
import { describe, expect, it } from 'vitest';
import type { PolygonGeometry } from '@keep-walking/geo';
import { loadDungeonArtifact } from '../../../apps/client/src/dungeons/artifact';
import type { ArtifactDungeon } from '../../../apps/client/src/dungeons/artifact';
import { buildSessionParams } from '../../../apps/client/src/session/config';
import { HomeTracker } from '../../../apps/client/src/dungeons/home-tracker';
import type {
  HomeTrackerConfig,
  HomeTrackerInput,
} from '../../../apps/client/src/dungeons/home-tracker';

const artifact = loadDungeonArtifact();
const firstDungeon = artifact.dungeons[0];
if (firstDungeon === undefined) throw new Error('fixture: artifact has no dungeons');
const real: ArtifactDungeon = firstDungeon;

const PLAYER_AT = { lat: 13.75, lng: 100.5 };
// Monday 2026-09-28 00:30 Bangkok local (UTC+7) -- same Monday every other Phase 2 spec pins
// (f04-closed-dungeon.spec.ts's own START_MONDAY comment), early enough that every weekly opening
// window below is still in the future *today*, never rolling into "opens tomorrow" territory.
const NOW_MS = Date.UTC(2026, 8, 27, 17, 30, 0);

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
// A huge inverse mask (outer ring around the world, hole around the player) -- same shape
// home-tracker.test.ts's own PLAY_AREA uses -- so every fixture dungeon below is inside the play
// area regardless of how far it is from the player.
const PLAY_AREA: PolygonGeometry = {
  type: 'Polygon',
  coordinates: [
    squareAround(PLAYER_AT, 20).coordinates[0] as never,
    squareAround(PLAYER_AT, 2).coordinates[0] as never,
  ],
};
// ~5.5 km from the player -- comfortably beyond farDungeonThreshold_m (1900) -- identical for both
// fixture dungeons below, so their `distance_m` is bit-for-bit equal, a real tie, not an
// approximation.
const FAR_GEOMETRY = squareAround({ lat: PLAYER_AT.lat + 0.05, lng: PLAYER_AT.lng }, 0.001);

function closedMonday(openAtMinute: number): ArtifactDungeon['opening_hours'] {
  return { weekly: { '1': [[openAtMinute, 1440]] } };
}

function fixtureDungeon(id: string, openAtMinute: number): ArtifactDungeon {
  return {
    ...real,
    id,
    geometry: FAR_GEOMETRY as never, // same cast home-tracker.test.ts's own nearDungeonFixture uses
    level_range: { min: 1, max: 60 },
    opening_hours: closedMonday(openAtMinute),
  };
}

function config(): HomeTrackerConfig {
  return {
    farDungeonThreshold_m: 1900,
    maxAccuracy_m: 100,
    sustainedPoorAccuracy_s: 30,
    reevaluateDistance_m: 200,
    playAreaMask: PLAY_AREA,
    launchAreaMask: null,
  };
}

function onboardingInput(): HomeTrackerInput {
  return {
    now_ms: NOW_MS,
    locationConsentGranted: true,
    permissionDenied: false,
    position: { lat: PLAYER_AT.lat, lng: PLAYER_AT.lng, accuracy_m: 10 },
    playerLevel: 1,
    onboarding: true,
  };
}

describe('R37 item 2.3 tie-break: equal distance -> opens sooner wins -> then lower dungeon_id', () => {
  it('two closed dungeons at the exact same distance: the one opening sooner is chosen', () => {
    const opensSoon = fixtureDungeon('z-opens-at-1am', 60); // 01:00
    const opensLater = fixtureDungeon('a-opens-at-2am', 120); // 02:00
    const params = buildSessionParams([opensSoon, opensLater]);
    // Order in the input array must not matter either -- try both orders.
    for (const dungeons of [
      [opensSoon, opensLater],
      [opensLater, opensSoon],
    ]) {
      const tracker = new HomeTracker({ dungeons, sessionParams: params }, config());
      const state = tracker.evaluate(onboardingInput());
      expect(state.kind).toBe('temporarilyClosed');
      if (state.kind === 'temporarilyClosed') {
        // The one opening at 01:00 wins even though its id ('z-...') sorts *after* the other's
        // ('a-...') alphabetically -- opening time is checked first, id only breaks a further tie.
        expect(state.dungeonId).toBe('z-opens-at-1am');
      }
    }
  });

  it('two closed dungeons at the exact same distance AND the same opening time: the lower dungeon_id wins', () => {
    const dungeonA = fixtureDungeon('alpha-dungeon', 60);
    const dungeonZ = fixtureDungeon('zulu-dungeon', 60); // identical opening time
    const params = buildSessionParams([dungeonA, dungeonZ]);
    for (const dungeons of [
      [dungeonA, dungeonZ],
      [dungeonZ, dungeonA],
    ]) {
      const tracker = new HomeTracker({ dungeons, sessionParams: params }, config());
      const state = tracker.evaluate(onboardingInput());
      expect(state.kind).toBe('temporarilyClosed');
      if (state.kind === 'temporarilyClosed') {
        expect(state.dungeonId).toBe('alpha-dungeon');
      }
    }
  });
});
