/** S3 — profanity level allowed per voice, and the `<speaker>: ` line format (style-guide 6, 6.2). */
import type { LintContext } from '../context';
import type { LintIssue } from '../types';
import { scanCheck } from './word-scan-runner';

export function checkS3(ctx: LintContext): LintIssue[] {
  return [...scanCheck(ctx, 'S3')];
}
