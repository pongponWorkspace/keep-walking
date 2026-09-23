/** S11 — no emoji or "this is a joke" tells; at most one `!`; no trailing period (style-guide กฎ 3, 1.2). */
import type { LintContext } from '../context';
import type { LintIssue } from '../types';
import { scanCheck } from './word-scan-runner';

export function checkS11(ctx: LintContext): LintIssue[] {
  return [...scanCheck(ctx, 'S11')];
}
