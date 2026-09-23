import { describe, expect, it } from 'vitest';
import { checkS4 } from '../src/checks/s4';
import { contextFor, rules } from './helpers';

describe('S4 — length limits (config/content/copy-rules.json#limits)', () => {
  it('passes the GDD canon autoRetreat text at 63 cells (limit 64)', () => {
    const ctx = contextFor({
      'run.autoRetreat': {
        text: 'HP เหลือต่ำกว่า {autoRetreatPct}% ระบบพาคุณกลับก่อน คุณรอด มอนสเตอร์ไม่ได้ แต่ก็ช่างมันเถอะ',
        voice: 'system',
        kind: 'message',
        context: 'x',
        cells: 63,
      },
    });
    expect(checkS4(ctx)).toEqual([]);
  });

  it('FAILs a legal message summary line over summaryMaxCells (65 cells)', () => {
    const longLine = 'ก'.repeat(65);
    const ctx = contextFor({
      'legal.x': { text: longLine, voice: 'legal', kind: 'message', context: 'x' },
    });
    expect(checkS4(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('does not bound the second line of a legal message by summaryMaxCells', () => {
    const ctx = contextFor({
      'legal.x': {
        text: `สั้นพอ\n${'ก'.repeat(200)}`,
        voice: 'legal',
        kind: 'message',
        context: 'x',
      },
    });
    expect(checkS4(ctx)).toEqual([]);
  });

  it('WARNs (not FAILs) when the declared `cells` does not match the counted value', () => {
    const ctx = contextFor({
      'label.x': { text: 'คุณตาย', voice: 'system', kind: 'label', context: 'x', cells: 999 },
    });
    const issues = checkS4(ctx);
    expect(issues.some((issue) => issue.level === 'WARN')).toBe(true);
    expect(issues.some((issue) => issue.level === 'FAIL')).toBe(false);
  });

  it('FAILs push.deathTitle-like text at 25 cells (titleMaxCells 24)', () => {
    const ctx = contextFor({
      'push.x': { text: 'ก'.repeat(25), voice: 'system', kind: 'push', context: 'x' },
    });
    expect(checkS4(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('passes push.deathTitle at 5 cells', () => {
    const ctx = contextFor({
      'push.deathTitle': { text: 'คุณตาย', voice: 'system', kind: 'push', context: 'x' },
    });
    expect(checkS4(ctx)).toEqual([]);
  });

  it('does not apply maxCellsPerLine to a single-line message (only maxCells does)', () => {
    const ctx = contextFor({
      'run.x': { text: 'ก'.repeat(40), voice: 'system', kind: 'message', context: 'x' },
    });
    expect(checkS4(ctx)).toEqual([]); // 40 <= message.maxCells (64), single line: no per-line cap
  });

  it('FAILs a message whose line is too long once it actually has a second line', () => {
    const ctx = contextFor({
      'run.x': { text: `${'ก'.repeat(40)}\nสั้น`, voice: 'system', kind: 'message', context: 'x' },
    });
    expect(checkS4(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('uses limits.buttonFullWidth (16) instead of limits.button (12) for a listed key', () => {
    const ctx = contextFor(
      {
        'run.summaryContinue': {
          text: 'เดินต่อเพื่อรับเพิ่ม',
          voice: 'system',
          kind: 'button',
          context: 'x',
        },
      },
      undefined,
      undefined,
      rules,
    );
    expect(checkS4(ctx)).toEqual([]); // 13 cells: FAILs against button (12) but not buttonFullWidth (16)
  });

  it('FAILs a non-listed button key at the same length that buttonFullWidth would allow', () => {
    const ctx = contextFor({
      'run.otherButton': {
        text: 'เดินต่อเพื่อรับเพิ่ม',
        voice: 'system',
        kind: 'button',
        context: 'x',
      },
    });
    expect(checkS4(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });
});
