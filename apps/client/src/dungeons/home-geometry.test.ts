import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadLaunchAreaDistrictIds, loadLaunchAreaMask, loadPlayAreaMask } from './home-geometry';

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadPlayAreaMask', () => {
  it('returns the single feature geometry verbatim', async () => {
    const geometry = { type: 'Polygon', coordinates: [[[0, 0]]] };
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ type: 'FeatureCollection', features: [{ geometry }] })),
    );
    await expect(loadPlayAreaMask('x')).resolves.toEqual(geometry);
  });

  it('falls back to a no-holes mask on a failed fetch (never throws)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, false)));
    const mask = await loadPlayAreaMask('x');
    expect(mask.type).toBe('Polygon');
  });

  it('falls back to a no-holes mask when the feature collection is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ type: 'FeatureCollection', features: [] })),
    );
    const mask = await loadPlayAreaMask('x');
    expect(mask.type).toBe('Polygon');
  });
});

describe('loadLaunchAreaMask', () => {
  it('returns null without fetching when the configured path is null (R55)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(loadLaunchAreaMask(null, 'x')).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('merges every Polygon feature into one MultiPolygon', async () => {
    const a = [[[0, 0]]];
    const b = [[[1, 1]]];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          type: 'FeatureCollection',
          features: [
            { geometry: { type: 'Polygon', coordinates: a } },
            { geometry: { type: 'Polygon', coordinates: b } },
          ],
        }),
      ),
    );
    const merged = await loadLaunchAreaMask('data/map/launch-area.geojson', 'x');
    expect(merged).toEqual({ type: 'MultiPolygon', coordinates: [a, b] });
  });

  it('returns null on a failed fetch (R55 fallback)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(loadLaunchAreaMask('data/map/launch-area.geojson', 'x')).resolves.toBeNull();
  });

  it('returns null when the feature collection has no polygon features', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ type: 'FeatureCollection', features: [] })),
    );
    await expect(loadLaunchAreaMask('data/map/launch-area.geojson', 'x')).resolves.toBeNull();
  });
});

describe('loadLaunchAreaDistrictIds', () => {
  it('collects every feature properties.id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          type: 'FeatureCollection',
          features: [
            { properties: { id: 'phraNakhon' } },
            { properties: { id: 'pathumWan' } },
            { properties: { id: 'bangRak' } },
          ],
        }),
      ),
    );
    const ids = await loadLaunchAreaDistrictIds('x');
    expect(ids).toEqual(new Set(['phraNakhon', 'pathumWan', 'bangRak']));
  });

  it('returns an empty set (never throws) on a failed fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(loadLaunchAreaDistrictIds('x')).resolves.toEqual(new Set());
  });
});
