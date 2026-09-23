/**
 * Typed access to tools/copy-lint/words.json (design/narrative/style-guide.md section 8.1).
 * Content is owned by narrative-designer; this module only gives it a shape. Every string in
 * the file is a RegExp *source* with the `u` flag (words.json#_meta._note).
 */
import { readFileSync } from 'node:fs';

interface FailWarnList {
  readonly fail: readonly string[];
  readonly warn: readonly string[];
}

export interface WordList {
  readonly W1: readonly string[];
  readonly W2a: { readonly all: readonly string[]; readonly characterAllowed: readonly string[] };
  readonly W2b: readonly string[];
  readonly W2bWarn: readonly string[];
  readonly W2c: FailWarnList;
  readonly W2d: readonly string[];
  readonly W2e: {
    readonly evasiveSpellingFail: readonly string[];
    readonly obfuscationWarnPattern: string;
  };
  readonly W3: readonly string[];
  readonly W4: readonly string[];
  readonly W5a: FailWarnList;
  readonly W5b: FailWarnList;
  readonly W5c: FailWarnList;
  readonly W5d: readonly string[];
  readonly W6: readonly string[];
  readonly W7: FailWarnList;
  readonly W8: Readonly<Record<string, readonly string[]>>;
  readonly latinAllowlist: {
    readonly caseInsensitive: readonly string[];
    readonly caseSensitive: readonly string[];
  };
  readonly dayNames: Readonly<Record<string, readonly string[]>>;
  readonly politeEndings: {
    readonly fail: readonly string[];
    readonly warn: readonly string[];
    readonly forbiddenAddressTerms: readonly string[];
  };
  readonly jokeSignals: {
    readonly repeatedFivePattern: string;
    readonly haPatterns: readonly string[];
  };
}

export function loadWordList(path: string): WordList {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as WordList;
}

/** Every full/short Thai day name across all weekdays, flattened for substring search. */
export function allDayNames(words: WordList): readonly string[] {
  return Object.values(words.dayNames).flat();
}

/**
 * Build a single regexp that matches any of `sources` (as regex sources) inside `text`, or
 * `undefined` when there is nothing to search for. Callers scan for a match with `.exec`.
 */
export function anyOf(sources: readonly string[]): RegExp | undefined {
  if (sources.length === 0) {
    return undefined;
  }
  return new RegExp(sources.join('|'), 'u');
}
