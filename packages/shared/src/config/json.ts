// Typed config accessor (ADR 0003 section 8.4 exports, board P2-F05-T02 TL B-06).
// No Ajv, no `new Function`, no schema compiler: plain code checks type and range so this
// module can run unchanged in a Worker (C1-4). Keys starting with "_" are metadata (source
// notes, assumptions) and are never readable as values. `null` means "not set yet, do not
// guess" and fails loudly with a dedicated error instead of returning a default.
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

/** Thrown when a config value is present but explicitly `null` ("no value yet"). */
export class ConfigUnsetError extends Error {
  constructor(path: string) {
    super(`config value is not set yet (null), refusing to guess: ${path}`);
    this.name = 'ConfigUnsetError';
  }
}

/** Thrown when a path does not resolve: missing key, metadata key, or not an object to walk. */
export class ConfigPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigPathError';
  }
}

/** Thrown when a resolved value does not have the type the caller asked for. */
export class ConfigTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigTypeError';
  }
}

function isJsonObject(value: Json | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Walks a dotted path. Refuses metadata keys ("_..."): code can never read one by mistake. */
export function getPath(root: JsonObject, path: string): Json {
  let node: Json = root;
  for (const key of path.split('.')) {
    if (key.startsWith('_')) {
      throw new ConfigPathError(`refusing to read metadata key "${key}" in path "${path}"`);
    }
    if (!isJsonObject(node) || !(key in node)) {
      throw new ConfigPathError(`config path not found: ${path}`);
    }
    node = node[key] as Json;
  }
  return node;
}

/** Same as getPath, but a `null` value fails loudly with ConfigUnsetError. */
export function required(root: JsonObject, path: string): Exclude<Json, null> {
  const value = getPath(root, path);
  if (value === null) throw new ConfigUnsetError(path);
  return value as Exclude<Json, null>;
}

export function num(root: JsonObject, path: string): number {
  const value = required(root, path);
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ConfigTypeError(`config value is not a finite number: ${path}`);
  }
  return value;
}

/** Like num, but a `null` value is a real answer ("no value", not "not set yet"). */
export function numOrNull(root: JsonObject, path: string): number | null {
  const value = getPath(root, path);
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ConfigTypeError(`config value is not a finite number or null: ${path}`);
  }
  return value;
}

export function str(root: JsonObject, path: string): string {
  const value = required(root, path);
  if (typeof value !== 'string') {
    throw new ConfigTypeError(`config value is not a string: ${path}`);
  }
  return value;
}

export function bool(root: JsonObject, path: string): boolean {
  const value = required(root, path);
  if (typeof value !== 'boolean') {
    throw new ConfigTypeError(`config value is not a boolean: ${path}`);
  }
  return value;
}

export function numArray(root: JsonObject, path: string): number[] {
  const value = required(root, path);
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'number')) {
    throw new ConfigTypeError(`config value is not a number array: ${path}`);
  }
  return value as number[];
}

export function strArray(root: JsonObject, path: string): string[] {
  const value = required(root, path);
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new ConfigTypeError(`config value is not a string array: ${path}`);
  }
  return value as string[];
}

/** Non-metadata keys of an object value (skips every key starting with "_"). */
export function valueKeys(root: JsonObject, path: string): string[] {
  const value = required(root, path);
  if (!isJsonObject(value)) {
    throw new ConfigTypeError(`config value is not an object: ${path}`);
  }
  return Object.keys(value).filter((k) => !k.startsWith('_'));
}
