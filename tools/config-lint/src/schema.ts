// JSON Schema per config file (packages/shared/schemas/config/<ns>/<name>.schema.json).
// Ajv runs here only: tools, test and build, never in a Worker (ADR 0003 C1-4, D-087).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { schemaPathFor } from './files';
import { NAMESPACES, type ConfigFile, type Finding } from './types';

const SCHEMA_DIR = 'packages/shared/schemas';
const CONFIG_SCHEMA_DIR = `${SCHEMA_DIR}/config`;
const SCHEMA_EXT = '.schema.json';
/** Schemas outside schemas/config/ that config schemas reference by $id (copy-schema 7). */
const REFERENCED_SCHEMAS = ['copy.schema.json', 'copy-rules.schema.json'];
const MAX_ERRORS_PER_FILE = 20;

type SchemaDoc = { $id?: string } & Record<string, unknown>;

function readSchema(repoRoot: string, rel: string): SchemaDoc {
  return JSON.parse(readFileSync(join(repoRoot, rel), 'utf8')) as SchemaDoc;
}

/** Repo-relative paths of every per-file config schema (excluding common.schema.json). */
export function listConfigSchemas(repoRoot: string): string[] {
  const out: string[] = [];
  for (const namespace of NAMESPACES) {
    const dir = join(repoRoot, CONFIG_SCHEMA_DIR, namespace);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)
      .filter((e) => e.endsWith(SCHEMA_EXT))
      .sort()) {
      out.push(`${CONFIG_SCHEMA_DIR}/${namespace}/${entry}`);
    }
  }
  return out;
}

export function checkSchemas(repoRoot: string, files: readonly ConfigFile[]): Finding[] {
  const findings: Finding[] = [];
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    allowUnionTypes: true,
    // names.th.json entries use `required` inside oneOf branches (name XOR nameReal+nameSuffix).
    strictRequired: false,
    // `_source` / `_meta` are declared in `properties` and also matched by the `^_` catch-all.
    allowMatchingProperties: true,
  });
  ajv.addSchema(readSchema(repoRoot, `${CONFIG_SCHEMA_DIR}/common.schema.json`));
  for (const rel of REFERENCED_SCHEMAS) ajv.addSchema(readSchema(repoRoot, `${SCHEMA_DIR}/${rel}`));
  const schemaPaths = new Set(listConfigSchemas(repoRoot));
  for (const rel of schemaPaths) ajv.addSchema(readSchema(repoRoot, rel), rel);

  for (const file of files) {
    const rel = schemaPathFor(file);
    if (!schemaPaths.has(rel)) {
      findings.push({
        level: 'error',
        rule: 'schema-missing',
        file: file.path,
        at: '',
        message: `no schema at ${rel} (one schema per config file)`,
      });
      continue;
    }
    schemaPaths.delete(rel);
    const validate = ajv.getSchema(rel);
    if (validate === undefined) throw new Error(`schema ${rel} failed to compile`);
    if (validate(file.data)) continue;
    for (const error of (validate.errors ?? []).slice(0, MAX_ERRORS_PER_FILE)) {
      const at = error.instancePath.replace(/^\//, '').replaceAll('/', '.');
      const detail = error.params === undefined ? '' : ` ${JSON.stringify(error.params)}`;
      findings.push({
        level: 'error',
        rule: 'schema',
        file: file.path,
        at,
        message: `${error.message ?? 'schema error'}${detail}`,
      });
    }
  }
  for (const orphan of schemaPaths) {
    findings.push({
      level: 'error',
      rule: 'schema-missing',
      file: orphan,
      at: '',
      message: 'schema has no matching config file',
    });
  }
  return findings;
}
