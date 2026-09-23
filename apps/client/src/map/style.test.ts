import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetByteTotals, getByteTotals } from '../debug/byte-counter';
import { buildRuntimeStyle } from './style';

const REAL_STYLE_PATH = fileURLToPath(
  new URL('../../../../art/direction/map-style/kw-light.style.json', import.meta.url),
);

function loadRealStyle(): unknown {
  return JSON.parse(readFileSync(REAL_STYLE_PATH, 'utf-8'));
}

function syntheticStyle(): unknown {
  return {
    version: 8,
    sources: {
      protomaps: { type: 'vector', url: 'https://kw-placeholder.invalid/tiles/x/tiles.json' },
    },
    glyphs: 'https://kw-placeholder.invalid/glyphs/{fontstack}/{range}.pbf',
    sprite: 'https://kw-placeholder.invalid/sprites/v4/light',
    'font-faces': {
      'Noto Sans Regular': [
        {
          url: 'https://kw-placeholder.invalid/glyphs/_faces/NotoSansThai-Regular.ttf',
          'unicode-range': ['U+0E00-0E7F'],
        },
      ],
    },
    layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#111111' } }],
  };
}

const PMTILES_ENV = {
  tilesUrl: 'pmtiles://https://host.example/bkk.pmtiles',
  glyphsUrl: 'https://host.example/glyphs/{fontstack}/{range}.pbf',
  spriteUrl: 'https://host.example/sprites/v4/light',
};

describe('buildRuntimeStyle (pmtiles:// scheme)', () => {
  afterEach(() => resetByteTotals());

  it('replaces every placeholder and leaves layers untouched', async () => {
    const style = await buildRuntimeStyle(syntheticStyle(), PMTILES_ENV);
    const sources = style['sources'] as Record<string, { url: string }>;

    expect(sources['protomaps']?.url).toBe(PMTILES_ENV.tilesUrl);
    expect(style['glyphs']).toBe(
      'kw+https://host.example/glyphs/{fontstack}/{range}.pbf?__kwCategory=style&__kwScheme=https',
    );
    expect(style['sprite']).toBe(
      'kw+https://host.example/sprites/v4/light?__kwCategory=style&__kwScheme=https',
    );
    const fontFaces = style['font-faces'] as Record<string, { url: string }[]>;
    expect(fontFaces['Noto Sans Regular']?.[0]?.url).toBe(
      'https://host.example/glyphs/_faces/NotoSansThai-Regular.ttf',
    );
    expect(style['layers']).toEqual((syntheticStyle() as Record<string, unknown>)['layers']);
  });

  it('throws, naming the path, when a placeholder survives substitution somewhere style.ts does not know to replace', async () => {
    const broken = syntheticStyle() as Record<string, unknown>;
    // sources.protomaps is fully replaced by resolveProtomapsSource, so a leftover placeholder has
    // to be injected somewhere that substitution does not touch, e.g. a future style field this
    // code does not yet know about.
    broken['unknownFutureField'] = 'https://kw-placeholder.invalid/leftover';

    await expect(buildRuntimeStyle(broken, PMTILES_ENV)).rejects.toThrow(/kw-placeholder\.invalid/);
  });

  it('throws when sources.protomaps is missing', async () => {
    await expect(buildRuntimeStyle({ version: 8, sources: {} }, PMTILES_ENV)).rejects.toThrow(
      /sources\.protomaps/,
    );
  });
});

describe('buildRuntimeStyle (TileJSON/XYZ scheme, D-031)', () => {
  afterEach(() => {
    resetByteTotals();
    vi.unstubAllGlobals();
  });

  it('fetches the TileJSON itself, inlines it, and rewrites tile URLs onto kw+https', async () => {
    const tileJsonBody = JSON.stringify({
      tiles: ['http://host.example/tiles/{z}/{x}/{y}.mvt'],
      bounds: [100, 13, 101, 14],
      minzoom: 0,
      maxzoom: 15,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        arrayBuffer: async () => new TextEncoder().encode(tileJsonBody).buffer,
      })),
    );

    const style = await buildRuntimeStyle(syntheticStyle(), {
      tilesUrl: 'http://host.example/tiles/tiles.json',
      glyphsUrl: PMTILES_ENV.glyphsUrl,
      spriteUrl: PMTILES_ENV.spriteUrl,
    });

    const protomaps = (style['sources'] as Record<string, Record<string, unknown>>)['protomaps'];
    expect(protomaps?.['tiles']).toEqual([
      'kw+https://host.example/tiles/{z}/{x}/{y}.mvt?__kwCategory=tiles&__kwScheme=http',
    ]);
    expect(protomaps?.['maxzoom']).toBe(15);
    expect(getByteTotals().style).toBeGreaterThan(0); // the TileJSON doc itself was counted
  });
});

describe('the real committed kw-light.style.json', () => {
  afterEach(() => resetByteTotals());

  it('substitutes cleanly end-to-end with no leftover placeholder', async () => {
    const style = await buildRuntimeStyle(loadRealStyle(), PMTILES_ENV);
    expect(JSON.stringify(style)).not.toContain('kw-placeholder.invalid');
    expect(Array.isArray(style['layers'])).toBe(true);
    expect((style['layers'] as unknown[]).length).toBe(38);
  });
});
