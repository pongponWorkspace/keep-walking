// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountRoleInfo } from './role-info';
import type { AssetRuntimeController } from '../assets/runtime';
import type { RuntimeManifest } from '../assets/manifest';

function fakeAssets(getManifest: () => RuntimeManifest | undefined = () => undefined): {
  readonly assets: AssetRuntimeController;
  readonly fireManifestReady: () => void;
} {
  let readyCb: (() => void) | undefined;
  const assets: AssetRuntimeController = {
    getManifest,
    basePath: '/kw/',
    scale: 1,
    isProduction: false,
    load: () => Promise.resolve(),
    getAvatarPart: () => undefined,
    loadAvatarPart: () => Promise.resolve(),
    onManifestReady: (cb) => {
      readyCb = cb;
    },
  };
  return { assets, fireManifestReady: () => readyCb?.() };
}

describe('mountRoleInfo (S-05)', () => {
  it('renders exactly the 4 roles', () => {
    const container = document.createElement('div');
    mountRoleInfo(container, vi.fn(), fakeAssets().assets);
    expect(container.querySelectorAll('.role-info-row').length).toBe(4);
  });

  it('hidden by default, shown/hidden via show()/hide()', () => {
    const container = document.createElement('div');
    const screen = mountRoleInfo(container, vi.fn(), fakeAssets().assets);
    expect(screen.root.hidden).toBe(true);
    screen.show();
    expect(screen.root.hidden).toBe(false);
    screen.hide();
    expect(screen.root.hidden).toBe(true);
  });

  it('close button calls onClose', () => {
    const container = document.createElement('div');
    const onClose = vi.fn();
    mountRoleInfo(container, onClose, fakeAssets().assets);
    container.querySelector<HTMLButtonElement>('.btn-secondary')?.click();
    expect(onClose).toHaveBeenCalled();
  });

  it('every badge img is hidden (no broken image) while the manifest has not loaded', () => {
    const container = document.createElement('div');
    mountRoleInfo(container, vi.fn(), fakeAssets().assets);
    for (const img of container.querySelectorAll('img')) {
      expect((img as HTMLImageElement).hidden).toBe(true);
    }
  });

  // V-40 (art gate F04-F06-visual-gate.md §8, P2-X47): a manifest that arrives after this screen
  // already mounted must still fill in the badge, not leave it hidden for the rest of the session.
  it('re-renders a badge once the manifest arrives after mount', () => {
    const manifest: RuntimeManifest = {
      runtimeVersion: 1,
      avatarRig: 1,
      assets: {
        'badge.class.tanker-48': {
          kind: 'badge',
          status: 'approved',
          placeholder: false,
          size: null,
          files: [
            {
              url: 'art/badge/tanker-48.png?v=1',
              format: 'png',
              scale: null,
              variant: null,
              width: 48,
              height: 48,
              bytes: 10,
            },
          ],
        },
      },
      fonts: [],
      audio: {},
      credits: [],
    };
    const manifestRef: { current: RuntimeManifest | undefined } = { current: undefined };
    const { assets, fireManifestReady } = fakeAssets(() => manifestRef.current);
    const container = document.createElement('div');
    mountRoleInfo(container, vi.fn(), assets);
    const tankerImg = container.querySelectorAll('img')[0] as HTMLImageElement;
    expect(tankerImg.hidden).toBe(true);

    manifestRef.current = manifest;
    fireManifestReady();

    expect(tankerImg.hidden).toBe(false);
    expect(tankerImg.src).toContain('art/badge/tanker-48.png');
  });
});
