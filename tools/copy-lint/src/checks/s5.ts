/** S5 — English only from the style-guide 5.1 allowlist, and never 3+ Latin tokens in a row. */
import type { LintContext } from '../context';
import type { LintIssue } from '../types';
import { scanCheck } from './word-scan-runner';

export function checkS5(ctx: LintContext): LintIssue[] {
  return [...scanCheck(ctx, 'S5')];
}
