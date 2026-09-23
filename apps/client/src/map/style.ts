/**
 * Loads `art/direction/map-style/kw-light.style.json` at runtime and replaces its four
 * `https://kw-placeholder.invalid` placeholders with the real `VITE_*` values
 * (art/direction/map-style.md section 3; docs/tech/F02-map-location-spike.md sections 6.3, 8, 11).
 *
 * Never touches color, layer order or filters (art-director owns those, map-style.md section 3:
 * "ห้ามแก้สี ลำดับ layer หรือ filter ในโค้ด"): every layer is copied through byte-for-byte. The only
 * writes this file makes are to `sources.protomaps`, `glyphs`, `sprite` and `font-faces.*[].url`.
 *
 * Byte counting (section 11): the style JSON itself and (for the TileJSON/XYZ path) the TileJSON
 * document are fetched here directly and counted with `countBytes('style', ...)` (this code runs
 * on the main thread already, so no protocol trick is needed for what it fetches itself).
 * `glyphs`/`sprite` are rewritten onto `kw+https://` so MapLibre's own (worker-thread) fetches of
 * them get counted; XYZ tile URLs inside the TileJSON are rewritten the same way. `font-faces` URLs
 * are left as plain `https://` — the browser's native `FontFace` API loads them outside MapLibre's
 * request pipeline, so `addProtocol` cannot see or count them (section 11 table row "font-faces":
 * Resource Timing only, not implemented by this HUD).
 */
import kwLightStyleUrl from '../../../../art/direction/map-style/kw-light.style.json?url';
import { countBytes } from '../debug/byte-counter';
import { registerCountingPmtilesArchive, toKwHttpsUrl } from './protocol';

const PLACEHOLDER_ORIGIN = 'https://kw-placeholder.invalid';
const PMTILES_SCHEME = 'pmtiles://';
const GLYPH_TEMPLATE_SUFFIX = '{fontstack}/{range}.pbf';

export interface RuntimeMapEnv {
  readonly tilesUrl: string;
  readonly glyphsUrl: string;
  readonly spriteUrl: string;
}

/** Loosely-typed style value: see the header comment on why this workspace never imports
 * `@maplibre/maplibre-gl-style-spec`'s `StyleSpecification` from `apps/client` (map-style.md 15.3;
 * ADR 0001 3.3). `map.ts` casts this to the exact type `MapLibreMap`'s constructor expects using
 * `ConstructorParameters`, not a named import of the style-spec package. */
export type RuntimeStyle = Record<string, unknown>;

