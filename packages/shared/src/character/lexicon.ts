/**
 * Resolves the dotted lexicon paths character.json points at (`lexiconRef`, `termsKey`,
 * `fallbackKey`, `patternKey`, `template[]`, `allow.*.key` — tech note F10 section 7.2) into the
 * loaded content file (or the vector fixture in the same shape). Every path is caller-resolved
 * data, never a key name this module hardcodes (CLAUDE.md non-negotiable 3).
 */
import type { Lexicon } from './types';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Walks `path` ("a.b.c") into `lexicon`. Throws on a missing or non-object intermediate step —
 * config-lint validates every path at lint time, so a failure here is a real config bug, not a
 * player-triggerable error. */
export function resolveLexiconPath(lexicon: Lexicon, path: string): unknown {
  let node: unknown = lexicon;
  for (const key of path.split('.')) {
    if (!isPlainObject(node) || !(key in node)) {
      throw new Error(`character lexicon: path "${path}" not found (at "${key}")`);
    }
    node = node[key];
  }
  return node;
}

function asStringList(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string')) {
    throw new Error(`character lexicon: "${path}" must resolve to a list of strings`);
  }
  return value;
}

/** A `lexiconPath` that must resolve to a plain string list (`random.template[]`,
 * `random.fallbackKey`, `banned.modes.*.termsKey` with `collect: "array"`, `banned.allow.*.key`). */
export function resolveStringList(lexicon: Lexicon, path: string): string[] {
  return asStringList(resolveLexiconPath(lexicon, path), path);
}

/** A `lexiconPath` that must resolve to a single string (`random.patternKey`). */
export function resolveLexiconString(lexicon: Lexicon, path: string): string {
  const value = resolveLexiconPath(lexicon, path);
  if (typeof value !== 'string') {
    throw new Error(`character lexicon: "${path}" must resolve to a string`);
  }
  return value;
}

/** `banned.modes.*.termsKey` with `collect: "categoryArrays"`: every object value whose key does
 * not start with `_` is itself a string list; this flattens every category into one combined
 * list (categories are for human review only, tech note F10 section 7.3). */
export function resolveCategoryArraysFlat(lexicon: Lexicon, path: string): string[] {
  const node = resolveLexiconPath(lexicon, path);
  if (!isPlainObject(node)) {
    throw new Error(`character lexicon: "${path}" must resolve to an object of string lists`);
  }
  const out: string[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('_')) continue;
    out.push(...asStringList(value, `${path}.${key}`));
  }
  return out;
}
