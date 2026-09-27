import { describe, expect, it } from 'vitest';
import { effectiveAssetId, pickScale, resolveIconFile, resolveIconUrl } from './icon';
import type { RuntimeManifest } from './manifest';

function asset(
  status: string,
  files: RuntimeManifest['assets'][string]['files'],
  replacedBy?: string,
): RuntimeManifest['assets'][string] {
  return {
    kind: 'icon-ui',
    status,
    placeholder: false,
    size: null,
    files,
    ...(replacedBy === undefined ? {} : { replacedBy }),
  };
}

const FILE_1X = {
  url: 'art/icon/ui/x@1x.png?v=1',
  format: 'png',
  scale: 1 as const,
  variant: null,
  width: 24,
  height: 24,
  bytes: 100,
};
const FILE_2X = {
  url: 'art/icon/ui/x@2x.png?v=1',
  format: 'png',
  scale: 2 as const,
  variant: null,
  width: 48,
  height: 48,
  bytes: 200,
};
const SVG = {
  url: 'art/icon/ui/help.svg?v=2',
  format: 'svg',
  scale: null,
  variant: null,
  width: 48,
  height: 48,
  bytes: 300,
};

const MANIFEST: RuntimeManifest = {
  runtimeVersion: 1,
  avatarRig: 1,
  assets: {
    'icon.ui.rift': asset('approved', [FILE_1X, FILE_2X]),
    'icon.ui.help': asset('approved', [SVG]),
    'icon.ui.draft-thing': asset('draft', [SVG]),
    'icon.ui.old': asset('deprecated', [SVG], 'icon.ui.rift'),
    'icon.ui.dead-end': asset('deprecated', [SVG]),
    'icon.ui.empty-files': asset('approved', []),
  },
  fonts: [],
  audio: {},
  credits: [],
};

describe('pickScale', () => {
  it('picks 2 at or above 1.5 dpr', () => {
    expect(pickScale(1)).toBe(1);
    expect(pickScale(1.5)).toBe(2);
    expect(pickScale(3)).toBe(2);
  });
});

describe('effectiveAssetId', () => {
  it('returns the id itself for an approved asset', () => {
    expect(effectiveAssetId(MANIFEST, 'icon.ui.rift', true)).toBe('icon.ui.rift');
  });

  it('resolves a deprecated id through replacedBy', () => {
    expect(effectiveAssetId(MANIFEST, 'icon.ui.old', true)).toBe('icon.ui.rift');
  });

  it('is undefined for a deprecated id with no replacedBy', () => {
    expect(effectiveAssetId(MANIFEST, 'icon.ui.dead-end', true)).toBeUndefined();
  });

  it('falls back (undefined) for draft/placeholder in production', () => {
    expect(effectiveAssetId(MANIFEST, 'icon.ui.draft-thing', true)).toBeUndefined();
  });

  it('shows draft/placeholder outside production (dev/preview)', () => {
    expect(effectiveAssetId(MANIFEST, 'icon.ui.draft-thing', false)).toBe('icon.ui.draft-thing');
  });

  it('is undefined for an unknown id', () => {
    expect(effectiveAssetId(MANIFEST, 'icon.ui.does-not-exist', true)).toBeUndefined();
  });
});

describe('resolveIconFile', () => {
  it('picks the file matching the requested scale', () => {
    expect(resolveIconFile(MANIFEST, 'icon.ui.rift', 2, true)?.url).toBe(FILE_2X.url);
    expect(resolveIconFile(MANIFEST, 'icon.ui.rift', 1, true)?.url).toBe(FILE_1X.url);
  });

  it('falls back to a scale-less file (SVG) when present', () => {
    expect(resolveIconFile(MANIFEST, 'icon.ui.help', 2, true)?.url).toBe(SVG.url);
  });

  it('is undefined when the asset has no files at all', () => {
    expect(resolveIconFile(MANIFEST, 'icon.ui.empty-files', 1, true)).toBeUndefined();
  });
});

describe('resolveIconUrl', () => {
  const BASE = '/kw/';

  it('prefixes basePath onto the resolved file url', () => {
    expect(resolveIconUrl(MANIFEST, BASE, 'icon.ui.rift', 1, true)).toBe(BASE + FILE_1X.url);
  });

  it('falls back to icon.ui.help when the id itself has no usable file', () => {
    expect(resolveIconUrl(MANIFEST, BASE, 'icon.ui.does-not-exist', 1, true)).toBe(BASE + SVG.url);
  });

  it('is undefined (empty frame) when even icon.ui.help is unusable', () => {
    const noHelp: RuntimeManifest = {
      ...MANIFEST,
      assets: { 'icon.ui.rift': MANIFEST.assets['icon.ui.rift'] } as never,
    };
    expect(resolveIconUrl(noHelp, BASE, 'icon.ui.does-not-exist', 1, true)).toBeUndefined();
  });

  it('is undefined when the manifest itself failed to load', () => {
    expect(resolveIconUrl(undefined, BASE, 'icon.ui.rift', 1, true)).toBeUndefined();
  });
});
