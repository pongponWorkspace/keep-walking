// Discovers and parses every config file under config/{balance,content,app}/ (ADR 0001 3.10.1).
// Read-only: no code writes to config/ (ADR 0001 3.10.2).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NAMESPACES, type ConfigFile, type Finding, type Json } from './types';

const JSON_EXT = '.json';

export interface LoadResult {
  readonly files: readonly ConfigFile[];
  readonly findings: readonly Finding[];
}

/** Loads config files from `<repoRoot>/config`. Files that fail to parse become findings. */
export function loadConfigFiles(repoRoot: string): LoadResult {
  const files: ConfigFile[] = [];
  const findings: Finding[] = [];
  for (const namespace of NAMESPACES) {
    const dir = join(repoRoot, 'config', namespace);
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries.filter((e) => e.endsWith(JSON_EXT)).sort()) {
      const path = `config/${namespace}/${entry}`;
      const name = entry.slice(0, -JSON_EXT.length);
      try {
        const data = JSON.parse(readFileSync(join(dir, entry), 'utf8')) as Json;
        files.push({ namespace, name, path, data });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        findings.push({
          level: 'error',
          rule: 'json-parse',
          file: path,
          at: '',
          message: `not valid JSON: ${reason}`,
        });
      }
    }
  }
  return { files, findings };
}

/** Schema path for a config file: packages/shared/schemas/config/<ns>/<name>.schema.json. */
export function schemaPathFor(file: Pick<ConfigFile, 'namespace' | 'name'>): string {
  return `packages/shared/schemas/config/${file.namespace}/${file.name}.schema.json`;
}
