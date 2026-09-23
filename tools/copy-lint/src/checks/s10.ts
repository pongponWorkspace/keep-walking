/** S10 — nothing from the 8 "don't teach in the first 10 minutes" word groups in `onboarding.*` (style-guide 6.8). */
import type { LintContext } from '../context';
import type { LintIssue } from '../types';
import { scanCheck } from './word-scan-runner';

export function checkS10(ctx: LintContext): LintIssue[] {
  return [...scanCheck(ctx, 'S10')];
}
