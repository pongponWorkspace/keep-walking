// @vitest-environment happy-dom
// setIconGlyph (D-121, docs/tech/asset-delivery.md 6.1, design/ux/components.md 13.9). Every
// browser API (fetch, DOMParser) is injected; container/img/svg elements are real happy-dom nodes
// so the sanitizer and the night backing-plate rule run against a real DOM tree.
import { describe, expect, it } from 'vitest';
import { createIconGlyphRenderer } from './icon-glyph';
import type { FetchTextLike, IconGlyphOptions } from './icon-glyph';
import type { AssetRuntime } from './icon-dom';
import type { RuntimeManifest } from './manifest';

function asset(
  files: RuntimeManifest['assets'][string]['files'],
  tintable?: true,
): RuntimeManifest['assets'][string] {
  return {
    kind: 'icon-ui',
    status: 'approved',
    placeholder: false,
    size: null,
    files,
    ...(tintable === undefined ? {} : { tintable }),
  };
}

const SVG_FILE = {
  url: 'art/icon/ui/grace.svg?v=1',
  format: 'svg',
  scale: null,
  variant: null,
  width: 24,
  height: 24,
  bytes: 500,
};

function manifestWith(assets: RuntimeManifest['assets']): RuntimeManifest {
  return { runtimeVersion: 1, avatarRig: 1, assets, fonts: [], audio: {}, credits: [] };
}

function runtimeOf(manifest: RuntimeManifest | undefined): AssetRuntime {
  return { getManifest: () => manifest, basePath: '/kw/', scale: 1, isProduction: false };
}

function parseSvgDocument(svgText: string): Document {
  return new DOMParser().parseFromString(svgText, 'image/svg+xml');
}

const OPTIONS: IconGlyphOptions = {
  altText: 'Grace',
  colorCss: 'rgb(0, 102, 153)',
  onNightBackground: false,
  nightPlateColorCss: 'rgb(255, 255, 255)',
};

function fetchTextOk(text: string): FetchTextLike {
  return async () => ({ ok: true, text: async () => text });
}

function fetchTextCounting(text: string): { fetchText: FetchTextLike; calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    fetchText: async (url) => {
      calls.push(url);
      return { ok: true, text: async () => text };
    },
  };
}

describe('setIconGlyph, tintable success', () => {
  it('inlines the SVG, sets color, and marks it decorative', async () => {
    const manifest = manifestWith({ 'icon.ui.grace': asset([SVG_FILE], true) });
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText: fetchTextOk('<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>'),
      parseSvgDocument,
    });
    const container = document.createElement('span');

    await renderer.setIconGlyph(container, 'icon.ui.grace', OPTIONS);

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    expect(svg?.getAttribute('style')).toBe(`color:${OPTIONS.colorCss}`);
    expect(container.querySelector('img')).toBeNull();
  });

  it('fetches the SVG only once per id across repeated calls (per session)', async () => {
    const manifest = manifestWith({ 'icon.ui.grace': asset([SVG_FILE], true) });
    const { fetchText, calls } = fetchTextCounting('<svg><path d="M0 0"/></svg>');
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText,
      parseSvgDocument,
    });

    await renderer.setIconGlyph(document.createElement('span'), 'icon.ui.grace', OPTIONS);
    await renderer.setIconGlyph(document.createElement('span'), 'icon.ui.grace', OPTIONS);

    expect(calls).toEqual(['/kw/art/icon/ui/grace.svg?v=1']);
  });
});

describe('setIconGlyph, sanitizer (asset-delivery.md 6.1)', () => {
  it('drops a <script> element, on* attributes, and a non-local href, keeps a #local href', async () => {
    const manifest = manifestWith({ 'icon.ui.grace': asset([SVG_FILE], true) });
    const dirty =
      '<svg onload="evil()"><script>alert(1)</script>' +
      '<a href="https://evil.example/x" onclick="evil()"><path d="M0 0"/></a>' +
      '<use href="#local-symbol"/></svg>';
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText: fetchTextOk(dirty),
      parseSvgDocument,
    });
    const container = document.createElement('span');

    await renderer.setIconGlyph(container, 'icon.ui.grace', OPTIONS);

    const svg = container.querySelector('svg');
    expect(svg?.querySelector('script')).toBeNull();
    expect(svg?.hasAttribute('onload')).toBe(false);
    expect(svg?.querySelector('a')?.hasAttribute('onclick')).toBe(false);
    expect(svg?.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(svg?.querySelector('use')?.getAttribute('href')).toBe('#local-symbol');
  });

  it('strips <title>/<desc> so a screen reader never reads them twice (13.9.2)', async () => {
    const manifest = manifestWith({ 'icon.ui.grace': asset([SVG_FILE], true) });
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText: fetchTextOk('<svg><title>Grace</title><desc>d</desc><path d="M0 0"/></svg>'),
      parseSvgDocument,
    });
    const container = document.createElement('span');

    await renderer.setIconGlyph(container, 'icon.ui.grace', OPTIONS);

    expect(container.querySelector('title')).toBeNull();
    expect(container.querySelector('desc')).toBeNull();
  });
});

