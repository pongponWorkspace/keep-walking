import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CopyRules } from '@keep-walking/shared';
import { buildContext, type LintContext } from '../src/context';
import { loadWordList } from '../src/words';
import realRules from '../../../config/content/copy-rules.json';

const here = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(here, '../../..');
export const words = loadWordList(resolve(here, '../words.json'));
export const rules = realRules as unknown as CopyRules;

/**
 * Same areas/limits as the real copy-rules.json, minus `limits.buttonFullWidth` (D-050):
 * that list names a specific real key (`run.summaryContinue`), which most fixtures below
 * do not define. Tests about buttonFullWidth itself import `rules` (the real file) instead.
 */
export const minimalRules: CopyRules = (() => {
  const clone = JSON.parse(JSON.stringify(rules)) as Omit<CopyRules, 'limits'> & {
    limits: Record<string, unknown>;
  };
  delete clone.limits['buttonFullWidth'];
  return clone as unknown as CopyRules;
})();

export interface EntryFixture {
  readonly text: string;
  readonly voice: string;
  readonly kind: string;
  readonly context?: string;
  readonly cells?: number;
  readonly cellsFirstLine?: number;
  readonly alts?: readonly string[];
  readonly altOf?: string;
  readonly beat?: string;
}

/** A minimal but schema-shaped copy.th.json: `_meta` + `_variables` + whatever entries you pass. */
export function fixtureFile(
  entries: Record<string, EntryFixture>,
  overrides: {
    readonly meta?: Record<string, unknown>;
    readonly variables?: Record<string, unknown>;
  } = {},
): Record<string, unknown> {
  return {
    _meta: {
      file: 'copy.th.json',
      owner: 'narrative-designer',
      task: 'TEST',
      version: 1,
      doc: 'test',
      ...overrides.meta,
    },
    _variables: {
      autoRetreatPct: { maxCells: 2, example: '25', source: 'test' },
      count: { maxCells: 4, example: '3', source: 'test' },
      distanceText: { maxCells: 8, example: '650 ม.', source: 'test' },
      ...overrides.variables,
    },
    ...entries,
  };
}

export function contextFor(
  entries: Record<string, EntryFixture>,
  overrides?: Parameters<typeof fixtureFile>[1],
  namesJson?: unknown,
  rulesOverride: CopyRules = minimalRules,
): LintContext {
  const file = fixtureFile(entries, overrides);
  return buildContext({
    repoRoot,
    copyRaw: JSON.stringify(file),
    copyJson: file,
    rules: rulesOverride,
    words,
    namesJson,
  });
}
