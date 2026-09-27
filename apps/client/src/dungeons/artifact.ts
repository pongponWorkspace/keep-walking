/**
 * The one place `apps/client` reads `data/dungeons/artifact/dungeons.client.v1.json` (tech note F04
 * section 13): builds the `SessionDungeonRecord` map `session/config.ts` needs, and the map's view
 * model (`kw-dungeons`/`kw-dungeon-labels`, tech note F02 15.2 / D-075) via
 * `map/dungeons-source.ts#setDungeonsSourceData`. This file never invents a `name`/`status` field
 * itself: `name` resolves `name_key` through `copy/load.ts` (names.th.json is loaded the same way,
 * P1 convention), `status` resolves through `selectOpening` (`@keep-walking/shared/session`,
 * P2-X10) — never a literal.
 */
import artifactJson from '../../../../data/dungeons/artifact/dungeons.client.v1.json';
import { getCopyText } from '../copy/load';
import { selectOpening } from '@keep-walking/shared/session';
import type { SessionDungeonRecord, SessionParams } from '@keep-walking/shared/session';
import type { DungeonGeometry, DungeonInput, DungeonStatus } from '../map/dungeons-source';

export interface NavDestination {
  readonly point: readonly [number, number];
  readonly source: 'entrance' | 'label_point';
}

export interface ArtifactDungeon {
  readonly id: string;
  readonly name_key: string;
  readonly preset: string;
  readonly level_range: { readonly min: number; readonly max: number };
  readonly drop_table_id: string;
  readonly verification_mode: string;
  readonly floor_level: number | null;
  readonly area_m2: number;
  readonly bbox: readonly [number, number, number, number];
  readonly geometry: DungeonGeometry;
  readonly label_point: readonly [number, number] | undefined;
  readonly nav_destination: NavDestination;
  readonly search_name_key: string;
  readonly opening_hours: SessionDungeonRecord['opening_hours'];
}

export interface DungeonArtifact {
  readonly format: string;
  readonly format_version: number;
  readonly dungeons: readonly ArtifactDungeon[];
}

/** Fails loudly (CLAUDE.md "config comes from config, fail loudly") rather than silently playing
 * with an empty or wrong-shaped dungeon set. */
export function loadDungeonArtifact(raw: unknown = artifactJson): DungeonArtifact {
  const file = raw as Partial<DungeonArtifact>;
  if (file.format !== 'kw-dungeons-client' || file.format_version !== 1) {
    throw new Error('dungeons artifact: unexpected format/format_version');
  }
  if (!Array.isArray(file.dungeons)) {
    throw new Error('dungeons artifact: missing dungeons array');
  }
  // The committed artifact is `tools/dungeons`' own validated, deterministic build output (RFC
  // 7946 rewound rings, `--check`ed in `pnpm test`) — trusted shape, cast rather than re-validated
  // structurally here (this module is the read side, not the build-time validator).
  return {
    format: file.format,
    format_version: file.format_version,
    dungeons: file.dungeons as unknown as readonly ArtifactDungeon[],
  };
}

/** `params` (built by `session/config.ts#buildSessionParams` from this same artifact) is passed in
 * rather than a bare UTC offset now: `selectOpening` looks the dungeon back up by id in
 * `params.dungeons`, the single source `sessionStep` itself uses (never a second, hand-rolled
 * opening-hours evaluation, CLAUDE.md "never fork the logic"). */
export function dungeonStatus(
  dungeon: ArtifactDungeon,
  params: SessionParams,
  now_ms: number,
): DungeonStatus {
  return selectOpening(dungeon.id, now_ms, params).open ? 'open' : 'closed';
}

/** The map source's per-dungeon input (tech note F02 15.2, D-089: `label_count` is never set in
 * Phase 2 — no player counts anywhere). `name`/`status` are resolved, never raw artifact fields. */
export function toMapDungeonInput(
  dungeon: ArtifactDungeon,
  params: SessionParams,
  now_ms: number,
): DungeonInput {
  return {
    id: dungeon.id,
    name: getCopyText(dungeon.name_key),
    geometry: dungeon.geometry,
    status: dungeonStatus(dungeon, params, now_ms),
    sponsored: false,
  };
}
