/**
 * S6 — no hardcoded numbers/day names/times (style-guide 4.1, 4.2; copy-schema 2.4). Most of
 * the work is the generic per-text scan; this file adds the copy-schema 2.4 structural rule:
 * every key in `_meta.dayNameExceptions.keys` must be *only* a day name (an optional leading
 * "วัน" plus one of words.json#dayNames), because that exception only turns off the day-name
 * part of S6, not the rest of it.
 */
import type { LintContext } from '../context';
import { fail, type LintIssue } from '../types';
import { scanCheck } from './word-scan-runner';

export function checkS6(ctx: LintContext): LintIssue[] {
  const issues = [...scanCheck(ctx, 'S6')];
  const dayNameForms = new Set(Object.values(ctx.words.dayNames).flat());
  for (const key of ctx.meta?.dayNameExceptions?.keys ?? []) {
    const entry = ctx.entries.get(key);
    if (!entry) {
      continue; // reported by S1 (exception key must exist)
    }
    const withoutLeadingDay = entry.text.startsWith('วัน')
      ? entry.text.slice('วัน'.length)
      : entry.text;
    if (!dayNameForms.has(entry.text) && !dayNameForms.has(withoutLeadingDay)) {
      issues.push(
        fail(
          key,
          'S6',
          `key ใน dayNameExceptions ต้องเป็นชื่อวันล้วน แต่ text คือ "${entry.text}"`,
        ),
      );
    }
  }
  return issues;
}
