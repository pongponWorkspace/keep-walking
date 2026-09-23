import { describe, expect, it } from 'vitest';
import { checkS2 } from '../src/checks/s2';
import { contextFor } from './helpers';

describe('S2 — no "chosen one" language (W1)', () => {
  it('FAILs on a W1 phrase', () => {
    const ctx = contextFor({
      'run.x': { text: 'คุณคือผู้ถูกเลือก', voice: 'system', kind: 'message', context: 'x' },
    });
    expect(checkS2(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('does not flag "พยากรณ์อากาศ" (only the exact "คำพยากรณ์" token is banned)', () => {
    const ctx = contextFor({
      'lore.rain': {
        text: 'พยากรณ์อากาศบอกว่าฝนจะตก',
        voice: 'research',
        kind: 'message',
        context: 'x',
      },
    });
    expect(checkS2(ctx)).toEqual([]);
  });

  it('does not flag "ปลุกจังหวัดเรา" (only the exact "ปลุกพลัง" token is banned)', () => {
    const ctx = contextFor({
      'run.x': { text: 'ปลุกจังหวัดเรา', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS2(ctx)).toEqual([]);
  });

  it('passes the GDD canon run.death text', () => {
    const ctx = contextFor({
      'run.death': {
        text: 'คุณตาย ของใน run นี้หายทั้งหมด ครั้งหน้าลองกลับบ้านก่อนตาย',
        voice: 'system',
        kind: 'message',
        context: 'x',
      },
    });
    expect(checkS2(ctx)).toEqual([]);
  });
});
