/**
 * `contact.email` / `contact.url` / `contact.phone` checks (tech note F10 section 7.1,
 * character.json `contact._note`). Every check is a plain, manual string/code-point scan — no
 * `RegExp` is ever constructed from config data (systems-designer contract, T04/T12 acceptance):
 * config never carries a regex pattern, only markers, code point ranges and counts.
 */
import { codePointsOf, inRanges } from './code-points';
import type { ContactPhoneConfig, ContactUrlConfig } from './types';

const ASCII_LOWER_A = 0x61;
const ASCII_LOWER_Z = 0x7a;
const ASCII_DIGIT_0 = 0x30;
const ASCII_DIGIT_9 = 0x39;

function isAsciiAlphaNumeric(ch: string): boolean {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return false;
  return (
    (cp >= ASCII_LOWER_A && cp <= ASCII_LOWER_Z) || (cp >= ASCII_DIGIT_0 && cp <= ASCII_DIGIT_9)
  );
}

export function hasEmailMarker(detectionForm: string, markers: readonly string[]): boolean {
  return markers.some((marker) => detectionForm.includes(marker));
}

/** `contact.url._note`: a marker anywhere; or `.` + a listed TLD + (end of string or a character
 * that is not a-z/0-9); or a `spelledMarkers` entry once every space is removed. */
export function isUrlLike(detectionForm: string, cfg: ContactUrlConfig): boolean {
  if (cfg.markers.some((marker) => detectionForm.includes(marker))) return true;
  const chars = codePointsOf(detectionForm);
  for (let i = 0; i < chars.length; i += 1) {
    if (chars[i] !== '.') continue;
    for (const tld of cfg.tlds) {
      const tldChars = codePointsOf(tld);
      const start = i + 1;
      const end = start + tldChars.length;
      if (end > chars.length) continue;
      if (chars.slice(start, end).join('') !== tld) continue;
      const boundary = end === chars.length || !isAsciiAlphaNumeric(chars[end] as string);
      if (boundary) return true;
    }
  }
  const noSpace = chars.filter((ch) => ch !== ' ').join('');
  return cfg.spelledMarkers.some((marker) => noSpace.includes(marker));
}

/** `contact.phone._note`: scans `detectionForm` code point by code point, tracking a "digit run"
 * that a `separators` character never breaks (so `081 234 5678` is one run of 10) but any other
 * character does (so `A12 B34 C56` is three runs of 2). Fails when the longest run exceeds
 * `maxDigitRun`, or the running total of every digit exceeds `maxTotalDigits`. */
export function isPhoneLike(detectionForm: string, cfg: ContactPhoneConfig): boolean {
  const separators = new Set(cfg.separators);
  let currentRun = 0;
  let maxRun = 0;
  let total = 0;
  for (const ch of detectionForm) {
    const cp = ch.codePointAt(0);
    if (cp !== undefined && inRanges(cp, cfg.digits)) {
      currentRun += 1;
      total += 1;
      maxRun = Math.max(maxRun, currentRun);
    } else if (!separators.has(ch)) {
      currentRun = 0;
    }
  }
  return maxRun > cfg.maxDigitRun || total > cfg.maxTotalDigits;
}
