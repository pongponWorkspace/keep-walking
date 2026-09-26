import { describe, expect, it } from 'vitest';
import { formatCopyText, formatText } from './format';

describe('formatText', () => {
  it('substitutes a known placeholder', () => {
    expect(formatText('before {timeLeft} after', { timeLeft: 'X' })).toBe('before X after');
  });

  it('leaves an unknown placeholder untouched', () => {
    expect(formatText('before {timeLeft} after', {})).toBe('before {timeLeft} after');
  });

  it('substitutes numbers by stringifying them', () => {
    expect(formatText('{countdown}', { countdown: 90 })).toBe('90');
  });

  it('substitutes every occurrence of the same placeholder', () => {
    expect(formatText('{a} and {a}', { a: 'x' })).toBe('x and x');
  });
});

describe('formatCopyText', () => {
  it('falls back to the raw key text (with placeholders untouched) for an unknown key', () => {
    expect(formatCopyText('does.not.exist', { foo: 'bar' })).toBe('does.not.exist');
  });

  it('formats a real key from copy.th.json (dungeon.closingSoonTag has a {timeLeft} placeholder)', () => {
    expect(formatCopyText('dungeon.closingSoonTag', { timeLeft: 'X' })).toContain('X');
  });
});
