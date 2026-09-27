/**
 * `setIconGlyph`: the second icon-rendering technique next to `icon-dom.ts`'s `setIconImg`
 * (D-121, `docs/tech/asset-delivery.md` 6.1, `design/ux/components.md` 13.9/13.9.2/13.9.3). An
 * `<img>` loads an SVG as a separate document — its `currentColor` resolves inside that document,
 * never against the page's own CSS — so a glyph that must change colour per status tone (chip
 * status, run-state pill) has to be inlined instead: fetch the SVG text once per id per session,
 * sanitize it against a real element+attribute allowlist (F06-TG-08: any element or attribute not
 * on the list is dropped — a disallowed element loses its whole subtree, not just its own tag —
 * so `<script>`, `<style>`, `<foreignObject>`, `<animate>`/`<set>`, every `on*` attribute, `style`
 * with `url(...)`, and a `href`/`xlink:href` that is not a local `#fragment` are all rejected the
 * same way: by never appearing on the allowlist in the first place), inject it as
 * `aria-hidden`/non-focusable decoration, and set its colour from the page's own stylesheet.
 *
 * Only entries with `assets[id].tintable === true` use this technique at all (the field exists
 * only when `true`, D-121, `manifest.ts#RuntimeAsset.tintable`) — this module checks that itself,
 * so a caller can call `setIconGlyph` for *any* icon id and get the right technique automatically,
 * same ergonomics as `setIconImg`. Every other id, and any tintable id whose fetch or sanitize
 * fails, falls back to the exact same `<img>` `setIconImg` already renders (6.4) — this file
 * reuses that function rather than a second `<img>` code path.
 */
import { effectiveAssetId, resolveIconFile } from './icon';
import { setIconImg } from './icon-dom';
import type { AssetRuntime } from './icon-dom';
import type { RuntimeManifest } from './manifest';

/** `docs/tech/asset-delivery.md` 6.1/13.9.2: 2 px around the glyph's own box, `bg.surface`
 * (allowed as a literal: 2 is in this repo's magic-number allowlist, identity/halving numbers). */
const NIGHT_BACKING_PLATE_INSET_PX = 2;

export type FetchTextLike = (
  input: string,
) => Promise<{ readonly ok: boolean; text(): Promise<string> }>;

/** `(text) => new DOMParser().parseFromString(text, 'image/svg+xml')`, injected so this module
 * never references the `DOMParser` global itself (ADR 0001 3.6 — testable in `happy-dom` against
 * a fake just as easily as against the real constructor). */
export type ParseSvgDocument = (svgText: string) => Document;

export interface IconGlyphDeps {
  readonly runtime: AssetRuntime;
  readonly fetchText: FetchTextLike;
  readonly parseSvgDocument: ParseSvgDocument;
}

export interface IconGlyphOptions {
  readonly altText: string;
  /** A CSS colour value (already resolved by the caller from `design/ux/tokens.json` per
   * components.md 13.9.1's table — this module owns no token map of its own, it only sets
   * `style.color` with whatever the caller decided). */
  readonly colorCss: string;
  /** True when the container is painted on `bg.night` — gates the fallback `<img>` backing plate
   * (13.9.2); irrelevant on the inline-SVG success path (its colour is always correct). */
  readonly onNightBackground: boolean;
  /** `bg.surface`'s resolved CSS value, only read when `onNightBackground` is true and the fallback
   * `<img>` path is taken. */
  readonly nightPlateColorCss: string;
}

/** `id` resolves (through the same `effectiveAssetId`/`replacedBy`/environment-gating chain
 * `setIconImg` uses) to an asset carrying `tintable: true` — the only condition allowed to pick
 * the inline-SVG technique (components.md 13.9: "ห้ามเดาจาก id, prefix หรือ kind"). */
function tintableFile(
  manifest: RuntimeManifest,
  id: string,
  scale: 1 | 2,
  isProduction: boolean,
): { readonly url: string } | undefined {
  const effectiveId = effectiveAssetId(manifest, id, isProduction);
  if (effectiveId === undefined) return undefined;
  const asset = manifest.assets[effectiveId];
  if (asset === undefined || asset.tintable !== true) return undefined;
  return resolveIconFile(manifest, id, scale, isProduction);
}

function isHrefAttr(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === 'href' || lower === 'xlink:href';
}

/** Element allowlist (F06-TG-08, asset-delivery.md 6.1, components.md 13.9.3): the shapes and
 * containers an icon SVG actually needs to draw itself. Anything else — `<script>`, `<style>`,
 * `<foreignObject>`, `<animate>`/`<set>` (which can smuggle a `href`/`attributeName` mutation past
 * a purely attribute-level filter), `<a>`, `<title>`/`<desc>`, or any future/unknown element — is
 * rejected together with its entire subtree, never inspected attribute-by-attribute. This is a real
 * allowlist: an element survives only by appearing here, not by failing a list of known-bad names. */
