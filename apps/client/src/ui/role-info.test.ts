// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountRoleInfo } from './role-info';
import type { AssetRuntime } from '../assets/icon-dom';

function fakeAssets(): AssetRuntime {
  return { getManifest: () => undefined, basePath: '/kw/', scale: 1, isProduction: false };
}

describe('mountRoleInfo (S-05)', () => {
  it('renders exactly the 4 roles', () => {
    const container = document.createElement('div');
    mountRoleInfo(container, vi.fn(), fakeAssets());
    expect(container.querySelectorAll('.role-info-row').length).toBe(4);
  });

  it('hidden by default, shown/hidden via show()/hide()', () => {
    const container = document.createElement('div');
    const screen = mountRoleInfo(container, vi.fn(), fakeAssets());
    expect(screen.root.hidden).toBe(true);
    screen.show();
    expect(screen.root.hidden).toBe(false);
    screen.hide();
    expect(screen.root.hidden).toBe(true);
  });

  it('close button calls onClose', () => {
    const container = document.createElement('div');
    const onClose = vi.fn();
    mountRoleInfo(container, onClose, fakeAssets());
    container.querySelector<HTMLButtonElement>('.btn-secondary')?.click();
    expect(onClose).toHaveBeenCalled();
  });

  it('every badge img is hidden (no broken image) while the manifest has not loaded', () => {
    const container = document.createElement('div');
    mountRoleInfo(container, vi.fn(), fakeAssets());
    for (const img of container.querySelectorAll('img')) {
      expect((img as HTMLImageElement).hidden).toBe(true);
    }
  });
});
