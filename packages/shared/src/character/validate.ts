/**
 * `validateCharacterName` — the single entry point the create-character screen and the random-
 * name generator both call (tech note F10 section 1/7, systems-designer contract). Data-driven:
 * which check runs in which order comes from `params.name.checkOrder` (11 entries, config-lint
 * checked), never a hardcoded 1-11 list in this file.
 */
import { isBanned } from './banned';
import { hasEmailMarker, isPhoneLike, isUrlLike } from './contact';
import { hasAnyLetter, hasMisplacedMark, hasStackedMarks, isEveryCodePointAllowed } from './marks';
import { normalizeName, toDetectionForm } from './normalize';
import type {
  CharacterNameParams,
  Lexicon,
  RejectReason,
  ValidateCharacterNameResult,
} from './types';

function hasWorkingSegmenter(): boolean {
  return typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';
}

/** Splits `s` into grapheme clusters, each as its own array of code points (one string per code
 * point, `code-points.ts#codePointsOf`'s convention) so `marks.ts` can inspect a cluster's base
 * and marks individually. */
function graphemeClustersOf(s: string, locale: string): string[][] {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(s), (entry) => Array.from(entry.segment));
}

export function validateCharacterName(
  name: string,
  params: CharacterNameParams,
  lexicon: Lexicon,
): ValidateCharacterNameResult {
  // Fail-closed when the platform has no Intl.Segmenter at all (tech note F10 section 1,
  // A-T04-4): every name is rejected, always with "charset" — never silently let one through
  // because grapheme length/mark checks could not run.
  if (!hasWorkingSegmenter()) {
    return { ok: false, reason: 'charset' };
  }

  const normalized = normalizeName(name, params.name.normalize);
  const clusters = graphemeClustersOf(normalized, params.name.segmenter.locale);
  const detectionForm = toDetectionForm(normalized, params.contact.detectionForm);

  const checks: Record<RejectReason, () => boolean> = {
    empty: () => normalized.length === 0,
    email: () => hasEmailMarker(detectionForm, params.contact.email.markers),
    url: () => isUrlLike(detectionForm, params.contact.url),
    phone: () => isPhoneLike(detectionForm, params.contact.phone),
    charset: () => !isEveryCodePointAllowed(normalized, params.name.allowed),
    misplacedMark: () => hasMisplacedMark(clusters, params.name),
    stackedMarks: () => hasStackedMarks(clusters, params.name),
    noLetter: () => params.name.requireLetter && !hasAnyLetter(normalized, params.name.letters),
    tooShort: () => clusters.length < params.name.minGraphemes,
    tooLong: () => clusters.length > params.name.maxGraphemes,
    banned: () => isBanned(normalized, params, lexicon),
  };

  for (const reason of params.name.checkOrder) {
    if (checks[reason]()) return { ok: false, reason };
  }
  return { ok: true, normalized, graphemes: clusters.length };
}
