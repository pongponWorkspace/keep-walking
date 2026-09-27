import { describe, expect, it } from 'vitest';
import {
  fetchAssetManifest,
  fetchManifestPart,
  isRuntimeManifest,
  isRuntimeManifestPart,
} from './manifest';
import type { RuntimeManifest, RuntimeManifestPart } from './manifest';

const HELP_ICON = {
  kind: 'icon-ui',
  status: 'approved',
  placeholder: false,
  size: { width: 48, height: 48 },
  files: [
    {
      url: 'art/icon/ui/help.svg?v=abc',
      format: 'svg',
      scale: null,
      variant: null,
      width: 48,
      height: 48,
      bytes: 900,
    },
  ],
} as const;

const VALID: RuntimeManifest = {
  runtimeVersion: 1,
  avatarRig: 1,
  assets: { 'icon.ui.help': HELP_ICON },
  parts: { avatar: { url: 'art/avatar/runtime-manifest.json?v=def456', bytes: 1234 } },
  fonts: [],
  audio: {},
  credits: [],
};

const VALID_PART: RuntimeManifestPart = {
  runtimeVersion: 1,
  avatarRig: 1,
  assets: { 'avatar.hair.buzz': HELP_ICON },
};

function fakeFetch(
  status: number,
  body: unknown,
): (input: string) => Promise<{ ok: boolean; json(): Promise<unknown> }> {
  return () =>
    Promise.resolve({ ok: status >= 200 && status < 300, json: () => Promise.resolve(body) });
}

describe('isRuntimeManifest', () => {
  it('accepts a well-shaped manifest', () => {
    expect(isRuntimeManifest(VALID)).toBe(true);
  });

  it('rejects a wrong runtimeVersion', () => {
    expect(isRuntimeManifest({ ...VALID, runtimeVersion: 2 })).toBe(false);
  });

  it('rejects a non-object', () => {
    expect(isRuntimeManifest(null)).toBe(false);
    expect(isRuntimeManifest('nope')).toBe(false);
  });

  it('rejects an asset with a malformed file', () => {
    const broken = {
      ...VALID,
      assets: {
        x: {
          kind: 'icon-ui',
          status: 'approved',
          placeholder: false,
          size: null,
          files: [{ format: 'svg' }],
        },
      },
    };
    expect(isRuntimeManifest(broken)).toBe(false);
  });

  it('accepts a manifest with no parts field (P2-X24 additive, backward compatible)', () => {
    const withoutParts: Record<string, unknown> = { ...VALID };
    delete withoutParts['parts'];
    expect(isRuntimeManifest(withoutParts)).toBe(true);
  });

  it('rejects a malformed parts value', () => {
    expect(isRuntimeManifest({ ...VALID, parts: { avatar: { url: 123 } } })).toBe(false);
  });
});

describe('isRuntimeManifestPart', () => {
  it('accepts a well-shaped part', () => {
    expect(isRuntimeManifestPart(VALID_PART)).toBe(true);
  });

  it('rejects a wrong runtimeVersion', () => {
    expect(isRuntimeManifestPart({ ...VALID_PART, runtimeVersion: 2 })).toBe(false);
  });

  it('rejects a non-object', () => {
    expect(isRuntimeManifestPart(null)).toBe(false);
  });
});

describe('fetchAssetManifest', () => {
  it('returns the manifest on a successful, well-shaped fetch', async () => {
    const result = await fetchAssetManifest(fakeFetch(200, VALID) as never, '/kw/');
    expect(result).toEqual(VALID);
  });

  it('returns undefined on a non-ok response (§6.4 fallback)', async () => {
    const result = await fetchAssetManifest(fakeFetch(404, {}) as never, '/kw/');
    expect(result).toBeUndefined();
  });

  it('returns undefined on malformed JSON shape rather than throwing', async () => {
    const result = await fetchAssetManifest(fakeFetch(200, { not: 'a manifest' }) as never, '/kw/');
    expect(result).toBeUndefined();
  });

  it('returns undefined when the fetch itself throws (offline)', async () => {
    const throwing = (() => Promise.reject(new Error('network'))) as never;
    const result = await fetchAssetManifest(throwing, '/kw/');
    expect(result).toBeUndefined();
  });
});

describe('fetchManifestPart', () => {
  it('returns undefined when the main manifest has no ref for this part', async () => {
    const result = await fetchManifestPart(
      fakeFetch(200, VALID_PART) as never,
      '/kw/',
      undefined,
      1,
    );
    expect(result).toBeUndefined();
  });

  it('fetches basePath + part.url and returns the part on success', async () => {
    let requested: string | undefined;
    const fetchImpl = (input: string) => {
      requested = input;
      return Promise.resolve({ ok: true, json: () => Promise.resolve(VALID_PART) });
    };
    const part = VALID.parts?.['avatar'];
    const result = await fetchManifestPart(fetchImpl as never, '/kw/', part, 1);
    expect(result).toEqual(VALID_PART);
    expect(requested).toBe(`/kw/${part?.url}`);
  });

  it('returns undefined when the part avatarRig does not match the expected one (§6.4)', async () => {
    const part = VALID.parts?.['avatar'];
    const result = await fetchManifestPart(
      fakeFetch(200, VALID_PART) as never,
      '/kw/',
      part,
      2 as unknown as 1,
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined on a non-ok response', async () => {
    const part = VALID.parts?.['avatar'];
    const result = await fetchManifestPart(fakeFetch(404, {}) as never, '/kw/', part, 1);
    expect(result).toBeUndefined();
  });
});
