// @vitest-environment happy-dom
// setIconGlyph (D-121, docs/tech/asset-delivery.md 6.1, design/ux/components.md 13.9). Every
// browser API (fetch, DOMParser) is injected; container/img/svg elements are real happy-dom nodes
// so the sanitizer and the night backing-plate rule run against a real DOM tree.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createIconGlyphRenderer } from './icon-glyph';
import type { FetchTextLike, IconGlyphOptions } from './icon-glyph';
import type { AssetRuntime } from './icon-dom';
import type { RuntimeManifest } from './manifest';

// `import.meta.url` read into its own binding, not passed inline: Vite recognises the exact AST
// shape `new URL('literal', import.meta.url)` as its own build-time asset-URL syntax and rewrites
// it to a dev-server URL (`http://localhost:.../...`) under this file's `happy-dom` environment
// (a plain `node` environment test, e.g. `map/style.test.ts`, does not hit this transform — only
// the browser-like pool does). Reading `import.meta.url` into `THIS_MODULE_URL` first breaks that
// literal pattern, so `new URL(...)` below runs as an ordinary runtime call against Node's own
// `URL`/`fileURLToPath` and resolves to a real `file:` path, same as every other repo fixture that
// reads a checked-in file relative to its own test file.
const THIS_MODULE_URL = import.meta.url;
/** A *static* string literal for the first argument (see above) — any further path joining goes
 * through `node:path`'s `join`, never a second `new URL(...)` call. */
const ICON_SOURCE_DIR = fileURLToPath(new URL('../../../../art/assets/icon/', THIS_MODULE_URL));

/** The real, checked-in master SVGs for every tintable manifest entry (tools/art/out/client is a
 * gitignored build product, so this reads the source masters directly — `tools/art` copies these
 * files byte-for-byte into the build, per its own pipeline, F06-TG-08's "all current manifest
 * glyphs still render" evidence). Not every file here is `tintable` in the manifest (e.g. entries
 * without `currentColor`), but every one is a real shipped icon and a fair sanitizer fixture. */
function readIconSource(relativePath: string): string {
  return readFileSync(join(ICON_SOURCE_DIR, relativePath), 'utf-8');
}

function listIconSvgFiles(dir: 'ui' | 'ui16'): readonly string[] {
  return readdirSync(join(ICON_SOURCE_DIR, dir))
    .filter((name) => name.endsWith('.svg'))
    .map((name) => `${dir}/${name}`);
}

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

