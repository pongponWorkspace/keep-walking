/**
 * The 10-row "ตัวอย่างผลที่คาดหวัง" table at the end of design/narrative/style-guide.md
 * section 7, reproduced 1:1 as test cases (P1-H02 acceptance: "test case 10 แถวของ
 * style guide ผ่านทั้งหมดผ่าน pnpm test").
 */
import { describe, expect, it } from 'vitest';
import { checkS3 } from '../src/checks/s3';
import { checkS5 } from '../src/checks/s5';
import { checkS6 } from '../src/checks/s6';
import { checkS9 } from '../src/checks/s9';
import { checkS10 } from '../src/checks/s10';
import { contextFor } from './helpers';

function fails(issues: readonly { level: string }[]): boolean {
  return issues.some((issue) => issue.level === 'FAIL');
}

describe('style-guide.md section 7 table', () => {
  it('1. run.death = GDD canon passes every check, cells = 47', () => {
    const ctx = contextFor({
      'run.death': {
        text: 'คุณตาย ของใน run นี้หายทั้งหมด ครั้งหน้าลองกลับบ้านก่อนตาย',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'death',
        cells: 47,
        alts: ['a', 'b'],
      },
    });
    expect(fails(checkS9(ctx))).toBe(false);
  });

  it('2. run.autoRetreat still printing "25%" -> FAIL S6', () => {
    const ctx = contextFor({
      'run.autoRetreat': {
        text: 'HP เหลือต่ำกว่า 25% ระบบพาคุณกลับก่อน คุณรอด มอนสเตอร์ไม่ได้ แต่ก็ช่างมันเถอะ',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'autoRetreat',
      },
    });
    expect(fails(checkS6(ctx))).toBe(true);
  });

  it('3. run.autoRetreat with {autoRetreatPct} -> passes, cells = 63', () => {
    const ctx = contextFor({
      'run.autoRetreat': {
        text: 'HP เหลือต่ำกว่า {autoRetreatPct}% ระบบพาคุณกลับก่อน คุณรอด มอนสเตอร์ไม่ได้ แต่ก็ช่างมันเถอะ',
        voice: 'system',
        kind: 'message',
        context: 'x',
        beat: 'autoRetreat',
        cells: 63,
      },
    });
    expect(fails(checkS6(ctx))).toBe(false);
    expect(fails(checkS9(ctx))).toBe(false);
  });

  it('4. "ห่างจากคุณ {distanceText}" does not trip the W2b "ห่า" guard', () => {
    const ctx = contextFor({
      'map.x': { text: 'ห่างจากคุณ {distanceText}', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(fails(checkS3(ctx))).toBe(false);
  });

  it('5. onboarding.firstReward with "ตีบวก" -> FAIL S10 U2', () => {
    const ctx = contextFor({
      'onboarding.firstReward': {
        text: 'เก็บไว้ตีบวกทีหลัง',
        voice: 'system',
        kind: 'message',
        context: 'x',
      },
    });
    expect(fails(checkS10(ctx))).toBe(true);
  });

  it('6. run.death with "เสียใจด้วย" -> FAIL S9', () => {
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
    expect(fails(checkS9(ctx))).toBe(true);
  });

  it('7. system "มึงตาย ของหายหมด" -> FAIL S3', () => {
    const ctx = contextFor({
      'run.x': { text: 'มึงตาย ของหายหมด', voice: 'system', kind: 'message', context: 'x' },
    });
    expect(fails(checkS3(ctx))).toBe(true);
  });

  it('8. character "มอนสเตอร์: มึงเข้ามาทำอะไรในบ้านกู" -> passes S3', () => {
    const ctx = contextFor({
      'lore.x': {
        text: 'มอนสเตอร์: มึงเข้ามาทำอะไรในบ้านกู',
        voice: 'character',
        kind: 'dialogue',
        context: 'x',
      },
    });
    expect(fails(checkS3(ctx))).toBe(false);
  });

  it('9. "Auto-retreat: ON" -> FAIL S5', () => {
    const ctx = contextFor({
      'settings.x': { text: 'Auto-retreat: ON', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(fails(checkS5(ctx))).toBe(true);
  });

  it('10. "raid เปิดทุกเสาร์ 16:00" -> FAIL S6 (day and time)', () => {
    const ctx = contextFor({
      'raid.x': { text: 'raid เปิดทุกเสาร์ 16:00', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(fails(checkS6(ctx))).toBe(true);
  });
});