describe('setIconGlyph, fallback to the existing <img> (asset-delivery.md 6.4)', () => {
  it('falls back on a failed fetch (network miss)', async () => {
    const manifest = manifestWith({ 'icon.ui.grace': asset([SVG_FILE], true) });
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText: async () => ({ ok: false, text: async () => '' }),
      parseSvgDocument,
    });
    const container = document.createElement('span');

    await renderer.setIconGlyph(container, 'icon.ui.grace', OPTIONS);

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.hidden).toBe(false);
    expect(img?.src).toContain('/kw/art/icon/ui/grace.svg?v=1');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('falls back when fetchText itself rejects', async () => {
    const manifest = manifestWith({ 'icon.ui.grace': asset([SVG_FILE], true) });
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText: async () => {
        throw new Error('offline');
      },
      parseSvgDocument,
    });
    const container = document.createElement('span');

    await expect(
      renderer.setIconGlyph(container, 'icon.ui.grace', OPTIONS),
    ).resolves.toBeUndefined();
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('falls back when the fetched text is not a valid <svg> document', async () => {
    const manifest = manifestWith({ 'icon.ui.grace': asset([SVG_FILE], true) });
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText: fetchTextOk('not xml at all <<<'),
      parseSvgDocument,
    });
    const container = document.createElement('span');

    await renderer.setIconGlyph(container, 'icon.ui.grace', OPTIONS);

    expect(container.querySelector('svg')).toBeNull();
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('uses the <img> path directly for an id with no tintable field (never fetches)', async () => {
    const manifest = manifestWith({ 'icon.ui.suspended': asset([SVG_FILE]) });
    const { fetchText, calls } = fetchTextCounting('<svg/>');
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText,
      parseSvgDocument,
    });
    const container = document.createElement('span');

    await renderer.setIconGlyph(container, 'icon.ui.suspended', OPTIONS);

    expect(calls).toEqual([]);
    expect(container.querySelector('img')).not.toBeNull();
  });

  it('hides on an undefined id, same as setIconImg', async () => {
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(undefined),
      fetchText: fetchTextOk('<svg/>'),
      parseSvgDocument,
    });
    const container = document.createElement('span');

    await renderer.setIconGlyph(container, undefined, OPTIONS);

    expect(container.querySelector('img')?.hidden).toBe(true);
  });

  it('adds a bg.surface backing plate sized glyph+2px only on bg.night', async () => {
    const manifest = manifestWith({ 'icon.ui.grace': asset([SVG_FILE], true) });
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText: async () => ({ ok: false, text: async () => '' }),
      parseSvgDocument,
    });
    const container = document.createElement('span');

    await renderer.setIconGlyph(container, 'icon.ui.grace', {
      ...OPTIONS,
      onNightBackground: true,
      nightPlateColorCss: 'rgb(255, 255, 255)',
    });

    const plate = container.querySelector('[data-kw-icon-glyph-plate]') as HTMLElement | null;
    expect(plate).not.toBeNull();
    expect(plate?.style.position).toBe('absolute');
    expect(plate?.style.inset).toBe('-2px');
    expect(plate?.style.background).toBe('rgb(255, 255, 255)');
  });

  it('adds no backing plate when not on bg.night', async () => {
    const manifest = manifestWith({ 'icon.ui.grace': asset([SVG_FILE], true) });
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText: async () => ({ ok: false, text: async () => '' }),
      parseSvgDocument,
    });
    const container = document.createElement('span');

    await renderer.setIconGlyph(container, 'icon.ui.grace', OPTIONS);

    expect(container.querySelector('[data-kw-icon-glyph-plate]')).toBeNull();
  });
});
