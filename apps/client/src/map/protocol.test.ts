import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RangeResponse, Source } from 'pmtiles';
import { resetByteTotals, getByteTotals } from '../debug/byte-counter';
import {
  CountingPmtilesSource,
  kwHttpsHandler,
  registerCountingPmtilesArchive,
  toKwHttpsUrl,
} from './protocol';

class FakeSource implements Source {
  constructor(private readonly key: string) {}
  getKey(): string {
    return this.key;
  }
  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    return { data: new Uint8Array(length).buffer };
  }
}

describe('toKwHttpsUrl', () => {
  it('keeps a glyph template with {fontstack}/{range} intact (no percent-encoding)', () => {
    const url = toKwHttpsUrl('https://host.example/glyphs/{fontstack}/{range}.pbf', 'style');
    expect(url).toBe(
      'kw+https://host.example/glyphs/{fontstack}/{range}.pbf?__kwCategory=style&__kwScheme=https',
    );
  });

  it('keeps an XYZ tile template with {z}/{x}/{y} intact', () => {
    const url = toKwHttpsUrl('https://host.example/tiles/{z}/{x}/{y}.mvt', 'tiles');
    expect(url).toBe(
      'kw+https://host.example/tiles/{z}/{x}/{y}.mvt?__kwCategory=tiles&__kwScheme=https',
    );
  });

  it('appends with & when the real URL already has a query string', () => {
    const url = toKwHttpsUrl('https://host.example/sprite.json?v=2', 'style');
    expect(url).toBe('kw+https://host.example/sprite.json?v=2&__kwCategory=style&__kwScheme=https');
  });

  it('preserves a plain http:// origin (e.g. tools/tiles/bin/serve.py at 127.0.0.1) instead of forcing https', () => {
    const url = toKwHttpsUrl('http://127.0.0.1:8765/fixtures/lumpini/sprites/v4/light', 'style');
    expect(url).toBe(
      'kw+https://127.0.0.1:8765/fixtures/lumpini/sprites/v4/light?__kwCategory=style&__kwScheme=http',
    );
  });
});

describe('CountingPmtilesSource', () => {
  afterEach(() => resetByteTotals());

  it('adds every getBytes response byte length to the tiles category (header, directory and tile bytes alike)', async () => {
    resetByteTotals();
    const counting = new CountingPmtilesSource(new FakeSource('https://host.example/bkk.pmtiles'));

    await counting.getBytes(0, 16384); // header + root directory fetch, per the tech note
    await counting.getBytes(20000, 512); // one tile

    expect(getByteTotals().tiles).toBe(16384 + 512);
    expect(counting.getKey()).toBe('https://host.example/bkk.pmtiles');
  });
});

describe('kwHttpsHandler', () => {
  afterEach(() => {
    resetByteTotals();
    vi.unstubAllGlobals();
  });

  it('fetches the real http:// URL (not https://) when toKwHttpsUrl was built from an http:// origin', async () => {
    resetByteTotals();
    const fetchMock = vi.fn(
      async () =>
        new Response(new Uint8Array([1, 2, 3, 4]).buffer, { status: 200, statusText: 'OK' }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const wrapped = toKwHttpsUrl(
      'http://127.0.0.1:8765/fixtures/lumpini/sprites/v4/light',
      'style',
    );
    const result = await kwHttpsHandler({ url: wrapped } as never, new AbortController());

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8765/fixtures/lumpini/sprites/v4/light',
      expect.anything(),
    );
    expect(result.data.byteLength).toBe(4);
    expect(getByteTotals().style).toBe(4);
  });
});

describe('registerCountingPmtilesArchive', () => {
  it('does not fetch anything just from registering (no map has requested a tile yet)', () => {
    resetByteTotals();
    registerCountingPmtilesArchive('https://host.example/bkk.pmtiles');
    expect(getByteTotals().tiles).toBe(0);
  });
});
