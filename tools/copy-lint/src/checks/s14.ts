/**
 * S14 — death, raidFail, and enhanceFail must offer exactly 2 alternatives (style-guide 3.4).
 * The alts themselves are already scanned by S2-S12 (word-scan-runner.ts scans every entry's
 * `alts`, not just its `text`), so this file only checks the count.
 */
import type { LintContext } from '../context';
import { fail, type LintIssue } from '../types';

const REQUIRED_ALT_BEATS = new Set(['death', 'raidFail', 'enhanceFail']);
const REQUIRED_ALT_COUNT = 2;

export function checkS14(ctx: LintContext): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const [key, entry] of ctx.entries) {
    if (entry.beat !== undefined && REQUIRED_ALT_BEATS.has(entry.beat)) {
      const count = entry.alts?.length ?? 0;
      if (count !== REQUIRED_ALT_COUNT) {
        issues.push(
          fail(
            key,
            'S14',
            `beat "${entry.beat}" ต้องมี alts พอดี ${REQUIRED_ALT_COUNT} รายการ (มี ${count})`,
          ),
        );
      }
    }
  }
  return issues;
}
