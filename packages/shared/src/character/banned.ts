/**
 * `banned.modes` + `banned.allow`: decides whether a normalized name is banned (tech note F10
 * section 7.1, character.json `banned._note`, P2-H64). One mode at a time: form the name (and,
 * for `wholeOrToken`, every space-separated token of the *normalized* name) through the mode's
 * pass, remove that pass's allow entries, then compare against the mode's term list (itself run
 * through the same pass, never allow-filtered — allow entries exist to rescue everyday words in
 * the *candidate name*, not to rescue a term).
 */
import { codePointsOf } from './code-points';
import { resolveCategoryArraysFlat, resolveStringList } from './lexicon';
import { applyPass } from './passes';
import type { BannedModeConfig, CharacterNameParams, Lexicon } from './types';

/** "Longest allow entry starting at this position wins; else keep one code point; one sweep, the
 * remainder joins with no gap" (character.json `banned._note`). */
function removeLongestAtPosition(s: string, terms: readonly string[]): string {
  const chars = codePointsOf(s);
  const termChars = terms.filter((t) => t.length > 0).map((t) => codePointsOf(t));
  const out: string[] = [];
  let i = 0;
  while (i < chars.length) {
    let bestLen = 0;
    for (const term of termChars) {
      if (term.length <= bestLen || i + term.length > chars.length) continue;
      if (term.every((ch, k) => chars[i + k] === ch)) bestLen = term.length;
    }
    if (bestLen > 0) {
      i += bestLen;
    } else {
      out.push(chars[i] as string);
      i += 1;
    }
  }
  return out.join('');
}

function formWithAllowRemoved(
  s: string,
  passName: string,
  params: CharacterNameParams,
  lexicon: Lexicon,
): string {
  const passed = applyPass(s, passName, params);
  const allowCfg = params.banned.allow[passName];
  if (allowCfg === undefined) return passed;
  const allowTerms = resolveStringList(lexicon, allowCfg.key).map((t) =>
    applyPass(t, passName, params),
  );
  return removeLongestAtPosition(passed, allowTerms);
}

function collectTerms(mode: BannedModeConfig, lexicon: Lexicon): string[] {
  if (mode.collect === 'array') return resolveStringList(lexicon, mode.termsKey);
  return resolveCategoryArraysFlat(lexicon, mode.termsKey);
}

function matchesMode(
  mode: BannedModeConfig,
  normalizedName: string,
  termForms: readonly string[],
  params: CharacterNameParams,
  lexicon: Lexicon,
): boolean {
  const whole = formWithAllowRemoved(normalizedName, mode.pass, params, lexicon);
  if (mode.match === 'contains') {
    return termForms.some((term) => whole.includes(term));
  }
  // wholeOrToken
  if (termForms.includes(whole)) return true;
  const tokens = normalizedName.split(' ').filter((t) => t.length > 0);
  return tokens.some((token) =>
    termForms.includes(formWithAllowRemoved(token, mode.pass, params, lexicon)),
  );
}

/** `true` when `normalizedName` (already past every earlier `name.checkOrder` entry) matches any
 * `banned.modes` entry. Resolves `banned.lexiconRef`'s content through `lexicon`, the caller's
 * already-loaded file — this never reads `params.banned.lexiconRef` itself (ADR 0003 C1-2: no
 * `fetch`/`fs` in the game core). */
export function isBanned(
  normalizedName: string,
  params: CharacterNameParams,
  lexicon: Lexicon,
): boolean {
  for (const [modeName, mode] of Object.entries(params.banned.modes)) {
    if (modeName.startsWith('_')) continue;
    const rawTerms = collectTerms(mode, lexicon);
    const termForms = rawTerms
      .map((t) => applyPass(t, mode.pass, params))
      .filter((t) => t.length > 0);
    if (matchesMode(mode, normalizedName, termForms, params, lexicon)) return true;
  }
  return false;
}
