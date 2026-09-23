/**
 * S9 — the three beats (style-guide section 3). The generic scan already removed W3
 * (sorry/comfort/explain) words; this file adds the exact-match canon check for hpLow,
 * autoRetreat, and death (style-guide 3.1 — "ข้อความ GDD คือ canon ... เปลี่ยนได้เฉพาะเลขที่ต้องเป็นตัวแปร").
 * `raidFail` and `enhanceFail` have no canon text yet (not designed), so only the W3 sweep
 * applies to them.
 */
import type { LintContext } from '../context';
import { fail, type LintIssue } from '../types';
import { scanCheck } from './word-scan-runner';

const CANON_TEXT: Readonly<Record<'hpLow' | 'autoRetreat' | 'death', string>> = {
  hpLow: 'HP ต่ำ กลับบ้าน ซื้อยา หาเพื่อนที่มี Support หรือไม่ก็เลิกดื้อ',
  autoRetreat:
    'HP เหลือต่ำกว่า {autoRetreatPct}% ระบบพาคุณกลับก่อน คุณรอด มอนสเตอร์ไม่ได้ แต่ก็ช่างมันเถอะ',
  death: 'คุณตาย ของใน run นี้หายทั้งหมด ครั้งหน้าลองกลับบ้านก่อนตาย',
};

function isCanonBeat(beat: string): beat is keyof typeof CANON_TEXT {
  return beat in CANON_TEXT;
}

export function checkS9(ctx: LintContext): LintIssue[] {
  const issues: LintIssue[] = [...scanCheck(ctx, 'S9')];
  for (const [key, entry] of ctx.entries) {
    if (
      entry.beat !== undefined &&
      isCanonBeat(entry.beat) &&
      entry.text !== CANON_TEXT[entry.beat]
    ) {
      issues.push(
        fail(
          key,
          'S9',
          `ข้อความหลักของ beat "${entry.beat}" ต้องตรงกับ canon GDD ทุกตัวอักษร: "${CANON_TEXT[entry.beat]}"`,
        ),
      );
    }
  }
  return issues;
}
