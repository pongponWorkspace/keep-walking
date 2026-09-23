import { describe, expect, it } from 'vitest';
import { checkS5 } from '../src/checks/s5';
import { contextFor } from './helpers';

describe('S5 — English only from the allowlist', () => {
  it('FAILs "Auto-retreat: ON"', () => {
    const ctx = contextFor({
      'settings.x': { text: 'Auto-retreat: ON', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS5(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('FAILs an English phrase of 3+ words even when every word is individually allowed', () => {
    const ctx = contextFor({
      'party.x': { text: 'Party found run raid', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS5(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('passes a single allowed word inside a Thai sentence', () => {
    const ctx = contextFor({
      'party.x': {
        text: 'เจอ party แล้ว กดเข้าร่วม',
        voice: 'system',
        kind: 'label',
        context: 'x',
      },
    });
    expect(checkS5(ctx)).toEqual([]);
  });

  it('is case-insensitive for Common/Uncommon/Rare/Epic/Legendary', () => {
    const ctx = contextFor({
      'rarity.x': { text: 'common', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS5(ctx)).toEqual([]);
  });

  it('accepts the single uppercase letters T, R, S, M', () => {
    const ctx = contextFor({
      'map.x': { text: 'T3 R4 S2 M3', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS5(ctx)).toEqual([]);
  });

  it('rejects lowercase t/r/s/m (case-sensitive single-letter tokens)', () => {
    const ctx = contextFor({
      'map.x': { text: 't3', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS5(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('rejects lowercase "hp" (HP must always be uppercase)', () => {
    const ctx = contextFor({
      'run.x': { text: 'hp ต่ำ', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS5(ctx).some((issue) => issue.level === 'FAIL')).toBe(true);
  });

  it('does not scan the variable name inside {}', () => {
    const ctx = contextFor({
      'run.x': { text: 'ห่างจากคุณ {distanceText}', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(checkS5(ctx)).toEqual([]);
  });
});
