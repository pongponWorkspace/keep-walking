// A second QA-only dungeon record with a caller-chosen `level_range`, for the one case in this
// folder that needs a specific range to reproduce a systems-designer golden vector exactly
// (`design/systems/test-vectors/tick-reward.json` `soloTickExp` level 1 in a 1-5 dungeon, P2-F05-T01
// source: "level 1 in a 1-5 dungeon (Z = 3)"). Mirrors `qaArtifactDungeon` in
// `qa/tests/F04/lib/qa-session-params.ts` (not exported there, so duplicated here rather than
// reaching into that file's internals) — same fields `buildDungeonRecord` reads, nothing more.
import { buildDungeonRecord } from '../../../../apps/client/src/session/config';
import type { ArtifactDungeon } from '../../../../apps/client/src/dungeons/artifact';
import type { SessionDungeonRecord } from '@keep-walking/shared/session';

const OPEN_ALL_DAY: readonly (readonly [number, number])[] = [[0, 1440]];
const ALWAYS_OPEN = {
  weekly: {
    '1': OPEN_ALL_DAY,
    '2': OPEN_ALL_DAY,
    '3': OPEN_ALL_DAY,
    '4': OPEN_ALL_DAY,
    '5': OPEN_ALL_DAY,
    '6': OPEN_ALL_DAY,
    '7': OPEN_ALL_DAY,
  },
} as const;

function rectGeometry(rect: {
  readonly south: number;
  readonly north: number;
  readonly west: number;
  readonly east: number;
}) {
  return {
    type: 'Polygon' as const,
    coordinates: [
      [
        [rect.west, rect.south],
        [rect.east, rect.south],
        [rect.east, rect.north],
        [rect.west, rect.north],
        [rect.west, rect.south],
      ],
    ],
  };
}

/** A QA rectangle dungeon record with the given `level_range` (everything else identical to
 * `qa-session-rect`: `largeParkDefault` drop table, always open, continuous_gps). */
export function customLevelRangeDungeonRecord(
  id: string,
  rect: {
    readonly south: number;
    readonly north: number;
    readonly west: number;
    readonly east: number;
  },
  levelRange: { readonly min: number; readonly max: number },
): SessionDungeonRecord {
  const dungeon: ArtifactDungeon = {
    id,
    name_key: `qa.dungeon.${id}`,
    preset: 'qaRect',
    level_range: levelRange,
    drop_table_id: 'largeParkDefault',
    verification_mode: 'continuous_gps',
    floor_level: null,
    area_m2: 10_000,
    bbox: [rect.west, rect.south, rect.east, rect.north],
    geometry: rectGeometry(rect) as unknown as ArtifactDungeon['geometry'],
    label_point: undefined,
    nav_destination: { point: [rect.west, rect.south], source: 'entrance' },
    search_name_key: `qa.dungeon.${id}.search`,
    opening_hours: ALWAYS_OPEN,
  };
  return buildDungeonRecord(dungeon);
}
