// Reading data/dungeons/ and checking it against packages/shared/schemas/dungeon.schema.json.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import type { FeatureCollection } from 'geojson';
import type { BuildConfig } from './context';
import type { DungeonGeometry, Issue, SourceFile, SourceRecord } from './types';

const FILE_ID = '(file)';

export interface SchemaValidators {
  source: ValidateFunction;
  artifact: ValidateFunction;
}

export function compileSchemas(schemaPath: string): SchemaValidators {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8')) as { $id: string };
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  ajv.addSchema(schema);
  const source = ajv.getSchema(schema.$id);
  const artifact = ajv.getSchema(`${schema.$id}#/$defs/artifactFile`);
  if (!source || !artifact) throw new Error(`cannot compile ${schemaPath}`);
  return { source, artifact };
}

export function schemaIssues(errors: ErrorObject[] | null | undefined, data: unknown): Issue[] {
  return (errors ?? []).map((e) => {
    const m = /^\/dungeons\/([0-9]+)/.exec(e.instancePath);
    const records = (data as { dungeons?: { id?: unknown }[] }).dungeons;
    const rec = m ? records?.[Number(m[1])] : undefined;
    const id = rec && typeof rec.id === 'string' ? rec.id : FILE_ID;
    return {
      id,
      code: 'schema',
      severity: 'error' as const,
      message: `${e.instancePath || '/'} ${e.message ?? 'is invalid'}`,
    };
  });
}

export interface LoadedSource {
  /** null when data/dungeons/dungeons.json does not exist yet (P2-F04-T13 pending). */
  file: SourceFile | null;
  issues: Issue[];
}

/**
 * Load the source file, validate it against the schema, and attach geometry from
 * `geometry_files` to records that do not carry it inline. Records are not reordered here.
 */
export function loadSource(
  root: string,
  build: BuildConfig,
  validators: SchemaValidators,
): LoadedSource {
  const path = resolve(root, build.paths.source);
  if (!existsSync(path)) return { file: null, issues: [] };
  const data: unknown = JSON.parse(readFileSync(path, 'utf8'));
  return checkSource(data, validators, (name) => {
    const p = resolve(dirname(path), name);
    return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as FeatureCollection) : null;
  });
}

/** Schema check + geometry attachment on already parsed data (used by tests with fixtures). */
export function checkSource(
  data: unknown,
  validators: SchemaValidators,
  readGeometryFile: (name: string) => FeatureCollection | null = () => null,
): LoadedSource {
  if (!validators.source(data)) {
    return { file: null, issues: schemaIssues(validators.source.errors, data) };
  }
  const file = structuredClone(data) as SourceFile;
  const issues: Issue[] = [];
  const byId = new Map<string, DungeonGeometry>();
  for (const name of file.geometry_files ?? []) {
    const fc = readGeometryFile(name);
    if (!fc) {
      issues.push({ id: FILE_ID, code: 'geometry_file_missing', severity: 'error', message: name });
      continue;
    }
    for (const f of fc.features) {
      const id = f.properties?.['id'];
      const g = f.geometry;
      if (typeof id === 'string' && g && (g.type === 'Polygon' || g.type === 'MultiPolygon')) {
        if (byId.has(id)) {
          issues.push({ id, code: 'geometry_duplicate', severity: 'error', message: name });
        }
        byId.set(id, g);
      }
    }
  }
  file.dungeons = file.dungeons.map((r: SourceRecord) => {
    if (r.geometry) {
      if (byId.has(r.id)) {
        issues.push({
          id: r.id,
          code: 'geometry_duplicate',
          severity: 'error',
          message: 'inline geometry and a geometry_files feature',
        });
      }
      return r;
    }
    const g = byId.get(r.id);
    return g ? { ...r, geometry: g } : r;
  });
  return { file, issues };
}
