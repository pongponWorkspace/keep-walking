/**
 * Pure per-text word/pattern scan shared by S2, S3, S5, S6, S8, S9 (the W3 part), S10, S11, S12,
 * and reused by S14 to scan `alts`. Each checks/sN.ts file filters this list down to its own
 * check id and adds whatever needs the wider file context (S4 length, S7 variables, S13 names).
 */
import type { CopyKind, CopyVoice } from '@keep-walking/shared';
import { stripVariables } from './text-utils';
import type { WordList } from './words';
import { fail, warn, type LintIssue } from './types';

const SYSTEM_GROUP: readonly CopyVoice[] = ['system', 'research', 'command', 'legal'];
const UNIT_PERIOD_EXCEPTIONS = ['Lv.', 'ม.', 'กม.', 'ชม.'];
const EMOJI_PATTERN = /[\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F000}-\u{1FAFF}]/u;

export interface ScanTarget {
  /** Reporting key, e.g. "run.death" or "run.death alts[0]". */
  readonly key: string;
  readonly area: string;
  readonly voice: CopyVoice;
  readonly kind: CopyKind;
  readonly text: string;
  /** Only true for the canon hpLow/autoRetreat/death/raidFail beats (style-guide 6.3, S9). */
  readonly checkThreeBeatWords?: boolean;
  /** True when the key is in `_meta.dayNameExceptions.keys` (copy-schema 2.4). */
  readonly dayNameExempt?: boolean;
  /** True when the key is in `_meta.numericExceptions[].keys` (copy-schema 4.2). */
  readonly numericExempt?: boolean;
}

function matches(source: string, text: string): boolean {
  return new RegExp(source, 'u').test(text);
}

export function scanText(target: ScanTarget, words: WordList): LintIssue[] {
  const issues: LintIssue[] = [];
  const stripped = stripVariables(target.text);
  const isSystemGroup = SYSTEM_GROUP.includes(target.voice);
  const push = (level: 'FAIL' | 'WARN', check: string, message: string): void => {
    issues.push(
      level === 'FAIL' ? fail(target.key, check, message) : warn(target.key, check, message),
    );
  };

  // S2 (style-guide 6.1, gฎ 1): scope `all`.
  for (const source of words.W1) {
    if (matches(source, stripped)) {
      push('FAIL', 'S2', `พบคำกลุ่ม "ผู้ถูกเลือก/โชคชะตา" (W1): "${source}"`);
    }
  }

  scanProfanity(target, stripped, words, push);
  scanWorldWords(target, stripped, words, isSystemGroup, push);

  if (target.checkThreeBeatWords) {
    for (const source of words.W3) {
      if (matches(source, stripped)) {
        push('FAIL', 'S9', `คำขอโทษ/ปลอบ/อธิบายในสามจังหวะ (W3): "${source}"`);
      }
    }
  }

  if (target.area === 'onboarding') {
    for (const [unit, list] of Object.entries(words.W8)) {
      for (const source of list) {
        if (matches(source, stripped)) {
          push('FAIL', 'S10', `สอนระบบ ${unit} ใน onboarding: "${source}"`);
        }
      }
    }
  }

  scanLatin(stripped, words, push);
  scanNumbersAndDays(target, stripped, words, isSystemGroup, push);
  scanJokeSignalsAndPunctuation(stripped, words, push);

  if (target.voice === 'system') {
    scanSystemVoiceEndings(target, stripped, words, push);
  }

  return issues;
}

function scanProfanity(
  target: ScanTarget,
  stripped: string,
  words: WordList,
  push: (level: 'FAIL' | 'WARN', check: string, message: string) => void,
): void {
  for (const word of words.W2a.all) {
    const exempt = target.voice === 'character' && words.W2a.characterAllowed.includes(word);
    if (!exempt && matches(word, stripped)) {
      push('FAIL', 'S3', `คำหยาบระดับบทพูด (W2a) "${word}" ไม่อนุญาตในเสียง ${target.voice}`);
    }
  }
  for (const source of words.W2b) {
    if (matches(source, stripped)) {
      push('FAIL', 'S3', `คำหยาบต้องห้ามทุกเสียง (W2b): "${source}"`);
    }
  }
  for (const source of words.W2bWarn) {
    if (matches(source, stripped)) {
      push('WARN', 'S3', `คำที่อาจชนคำปกติ (W2b-warn): "${source}"`);
    }
  }
  for (const source of words.W2e.evasiveSpellingFail) {
    if (matches(source, stripped)) {
      push('FAIL', 'S3', `รูปสะกดเลี่ยงคำหยาบ (W2e): "${source}"`);
    }
  }
  if (matches(words.W2e.obfuscationWarnPattern, stripped)) {
    push('WARN', 'S3', 'พบเครื่องหมายคั่นกลางคำไทย (อาจเลี่ยงคำหยาบ, W2e)');
  }
  if (target.kind === 'dialogue') {
    const speakerPattern = /^[^:\n]{1,64}: /;
    for (const line of stripped.split('\n')) {
      if (!speakerPattern.test(line)) {
        push('FAIL', 'S3', `บรรทัดบทพูดต้องขึ้นต้นด้วย "<ผู้พูด>: ": "${line}"`);
      }
    }
  }
}

