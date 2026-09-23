import { describe, expect, it } from 'vitest';
import { MAP_ATTRIBUTION, PMTILES_SOURCE_ID, buildPlaceholderStyle } from './style';

describe('buildPlaceholderStyle', () => {
  it('wraps the tiles URL in the pmtiles:// protocol MapLibre needs (T09 acceptance)', () => {
    const style = buildPlaceholderStyle({ tilesUrl: 'https://example.invalid/bkk.pmtiles' });

    expect(style.sources[PMTILES_SOURCE_ID]?.url).toBe(
      'pmtiles://https://example.invalid/bkk.pmtiles',
    );
  });

  it('sets the required OSM + Protomaps attribution text on the source (TL-S13)', () => {
    const style = buildPlaceholderStyle({ tilesUrl: 'https://example.invalid/bkk.pmtiles' });

    expect(style.sources[PMTILES_SOURCE_ID]?.attribution).toBe(MAP_ATTRIBUTION);
    expect(MAP_ATTRIBUTION).toContain('OpenStreetMap contributors');
    expect(MAP_ATTRIBUTION).toContain('Protomaps');
  });

  it('omits glyphs/sprite when not configured instead of writing undefined', () => {
    const style = buildPlaceholderStyle({ tilesUrl: 'https://example.invalid/bkk.pmtiles' });

    expect('glyphs' in style).toBe(false);
    expect('sprite' in style).toBe(false);
  });

  it('includes glyphs/sprite URLs when configured', () => {
    const style = buildPlaceholderStyle({
      tilesUrl: 'https://example.invalid/bkk.pmtiles',
      glyphsUrl: 'https://example.invalid/fonts/{fontstack}/{range}.pbf',
      spriteUrl: 'https://example.invalid/sprite',
    });

    expect(style.glyphs).toBe('https://example.invalid/fonts/{fontstack}/{range}.pbf');
    expect(style.sprite).toBe('https://example.invalid/sprite');
  });

  it('is valid MapLibre style version 8', () => {
    const style = buildPlaceholderStyle({ tilesUrl: 'https://example.invalid/bkk.pmtiles' });

    expect(style.version).toBe(8);
    expect(style.layers.length).toBeGreaterThan(0);
  });
});
