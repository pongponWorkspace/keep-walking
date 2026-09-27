// Schema scaffold for a NEW config file (tech-lead): prints a starting JSON Schema inferred from
// the file's current values. The output is a starting point only; the checked-in schema is then
// curated by hand (ranges, enums, non-negotiables), so never regenerate over an existing schema.
//   pnpm --filter @keep-walking/tools-config-lint run scaffold config/balance/<name>.json
import { readFileSync } from 'node:fs';
import { hasUnitSuffix } from './units';
import { isMetaKey, isObject, isPointerKey, type Json, type JsonObject } from './types';

type Schema = { [key: string]: unknown };

const SCHEMA_BASE = 'https://keep-walking.invalid/schemas/config';
const COMMON = '../common.schema.json#/$defs';
const SUFFIX_DEF: ReadonlyArray<readonly [RegExp, string]> = [
  [/_m2$/, 'squareMeters'],
  [/_ms$/, 'milliseconds'],
  [/_m$/, 'meters'],
  [/_s$/, 'seconds'],
  [/_min$/, 'minutes'],
  [/_deg$/, 'degrees'],
  [/_bytes$/, 'bytes'],
  [/_h$/, 'hours'],
  [/_days$/, 'days'],
  [/_yr$/, 'years'],
  [/_kmh$/, 'kmh'],
  [/_ratio$/, 'ratio'],
  [/_gold$/, 'gold'],
  [/_levels$/, 'levels'],
  [/_pct$/, 'pct'],
  [/_pct[A-Z][A-Za-z]*$/, 'pctOf'],
];

function unitRef(key: string): Schema | null {
  if (!hasUnitSuffix(key)) return null;
  const found = SUFFIX_DEF.find(([pattern]) => pattern.test(key));
  return found === undefined ? null : { $ref: `${COMMON}/${found[1]}` };
}

function leafSchema(key: string, value: Json): Schema {
  if (value === null) return { type: ['number', 'null'] };
  if (typeof value === 'boolean') return { type: 'boolean' };
  if (typeof value === 'string') return { type: 'string', minLength: 1 };
  if (typeof value === 'number') {
    const ref = unitRef(key);
    if (ref !== null) return ref;
    return Number.isInteger(value) && value >= 0
      ? { type: 'integer', minimum: 0 }
      : { type: 'number' };
  }
  return {};
}

function arraySchema(key: string, value: Json[]): Schema {
  if (value.length === 0) return { type: 'array' };
  if (value.every(isObject)) {
    const objects = value as JsonObject[];
    const merged: JsonObject = Object.assign({}, ...objects) as JsonObject;
    const shared = Object.keys(merged).filter((k) => !isMetaKey(k) && objects.every((o) => k in o));
    const items = objectSchema(merged, false);
    items['required'] = shared;
    return { type: 'array', minItems: 1, items };
  }
  const first = value[0] as Json;
  return { type: 'array', items: leafSchema(key, first) };
}

export function valueSchema(key: string, value: Json): Schema {
  if (Array.isArray(value)) return arraySchema(key, value);
  if (isObject(value)) return objectSchema(value, false);
  return leafSchema(key, value);
}

export function objectSchema(obj: JsonObject, isRoot: boolean): Schema {
  const properties: Schema = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key === '_meta' && isRoot) {
      properties[key] = { $ref: `${COMMON}/meta` };
      required.push(key);
    } else if (key === '_source') {
      properties[key] = { $ref: `${COMMON}/source` };
    } else if (key === '_nullMeans') {
      properties[key] = { $ref: `${COMMON}/nullMeans` };
    } else if (isMetaKey(key)) {
      continue;
    } else if (isPointerKey(key)) {
      properties[key] = { $ref: `${COMMON}/pointer` };
      required.push(key);
    } else {
      properties[key] = valueSchema(key, value);
      required.push(key);
    }
  }
  return { type: 'object', required, properties, patternProperties: { '^_': {} } };
}

export function scaffold(configPath: string): Schema {
  const data = JSON.parse(readFileSync(configPath, 'utf8')) as Json;
  if (!isObject(data)) throw new Error(`${configPath}: top level must be an object`);
  const rel = configPath
    .slice(configPath.indexOf('config/') + 'config/'.length)
    .replace(/\.json$/, '');
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `${SCHEMA_BASE}/${rel}.schema.json`,
    title: `config/${rel}.json`,
    ...objectSchema(data, true),
  };
}

const target = process.argv[2];
if (target !== undefined && import.meta.url === `file://${process.argv[1] ?? ''}`) {
  process.stdout.write(`${JSON.stringify(scaffold(target), null, 2)}\n`);
}
