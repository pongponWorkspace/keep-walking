import { describe, expect, it } from 'vitest';
import { checkS11 } from '../src/checks/s11';
import { contextFor } from './helpers';

describe('S11 — joke tells and punctuation', () => {
  it('FAILs an emoji', () => {
    const ctx = contextFor({
      'run.x': { text: 'ยินดีด้วย 🎉', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS11(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('FAILs "555"', () => {
    const ctx = contextFor({
      'run.x': { text: 'ฮาก 555', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS11(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('WARNs (not FAILs) on more than one exclamation mark', () => {
    const ctx = contextFor({
      'run.x': { text: 'ระวัง!!', voice: 'system', kind: 'label', context: 'x' },
    });
    const issues = checkS11(ctx);
    expect(issues.some((issue) => issue.level === 'FAIL')).toBe(false);
    expect(issues.some((issue) => issue.level === 'WARN')).toBe(true);
  });

  it('WARNs on a trailing period, but not after "Lv." or a unit abbreviation', () => {
    const trailing = checkS11(
      contextFor({ 'run.x': { text: 'จบประโยค.', voice: 'system', kind: 'label', context: 'x' } }),
    );
    expect(trailing.some((issue) => issue.level === 'WARN')).toBe(true);

    const unit = checkS11(
      contextFor({
        'run.x': { text: 'อยู่ห่าง 3.2 กม.', voice: 'system', kind: 'label', context: 'x' },
      }),
    );
    expect(unit).toEqual([]);
  });

  it('passes a plain sentence with no punctuation tells', () => {
    const ctx = contextFor({
      'run.x': {
        text: 'รอบนี้เดินไม่พอ ไม่ได้ของ เดินต่อ',
        voice: 'system',
        kind: 'message',
        context: 'x',
      },
    });
    expect(checkS11(ctx)).toEqual([]);
  });
});
