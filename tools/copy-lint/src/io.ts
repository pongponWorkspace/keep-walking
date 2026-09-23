/**
 * File loading for the copy lint: reads config/content/copy.th.json etc. from disk, and scans
 * the raw JSON text for duplicate top-level keys, since `JSON.parse` silently keeps the last
 * one (docs/tech/copy-schema.md section 2.1).
 */
import { existsSync, readFileSync } from 'node:fs';

export class MissingFileError extends Error {
  constructor(readonly path: string) {
    super(`Required file not found: ${path}`);
    this.name = 'MissingFileError';
  }
}

export interface LoadedJsonFile {
  readonly path: string;
  readonly raw: string;
  readonly json: unknown;
}

/** Read and JSON.parse `path`. Throws MissingFileError when the file does not exist. */
export function loadJsonFile(path: string): LoadedJsonFile {
  if (!existsSync(path)) {
    throw new MissingFileError(path);
  }
  const raw = readFileSync(path, 'utf8');
  return { path, raw, json: JSON.parse(raw) as unknown };
}

/** Same as loadJsonFile, but returns `undefined` instead of throwing when the file is absent. */
export function loadOptionalJsonFile(path: string): LoadedJsonFile | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  return loadJsonFile(path);
}

/**
 * Every top-level object key that appears in `rawJson`, in file order, *including repeats*.
 * A minimal hand-rolled scanner (not JSON.parse, which silently drops the earlier duplicate).
 * Tracks string literals (with `\"` escapes) and object/array nesting depth; a key is any
 * string found at depth 1 that is immediately followed (after whitespace) by `:`.
 */
export function findTopLevelKeys(rawJson: string): readonly string[] {
  const keys: string[] = [];
  let depth = 0;
  let i = 0;
  const n = rawJson.length;
  while (i < n) {
    const ch = rawJson[i];
    if (ch === '"') {
      const stringResult = readJsonString(rawJson, i);
      if (depth === 1) {
        let j = stringResult.endIndex;
        while (j < n && isJsonWhitespace(rawJson[j])) {
          j += 1;
        }
        if (rawJson[j] === ':') {
          keys.push(stringResult.value);
        }
      }
      i = stringResult.endIndex;
      continue;
    }
    if (ch === '{' || ch === '[') {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth -= 1;
      i += 1;
      continue;
    }
    i += 1;
  }
  return keys;
}

/** Top-level keys that appear more than once in `rawJson` (order of first repeat). */
export function findDuplicateTopLevelKeys(rawJson: string): readonly string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const key of findTopLevelKeys(rawJson)) {
    if (seen.has(key) && !duplicates.includes(key)) {
      duplicates.push(key);
    }
    seen.add(key);
  }
  return duplicates;
}

function isJsonWhitespace(ch: string | undefined): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';
}

/** `text[start]` must be the opening `"`. Returns the unescaped value and the index after the closing `"`. */
function readJsonString(text: string, start: number): { value: string; endIndex: number } {
  let i = start + 1;
  let literal = '"';
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      literal += ch + (text[i + 1] ?? '');
      i += 2;
      continue;
    }
    literal += ch;
    if (ch === '"') {
      i += 1;
      break;
    }
    i += 1;
  }
  return { value: JSON.parse(literal) as string, endIndex: i };
}

/**
 * Resolve a copy-schema 5.3 `configKey` pointer (`"config/balance/x.json#a.b.c"`, or
 * `"x.json#a.b.c"` for the same folder as `baseDir`) against files already on disk.
 * Returns true when the file exists and the dotted path resolves to a defined value.
 */
export function configKeyResolves(configKey: string, repoRoot: string): boolean {
  const hashIndex = configKey.indexOf('#');
  if (hashIndex === -1) {
    return false;
  }
  const filePart = configKey.slice(0, hashIndex);
  const pathPart = configKey.slice(hashIndex + 1);
  const filePath = filePart.includes('/')
    ? `${repoRoot}/${filePart}`
    : `${repoRoot}/config/content/${filePart}`;
  const file = loadOptionalJsonFile(filePath);
  if (!file) {
    return false;
  }
  let current: unknown = file.json;
  for (const segment of pathPart.split('.')) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return false;
    }
    if (!(segment in current)) {
      return false;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current !== undefined;
}
