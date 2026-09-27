import { describe, expect, it } from 'vitest';
import {
  getDungeonFullName,
  getDungeonShortName,
  getItemName,
  isResolvedDungeonName,
} from './names';
// Read the real names directly from the data file rather than hardcoding Thai text in this file
// (qa-tester's TC-COPY-01, `qa/tests/F02/privacy-copy.test.ts`: no Thai-script literal in code).
import namesThJson from '../../../../config/content/names.th.json';

const names = namesThJson as unknown as Record<
  string,
  { name?: string; nameReal?: string; nameSuffix?: string }
>;

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

  it('resolves a dungeon search name (dungeon.<id>.search)', () => {
    expect(getItemName('dungeon.rommaninatPark.search')).toBe(
      names['dungeon.rommaninatPark.search']?.name,
    );
  });
});

// C-01 (copy gate P2-X37): dungeon names come from names.th.json, never copy.th.json.
describe('getDungeonFullName', () => {
  it('joins nameReal and nameSuffix with the displayFormat separator (names.th.json#_meta)', () => {
    const entry = names['dungeon.lumpini'];
    expect(getDungeonFullName('dungeon.lumpini')).toBe(`${entry?.nameReal} — ${entry?.nameSuffix}`);
  });

  it('falls back to the key itself for an unknown nameKey (never a raw key elsewhere)', () => {
    expect(getDungeonFullName('dungeon.doesNotExist')).toBe('dungeon.doesNotExist');
  });
});

describe('getDungeonShortName', () => {
  it('returns nameReal alone', () => {
    expect(getDungeonShortName('dungeon.lumpini')).toBe(names['dungeon.lumpini']?.nameReal);
  });

  it('falls back to the key itself for an unknown nameKey', () => {
    expect(getDungeonShortName('dungeon.doesNotExist')).toBe('dungeon.doesNotExist');
  });
});

describe('isResolvedDungeonName', () => {
  it('is true once the name resolves away from the raw key', () => {
    expect(isResolvedDungeonName('dungeon.lumpini', getDungeonShortName('dungeon.lumpini'))).toBe(
      true,
    );
  });

  it('is false when the fallback returned the key itself unchanged (A2)', () => {
    expect(
      isResolvedDungeonName('dungeon.doesNotExist', getDungeonShortName('dungeon.doesNotExist')),
    ).toBe(false);
  });
});
