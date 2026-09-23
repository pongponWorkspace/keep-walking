/** Runs word-scan.ts once over every entry (and its alts) and caches the result per context. */
import type { LintContext } from '../context';
import { areaOf, entryTexts } from '../text-utils';
import type { LintIssue } from '../types';
import { scanText } from '../word-scan';

const THREE_BEAT_WORDS_BEATS = new Set(['hpLow', 'autoRetreat', 'death', 'raidFail']);

const cache = new WeakMap<LintContext, readonly LintIssue[]>();

/** All S2/S3/S5/S6/S8/S9(W3)/S10/S11/S12 findings for every entry's `text` and `alts`. */
export function scanAllEntries(ctx: LintContext): readonly LintIssue[] {
  const cached = cache.get(ctx);
  if (cached) {
    return cached;
  }
  const issues: LintIssue[] = [];
  const numericExemptKeys = new Set(
    (ctx.meta?.numericExceptions ?? []).flatMap((list) => list.keys),
  );
  const dayNameExemptKeys = new Set(ctx.meta?.dayNameExceptions?.keys ?? []);

  for (const [key, entry] of ctx.entries) {
    const area = areaOf(key);
    const checkThreeBeatWords = entry.beat !== undefined && THREE_BEAT_WORDS_BEATS.has(entry.beat);
    for (const { label, text } of entryTexts(key, entry)) {
      issues.push(
        ...scanText(
          {
            key: label,
            area,
            voice: entry.voice,
            kind: entry.kind,
            text,
            checkThreeBeatWords,
            dayNameExempt: dayNameExemptKeys.has(key),
            numericExempt: numericExemptKeys.has(key),
          },
          ctx.words,
        ),
      );
    }
  }
  cache.set(ctx, issues);
  return issues;
}

export function scanCheck(ctx: LintContext, check: string): readonly LintIssue[] {
  return scanAllEntries(ctx).filter((issue) => issue.check === check);
}
