/**
 * `{variable}` handling for copy text (docs/tech/copy-schema.md sections 4.1, 4.2, 5).
 * Pure and server-safe: no DOM, no Node, no config, no numeric limits (limits live in
 * config/content/copy-rules.json and are read by the caller, never hardcoded here).
 */

import type { CopyVariable } from './copy';

/** `{name}` where `name` matches `^[a-z][a-zA-Z0-9]*$` (copy-schema 5.1). No format spec. */
const VARIABLE_SOURCE = '\\{([a-z][a-zA-Z0-9]*)\\}';

function variablePattern(): RegExp {
  // A fresh RegExp per call: a shared `g` regexp would carry lastIndex state across calls.
  return new RegExp(VARIABLE_SOURCE, 'g');
}

/** Thrown by fillTemplate/fillWithMaxCells when `text` uses a variable with no known value. */
export class MissingCopyVariableError extends Error {
  readonly variableName: string;
  readonly text: string;

  constructor(variableName: string, text: string) {
    super(`Missing copy variable "{${variableName}}" while filling "${text}"`);
    this.name = 'MissingCopyVariableError';
    this.variableName = variableName;
    this.text = text;
  }
}

/** Every distinct `{name}` referenced in `text`, in order of first appearance. */
export function extractVariables(text: string): readonly string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(variablePattern())) {
    const name = match[1];
    if (name !== undefined) {
      seen.add(name);
    }
  }
  return [...seen];
}

/**
 * True when `text` has a `{` or `}` that is not part of a well-formed `{name}` variable
 * (copy-schema 2.2: "ห้าม `{` `}` ที่ไม่ใช่ตัวแปร"). Used by S7.
 */
export function hasUnbalancedBraces(text: string): boolean {
  const withoutVariables = text.replace(variablePattern(), '');
  return withoutVariables.includes('{') || withoutVariables.includes('}');
}

/** Replace every `{name}` in `text` with `values[name]`. Throws when a value is missing. */
export function fillTemplate(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(variablePattern(), (_match, name: string) => {
    const value = values[name];
    if (value === undefined) {
      throw new MissingCopyVariableError(name, text);
    }
    return value;
  });
}

/** The worst-case filler character used to measure display cells (copy-schema 4.2). */
const CELL_FILLER_CHAR = 'ก';

/**
 * Replace every `{name}` in `text` with `variables.get(name).maxCells` filler characters,
 * for measuring the worst-case display width (copy-schema 4.2, used by S4). Throws when
 * `text` references a variable that is not registered in `_variables`.
 */
export function fillWithMaxCells(
  text: string,
  variables: ReadonlyMap<string, CopyVariable>,
): string {
  return text.replace(variablePattern(), (_match, name: string) => {
    const variable = variables.get(name);
    if (variable === undefined) {
      throw new MissingCopyVariableError(name, text);
    }
    return CELL_FILLER_CHAR.repeat(variable.maxCells);
  });
}
