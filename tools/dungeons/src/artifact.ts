// Client artifact (docs/tech/F04-dungeon-presence.md 13.2): whitelist only, dungeons sorted by id,
// fixed key order, no build time, no network. Serialized with number arrays inline so a diff
// shows one position per line.
import { createHash } from 'node:crypto';
import type { BuildConfig } from './context';
import type { ArtifactDungeon, ArtifactFile, SourceRecord } from './types';
import type { Prepared } from './validate';

const INDENT = '  ';

/** JSON with object keys sorted at every level (hash input only). */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** sha256 of the published source records (sorted by id, canonical JSON). */
export function sourceSha256(published: readonly SourceRecord[]): string {
  const sorted = [...published].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return createHash('sha256').update(canonicalJson(sorted)).digest('hex');
}

export function toArtifactDungeon(p: Prepared): ArtifactDungeon {
  const r = p.record;
  if (!p.hours || r.name_key === null || r.search_name_key === null) {
    throw new Error(`${r.id} is not publishable`);
  }
  return {
    id: r.id,
    name_key: r.name_key,
    preset: r.preset,
    level_range: { min: r.level_range.min, max: r.level_range.max },
    drop_table_id: r.drop_table_id,
    verification_mode: 'continuous_gps',
    floor_level: null,
    area_m2: p.area_m2,
    bbox: p.bbox,
    geometry: p.geometry,
    label_point: p.label_point,
    nav_destination: { point: p.nav_destination.point, source: p.nav_destination.source },
    search_name_key: r.search_name_key,
    opening_hours: {
      source: p.hours.source,
      weekly: p.hours.weekly,
      exceptions: p.hours.exceptions,
    },
  };
}

export function buildArtifact(publishable: readonly Prepared[], build: BuildConfig): ArtifactFile {
  const sorted = [...publishable].sort((a, b) =>
    a.record.id < b.record.id ? -1 : a.record.id > b.record.id ? 1 : 0,
  );
  return {
    format: 'kw-dungeons-client',
    format_version: 1,
    source_sha256: sourceSha256(sorted.map((p) => p.record)),
    attribution: [...build.attribution],
    dungeons: sorted.map(toArtifactDungeon),
  };
}

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'number');
}

function write(value: unknown, depth: number): string {
  const pad = INDENT.repeat(depth + 1);
  const close = INDENT.repeat(depth);
  if (isNumberArray(value)) return `[${value.map((n) => JSON.stringify(n)).join(', ')}]`;
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[\n${value.map((v) => pad + write(v, depth + 1)).join(',\n')}\n${close}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return '{}';
    const body = entries.map(([k, v]) => `${pad}${JSON.stringify(k)}: ${write(v, depth + 1)}`);
    return `{\n${body.join(',\n')}\n${close}}`;
  }
  return JSON.stringify(value);
}

/** Deterministic text of the artifact (insertion key order, LF, trailing newline). */
export function serializeArtifact(artifact: ArtifactFile): string {
  return `${write(artifact, 0)}\n`;
}