function scanWorldWords(
  target: ScanTarget,
  stripped: string,
  words: WordList,
  isSystemGroup: boolean,
  push: (level: 'FAIL' | 'WARN', check: string, message: string) => void,
): void {
  if (isSystemGroup) {
    for (const word of words.W2c.fail) {
      if (matches(word, stripped)) push('FAIL', 'S8', `คำด่าตัวตน (W2c): "${word}"`);
    }
    for (const word of words.W2c.warn) {
      if (matches(word, stripped)) push('WARN', 'S8', `คำที่อาจด่าตัวตน (W2c): "${word}"`);
    }
    for (const word of words.W4) {
      if (matches(word, stripped)) push('FAIL', 'S8', `คำวีรบุรุษ/ความรุนแรง (W4): "${word}"`);
    }
  }
  for (const word of words.W5a.fail) {
    if (matches(word, stripped)) push('FAIL', 'S8', `คำสถาบันพระมหากษัตริย์ (W5a): "${word}"`);
  }
  for (const word of words.W5a.warn) {
    if (matches(word, stripped)) push('WARN', 'S8', `อาจชนคำปกติ (W5a): "${word}"`);
  }
  for (const word of words.W5b.fail) {
    if (matches(word, stripped)) push('FAIL', 'S8', `คำศาสนาและความเชื่อ (W5b): "${word}"`);
  }
  for (const word of words.W5b.warn) {
    if (matches(word, stripped)) push('WARN', 'S8', `อาจชนคำปกติ (W5b): "${word}"`);
  }
  for (const word of words.W5c.fail) {
    if (matches(word, stripped)) push('FAIL', 'S8', `คำการเมือง (W5c): "${word}"`);
  }
  for (const word of words.W5c.warn) {
    if (matches(word, stripped)) push('WARN', 'S8', `คำการเมืองรอ HUMAN (W5c): "${word}"`);
  }
  for (const word of words.W5d) {
    if (matches(word, stripped)) push('WARN', 'S8', `คำปีศาจ (W5d): "${word}"`);
  }
  for (const word of words.W7.fail) {
    if (matches(word, stripped)) push('FAIL', 'S8', `ชื่อแบรนด์จริง (W7): "${word}"`);
  }
  for (const word of words.W7.warn) {
    if (matches(word, stripped)) push('WARN', 'S8', `อาจชนชื่อแบรนด์ (W7): "${word}"`);
  }
  if (target.area === 'enhance' || target.area === 'shop' || target.area === 'market') {
    for (const word of words.W6) {
      if (matches(word, stripped)) push('FAIL', 'S8', `คำการพนัน/ขู่ของพัง (W6): "${word}"`);
    }
  }
}

/** `[A-Za-z][A-Za-z.-]*` (a Latin token) or a single Thai character, in text order. */
const TOKEN_OR_THAI_SOURCE = '[A-Za-z][A-Za-z.\\-]*|[\\u0E00-\\u0E7F]';
/** style-guide 5: "3 token ติดกันโดยไม่มีอักษรไทยคั่น = FAIL (วลีอังกฤษ)". */
const ENGLISH_PHRASE_MIN_TOKENS = 3;

function isAllowedLatinToken(token: string, allowlist: WordList['latinAllowlist']): boolean {
  if (allowlist.caseSensitive.includes(token)) {
    return true;
  }
  const lower = token.toLowerCase();
  return allowlist.caseInsensitive.some((word) => word.toLowerCase() === lower);
}

