import { describe, expect, it, vi } from 'vitest';
import { readBuildProfile, readMapEnv, shouldSkipF04App, withTestEnvOverrides } from './env';

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

describe('shouldSkipF04App', () => {
  it('is false with no query params at all', () => {
    expect(shouldSkipF04App('', 'e2eSkipF04App', true)).toBe(false);
  });

  it('is false when the param is absent, even alongside other params', () => {
    expect(shouldSkipF04App('?hud=1', 'e2eSkipF04App', true)).toBe(false);
  });

  it('is true whenever the param is present under the Mock provider, regardless of its value', () => {
    expect(shouldSkipF04App('?e2eSkipF04App=1', 'e2eSkipF04App', true)).toBe(true);
    expect(shouldSkipF04App('?e2eSkipF04App=', 'e2eSkipF04App', true)).toBe(true);
    expect(shouldSkipF04App('?hud=1&e2eSkipF04App=0', 'e2eSkipF04App', true)).toBe(true);
  });

  it('uses the configured param name, not a literal "e2eSkipF04App"', () => {
    expect(shouldSkipF04App('?skip=1', 'skip', true)).toBe(true);
    expect(shouldSkipF04App('?e2eSkipF04App=1', 'skip', true)).toBe(false);
  });

  // TG-05 (tech gate P2-F05-T15, decision 6.2): outside the Mock provider this must never take
  // effect, even when the param is present on the URL — a plain playtest/production link must
  // never be able to silently go quiet with no game loop and no message.
  it('is false outside the Mock provider even when the param is present (TG-05)', () => {
    expect(shouldSkipF04App('?e2eSkipF04App=1', 'e2eSkipF04App', false)).toBe(false);
  });
});

describe('readBuildProfile', () => {
  it('defaults to dev with no commit when both vars are unset', () => {
    expect(readBuildProfile({})).toEqual({ profile: 'dev', commit: undefined });
  });

  it('reads a valid playtest profile and commit', () => {
    expect(readBuildProfile({ VITE_KW_PROFILE: 'playtest', VITE_KW_COMMIT: 'abc1234' })).toEqual({
      profile: 'playtest',
      commit: 'abc1234',
    });
  });

  it('falls back to dev and warns on an unknown profile value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(readBuildProfile({ VITE_KW_PROFILE: 'staging' })).toEqual({
      profile: 'dev',
      commit: undefined,
    });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('staging'));
    warn.mockRestore();
  });

  it('treats a blank commit the same as unset', () => {
    expect(readBuildProfile({ VITE_KW_COMMIT: '   ' }).commit).toBeUndefined();
  });
});
