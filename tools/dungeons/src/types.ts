// Types of the dungeon source records (data/dungeons/dungeons.json) and the client artifact.
// Contract: packages/shared/schemas/dungeon.schema.json, docs/tech/F04-dungeon-presence.md 8, 13.
import type { MultiPolygon, Polygon, Position } from 'geojson';

export type DungeonGeometry = Polygon | MultiPolygon;
export type LngLat = [number, number];

/** [start_min, end_min) local minutes after midnight. */
export type Interval = [number, number];
export type IsoWeekday = '1' | '2' | '3' | '4' | '5' | '6' | '7';
export type Weekly = Record<IsoWeekday, Interval[]>;

export interface HoursException {
  date: string;
  intervals: Interval[];
  note?: string;
}

export type SourceHours =
  | { source: 'osm'; osm: string; exceptions?: HoursException[]; note?: string }
  | {
      source: 'manual';
      weekly: Weekly;
      exceptions?: HoursException[];
      osm?: string;
      reason: string;
    }
  | { source: 'manual_required'; osm?: string; note?: string };

export interface Entrance {
  point: LngLat;
  evidence: 'osm_footway' | 'field_photo' | 'field_visit' | 'pending';
  note?: string;
}

export interface ReviewAck {
  flag: string;
  ref: string;
  note?: string;
}

export type RecordStatus = 'draft' | 'review' | 'published' | 'retired';

export interface SourceRecord {
  id: string;
  status: RecordStatus;
  name_key: string | null;
  search_name_key: string | null;
  name_real?: string | null;
  osm_id?: string | null;
  osm_tags?: Record<string, string>;
  geometry_source?: 'osm' | 'osm_edited' | 'manual';
  preset: string;
  level_range: { min: number; max: number };
  drop_table_id: string;
  verification_mode: string;
  floor_level: number | null;
  geometry?: DungeonGeometry;
  entrance: Entrance | null;
  opening_hours: SourceHours;
  temporary?: { expires_on: string } | null;
  review_acknowledged?: ReviewAck[];
  notes?: string;
}

export interface SourceFile {
  $schema?: string;
  _meta?: Record<string, unknown>;
  format: 'kw-dungeons-source';
  format_version: 1;
  geometry_files?: string[];
  dungeons: SourceRecord[];
}

export interface ArtifactHours {
  source: 'osm' | 'manual';
  weekly: Weekly;
  exceptions: HoursException[];
}

export interface ArtifactDungeon {
  id: string;
  name_key: string;
  preset: string;
  level_range: { min: number; max: number };
  drop_table_id: string;
  verification_mode: 'continuous_gps';
  floor_level: null;
  area_m2: number;
  bbox: [number, number, number, number];
  geometry: DungeonGeometry;
  label_point: LngLat;
  nav_destination: { point: LngLat; source: 'entrance' | 'label_point' };
  search_name_key: string;
  opening_hours: ArtifactHours;
}

export interface ArtifactFile {
  format: 'kw-dungeons-client';
  format_version: 1;
  source_sha256: string;
  attribution: string[];
  dungeons: ArtifactDungeon[];
}

export type Severity = 'error' | 'review' | 'warning';

/** One validator finding. `review` = needs an acknowledgement before publishing. */
export interface Issue {
  id: string;
  code: string;
  severity: Severity;
  message: string;
}

export type { Position };
