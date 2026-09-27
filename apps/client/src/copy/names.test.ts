import { describe, expect, it } from 'vitest';
import { getItemName } from './names';
// Read the real names directly from the data file rather than hardcoding Thai text in this file
// (qa-tester's TC-COPY-01, `qa/tests/F02/privacy-copy.test.ts`: no Thai-script literal in code).
import namesThJson from '../../../../config/content/names.th.json';

const names = namesThJson as unknown as Record<string, { name?: string; nameReal?: string }>;

describe('getItemName', () => {
  it('resolves a material name (names.th.json#material.elementDust)', () => {
    expect(getItemName('material.elementDust')).toBe(names['material.elementDust']?.name);
  });

  it('resolves a potion name', () => {
    expect(getItemName('potion.hpSmall')).toBe(names['potion.hpSmall']?.name);
  });

  it('resolves an equipment name', () => {
    expect(getItemName('equipment.weapon')).toBe(names['equipment.weapon']?.name);
  });

  it('falls back to the key itself for an unknown nameKey (never invents Thai text)', () => {
    expect(getItemName('material.doesNotExist')).toBe('material.doesNotExist');
  });
});
