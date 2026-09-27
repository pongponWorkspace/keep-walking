import { describe, expect, it } from 'vitest';
import { itemLineView } from './item-line-view';
// Read the real name directly from the data file rather than hardcoding Thai text in this file
// (qa-tester's TC-COPY-01, `qa/tests/F02/privacy-copy.test.ts`: no Thai-script literal in code).
import namesThJson from '../../../../config/content/names.th.json';

const names = namesThJson as unknown as Record<string, { name?: string }>;

describe('itemLineView', () => {
  it('resolves name + rarity frame for a known item', () => {
    const view = itemLineView('elementDust', 3);
    expect(view.name).toBe(names['material.elementDust']?.name);
    expect(view.qty).toBe(3);
    expect(view.frameIconId).toBe('frame.rarity.common-52');
    expect(view.itemIconId).toBe('icon.item.mat-dust');
  });

  it('falls back to the raw id for an unknown item (never a crash)', () => {
    const view = itemLineView('does-not-exist', 1);
    expect(view.name).toBe('does-not-exist');
    expect(view.frameIconId).toBeUndefined();
    expect(view.itemIconId).toBeUndefined();
  });
});
