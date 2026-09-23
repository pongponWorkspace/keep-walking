// Config loader for the balance simulator.
// Reads config/balance/*.json only (P1-F03-T07). Keys starting with "_" are metadata and are
// never returned as values. A null or missing value throws: the simulator never guesses.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = { [key: string]: Json };

export const BALANCE_FILES = [
  'anticheat',
  'classes',
  'combat',
  'drops',
  'dungeons',
  'economy',
  'enhance',
  'equipment',
  'progression',
  'raid',
  'unlocks',
] as const;
export type BalanceFile = (typeof BALANCE_FILES)[number];
export type BalanceConfig = Record<BalanceFile, JsonObject>;

/** Repo root resolved from this file (tools/sim/src/config.ts). */
export const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
export const BALANCE_DIR = `${REPO_ROOT}config/balance/`;

function isObject(value: Json | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readJsonFile(path: string): Json {
  return JSON.parse(readFileSync(path, 'utf8')) as Json;
}

/** Loads every balance file. Throws if a file is missing or is not a JSON object. */
export function loadBalanceConfig(dir: string = BALANCE_DIR): BalanceConfig {
  const out: Partial<BalanceConfig> = {};
  for (const name of BALANCE_FILES) {
    const parsed = readJsonFile(`${dir}${name}.json`);
    if (!isObject(parsed)) {
      throw new Error(`config/balance/${name}.json is not a JSON object`);
    }
    out[name] = parsed;
  }
  return out as BalanceConfig;
}

/** Walks a dotted path. Refuses metadata keys so code can never read a "_" key by mistake. */
export function getPath(root: JsonObject, path: string): Json {
  let node: Json = root;
  for (const key of path.split('.')) {
    if (key.startsWith('_')) {
      throw new Error(`refusing to read metadata key "${key}" in path "${path}"`);
    }
    if (!isObject(node) || !(key in node)) {
      throw new Error(`config path not found: ${path}`);
    }
    node = node[key] as Json;
  }
  return node;
}

export function num(root: JsonObject, path: string): number {
  const value = getPath(root, path);
  if (value === null) {
    throw new Error(`config value is null (no value yet, do not guess): ${path}`);
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`config value is not a finite number: ${path}`);
  }
  return value;
}

export function str(root: JsonObject, path: string): string {
  const value = getPath(root, path);
  if (typeof value !== 'string') {
    throw new Error(`config value is not a string: ${path}`);
  }
  return value;
}

export function numArray(root: JsonObject, path: string): number[] {
  const value = getPath(root, path);
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'number')) {
    throw new Error(`config value is not a number array: ${path}`);
  }
  return value as number[];
}

export function strArray(root: JsonObject, path: string): string[] {
  const value = getPath(root, path);
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new Error(`config value is not a string array: ${path}`);
  }
  return value as string[];
}

/** Non-metadata keys of an object (skips every key starting with "_"). */
export function valueKeys(root: JsonObject, path: string): string[] {
  const value = getPath(root, path);
  if (!isObject(value)) {
    throw new Error(`config value is not an object: ${path}`);
  }
  return Object.keys(value).filter((k) => !k.startsWith('_'));
}
