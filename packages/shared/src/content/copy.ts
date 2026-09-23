/**
 * Types and pure readers for `copy.<locale>.json` (docs/tech/copy-schema.md sections 2, 5, 7).
 * Pure and server-safe: no DOM, no Node, no validation (the JSON Schema in
 * ../../schemas/copy.schema.json validates structure; Ajv only runs in tools/ and tests
 * because Workers forbid `new Function`). Both the copy lint and the client import this file
 * so the flat-key-map contract can never drift between them.
 */

export const COPY_VOICES = ['system', 'research', 'character', 'command', 'legal'] as const;
export type CopyVoice = (typeof COPY_VOICES)[number];

export const COPY_KINDS = ['message', 'button', 'label', 'push', 'dialogue', 'command'] as const;
export type CopyKind = (typeof COPY_KINDS)[number];

export const COPY_BEATS = ['hpLow', 'autoRetreat', 'death', 'raidFail', 'enhanceFail'] as const;
export type CopyBeat = (typeof COPY_BEATS)[number];

/** `<area>.<name>` opaque key. The file is a flat map: never split this on `.` (copy-schema 2.1). */
export const COPY_KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;

/** `voice` values allowed for each `kind` (copy-schema 3.1 / style-guide 4.4). */
export const ALLOWED_VOICES_BY_KIND: Readonly<Record<CopyKind, readonly CopyVoice[]>> = {
  message: ['system', 'research', 'legal'],
  button: ['system', 'legal'],
  label: ['system', 'research', 'legal'],
  push: ['system'],
  dialogue: ['character'],
  command: ['command'],
};

/** One item of `copy.<locale>.json` (copy-schema 2.2). */
export interface CopyEntry {
  readonly text: string;
  readonly voice: CopyVoice;
  readonly kind: CopyKind;
  readonly context: string;
  readonly cells?: number;
  readonly cellsFirstLine?: number;
  readonly alts?: readonly string[];
  readonly altOf?: string;
  readonly beat?: CopyBeat;
}

/** `{ keys, reason }` used by `_meta.numericExceptions` and `_meta.dayNameExceptions`. */
export interface CopyExceptionList {
  readonly keys: readonly string[];
  readonly reason: string;
}

/** `_meta` of `copy.<locale>.json` (copy-schema 2.1, ADR 0001 3.10.2). */
export interface CopyMeta {
  readonly file: string;
  readonly owner: string;
  readonly task: string;
  readonly version?: number;
  readonly doc?: string;
  readonly numericExceptions?: readonly CopyExceptionList[];
  readonly dayNameExceptions?: CopyExceptionList;
  /** Documentation only (copy-schema 0): lint and client both skip parsing this. */
  readonly gpsStateMap?: Readonly<Record<string, unknown>>;
}

/** One entry of the `_variables` registry (copy-schema 5.2). */
export interface CopyVariable {
  readonly maxCells: number;
  readonly example: string;
  readonly source: string;
  readonly configKey?: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Flat `key -> CopyEntry` view of a parsed `copy.<locale>.json`. Skips `_`-prefixed keys
 * (`_meta`, `_variables`, and any other metadata note). Does not split keys on `.` and
 * does not validate shape (copy-schema 2.1, 7): validate with copy.schema.json first.
 */
export function copyEntries(file: unknown): ReadonlyMap<string, CopyEntry> {
  const entries = new Map<string, CopyEntry>();
  if (!isPlainObject(file)) {
    return entries;
  }
  for (const [key, value] of Object.entries(file)) {
    if (key.startsWith('_')) {
      continue;
    }
    if (isPlainObject(value)) {
      entries.set(key, value as unknown as CopyEntry);
    }
  }
  return entries;
}

/** `name -> CopyVariable` view of `file._variables`. Does not validate shape. */
export function copyVariables(file: unknown): ReadonlyMap<string, CopyVariable> {
  const variables = new Map<string, CopyVariable>();
  if (!isPlainObject(file)) {
    return variables;
  }
  const raw = file['_variables'];
  if (!isPlainObject(raw)) {
    return variables;
  }
  for (const [name, value] of Object.entries(raw)) {
    if (isPlainObject(value)) {
      variables.set(name, value as unknown as CopyVariable);
    }
  }
  return variables;
}

/** `file._meta`, or `undefined` when absent or not an object. Does not validate shape. */
export function copyMeta(file: unknown): CopyMeta | undefined {
  if (!isPlainObject(file)) {
    return undefined;
  }
  const raw = file['_meta'];
  return isPlainObject(raw) ? (raw as unknown as CopyMeta) : undefined;
}