describe('setIconGlyph, sanitizer allowlist (F06-TG-08, asset-delivery.md 6.1)', () => {
  async function sanitize(svgText: string): Promise<HTMLElement> {
    const manifest = manifestWith({ 'icon.ui.grace': asset([SVG_FILE], true) });
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText: fetchTextOk(svgText),
      parseSvgDocument,
    });
    const container = document.createElement('span');
    await renderer.setIconGlyph(container, 'icon.ui.grace', OPTIONS);
    return container;
  }

  it('drops a <script> element anywhere in the subtree, keeps a sibling shape', async () => {
    const container = await sanitize('<svg><script>alert(1)</script><path d="M0 0"/></svg>');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('path')).not.toBeNull();
  });

  it('drops every on* attribute, on the root and on a descendant', async () => {
    const container = await sanitize(
      '<svg onload="evil()"><path d="M0 0" onclick="evil()" onmouseover="evil()"/></svg>',
    );
    const svg = container.querySelector('svg');
    expect(svg?.hasAttribute('onload')).toBe(false);
    const path = container.querySelector('path');
    expect(path?.hasAttribute('onclick')).toBe(false);
    expect(path?.hasAttribute('onmouseover')).toBe(false);
    expect(path?.getAttribute('d')).toBe('M0 0');
  });

  it('drops href/xlink:href pointing off-document, keeps a local #fragment href', async () => {
    const container = await sanitize(
      '<svg><defs><symbol id="local-symbol"><path d="M0 0"/></symbol></defs>' +
        '<use href="https://evil.example/x#y" xlink:href="https://evil.example/x#y"/>' +
        '<use href="#local-symbol"/></svg>',
    );
    const uses = container.querySelectorAll('use');
    expect(uses[0]?.hasAttribute('href')).toBe(false);
    expect(uses[0]?.hasAttribute('xlink:href')).toBe(false);
    expect(uses[1]?.getAttribute('href')).toBe('#local-symbol');
  });

  it('drops the style attribute outright, including one carrying url(...)', async () => {
    const container = await sanitize(
      '<svg><path d="M0 0" style="fill:url(https://evil.example/x)"/></svg>',
    );
    expect(container.querySelector('path')?.hasAttribute('style')).toBe(false);
  });

  it('drops <foreignObject> and everything nested inside it, including a script', async () => {
    const container = await sanitize(
      '<svg><foreignObject><script>alert(1)</script><div onclick="evil()">hi</div>' +
        '</foreignObject><path d="M0 0"/></svg>',
    );
    expect(container.querySelector('foreignObject')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('div')).toBeNull();
    expect(container.querySelector('path')).not.toBeNull();
  });

  it('drops a <style> element (CSS url() smuggling)', async () => {
    const container = await sanitize(
      '<svg><style>path{fill:url(https://evil.example/x)}</style><path d="M0 0"/></svg>',
    );
    expect(container.querySelector('style')).toBeNull();
    expect(container.querySelector('path')).not.toBeNull();
  });

  it('drops <animate> and <set> (attribute-mutation elements, e.g. animating href)', async () => {
    const container = await sanitize(
      '<svg><use href="#x"><animate attributeName="href" to="https://evil.example/x"/>' +
        '<set attributeName="href" to="https://evil.example/x"/></use></svg>',
    );
    expect(container.querySelector('animate')).toBeNull();
    expect(container.querySelector('set')).toBeNull();
  });

  it('drops an <a> element and everything it wraps, not just its own attributes', async () => {
    const container = await sanitize(
      '<svg><a href="https://evil.example/x" onclick="evil()"><path d="M0 0"/></a>' +
        '<circle cx="1" cy="1" r="1"/></svg>',
    );
    expect(container.querySelector('a')).toBeNull();
    // The path nested only inside the rejected <a> is gone with it...
    expect(container.querySelector('path')).toBeNull();
    // ...but a sibling shape outside the rejected element survives.
    expect(container.querySelector('circle')).not.toBeNull();
  });

  it('drops an unknown/future element entirely (allowlist, not a denylist)', async () => {
    const container = await sanitize('<svg><image href="https://evil.example/x.png"/></svg>');
    expect(container.querySelector('image')).toBeNull();
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

describe('setIconGlyph, real manifest glyphs still render (F06-TG-08)', () => {
  const DRAWABLE_TAGS = ['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'];

  function countDrawableElements(doc: ParentNode): number {
    return DRAWABLE_TAGS.reduce((total, tag) => total + doc.querySelectorAll(tag).length, 0);
  }

  // Every source SVG under `tools/art`'s `svg.currentColorKinds` scan that actually uses
  // `currentColor` — the same condition `tools/art/src/stage.ts` uses to set `tintable: true` in
  // the manifest (checked directly against the source masters here since the build output under
  // `tools/art/out/` is gitignored). At the time of writing this is the full 30-entry set
  // (`icon.ui.*` + `icon.ui16.*`) `docs/reviews/F06-tech-gate.md` F06-TG-08 asks this test to cover.
  const tintableIconFiles = (['ui', 'ui16'] as const).flatMap((dir) =>
    listIconSvgFiles(dir).filter((path) => readIconSource(path).includes('currentColor')),
  );

  it('found every currently-tintable manifest icon (guards against an empty/broken fixture)', () => {
    expect(tintableIconFiles).toHaveLength(30);
  });

  it.each(tintableIconFiles)('renders %s inline with every drawable shape intact', async (path) => {
    const svgText = readIconSource(path);
    const manifest = manifestWith({ 'icon.ui.grace': asset([SVG_FILE], true) });
    const renderer = createIconGlyphRenderer({
      runtime: runtimeOf(manifest),
      fetchText: fetchTextOk(svgText),
      parseSvgDocument,
    });
    const container = document.createElement('span');

    await renderer.setIconGlyph(container, 'icon.ui.grace', OPTIONS);

    expect(container.querySelector('img')).toBeNull();
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('style')).toBe(`color:${OPTIONS.colorCss}`);
    // The allowlist must not remove any of the real, trusted shapes this first-party asset ships.
    expect(countDrawableElements(container)).toBe(
      countDrawableElements(new DOMParser().parseFromString(svgText, 'image/svg+xml')),
    );
  });
});