const ALLOWED_SVG_ELEMENTS: ReadonlySet<string> = new Set([
  'svg',
  'g',
  'path',
  'circle',
  'ellipse',
  'rect',
  'line',
  'polyline',
  'polygon',
  'defs',
  'clipPath',
  'mask',
  'linearGradient',
  'radialGradient',
  'stop',
  'use',
  'symbol',
]);

/** Attribute allowlist: purely presentational/geometry attributes. Notably absent: every `on*`
 * handler, `style` (which could carry `url(...)`, C2-1 — this module sets colour through the
 * `style` *attribute* itself, but only after sanitizing, via `setInlineColor`), and anything else
 * not needed to draw a shape or reference a local gradient/clip/mask. `href`/`xlink:href` are
 * allowed here but re-checked below: only a local `#fragment` value survives. */
const ALLOWED_SVG_ATTRIBUTES: ReadonlySet<string> = new Set([
  'id',
  'xmlns',
  'viewBox',
  'width',
  'height',
  'preserveAspectRatio',
  'fill',
  'fill-rule',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-miterlimit',
  'stroke-opacity',
  'clip-rule',
  'clip-path',
  'mask',
  'opacity',
  'd',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'points',
  'transform',
  'gradientUnits',
  'gradientTransform',
  'clipPathUnits',
  'maskUnits',
  'maskContentUnits',
  'offset',
  'stop-color',
  'stop-opacity',
  'href',
  'xlink:href',
]);

/** Removes every descendant element whose `localName` is not in `ALLOWED_SVG_ELEMENTS`, subtree
 * and all — a disallowed element is never recursed into (its children are gone with it, allowed or
 * not). `root` itself (already checked to be `<svg>` by the caller) is never removed. */
function removeDisallowedElements(root: Element): void {
  const toRemove: Element[] = [];
  const visit = (el: Element): void => {
    for (const child of Array.from(el.children)) {
      if (ALLOWED_SVG_ELEMENTS.has(child.localName)) {
        visit(child);
      } else {
        toRemove.push(child);
      }
    }
  };
  visit(root);
  for (const el of toRemove) el.remove();
}

/** Removes every attribute not in `ALLOWED_SVG_ATTRIBUTES`, on `root` and every surviving
 * descendant. A `href`/`xlink:href` that *is* on the allowlist still only survives when its value
 * is a local `#fragment` reference (never an external URL an attacker could point at). */
function removeDisallowedAttributes(root: Element): void {
  const elements: readonly Element[] = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const el of elements) {
    for (const attr of Array.from(el.attributes)) {
      const allowed =
        ALLOWED_SVG_ATTRIBUTES.has(attr.name) &&
        (!isHrefAttr(attr.name) || attr.value.startsWith('#'));
      if (!allowed) el.removeAttribute(attr.name);
    }
  }
}

/**
 * Allowlist sanitizer (F06-TG-08, asset-delivery.md 6.1, components.md 13.9.3): keeps only the
 * element names in `ALLOWED_SVG_ELEMENTS` (subtree removed for anything else — `<script>`,
 * `<style>`, `<foreignObject>`, `<animate>`, `<set>`, `<title>`/`<desc>`, `<a>`, and any unknown
 * element all fall here, together with anything they contain) and, on what survives, only the
 * attribute names in `ALLOWED_SVG_ATTRIBUTES` (every `on*` handler and `style` are never on that
 * list; `href`/`xlink:href` are on it but re-checked to be a local `#fragment`). Mutates `root` in
 * place; returns `false` when `root` is not actually an `<svg>` document (a parse failure, e.g.
 * `DOMParser`'s own `<parsererror>` node, or a non-SVG payload) — the caller falls back to `<img>`
 * in that case, same as a failed fetch.
 */
function sanitizeSvgRoot(root: Element, ownerDoc: Document): boolean {
  if (root.localName !== 'svg' || ownerDoc.getElementsByTagName('parsererror').length > 0) {
    return false;
  }
  removeDisallowedElements(root);
  removeDisallowedAttributes(root);
  root.setAttribute('aria-hidden', 'true');
  root.setAttribute('focusable', 'false');
  return true;
}

/** Sets (or replaces) `color` in `el`'s `style` attribute directly, rather than through the CSSOM
 * `.style` property: a parsed-then-imported SVG root is not guaranteed to carry the
 * `ElementCSSInlineStyle` mixin in every DOM implementation this project tests against (happy-dom
 * does not implement `.style` on a `DOMParser`-produced `image/svg+xml` document, even though
 * every real browser does) — the `style` *attribute* is plain markup and works identically
 * everywhere, including real browsers, so this is not a workaround specific to tests. */
