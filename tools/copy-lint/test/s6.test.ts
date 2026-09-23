import { describe, expect, it } from 'vitest';
import { checkS6 } from '../src/checks/s6';
import { contextFor } from './helpers';

describe('S6 — no hardcoded numbers or day names', () => {
  it('FAILs "raid เปิดทุกเสาร์ 16:00" (day name and time)', () => {
    const ctx = contextFor({
      'raid.x': { text: 'raid เปิดทุกเสาร์ 16:00', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS6(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('passes weekday.saturday = "วันเสาร์" when the key is in dayNameExceptions', () => {
    const ctx = contextFor(
      { 'weekday.saturday': { text: 'วันเสาร์', voice: 'system', kind: 'label', context: 'x' } },
      { meta: { dayNameExceptions: { keys: ['weekday.saturday'], reason: 'test' } } },
    );
    expect(checkS6(ctx)).toEqual([]);
  });

  it('FAILs weekday.saturday = "วันเสาร์ 16:00" (extra content, and a time pattern)', () => {
    const ctx = contextFor(
      {
        'weekday.saturday': {
          text: 'วันเสาร์ 16:00',
          voice: 'system',
          kind: 'label',
          context: 'x',
        },
      },
      { meta: { dayNameExceptions: { keys: ['weekday.saturday'], reason: 'test' } } },
    );
    expect(checkS6(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('passes a numericException key that has a literal digit', () => {
    const ctx = contextFor(
      { 'lore.x': { text: 'Lv.50: เออ มา', voice: 'character', kind: 'dialogue', context: 'x' } },
      { meta: { numericExceptions: [{ keys: ['lore.x'], reason: 'test' }] } },
    );
    expect(checkS6(ctx)).toEqual([]);
  });

  it('FAILs the same digit when the key is not registered as an exception', () => {
    const ctx = contextFor({
      'lore.x': { text: 'Lv.50: เออ มา', voice: 'character', kind: 'dialogue', context: 'x' },
    });
    expect(checkS6(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('does not scan the digits inside a {variable}', () => {
    const ctx = contextFor({
      'run.x': {
        text: 'HP เหลือต่ำกว่า {autoRetreatPct}%',
        voice: 'system',
        kind: 'message',
        context: 'x',
      },
    });
    expect(checkS6(ctx)).toEqual([]);
  });

  it('downgrades a day name to WARN in the lore area', () => {
    const ctx = contextFor({
      'lore.x': {
        text: 'ทีมวิจัยพบว่าวันเสาร์คนว่างที่สุด',
        voice: 'research',
        kind: 'message',
        context: 'x',
      },
    });
    const issues = checkS6(ctx);
    expect(issues.some((issue) => issue.level === 'FAIL')).toBe(false);
    expect(issues.some((issue) => issue.level === 'WARN')).toBe(true);
  });
});