/** S5 (style-guide กฎ 5, 5.1): allowlist membership, and 3+ Latin tokens in a row = a phrase. */
function scanLatin(
  stripped: string,
  words: WordList,
  push: (level: 'FAIL' | 'WARN', check: string, message: string) => void,
): void {
  const pattern = new RegExp(TOKEN_OR_THAI_SOURCE, 'gu');
  let latinRun = 0;
  for (const match of stripped.matchAll(pattern)) {
    const piece = match[0];
    if (/^[A-Za-z]/u.test(piece)) {
      // A lone letter (T/R/S/M glyph tokens, style-guide 5.1) is not a "word" of a phrase: it
      // neither extends nor breaks a run of real English words.
      if (piece.length > 1) {
        latinRun += 1;
        if (latinRun === ENGLISH_PHRASE_MIN_TOKENS) {
          push(
            'FAIL',
            'S5',
            `พบคำอังกฤษติดกันตั้งแต่ 3 คำโดยไม่มีอักษรไทยคั่น (วลีอังกฤษ): "...${piece}"`,
          );
        }
      }
      if (!isAllowedLatinToken(piece, words.latinAllowlist)) {
        push('FAIL', 'S5', `คำอังกฤษ "${piece}" ไม่อยู่ใน allowlist (style-guide 5.1)`);
      }
    } else {
      latinRun = 0;
    }
  }
}

const DIGIT_PATTERN = /[0-9๐-๙]/u;

/** S6 (style-guide 4.1, 4.2): raw digits, and raw Thai weekday names in the system-voice group. */
function scanNumbersAndDays(
  target: ScanTarget,
  stripped: string,
  words: WordList,
  isSystemGroup: boolean,
  push: (level: 'FAIL' | 'WARN', check: string, message: string) => void,
): void {
  if (!target.numericExempt && DIGIT_PATTERN.test(stripped)) {
    push(
      'FAIL',
      'S6',
      'มีตัวเลขพิมพ์ตรงนอก {} ต้องมาจากตัวแปร (ยกเว้น key ใน _meta.numericExceptions)',
    );
  }
  if (isSystemGroup && !target.dayNameExempt) {
    const dayNames = Object.values(words.dayNames).flat();
    const hit = dayNames.find((day) => stripped.includes(day));
    if (hit !== undefined) {
      const level = target.area === 'lore' ? 'WARN' : 'FAIL';
      push(level, 'S6', `พบชื่อวันพิมพ์ตรง "${hit}" ต้องมาจากตัวแปร {raidDay} หรือ weekday.*`);
    }
  }
}

/** S11 (style-guide กฎ 3, 1.2): emoji and joke tells are FAIL; extra punctuation is WARN. */
function scanJokeSignalsAndPunctuation(
  stripped: string,
  words: WordList,
  push: (level: 'FAIL' | 'WARN', check: string, message: string) => void,
): void {
  if (EMOJI_PATTERN.test(stripped)) {
    push('FAIL', 'S11', 'พบ emoji ในข้อความ');
  }
  if (new RegExp(words.jokeSignals.repeatedFivePattern, 'u').test(stripped)) {
    push('FAIL', 'S11', 'พบ "555+" (สัญญาณว่าตลก)');
  }
  for (const source of words.jokeSignals.haPatterns) {
    if (matches(source, stripped)) {
      push('FAIL', 'S11', `พบสัญญาณว่าตลก "${source}"`);
    }
  }
  const exclamationCount = (stripped.match(/!/gu) ?? []).length;
  if (exclamationCount > 1) {
    push('WARN', 'S11', `มีเครื่องหมายอัศเจรีย์ ${exclamationCount} ตัว เกิน 1 ตัวต่อ key`);
  }
  const trimmed = stripped.replace(/\s+$/u, '');
  const hasUnitException = UNIT_PERIOD_EXCEPTIONS.some((suffix) => trimmed.endsWith(suffix));
  if (trimmed.endsWith('.') && !hasUnitException) {
    push('WARN', 'S11', 'มีจุดท้ายประโยค (ยกเว้น Lv. และหน่วย ม./กม./ชม.)');
  }
}

/** S12 (style-guide 1.2), scoped to `voice: system` exactly (not the wider system-voice group). */
function scanSystemVoiceEndings(
  target: ScanTarget,
  stripped: string,
  words: WordList,
  push: (level: 'FAIL' | 'WARN', check: string, message: string) => void,
): void {
  for (const ending of words.politeEndings.fail) {
    if (new RegExp(`${ending}(?:\\s|$)`, 'u').test(stripped)) {
      push('FAIL', 'S12', `คำลงท้ายไม่เป็นกลางทางเพศ "${ending}"`);
    }
  }
  for (const ending of words.politeEndings.warn) {
    if (new RegExp(`${ending}(?:\\s|$)`, 'u').test(stripped)) {
      push('WARN', 'S12', `คำลงท้าย "${ending}" ท้ายประโยค`);
    }
  }
  for (const term of words.politeEndings.forbiddenAddressTerms) {
    if (stripped.includes(term)) {
      push('FAIL', 'S12', `คำเรียกผู้เล่นที่ห้าม "${term}"`);
    }
  }
}
