import { describe, expect, it } from 'vitest';
import { itemCatalogEntry } from './item-catalog';

describe('itemCatalogEntry', () => {
  it('resolves a known material item (elementDust, common)', () => {
    const entry = itemCatalogEntry('elementDust');
    expect(entry?.nameKey).toBe('material.elementDust');
    expect(entry?.rarity).toBe('common');
    expect(entry?.iconId).toBe('icon.item.mat-dust');
  });

  it('resolves a known rare item (riftStone)', () => {
    const entry = itemCatalogEntry('riftStone');
    expect(entry?.rarity).toBe('rare');
  });

  it('is undefined for an unknown item id', () => {
    expect(itemCatalogEntry('does-not-exist')).toBeUndefined();
  });
});
