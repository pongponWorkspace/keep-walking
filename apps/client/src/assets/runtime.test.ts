import { describe, expect, it } from 'vitest';
import { AVATAR_PART_NAME, createAssetRuntime } from './runtime';

const MANIFEST = {
  runtimeVersion: 1,
  avatarRig: 1,
  assets: {},
  parts: { [AVATAR_PART_NAME]: { url: 'art/avatar/runtime-manifest.json?v=abc', bytes: 10 } },
  fonts: [],
  audio: {},
  credits: [],
};

const PART = { runtimeVersion: 1, avatarRig: 1, assets: {} };

function fakeFetch(manifestBody: unknown, partBody: unknown): typeof fetch {
  return ((input: string) => {
    const body = input.endsWith('asset-manifest.json') ? manifestBody : partBody;
    return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
  }) as unknown as typeof fetch;
}

describe('createAssetRuntime', () => {
  it('getAvatarPart is undefined before loadAvatarPart resolves', async () => {
    const runtime = createAssetRuntime(fakeFetch(MANIFEST, PART), 1, 'dev');
    expect(runtime.getAvatarPart()).toBeUndefined();
    await runtime.load();
    expect(runtime.getAvatarPart()).toBeUndefined();
  });

  it('loadAvatarPart fetches the part referenced by the main manifest', async () => {
    const runtime = createAssetRuntime(fakeFetch(MANIFEST, PART), 1, 'dev');
    await runtime.load();
    await runtime.loadAvatarPart();
    expect(runtime.getAvatarPart()).toEqual(PART);
  });

  it('loadAvatarPart is a no-op (stays undefined) when the main manifest never loaded', async () => {
    const runtime = createAssetRuntime(fakeFetch(undefined, PART), 1, 'dev');
    await runtime.loadAvatarPart();
    expect(runtime.getAvatarPart()).toBeUndefined();
  });
});
