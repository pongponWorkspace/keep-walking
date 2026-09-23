import { describe, expect, it } from 'vitest';
import { checkS9 } from '../src/checks/s9';
import { contextFor } from './helpers';

describe('S9 — the three beats: canon text and no sorry/comfort/explain words', () => {
  it('FAILs run.death when it contains "เสียใจด้วย"', () => {
    const ctx = contextFor({
      'run.death': {
        text: 'เสียใจด้วย คุณตาย',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'death',
        alts: ['a', 'b'],
      },
    });
    expect(checkS9(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('passes the exact GDD canon text for hpLow, autoRetreat, and death', () => {
    const ctx = contextFor({
      'run.hpLow': {
        text: 'HP ต่ำ กลับบ้าน ซื้อยา หาเพื่อนที่มี Support หรือไม่ก็เลิกดื้อ',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'hpLow',
      },
      'run.autoRetreat': {
        text: 'HP เหลือต่ำกว่า {autoRetreatPct}% ระบบพาคุณกลับก่อน คุณรอด มอนสเตอร์ไม่ได้ แต่ก็ช่างมันเถอะ',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'autoRetreat',
      },
      'run.death': {
        text: 'คุณตาย ของใน run นี้หายทั้งหมด ครั้งหน้าลองกลับบ้านก่อนตาย',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'death',
        alts: ['a', 'b'],
      },
    });
    expect(checkS9(ctx)).toEqual([]);
  });

  it('FAILs when the death text deviates from canon', () => {
    const ctx = contextFor({
      'run.death': {
        text: 'คุณตายแล้ว ของหายหมดเลย',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'death',
        alts: ['a', 'b'],
      },
    });
    expect(checkS9(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });
});
