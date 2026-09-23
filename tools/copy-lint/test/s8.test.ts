import { describe, expect, it } from 'vitest';
import { checkS8 } from '../src/checks/s8';
import { contextFor } from './helpers';

describe('S8 — world-forbidden words (W2c, W4, W5, W6, W7)', () => {
  it('FAILs a W4 word ("วีรบุรุษ") in voice system', () => {
    const ctx = contextFor({
      'run.x': { text: 'คุณคือวีรบุรุษ', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS8(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('FAILs W6 gambling words inside enhance.* but not outside it', () => {
    const inEnhance = contextFor({
      'enhance.x': { text: 'ลุ้นรวยกับการตีบวก', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS8(inEnhance).some((issue) => issue.level === 'FAIL')).toBe(true);

    const outside = contextFor({
      'run.x': { text: 'ลุ้นรวยกับการตีบวก', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS8(outside)).toEqual([]);
  });

  it('WARNs (not FAILs) on "รัฐบาล" pending H-02', () => {
    const ctx = contextFor({
      'lore.x': { text: 'รัฐบาลประกาศ', voice: 'research', kind: 'message', context: 'x' },
    });
    const issues = checkS8(ctx);
    expect(issues.some((issue) => issue.level === 'FAIL')).toBe(false);
    expect(issues.some((issue) => issue.level === 'WARN')).toBe(true);
  });

  it('does not flag "วัด" inside "จังหวัด"', () => {
    const ctx = contextFor({
      'privacy.x': { text: 'เลือกจังหวัดของคุณ', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS8(ctx)).toEqual([]);
  });

  it('FAILs a real religious-site word ("โบสถ์")', () => {
    const ctx = contextFor({
      'lore.x': { text: 'ข้างๆ มีโบสถ์', voice: 'research', kind: 'message', context: 'x' },
    });
    expect(checkS8(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });
});
