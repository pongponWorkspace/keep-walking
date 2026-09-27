// SVG text inspection for V7/V8 and the key-colour swap (avatar-spec 7.4). Regex based on
// purpose: the files are agent-written flat SVG without entities or CDATA.
import type { RampSlot } from './config';

export interface SvgRoot {
  viewBox: [number, number, number, number] | null;
  width: number | null;
  height: number | null;
}

export interface SvgAttr {
  element: string;
  name: string;
  value: string;
  /** All attributes of the same element (for the opacity exception). */
  siblings: Map<string, string>;
}

const COMMENT = /<!--[\s\S]*?-->/g;
const ELEMENT = /<([A-Za-z][\w:-]*)((?:\s+[\w:-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*\/?>/g;
const ATTR = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const HEX_ANY = /#[0-9A-Fa-f]{3,8}\b/g;
const VIEWBOX_PARTS = 4;

export function stripComments(svg: string): string {
  return svg.replace(COMMENT, '');
}

function parseAttrs(raw: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of raw.matchAll(ATTR)) out.set(m[1] ?? '', m[2] ?? m[3] ?? '');
  return out;
}

/** Style attribute declarations are exposed as attributes of the same element. */
function withStyle(attrs: Map<string, string>): Map<string, string> {
  const style = attrs.get('style');
  if (style === undefined) return attrs;
  const merged = new Map(attrs);
  for (const decl of style.split(';')) {
    const [name, ...rest] = decl.split(':');
    if (name !== undefined && rest.length > 0) merged.set(name.trim(), rest.join(':').trim());
  }
  return merged;
}

export function elements(svg: string): { name: string; attrs: Map<string, string> }[] {
  const out: { name: string; attrs: Map<string, string> }[] = [];
  for (const m of stripComments(svg).matchAll(ELEMENT)) {
    out.push({ name: m[1] ?? '', attrs: withStyle(parseAttrs(m[2] ?? '')) });
  }
  return out;
}

export function attributes(svg: string): SvgAttr[] {
  const out: SvgAttr[] = [];
  for (const el of elements(svg)) {
    for (const [name, value] of el.attrs) out.push({ element: el.name, name, value, siblings: el.attrs });
  }
  return out;
}

export function readRoot(svg: string): SvgRoot {
  const root = elements(svg).find((e) => e.name === 'svg');
  if (root === undefined) return { viewBox: null, width: null, height: null };
  const vb = (root.attrs.get('viewBox') ?? '').trim().split(/[\s,]+/).map(Number);
  const num = (v: string | undefined): number | null => (v === undefined || v === '' ? null : Number(v));
  return {
    viewBox: vb.length === VIEWBOX_PARTS && vb.every(Number.isFinite) ? (vb as [number, number, number, number]) : null,
    width: num(root.attrs.get('width')),
    height: num(root.attrs.get('height')),
  };
}

/** `<style>` bodies are text, not attributes; their colours are scanned separately. */
export function styleBlocks(svg: string): string[] {
  return [...stripComments(svg).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1] ?? '');
}

export function hexIn(text: string): string[] {
  return [...text.matchAll(HEX_ANY)].map((m) => m[0]);
}

/** Every hex literal outside comments (V8 scans all of it, including style blocks). */
export function allHex(svg: string): string[] {
  return hexIn(stripComments(svg).replace(/url\(#[^)]*\)|href\s*=\s*"#[^"]*"/g, ''));
}

/**
 * Replace key colours with a ramp (avatar-spec 7.4). Works on attribute text, never on
 * pixels, so antialiased edges blend with the real ramp colour.
 */
export function swapKeys(svg: string, keys: Record<RampSlot, string>, ramp: Record<RampSlot, string>): string {
  let out = svg;
  for (const slot of ['top', 'left', 'right'] as const) {
    out = out.replace(new RegExp(keys[slot], 'gi'), ramp[slot]);
  }
  return out;
}

const CURRENT_COLOR = 'currentcolor';

/**
 * True when a colour attribute (or its `style` declaration) or a `<style>` block uses the
 * `currentColor` keyword (P2-H13, components.md 13.9): the glyph takes its colour from CSS, so
 * the client must inline it. Comments are ignored; the CSS keyword is matched case-insensitively.
 */
export function usesCurrentColor(svg: string, colorAttributes: readonly string[]): boolean {
  for (const a of attributes(svg)) {
    if (colorAttributes.includes(a.name) && a.value.trim().toLowerCase() === CURRENT_COLOR) return true;
  }
  return styleBlocks(svg).some((css) => css.toLowerCase().includes(CURRENT_COLOR));
}
