// Minimal placeholder MapLibre style for the map spike. Replaced wholesale by
// the art-directed style (P1-F03-T12) plumbed through P1-F02-T11. Kept as
// plain, precisely-typed data (no `packages/*` import needed) so this stays
// pure and unit-testable without a DOM (ADR 0001 3.6).
//
// Types are declared locally instead of importing `StyleSpecification` from
// `@maplibre/maplibre-gl-style-spec`: that package is a transitive dependency
// of maplibre-gl, not one this workspace declares, and pnpm's strict
// node_modules refuses to resolve undeclared imports (ADR 0001 3.3). The
// shapes below match the spec's required fields, so TypeScript still checks
// structural compatibility when this value is passed as `Map`'s `style`
// option.

const STYLE_SPEC_VERSION = 8;

export const PMTILES_SOURCE_ID = 'basemap';
export const PMTILES_LAYER_ID = 'basemap-landuse';

/** Pinned by TL-S13: both notices are required regardless of which fixture is loaded. */
export const MAP_ATTRIBUTION = '© OpenStreetMap contributors © Protomaps';

interface PlaceholderVectorSource {
  readonly type: 'vector';
  readonly url: string;
  readonly attribution: string;
}

interface PlaceholderBackgroundLayer {
  readonly id: string;
  readonly type: 'background';
  readonly paint: { readonly 'background-color': string };
}

interface PlaceholderFillLayer {
  readonly id: string;
  readonly type: 'fill';
  readonly source: string;
  readonly 'source-layer': string;
  readonly paint: { readonly 'fill-color': string; readonly 'fill-opacity': number };
}

export interface PlaceholderMapStyle {
  readonly version: typeof STYLE_SPEC_VERSION;
  readonly glyphs?: string;
  readonly sprite?: string;
  readonly sources: Record<string, PlaceholderVectorSource>;
  // A plain (not readonly) array: MapLibre's `StyleSpecification.layers` is
  // typed as `Array<LayerSpecification>`, and `ReadonlyArray` is not
  // assignable to it even though this value is never mutated.
  readonly layers: (PlaceholderBackgroundLayer | PlaceholderFillLayer)[];
}

export interface PlaceholderStyleConfig {
  readonly tilesUrl: string;
  readonly glyphsUrl?: string | undefined;
  readonly spriteUrl?: string | undefined;
}

const BACKGROUND_COLOR = '#e8e6df';
const LANDUSE_FILL_COLOR = '#c9c6bd';
const LANDUSE_FILL_OPACITY = 0.6;

export function buildPlaceholderStyle(config: PlaceholderStyleConfig): PlaceholderMapStyle {
  return {
    version: STYLE_SPEC_VERSION,
    ...(config.glyphsUrl !== undefined ? { glyphs: config.glyphsUrl } : {}),
    ...(config.spriteUrl !== undefined ? { sprite: config.spriteUrl } : {}),
    sources: {
      [PMTILES_SOURCE_ID]: {
        type: 'vector',
        url: `pmtiles://${config.tilesUrl}`,
        attribution: MAP_ATTRIBUTION,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': BACKGROUND_COLOR },
      },
      {
        id: PMTILES_LAYER_ID,
        type: 'fill',
        source: PMTILES_SOURCE_ID,
        'source-layer': 'landuse',
        paint: { 'fill-color': LANDUSE_FILL_COLOR, 'fill-opacity': LANDUSE_FILL_OPACITY },
      },
    ],
  };
}
