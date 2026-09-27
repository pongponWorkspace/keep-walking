/**
 * `@font-face` from the runtime manifest's `fonts[]` (`docs/tech/asset-delivery.md` 7): one rule
 * per entry, `family`/`weight`/`url`/`format` read straight off the manifest — never a hardcoded
 * font file name or a second copy of the family/weight pairing.
 *
 * V-31 (art gate F04-F06 round 1, components.md 13's own handoff): also emits one `--kw-font-<role>`
 * CSS custom property per `RuntimeFont.role` (`ui`/`map`) on `:root`, holding that role's `family`
 * name verbatim — `app.css` reads `var(--kw-font-ui, 'IBM Plex Sans Thai Looped')` rather than
 * embedding the family name as a second literal (style-guide 7: the manifest, not the stylesheet, is
 * the source of truth for which font file is actually live).
 */
import type { RuntimeManifest } from './manifest';

/** One `--kw-font-<role>` declaration per distinct role in `fonts[]` (first occurrence wins — every
 * font of a given role shares one family, `tokens.json#font`), or `''` when there are none. */
function fontRoleVariablesCss(manifest: RuntimeManifest): string {
  const familyByRole = new Map<string, string>();
  for (const font of manifest.fonts) {
    if (!familyByRole.has(font.role)) familyByRole.set(font.role, font.family);
  }
  if (familyByRole.size === 0) return '';
  const declarations = [...familyByRole.entries()]
    .map(([role, family]) => `--kw-font-${role}: '${family}';`)
    .join(' ');
  return `:root { ${declarations} }`;
}

/** Pure so it is unit-testable without a DOM: the `<style>` text this session's fonts need. Empty
 * for a manifest with no fonts (never a lone, useless `:root` rule). */
export function fontFaceCss(manifest: RuntimeManifest, basePath: string): string {
  const faceRules = manifest.fonts
    .map(
      (font) =>
        `@font-face { font-family: '${font.family}'; font-weight: ${font.weight}; ` +
        `font-display: swap; src: url('${basePath}${font.url}') format('${font.format}'); }`,
    )
    .join('\n');
  if (faceRules === '') return '';
  return `${faceRules}\n${fontRoleVariablesCss(manifest)}`;
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
