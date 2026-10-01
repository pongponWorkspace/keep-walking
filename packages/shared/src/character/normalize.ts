/**
 * `name.normalize` pipeline (tech note F10 section 7.1 / character.json `name.normalize._source`):
 * NFC (or NFKC for the contact detection form), strip invisible code points, map other whitespace
 * to a single space, trim, collapse runs of spaces. Same pipeline doubles as the `nameNormalize`
 * banned-pass step (character.json `banned.passes.light.steps[0]`).
 */
import { filterCodePoints, inRanges, mapCodePoints, SPACE_CODE_POINT } from './code-points';
import type { ContactDetectionFormConfig, NameNormalizeConfig } from './types';

function trimSpaces(s: string): string {
  let start = 0;
  let end = s.length;
  while (start < end && s.charCodeAt(start) === SPACE_CODE_POINT) start += 1;
  while (end > start && s.charCodeAt(end - 1) === SPACE_CODE_POINT) end -= 1;
  return s.slice(start, end);
}

function collapseSpaces(s: string): string {
  let out = '';
  let previousWasSpace = false;
  for (const ch of s) {
    const isSpace = ch.charCodeAt(0) === SPACE_CODE_POINT;
    if (isSpace && previousWasSpace) continue;
    out += ch;
    previousWasSpace = isSpace;
  }
  return out;
}

/** The normalized string a name is validated against and, if it passes, stored as. */
export function normalizeName(raw: string, cfg: NameNormalizeConfig): string {
  let s = raw.normalize(cfg.form);
  s = filterCodePoints(s, (cp) => !inRanges(cp, cfg.stripCodePoints));
  s = mapCodePoints(s, (cp) => (inRanges(cp, cfg.mapToSpace) ? SPACE_CODE_POINT : cp));
  if (cfg.trimSpaces) s = trimSpaces(s);
  if (cfg.collapseSpaces) s = collapseSpaces(s);
  return s;
}

/** `contact.detectionForm`: NFKC (folds fullwidth look-alikes) then optionally lowercase, applied
 * to the already-normalized name (tech note F10 section 7.1: "ทุก contact check อ่าน detection
 * form ของชื่อที่ normalize แล้ว"). */
export function toDetectionForm(normalized: string, cfg: ContactDetectionFormConfig): string {
  const folded = normalized.normalize(cfg.form);
  return cfg.lowercase ? folded.toLowerCase() : folded;
}
