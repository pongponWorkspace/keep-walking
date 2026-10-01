import { describe, expect, it } from 'vitest';
import { checkCharacter } from '../src/character';
import type { Json } from '../src/types';
import { file } from './helpers';

const LEXICON = 'config/content/character-names.th.json';

function character(overrides: { name?: Json; phone?: Json; banned?: Json; random?: Json } = {}) {
  return file('balance', 'character', {
    name: overrides.name ?? {
      minGraphemes: 2,
      maxGraphemes: 16,
      segmenter: { locale: 'th' },
      allowed: [
        { from: 'U+0E01', to: 'U+0E3A', label: 'Thai' },
        { from: 'U+0E40', to: 'U+0E4E', label: 'Thai marks' },
        { from: 'U+0061', to: 'U+007A', label: 'a-z' },
      ],
    },
    contact: { phone: overrides.phone ?? { maxDigitRun: 4, maxTotalDigits: 6 } },
    banned: overrides.banned ?? {
      lexiconRef: LEXICON,
      termCharset: 'name.allowed',
      passes: {
        light: { steps: [{ op: 'removeCodePoints', ranges: [{ from: 'U+0020', to: 'U+0020' }] }] },
        heavy: {
          base: 'light',
          steps: [{ op: 'removeCodePoints', ranges: [{ from: 'U+0E47', to: 'U+0E4E' }] }],
        },
      },
      modes: {
        substring: { pass: 'light', termsKey: 'blockedTerms.substring' },
        token: { pass: 'light', termsKey: 'blockedTerms.token.terms' },
      },
      allow: { light: { key: 'blockedTerms.allow.light' } },
    },
    random: overrides.random ?? {
      lexiconRef: LEXICON,
      template: ['randomName.heads', 'randomName.tails'],
      patternKey: 'randomName.pattern',
      pattern: 'headTail',
      fallbackKey: 'randomName.fallback.names',
    },
  });
}

function lexicon(fallback: Json = ['คนเดินเท้า', 'สายเดิน']) {
  return file('content', 'character-names.th', {
    randomName: {
      pattern: 'headTail',
      heads: ['ร่ม'],
      tails: ['เดิน'],
      fallback: { names: fallback },
    },
    blockedTerms: {
      substring: { _note: 'x', profanity: ['aaa'], insult: ['bbb'] },
      token: { _note: 'x', terms: ['ccc'] },
      allow: { light: [] },
    },
  });
}

const messages = (findings: ReturnType<typeof checkCharacter>) => findings.map((f) => f.at);

describe('checkCharacter (tech note F10 7.3)', () => {
  it('passes a consistent pair of files', () => {
    expect(checkCharacter([character(), lexicon()])).toEqual([]);
  });

  it('is a no-op when character.json is absent (fixture tests)', () => {
    expect(checkCharacter([lexicon()])).toEqual([]);
  });

  it('flags a range whose from is after to', () => {
    const name = { minGraphemes: 2, maxGraphemes: 16, allowed: [{ from: 'U+0E3A', to: 'U+0E01' }] };
    expect(messages(checkCharacter([character({ name }), lexicon()]))).toContain('name.allowed[0]');
  });

  it('flags maxGraphemes < minGraphemes and maxDigitRun > maxTotalDigits', () => {
    const name = { minGraphemes: 5, maxGraphemes: 3, allowed: [] };
    const phone = { maxDigitRun: 7, maxTotalDigits: 6 };
    const at = messages(checkCharacter([character({ name, phone }), lexicon()]));
    expect(at).toContain('name.maxGraphemes');
    expect(at).toContain('contact.phone.maxDigitRun');
  });

  it('flags every lexicon path that does not resolve, found by field name', () => {
    const banned = {
      lexiconRef: LEXICON,
      termCharset: 'name.allowed',
      passes: { light: { steps: [] } },
      modes: { x: { pass: 'light', termsKey: 'blockedTerms.nope' } },
    };
    const random = {
      lexiconRef: LEXICON,
      template: ['randomName.heads', 'randomName.missing'],
      patternKey: 'randomName.pattern',
      pattern: 'headTail',
      fallbackKey: 'randomName.fallback.names',
    };
    const at = messages(checkCharacter([character({ banned, random }), lexicon()]));
    expect(at).toEqual(['banned.modes.x.termsKey', 'random.template[1]']);
  });

  it('flags a missing lexicon file', () => {
    expect(messages(checkCharacter([character()]))).toEqual([
      'banned.lexiconRef',
      'random.lexiconRef',
    ]);
  });

  it('flags an empty fallback list', () => {
    expect(messages(checkCharacter([character(), lexicon([])]))).toEqual(['random.fallbackKey']);
  });

  it('flags fallback names outside the length or charset rules, per entry', () => {
    const bad = ['ก', 'คนเดิน@', ' สายเดิน', 'คนเดินเท้าคนเดินเท้าคนเดินเท้า'];
    const found = checkCharacter([character(), lexicon(bad)]);
    expect(found.every((f) => f.file === LEXICON)).toBe(true);
    expect(new Set(messages(found))).toEqual(
      new Set([0, 1, 2, 3].map((i) => `randomName.fallback.names[${i}]`)),
    );
  });

  it('flags a random.pattern that differs from the lexicon value at patternKey', () => {
    const random = {
      lexiconRef: LEXICON,
      template: ['randomName.heads'],
      patternKey: 'randomName.pattern',
      pattern: 'other',
      fallbackKey: 'randomName.fallback.names',
    };
    expect(messages(checkCharacter([character({ random }), lexicon()]))).toEqual([
      'random.pattern',
    ]);
  });

  it('flags a mode whose pass does not exist and a base that is not another pass', () => {
    const banned = {
      lexiconRef: LEXICON,
      termCharset: 'name.allowed',
      passes: { light: { base: 'light', steps: [] } },
      modes: { x: { pass: 'nope', termsKey: 'blockedTerms.token.terms' } },
    };
    expect(messages(checkCharacter([character({ banned }), lexicon()]))).toEqual([
      'banned.passes.light.base',
      'banned.modes.x',
    ]);
  });

  it('flags terms outside termCharset, not NFC, or empty after their pass (with base)', () => {
    const lex = lexicon();
    const data = lex.data as { blockedTerms: { token: { terms: string[] } } };
    data.blockedTerms.token.terms = ['ok', 'b@d', 'e\u0301', '\u0E48\u0E49'];
    const bannedHeavy = {
      lexiconRef: LEXICON,
      termCharset: 'name.allowed',
      passes: {
        light: { steps: [] },
        heavy: {
          base: 'light',
          steps: [{ op: 'removeCodePoints', ranges: [{ from: 'U+0E47', to: 'U+0E4E' }] }],
        },
      },
      modes: { token: { pass: 'heavy', termsKey: 'blockedTerms.token.terms' } },
    };
    const found = checkCharacter([character({ banned: bannedHeavy }), lex]);
    expect(found.map((f) => `${f.at} ${f.message}`)).toEqual([
      'blockedTerms.token.terms[1] term has a code point outside banned.termCharset',
      'blockedTerms.token.terms[2] term must be NFC',
      'blockedTerms.token.terms[2] term has a code point outside banned.termCharset',
      'blockedTerms.token.terms[3] term is empty after pass "heavy"',
    ]);
  });
});
