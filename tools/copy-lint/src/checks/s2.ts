/** S2 — no "chosen one" language anywhere (style-guide กฎ 1, section 6.1). */
import type { LintContext } from '../context';
import type { LintIssue } from '../types';
import { fail } from '../types';
import { scanCheck } from './word-scan-runner';

export function checkS2(ctx: LintContext): LintIssue[] {
  const issues = [...scanCheck(ctx, 'S2')];
  if (ctx.names === undefined) {
    return issues;
  }
  for (const name of ctx.names) {
    for (const source of ctx.words.W1) {
      if (new RegExp(source, 'u').test(name)) {
        issues.push(
          fail('names.th.json', 'S2', `ชื่อ "${name}" มีคำต้องห้ามกฎข้อ 1 (W1): "${source}"`),
        );
      }
    }
  }
  return issues;
}
