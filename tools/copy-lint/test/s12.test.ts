import { describe, expect, it } from 'vitest';
import { checkS12 } from '../src/checks/s12';
import { contextFor } from './helpers';

describe('S12 — the `system` register', () => {
  it('FAILs a polite ending ("ค่ะ") in voice system', () => {
    const ctx = contextFor({
      'run.x': { text: 'ยินดีต้อนรับค่ะ', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS12(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('FAILs "ผู้เล่นทุกท่าน"', () => {
    const ctx = contextFor({
      'run.x': { text: 'แจ้งผู้เล่นทุกท่าน', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS12(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('WARNs (not FAILs) on a trailing "นะ"', () => {
    const issues = checkS12(
      contextFor({ 'run.x': { text: 'เดินต่อนะ', voice: 'system', kind: 'label', context: 'x' } }),
    );
    expect(issues.some((issue) => issue.level === 'FAIL')).toBe(false);
    expect(issues.some((issue) => issue.level === 'WARN')).toBe(true);
  });

  it('does not check voice research/legal/command (S12 is scoped to voice: system only)', () => {
    const ctx = contextFor({
      'legal.x': { text: 'อ่านให้เข้าใจนะคะ', voice: 'legal', kind: 'message', context: 'x' },
    });
    expect(checkS12(ctx)).toEqual([]);
  });

  it('passes a neutral system sentence', () => {
    const ctx = contextFor({
      'run.x': { text: 'เดินต่อ รับเพิ่ม', voice: 'system', kind: 'button', context: 'x' },
    });
    expect(checkS12(ctx)).toEqual([]);
  });
});
