/** S8 — world-forbidden words: W2c, W4, W5, W7 by voice; W6 inside enhance./shop./market. (style-guide 6.2, 6.4-6.7). */
import type { LintContext } from '../context';
import type { LintIssue } from '../types';
import { scanCheck } from './word-scan-runner';

export function checkS8(ctx: LintContext): LintIssue[] {
  return [...scanCheck(ctx, 'S8')];
}
