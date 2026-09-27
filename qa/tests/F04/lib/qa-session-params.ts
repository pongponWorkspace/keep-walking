// Shared harness for P2-F04-T22 (black-box F04): builds a real `SessionParams` — the exact
// `SessionConfig` `apps/client` ships (via its own `buildSessionConfig()`, never reinvented here)
// plus a small set of QA-only `SessionDungeonRecord`s — so every test in this folder drives
// `createSession`/`sessionStep` (the public interface `@keep-walking/shared/session` exports),
// never the internal `run`/`reward` reducers directly (tech-lead N-08, task context: "trace-replay
// must go through the session public interface, not internals").
//
// `buildSessionConfig`/`buildDungeonRecord` are imported by relative path from `apps/client/src`
// (a real shipped module, not a dev test file — reading it here does not modify it, same
// convention `qa/tests/F02` already uses for `@keep-walking/location`'s public classes). QA's own
// polygons (`TEST_RECT_POLYGON`, `qa-rect-overlap-b`) come from `qa/tests/traces` /
// `tools/traces/src/places` (read-only), not re-typed by hand.
import { TEST_RECT } from '../../../../tools/traces/src/places';
import { QA_OVERLAP_RECT } from '../../traces/lib/overlap-polygon';
import { buildSessionConfig, buildDungeonRecord } from '../../../../apps/client/src/session/config';
import type { ArtifactDungeon } from '../../../../apps/client/src/dungeons/artifact';
import type {
  SessionConfig,
  SessionDungeonRecord,
  SessionParams,
} from '@keep-walking/shared/session';

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

/** A minimal, valid `ArtifactDungeon` for a QA-only rectangle — every field `buildDungeonRecord`
 * reads, nothing `sessionStep` does not use (name/label/search keys are never read by the engine,
 * only by the map/UI layer this harness never touches). */
function qaArtifactDungeon(
  id: string,
  rect: {
    readonly south: number;
    readonly north: number;
    readonly west: number;
    readonly east: number;
  },
  openingHours: SessionDungeonRecord['opening_hours'],
): ArtifactDungeon {
  return {
    id,
    name_key: `qa.dungeon.${id}`,
    preset: 'qaRect',
    level_range: { min: 1, max: 60 },
    drop_table_id: 'largeParkDefault',
    verification_mode: 'continuous_gps',
    floor_level: null,
    area_m2: 10_000,
    bbox: [rect.west, rect.south, rect.east, rect.north],
    geometry: rectGeometry(rect) as unknown as ArtifactDungeon['geometry'],
    label_point: undefined,
    nav_destination: { point: [rect.west, rect.south], source: 'entrance' },
    search_name_key: `qa.dungeon.${id}.search`,
    opening_hours: openingHours,
  };
}

export const QA_RECT_DUNGEON_ID = 'qa-session-rect';
export const QA_OVERLAP_DUNGEON_ID = 'qa-session-overlap-rect';

/** `SessionParams` with the two QA rectangles (`TEST_RECT`, `qa-rect-overlap-b`) both always open,
 * real `SessionConfig` (config/balance/*.json through the client's own accessor). */
export function qaSessionParams(): SessionParams {
  const config: SessionConfig = buildSessionConfig();
  const rect = qaArtifactDungeon(QA_RECT_DUNGEON_ID, TEST_RECT, ALWAYS_OPEN);
  const overlap = qaArtifactDungeon(QA_OVERLAP_DUNGEON_ID, QA_OVERLAP_RECT, ALWAYS_OPEN);
  return {
    config,
    dungeons: {
      [QA_RECT_DUNGEON_ID]: buildDungeonRecord(rect),
      [QA_OVERLAP_DUNGEON_ID]: buildDungeonRecord(overlap),
    },
  };
}

/** Same `TEST_RECT` rectangle, but with a caller-supplied `opening_hours` — for F04-C08 (dungeon
 * closes mid-run). `params` from `qaSessionParams()` are otherwise untouched (same config, same
 * overlap dungeon still present so overlap tests and closing-hours tests never need two builders). */
export function qaSessionParamsWithClosableRect(
  openingHours: SessionDungeonRecord['opening_hours'],
): { readonly params: SessionParams; readonly dungeonId: string } {
  const base = qaSessionParams();
  const id = 'qa-session-closable-rect';
  const dungeon = qaArtifactDungeon(id, TEST_RECT, openingHours);
  return {
    params: {
      config: base.config,
      dungeons: { ...base.dungeons, [id]: buildDungeonRecord(dungeon) },
    },
    dungeonId: id,
  };
}
