/** S12 — the `system` register: no polite endings, no "ท่าน" (style-guide 1.2). */
import type { LintContext } from '../context';
import type { LintIssue } from '../types';
import { scanCheck } from './word-scan-runner';

export function checkS12(ctx: LintContext): LintIssue[] {
  return [...scanCheck(ctx, 'S12')];
}
