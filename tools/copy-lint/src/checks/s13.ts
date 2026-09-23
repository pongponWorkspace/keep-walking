/**
 * S13 — no name from names.th.json typed directly into copy.th.json; it must come through a
 * variable (non-negotiable 3, copy-schema section 1). WARN (not FAIL) when names.th.json does
 * not exist yet, per docs/tech/copy-schema.md 8.1: "names.th.json ไม่มี = WARN แล้วข้ามส่วนชื่อ".
 */
import type { LintContext } from '../context';
import { entryTexts } from '../text-utils';
import { fail, warn, type LintIssue } from '../types';

export function checkS13(ctx: LintContext): LintIssue[] {
  if (ctx.names === undefined) {
    return [warn('names.th.json', 'S13', 'ไม่พบ config/content/names.th.json ข้ามการตรวจชื่อ')];
  }
  const issues: LintIssue[] = [];
  for (const [key, entry] of ctx.entries) {
    for (const { label, text } of entryTexts(key, entry)) {
      for (const name of ctx.names) {
        if (name.length > 0 && text.includes(name)) {
          issues.push(fail(label, 'S13', `พบชื่อ "${name}" พิมพ์ตรงในข้อความ ต้องมาผ่านตัวแปร`));
        }
      }
    }
  }
  return issues;
}
