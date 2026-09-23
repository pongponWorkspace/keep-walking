import { describe, expect, it } from 'vitest';
import { checkS3 } from '../src/checks/s3';
import { contextFor } from './helpers';

describe('S3 — profanity level per voice', () => {
  it('FAILs "มึงตาย ของหายหมด" in voice system', () => {
    const ctx = contextFor({
      'run.x': { text: 'มึงตาย ของหายหมด', voice: 'system', kind: 'message', context: 'x' },
    });
    expect(checkS3(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('passes "มอนสเตอร์: มึงเข้ามาทำอะไรในบ้านกู" in voice character / kind dialogue', () => {
    const ctx = contextFor({
      'lore.monsterLine': {
        text: 'มอนสเตอร์: มึงเข้ามาทำอะไรในบ้านกู',
        voice: 'character',
        kind: 'dialogue',
        context: 'x',
      },
    });
    expect(checkS3(ctx)).toEqual([]);
  });

  it('does not flag "กู้คืน" (a false positive of the bare pronoun "กู")', () => {
    const ctx = contextFor({
      'account.x': {
        text: 'ลบแล้วกู้คืนไม่ได้ ทุกอย่างหายหมด',
        voice: 'legal',
        kind: 'message',
        context: 'x',
      },
    });
    expect(checkS3(ctx)).toEqual([]);
  });

  it('FAILs W2b profanity ("เหี้ย") even in voice character', () => {
    const ctx = contextFor({
      'lore.x': {
        text: 'มอนสเตอร์: เหี้ยจริง',
        voice: 'character',
        kind: 'dialogue',
        context: 'x',
      },
    });
    expect(checkS3(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('FAILs a dialogue line with no "<speaker>: " prefix', () => {
    const ctx = contextFor({
      'lore.x': { text: 'ไม่มีชื่อผู้พูดเลย', voice: 'character', kind: 'dialogue', context: 'x' },
    });
    expect(checkS3(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });
});
