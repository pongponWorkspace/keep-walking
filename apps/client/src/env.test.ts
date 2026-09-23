import { describe, expect, it } from 'vitest';
import { readMapEnv, withTestEnvOverrides } from './env';

describe('readMapEnv', () => {
  it('passes through set values', () => {
    const result = readMapEnv({
      VITE_TILES_URL: 'https://example.invalid/bkk.pmtiles',
      VITE_GLYPHS_URL: 'https://example.invalid/fonts/{fontstack}/{range}.pbf',
      VITE_SPRITE_URL: 'https://example.invalid/sprite',
    });

    expect(result).toStrictEqual({
      tilesUrl: 'https://example.invalid/bkk.pmtiles',
      glyphsUrl: 'https://example.invalid/fonts/{fontstack}/{range}.pbf',
      spriteUrl: 'https://example.invalid/sprite',
    });
  });

  it('treats a fully-missing env as all undefined', () => {
    expect(readMapEnv({})).toStrictEqual({
      tilesUrl: undefined,
      glyphsUrl: undefined,
      spriteUrl: undefined,
    });
  });

  it('treats blank/whitespace-only values as unset, not as an empty URL', () => {
    const result = readMapEnv({
      VITE_TILES_URL: '   ',
      VITE_GLYPHS_URL: '',
      VITE_SPRITE_URL: undefined,
    });

    expect(result).toStrictEqual({
      tilesUrl: undefined,
      glyphsUrl: undefined,
      spriteUrl: undefined,
    });
  });

  it('trims surrounding whitespace from a set value', () => {
    const result = readMapEnv({ VITE_TILES_URL: '  https://example.invalid/bkk.pmtiles  ' });

    expect(result.tilesUrl).toBe('https://example.invalid/bkk.pmtiles');
  });
});

describe('withTestEnvOverrides', () => {
  const baseEnv = readMapEnv({
    VITE_TILES_URL: 'https://example.invalid/real.pmtiles',
    VITE_GLYPHS_URL: 'https://example.invalid/fonts/{fontstack}/{range}.pbf',
    VITE_SPRITE_URL: 'https://example.invalid/sprite',
  });

  it('leaves the env untouched when no override query params are present', () => {
    expect(withTestEnvOverrides(baseEnv, '')).toStrictEqual(baseEnv);
    expect(withTestEnvOverrides(baseEnv, '?other=1')).toStrictEqual(baseEnv);
  });

  it('overrides only the keys whose query param is present', () => {
    const result = withTestEnvOverrides(baseEnv, '?e2eTilesUrl=/fixtures/missing.pmtiles');

    expect(result).toStrictEqual({ ...baseEnv, tilesUrl: '/fixtures/missing.pmtiles' });
  });

  it('force-clears glyphs/sprite so a dev.env.local pointing at a real CDN cannot leak into e2e', () => {
    const result = withTestEnvOverrides(
      baseEnv,
      '?e2eTilesUrl=/fixtures/missing.pmtiles&e2eGlyphsUrl=&e2eSpriteUrl=',
    );

    expect(result).toStrictEqual({
      tilesUrl: '/fixtures/missing.pmtiles',
      glyphsUrl: undefined,
      spriteUrl: undefined,
    });
  });
});