function setInlineColor(el: Element, colorCss: string): void {
  const existing = el.getAttribute('style') ?? '';
  const withoutColor = existing
    .split(';')
    .map((decl) => decl.trim())
    .filter((decl) => decl !== '' && !/^color\s*:/i.test(decl));
  el.setAttribute('style', [...withoutColor, `color:${colorCss}`].join(';'));
}

const IMG_ROLE_ATTR = 'data-kw-icon-glyph-img';
const PLATE_ROLE_ATTR = 'data-kw-icon-glyph-plate';

/** The `<img>` fallback (asset-delivery.md 6.4, unchanged) plus, only on `bg.night`, a `bg.surface`
 * backing plate sized to the glyph's own box + 2 px on every side (components.md 13.9.2) — done
 * with `inset: -2px` on an absolutely-positioned sibling behind the `<img>` rather than computed
 * pixel dimensions, so it tracks the glyph's real rendered size at any scale without this module
 * needing to know it up front. */
function renderFallbackImg(
  container: HTMLElement,
  runtime: AssetRuntime,
  id: string | undefined,
  options: IconGlyphOptions,
): void {
  const ownerDoc = container.ownerDocument;
  container.replaceChildren();
  if (options.onNightBackground) {
    if (container.style.position === '') container.style.position = 'relative';
    const plate = ownerDoc.createElement('div');
    plate.setAttribute(PLATE_ROLE_ATTR, '');
    plate.setAttribute('aria-hidden', 'true');
    plate.style.position = 'absolute';
    plate.style.inset = `-${NIGHT_BACKING_PLATE_INSET_PX}px`;
    plate.style.background = options.nightPlateColorCss;
    container.append(plate);
  }
  const img = ownerDoc.createElement('img');
  img.setAttribute(IMG_ROLE_ATTR, '');
  container.append(img);
  setIconImg(img, runtime, id, options.altText);
}

export interface IconGlyphRenderer {
  /** Renders `id` into `container` (any wrapper element, e.g. a `<span>` next to a status label) —
   * inline `<svg>` when tintable, `setIconImg`'s `<img>` otherwise or on any failure. Safe to call
   * again with a different `id`/`options` (fully replaces `container`'s children each time). */
  setIconGlyph(
    container: HTMLElement,
    id: string | undefined,
    options: IconGlyphOptions,
  ): Promise<void>;
}

/**
 * `deps.fetchText` runs at most once per id for the life of this renderer (one instance per
 * session, same lifetime as the `AssetRuntime` it wraps) — concurrent calls for the same id before
 * the first fetch settles share the one in-flight promise instead of firing a second request.
 */
export function createIconGlyphRenderer(deps: IconGlyphDeps): IconGlyphRenderer {
  const svgTextCache = new Map<string, Promise<string | undefined>>();

  function fetchSvgTextOnce(id: string, url: string): Promise<string | undefined> {
    const cached = svgTextCache.get(id);
    if (cached !== undefined) return cached;
    const pending = deps
      .fetchText(url)
      .then((res) => (res.ok ? res.text() : undefined))
      .catch(() => undefined);
    svgTextCache.set(id, pending);
    // A failure is not cached past its own call: a network miss should be retryable on the next
    // render (asset-delivery.md 6.4's "retry once back online"), unlike a *successful* fetch,
    // which really is fetched only once per id per session. Concurrent callers before this
    // settles still share the one in-flight `pending` promise above.
    void pending.then((text) => {
      if (text === undefined) svgTextCache.delete(id);
    });
    return pending;
  }

  async function setIconGlyph(
    container: HTMLElement,
    id: string | undefined,
    options: IconGlyphOptions,
  ): Promise<void> {
    if (id === undefined) {
      renderFallbackImg(container, deps.runtime, id, options);
      return;
    }
    const manifest = deps.runtime.getManifest();
    const file =
      manifest === undefined
        ? undefined
        : tintableFile(manifest, id, deps.runtime.scale, deps.runtime.isProduction);
    if (file === undefined) {
      renderFallbackImg(container, deps.runtime, id, options);
      return;
    }
    const svgText = await fetchSvgTextOnce(id, deps.runtime.basePath + file.url);
    if (svgText === undefined) {
      renderFallbackImg(container, deps.runtime, id, options);
      return;
    }
    const svgDoc = deps.parseSvgDocument(svgText);
    const root = svgDoc.documentElement;
    if (!sanitizeSvgRoot(root, svgDoc)) {
      renderFallbackImg(container, deps.runtime, id, options);
      return;
    }
    const imported = container.ownerDocument.importNode(root, true);
    setInlineColor(imported, options.colorCss);
    container.replaceChildren();
    container.append(imported);
  }

  return { setIconGlyph };
}
