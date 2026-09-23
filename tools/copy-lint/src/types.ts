/** One finding of the copy lint. One line of output per issue (docs/tech/copy-schema.md 8.1). */
export type LintLevel = 'FAIL' | 'WARN';

export interface LintIssue {
  /** Copy key the issue is about, or `<file>` for a whole-file issue (e.g. missing _meta). */
  readonly key: string;
  /** Check id, e.g. "S1". */
  readonly check: string;
  readonly level: LintLevel;
  readonly message: string;
}

export function fail(key: string, check: string, message: string): LintIssue {
  return { key, check, level: 'FAIL', message };
}

export function warn(key: string, check: string, message: string): LintIssue {
  return { key, check, level: 'WARN', message };
}
