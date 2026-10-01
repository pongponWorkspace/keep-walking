/**
 * Grapheme-cluster-level checks: `charset`, `misplacedMark`, `stackedMarks`, `noLetter` (tech note
 * F10 section 7.1). `clusters` is the normalized name already split into grapheme clusters by
 * `Intl.Segmenter` (`validate.ts`); each cluster here is its own code points, first-to-last as
 * written, so `cluster[0]` is always the cluster's base.
 */
import { codePointsOf, inRanges } from './code-points';
import type { NameConfig } from './types';

function codePointAt(cluster: readonly string[], index: number): number {
  const cp = cluster[index]?.codePointAt(0);
  if (cp === undefined) throw new Error('unreachable: empty grapheme cluster');
  return cp;
}

export function isEveryCodePointAllowed(
  normalized: string,
  allowed: NameConfig['allowed'],
): boolean {
  return codePointsOf(normalized).every((ch) => {
    const cp = ch.codePointAt(0);
    return cp !== undefined && inRanges(cp, allowed);
  });
}

export function hasAnyLetter(normalized: string, letters: NameConfig['letters']): boolean {
  return codePointsOf(normalized).some((ch) => {
    const cp = ch.codePointAt(0);
    return cp !== undefined && inRanges(cp, letters);
  });
}

/** A Thai mark must sit in a cluster whose first code point is a Thai consonant: this rejects a
 * cluster that starts with a mark itself (a leading mark, or a mark after a space/start of text —
 * `Intl.Segmenter` gives the mark its own one-code-point cluster in that case), and a cluster
 * whose later code points include a Thai mark but whose base is not a Thai consonant (a mark on a
 * Latin letter). */
export function hasMisplacedMark(
  clusters: readonly (readonly string[])[],
  cfg: NameConfig,
): boolean {
  return clusters.some((cluster) => {
    const base = codePointAt(cluster, 0);
    if (inRanges(base, cfg.thaiMarks)) return true;
    if (cluster.length <= 1) return false;
    const hasThaiMark = cluster
      .slice(1)
      .some((ch) => inRanges(ch.codePointAt(0) ?? Number.NaN, cfg.thaiMarks));
    return hasThaiMark && !inRanges(base, cfg.thaiMarkBases);
  });
}

/** Mark stacking ("zalgo"): too many code points in one cluster, too many tone marks in one
 * cluster, or (when configured) the same mark code point repeated in one cluster. Only meaningful
 * once `hasMisplacedMark` is false for the whole name (checkOrder runs `misplacedMark` first). */
export function hasStackedMarks(
  clusters: readonly (readonly string[])[],
  cfg: NameConfig,
): boolean {
  return clusters.some((cluster) => {
    if (cluster.length > cfg.maxCodePointsPerGrapheme) return true;
    const marks = cluster.slice(1).map((ch) => ch.codePointAt(0) ?? Number.NaN);
    const toneMarkCount = marks.filter((cp) => inRanges(cp, cfg.toneMarks)).length;
    if (toneMarkCount > cfg.maxToneMarksPerGrapheme) return true;
    if (cfg.rejectRepeatedMarkInGrapheme) {
      const seen = new Set<number>();
      for (const cp of marks) {
        if (seen.has(cp)) return true;
        seen.add(cp);
      }
    }
    return false;
  });
}