async function countedFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`style: failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  countBytes('style', buffer.byteLength);
  return JSON.parse(new TextDecoder('utf-8').decode(buffer));
}

/** Fetches and JSON-parses the committed style file, counting its bytes as `style`. */
export async function loadKwLightStyleJson(): Promise<unknown> {
  return countedFetchJson(kwLightStyleUrl);
}

function throwIfPlaceholderRemains(value: unknown, path: string): void {
  if (typeof value === 'string') {
    if (value.includes(PLACEHOLDER_ORIGIN)) {
      throw new Error(
        `style: placeholder "${PLACEHOLDER_ORIGIN}" survived substitution at ${path}`,
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => throwIfPlaceholderRemains(item, `${path}[${i}]`));
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      throwIfPlaceholderRemains(child, `${path}.${key}`);
    }
  }
}

function lastPathSegment(url: string): string {
  const segments = url.split('/');
  const last = segments[segments.length - 1];
  if (last === undefined || last.length === 0) {
    throw new Error(`style: could not read a file name from placeholder font-face url "${url}"`);
  }
  return last;
}

/** `VITE_GLYPHS_URL` with the literal template suffix swapped for `_faces/<file>` (tech note 6.3). */
function deriveFontFaceUrl(placeholderFontUrl: string, glyphsUrl: string): string {
  if (!glyphsUrl.includes(GLYPH_TEMPLATE_SUFFIX)) {
    throw new Error(
      `style: VITE_GLYPHS_URL must contain the literal "${GLYPH_TEMPLATE_SUFFIX}" template segment`,
    );
  }
  const fileName = lastPathSegment(placeholderFontUrl);
  return glyphsUrl.replace(GLYPH_TEMPLATE_SUFFIX, `_faces/${fileName}`);
}

interface TileJsonDoc {
  readonly tiles: readonly string[];
  readonly bounds?: readonly [number, number, number, number];
  readonly minzoom?: number;
  readonly maxzoom?: number;
}

function isTileJsonDoc(value: unknown): value is TileJsonDoc {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as Record<string, unknown>)['tiles'])
  );
}

/**
 * Resolves `env.tilesUrl` (`docs/tech/F02-map-location-spike.md` section 8, D-031) into the
 * `sources.protomaps` value to splice into the style, and does the one-time protocol/counting
 * setup each scheme needs. `originalAttribution` is the placeholder style's own attribution string
 * (art-director-owned, TL-S13): the TileJSON branch inlines the source instead of using a `url` the
 * way MapLibre would auto-attribute it, so this function must carry that string over explicitly.
 */
async function resolveProtomapsSource(
  tilesUrl: string,
  originalAttribution: unknown,
): Promise<Record<string, unknown>> {
  if (tilesUrl.startsWith(PMTILES_SCHEME)) {
    registerCountingPmtilesArchive(tilesUrl.slice(PMTILES_SCHEME.length));
    return { type: 'vector', url: tilesUrl, attribution: originalAttribution };
  }
  if (tilesUrl.endsWith('.json')) {
    const tileJson = await countedFetchJson(tilesUrl);
    if (!isTileJsonDoc(tileJson)) {
      throw new Error(`style: TileJSON at "${tilesUrl}" has no "tiles" array`);
    }
    return {
      type: 'vector',
      tiles: tileJson.tiles.map((t) => toKwHttpsUrl(t, 'tiles')),
      ...(tileJson.bounds !== undefined ? { bounds: tileJson.bounds } : {}),
      minzoom: tileJson.minzoom ?? 0,
      ...(tileJson.maxzoom !== undefined ? { maxzoom: tileJson.maxzoom } : {}),
      attribution: originalAttribution,
    };
  }
  throw new Error(
    `style: VITE_TILES_URL "${tilesUrl}" must start with "${PMTILES_SCHEME}" or end with ".json"`,
  );
}

/** Deep-clones `raw` (plain-JSON safe: no functions/dates in a style document) so substitution
 * never mutates the object a caller may still hold a reference to (e.g. in a test fixture). */
function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Applies every placeholder substitution to a parsed `kw-light.style.json` object and returns the
 * finalized style. Async only because resolving the TileJSON path fetches the TileJSON document.
 */
export async function buildRuntimeStyle(raw: unknown, env: RuntimeMapEnv): Promise<RuntimeStyle> {
  const style = cloneJson(raw) as Record<string, unknown>;
  const sources = style['sources'] as Record<string, Record<string, unknown>> | undefined;
  const protomaps = sources?.['protomaps'];
  if (sources === undefined || protomaps === undefined) {
    throw new Error('style: sources.protomaps is missing from kw-light.style.json');
  }
  sources['protomaps'] = await resolveProtomapsSource(env.tilesUrl, protomaps['attribution']);
  style['glyphs'] = toKwHttpsUrl(env.glyphsUrl, 'style');
  style['sprite'] = toKwHttpsUrl(env.spriteUrl, 'style');

  const fontFaces = style['font-faces'] as Record<string, { url: string }[]> | undefined;
  if (fontFaces !== undefined) {
    for (const faces of Object.values(fontFaces)) {
      for (const face of faces) {
        face.url = deriveFontFaceUrl(face.url, env.glyphsUrl);
      }
    }
  }

  // `metadata` is art-director documentation (placeholder scheme, runtime image list): never a
  // value MapLibre resolves into a request, and not needed on-device, so it is dropped here rather
  // than exempted from the placeholder scan below (which must stay exhaustive over everything live).
  delete style['metadata'];

  throwIfPlaceholderRemains(style, '$');
  return style;
}

/** Fetches `kw-light.style.json` and finalizes it against `env` in one call (`map.ts`'s entry point). */
export async function loadRuntimeStyle(env: RuntimeMapEnv): Promise<RuntimeStyle> {
  const raw = await loadKwLightStyleJson();
  return buildRuntimeStyle(raw, env);
}
