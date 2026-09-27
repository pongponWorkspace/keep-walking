// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { fontFaceCss, injectFontFaces } from './fonts';
import type { RuntimeManifest } from './manifest';

const MANIFEST: RuntimeManifest = {
  runtimeVersion: 1,
  avatarRig: 1,
  assets: {},
  fonts: [
    {
      id: 'font.ui.plex-sans-thai-looped-500',
      role: 'ui',
      family: 'IBM Plex Sans Thai Looped',
      weight: 500,
      url: 'fonts/ui/IBMPlexSansThaiLooped-Medium.woff2?v=abc123',
      format: 'woff2',
      bytes: 44120,
    },
    {
      id: 'font.ui.plex-sans-thai-looped-700',
      role: 'ui',
      family: 'IBM Plex Sans Thai Looped',
      weight: 700,
      url: 'fonts/ui/IBMPlexSansThaiLooped-Bold.woff2?v=def456',
      format: 'woff2',
      bytes: 43144,
    },
  ],
  audio: {},
  credits: [],
};

describe('fontFaceCss', () => {
  it('emits one @font-face per font entry with family/weight/url/format', () => {
    const css = fontFaceCss(MANIFEST, '/kw/');
    expect(css).toContain("font-family: 'IBM Plex Sans Thai Looped'");
    expect(css).toContain('font-weight: 500');
    expect(css).toContain('font-weight: 700');
    expect(css).toContain("url('/kw/fonts/ui/IBMPlexSansThaiLooped-Medium.woff2?v=abc123')");
    expect(css).toContain("format('woff2')");
    expect(css).toContain('font-display: swap');
  });

  it('is empty for a manifest with no fonts', () => {
    expect(fontFaceCss({ ...MANIFEST, fonts: [] }, '/kw/')).toBe('');
  });
});

describe('injectFontFaces', () => {
  it('appends one style element with the font-face CSS', () => {
    injectFontFaces(document, MANIFEST, '/kw/');
    const style = document.getElementById('kw-asset-fonts');
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain('IBM Plex Sans Thai Looped');
  });

  it('is idempotent (replaces rather than duplicating the style element)', () => {
    injectFontFaces(document, MANIFEST, '/kw/');
    injectFontFaces(document, MANIFEST, '/kw/');
    expect(document.querySelectorAll('#kw-asset-fonts').length).toBe(1);
  });

  it('does nothing for a manifest with no fonts', () => {
    document.getElementById('kw-asset-fonts')?.remove();
    injectFontFaces(document, { ...MANIFEST, fonts: [] }, '/kw/');
    expect(document.getElementById('kw-asset-fonts')).toBeNull();
  });
});
