/**
 * P2-F06-T17 (board: "เพิ่ม trace + replay ผ่าน Mock สำหรับสถานะ home (far, out_of_area,
 * outside_launch_district, temporarilyClosed)"): black-box trace-replay of the real, exported
 * pure `homeState()` (`apps/client/src/home/home-state.ts`, P2-X27) — the exact function
 * `dungeons/home-tracker.ts` calls on every Mock/real position update (tech note F06 section 9).
 *
 * This drives `data/gps-traces/qa/qa-home-states-walk-01.trace.json` sample-by-sample (same shape
 * the client's LocationProvider/Mock replay hands the app) into `homeState()`, never re-deriving
 * the polygon/threshold logic by hand — only the trace's own coordinates and a synthetic
 * play-area/launch-area/dungeon triple built once, read-only, for this file.
 *
 * Not run through `sessionStep` or any anti-cheat gate on purpose: `home-state.ts`'s own doc
 * comment is explicit that this module is "display only — never decides a reward" (ADR 0003 3.3
 * item 2), so there is no movement gate, speed lock, or presence hysteresis to replay here, only
 * raw position -> panel state.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { homeState } from '../../../apps/client/src/home/home-state';
import type { HomeStateDungeon, HomeStateParams } from '../../../apps/client/src/home/home-state';
import { loadCommittedTrace, rectPolygon } from '../traces/lib/load-trace';

const START_EPOCH_MS = Date.UTC(2026, 9, 2, 5, 0, 0); // pinned start= (P2-F06-T10 lesson: no real-clock flakes)

// Synthetic play-area mask A, launch-area mask B (subset of A), one dungeon D1 inside B — see the
// trace file's own `meta.description` for the exact numbers this mirrors.
//
// `@keep-walking/geo#inPlayArea` reads the *real* playarea-mask.geojson convention (this module's
// own doc comment, `home-state.ts`'s doc comment section 9.2 "_note"): the mask's outer ring is a
// huge encompassing box and the actual playable area is a HOLE cut out of it (`inAHole && !pointInPolygon`)
// — a point only counts as "in the play area" when it falls inside a hole, never a bare outer ring.
// `farOrOutsideLaunchDistrict`'s launch-area check is a plain `pointInPolygon` on the *other* hand
// (home-state.ts source), so `LAUNCH_AREA` stays an ordinary single-ring rectangle.
const PLAY_AREA = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [-179, -80],
      [179, -80],
      [179, 80],
      [-179, 80],
      [-179, -80],
    ],
    [
      [100.4, 13.9],
      [100.46, 13.9],
      [100.46, 13.96],
      [100.4, 13.96],
      [100.4, 13.9],
    ],
  ],
};
const LAUNCH_AREA = rectPolygon({ south: 13.9, north: 13.93, west: 100.4, east: 100.43 });
const DUNGEON_GEOMETRY = rectPolygon({ south: 13.914, north: 13.916, west: 100.414, east: 100.416 });

function paramsOf(farDungeonThreshold_m: number): HomeStateParams {
  return {
    farDungeonThreshold_m,
    maxAccuracy_m: 100,
    sustainedPoorAccuracy_s: 30,
    playAreaMask: PLAY_AREA,
    launchAreaMask: LAUNCH_AREA,
  };
}

function dungeon(open: boolean): HomeStateDungeon {
  return {
    id: 'qa-home-state-dungeon',
    levelRange: { min: 1, max: 60 },
    geometry: DUNGEON_GEOMETRY,
    open,
    nextOpenAt_ms: open ? null : START_EPOCH_MS + 3600_000,
  };
}

describe('home-state trace-replay (P2-F06-T17, qa-home-states-walk-01)', () => {
  const trace = loadCommittedTrace('data/gps-traces/qa/qa-home-states-walk-01.trace.json');
  // config/balance/unlocks.json#home.farDungeonThreshold_m, read live, never hardcoded here.
  const unlocksJson = JSON.parse(
    readFileSync(`${new URL('../../../', import.meta.url).pathname}config/balance/unlocks.json`, 'utf8'),
  ) as { readonly home: { readonly farDungeonThreshold_m: number } };
  const params = paramsOf(unlocksJson.home.farDungeonThreshold_m);

  function positionAt(t_ms: number) {
    const s = trace.samples.find((x) => x.t === t_ms);
    if (s === undefined) throw new Error(`no sample at t=${t_ms}`);
    return { lat: s.lat, lng: s.lng, accuracy_m: s.accuracy };
  }

  it('leg 1 (far outside the play-area mask) -> out_of_area', () => {
    const result = homeState(
      {
        now_ms: START_EPOCH_MS,
        locationConsentGranted: true,
        permissionDenied: false,
        position: positionAt(0),
        poorAccuracySince_ms: null,
        playerLevel: 1,
        onboarding: false,
        dungeons: [dungeon(true)],
      },
      params,
    );
    expect(result).toEqual({ kind: 'out_of_area' });
  });

  it('leg 2 (inside play-area AND launch-area, far from the only dungeon) -> far', () => {
    const result = homeState(
      {
        now_ms: START_EPOCH_MS + 180000,
        locationConsentGranted: true,
        permissionDenied: false,
        position: positionAt(180000),
        poorAccuracySince_ms: null,
        playerLevel: 1,
        onboarding: false,
        dungeons: [dungeon(true)],
      },
      params,
    );
    expect(result.kind).toBe('far');
    if (result.kind === 'far') expect(result.dungeonId).toBe('qa-home-state-dungeon');
  });

  it('leg 3 (inside play-area, outside launch-area, far from the only dungeon) -> outside_launch_district', () => {
    const result = homeState(
      {
        now_ms: START_EPOCH_MS + 360000,
        locationConsentGranted: true,
        permissionDenied: false,
        position: positionAt(360000),
        poorAccuracySince_ms: null,
        playerLevel: 1,
        onboarding: false,
        dungeons: [dungeon(true)],
      },
      params,
    );
    expect(result).toEqual({
      kind: 'outside_launch_district',
      dungeonId: 'qa-home-state-dungeon',
      distance_m: expect.any(Number),
    });
  });

  it('leg 4, dungeon closed -> temporarilyClosed (not far: within threshold, just closed, H-E21)', () => {
    const result = homeState(
      {
        now_ms: START_EPOCH_MS + 540000,
        locationConsentGranted: true,
        permissionDenied: false,
        position: positionAt(540000),
        poorAccuracySince_ms: null,
        playerLevel: 1,
        onboarding: false,
        dungeons: [dungeon(false)],
      },
      params,
    );
    expect(result).toEqual({
      kind: 'temporarilyClosed',
      dungeonId: 'qa-home-state-dungeon',
      nextOpenAt_ms: START_EPOCH_MS + 3600_000,
    });
  });

  it('leg 4, same position, dungeon open -> near (control: proves leg 4 alone is not what drives temporarilyClosed)', () => {
    const result = homeState(
      {
        now_ms: START_EPOCH_MS + 540000,
        locationConsentGranted: true,
        permissionDenied: false,
        position: positionAt(540000),
        poorAccuracySince_ms: null,
        playerLevel: 1,
        onboarding: false,
        dungeons: [dungeon(true)],
      },
      params,
    );
    expect(result).toEqual({ kind: 'near', dungeonId: 'qa-home-state-dungeon' });
  });

  it('unknown wins over every other state when consent/permission is missing, regardless of position', () => {
    const result = homeState(
      {
        now_ms: START_EPOCH_MS + 540000,
        locationConsentGranted: false,
        permissionDenied: false,
        position: positionAt(540000),
        poorAccuracySince_ms: null,
        playerLevel: 1,
        onboarding: false,
        dungeons: [dungeon(true)],
      },
      params,
    );
    expect(result).toEqual({ kind: 'unknown' });
  });
});
