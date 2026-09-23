/**
 * Everything a check function needs, built once per lint run. Checks are pure functions of
 * this context so they can be unit-tested with small fixtures (docs/tech/copy-schema.md 8.1).
 */
import type { CopyEntry, CopyMeta, CopyRules, CopyVariable } from '@keep-walking/shared';
import { copyEntries, copyMeta, copyVariables } from '@keep-walking/shared';
import { findDuplicateTopLevelKeys } from './io';
import { nameLeafStrings } from './names';
import type { WordList } from './words';

export interface LintContext {
  readonly repoRoot: string;
  readonly copyRaw: string;
  readonly copyJson: unknown;
  readonly entries: ReadonlyMap<string, CopyEntry>;
  readonly variables: ReadonlyMap<string, CopyVariable>;
  readonly meta: CopyMeta | undefined;
  readonly duplicateTopLevelKeys: readonly string[];
  readonly rules: CopyRules;
  readonly words: WordList;
  /** `undefined` when config/content/names.th.json does not exist yet (copy-schema 8.1). */
  readonly names: readonly string[] | undefined;
}

export function buildContext(input: {
  readonly repoRoot: string;
  readonly copyRaw: string;
  readonly copyJson: unknown;
  readonly rules: CopyRules;
  readonly words: WordList;
  readonly namesJson: unknown | undefined;
}): LintContext {
  return {
    repoRoot: input.repoRoot,
    copyRaw: input.copyRaw,
    copyJson: input.copyJson,
    entries: copyEntries(input.copyJson),
    variables: copyVariables(input.copyJson),
    meta: copyMeta(input.copyJson),
    duplicateTopLevelKeys: findDuplicateTopLevelKeys(input.copyRaw),
    rules: input.rules,
    words: input.words,
    names: input.namesJson === undefined ? undefined : nameLeafStrings(input.namesJson),
  };
}
