// Shared types of tools/config-lint (P2-F04-T24, ADR 0001 3.10, D-062).

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

/** The three config namespaces (ADR 0001 3.10.1). */
export type Namespace = 'balance' | 'content' | 'app';
export const NAMESPACES: readonly Namespace[] = ['balance', 'content', 'app'];

export interface ConfigFile {
  readonly namespace: Namespace;
  /** File name without `.json`, e.g. `dungeons`, `copy.th`. */
  readonly name: string;
  /** Repo-relative path with forward slashes, e.g. `config/balance/dungeons.json`. */
  readonly path: string;
  readonly data: Json;
}

/**
 * error = fails `pnpm test`. warn = printed, never fails (ADR 0001 3.10.7: an undeclared
 * `null` is a WARN because accessors already throw ConfigUnsetError when it is read).
 */
export type Level = 'error' | 'warn';

export type RuleId =
  | 'json-parse'
  | 'schema-missing'
  | 'schema'
  | 'top-level-object'
  | 'meta-missing'
  | 'meta-field'
  | 'meta-nested'
  | 'source-missing'
  | 'key-case'
  | 'unit-suffix'
  | 'ratio-range'
  | 'local-time'
  | 'pointer'
  | 'pointer-name'
  | 'null-undeclared'
  | 'null-means'
  | 'cross-file';

export interface Finding {
  readonly level: Level;
  readonly rule: RuleId;
  /** Repo-relative config path. */
  readonly file: string;
  /** Dotted path inside the file (`movementGate.window_s`, `brackets[0].rate_pct`), '' = root. */
  readonly at: string;
  readonly message: string;
}

export function isObject(value: Json | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Keys starting with `_` are metadata and are skipped by loaders (ADR 0001 3.10.4). */
export function isMetaKey(key: string): boolean {
  return key.startsWith('_');
}

/** `seeFile` or `see` + UpperCamel name is a pointer, not a value (ADR 0001 3.10.6). */
export function isPointerKey(key: string): boolean {
  return key === 'seeFile' || /^see[A-Z]/.test(key);
}

export function joinPath(parent: string, key: string): string {
  return parent === '' ? key : `${parent}.${key}`;
}
