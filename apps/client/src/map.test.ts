import { describe, expect, it } from 'vitest';
import { deriveTilesetId } from './map';

describe('deriveTilesetId', () => {
  it('reads the tileset id from a pmtiles:// archive file name', () => {
    expect(deriveTilesetId('pmtiles://https://host.example/pm4-20260923-z15.pmtiles')).toBe(
      'pm4-20260923-z15',
    );
  });

  it('reads the tileset id from a TileJSON URL', () => {
    expect(deriveTilesetId('https://host.example/tiles/pm4-20260923-z15/tiles.json')).toBe(
      'pm4-20260923-z15',
    );
  });

  it('returns undefined for a shape it does not recognize', () => {
    expect(deriveTilesetId('https://host.example/some-other-thing.json')).toBeUndefined();
  });

  it('ignores a query string', () => {
    expect(deriveTilesetId('pmtiles://https://host.example/bkk.pmtiles?v=2')).toBe('bkk');
  });
});
