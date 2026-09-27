/**
 * `@font-face` from the runtime manifest's `fonts[]` (`docs/tech/asset-delivery.md` 7): one rule
 * per entry, `family`/`weight`/`url`/`format` read straight off the manifest — never a hardcoded
 * font file name or a second copy of the family/weight pairing.
 */
import type { RuntimeManifest } from './manifest';

/** Pure so it is unit-testable without a DOM: the `<style>` text this session's fonts need. */
export function fontFaceCss(manifest: RuntimeManifest, basePath: string): string {
  return manifest.fonts
    .map(
      (font) =>
        `@font-face { font-family: '${font.family}'; font-weight: ${font.weight}; ` +
        `font-display: swap; src: url('${basePath}${font.url}') format('${font.format}'); }`,
    )
    .join('\n');
}

const STYLE_ELEMENT_ID = 'kw-asset-fonts';

/** Appends (or replaces) the one `<style id="kw-asset-fonts">` this session needs — idempotent,
 * safe to call more than once (e.g. a retried fetch). No-op when the manifest has no fonts. */
export function injectFontFaces(
  doc: Document,
  manifest: RuntimeManifest,
  basePath: string = `${import.meta.env.BASE_URL}kw/`,
): void {
  if (manifest.fonts.length === 0) return;
  let style = doc.getElementById(STYLE_ELEMENT_ID) as HTMLStyleElement | null;
  if (style === null) {
    style = doc.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    doc.head.append(style);
  }
  style.textContent = fontFaceCss(manifest, basePath);
}
