// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountClassSelect } from './class-select';
import type { AssetRuntimeController } from '../assets/runtime';
import type { RuntimeManifest } from '../assets/manifest';
import { getCopyText } from '../copy/load';

function fakeAssets(getManifest: () => RuntimeManifest | undefined = () => undefined): {
  readonly assets: AssetRuntimeController;
  readonly fireManifestReady: () => void;
} {
  let readyCb: (() => void) | undefined;
  const assets: AssetRuntimeController = {
    getManifest,
    basePath: '/assets/',
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

const FAKE_ASSETS: AssetRuntimeController = fakeAssets().assets;

describe('mountClassSelect', () => {
  it('starts hidden and shows exactly 4 class cards with no way to dismiss without choosing', () => {
    const container = document.createElement('div');
    const sheet = mountClassSelect(container, () => undefined, FAKE_ASSETS);
    expect(sheet.root.hidden).toBe(true);
    sheet.show();
    expect(sheet.root.hidden).toBe(false);
    const cards = sheet.root.querySelectorAll('button.class-select-card');
    expect(cards.length).toBe(4);
    // R29: class cannot be skipped — no cancel/close button anywhere on this sheet.
    expect(sheet.root.querySelectorAll('button').length).toBe(4);
  });

  it('dispatches the same chooseClass classId a tap on each card sends, in class.tanker/ranged/support/magic order', () => {
    const container = document.createElement('div');
    const onChoose = vi.fn();
    const sheet = mountClassSelect(container, onChoose, FAKE_ASSETS);
    sheet.show();
    const cards = sheet.root.querySelectorAll<HTMLButtonElement>('button.class-select-card');
    cards[2]?.click();
    expect(onChoose).toHaveBeenCalledWith('support');
  });

  it('every card shows the reused role-info copy (name + one-line description)', () => {
    const container = document.createElement('div');
    const sheet = mountClassSelect(container, () => undefined, FAKE_ASSETS);
    expect(sheet.root.textContent).toContain(getCopyText('class.tanker'));
    expect(sheet.root.textContent).toContain(getCopyText('onboarding.pickRoleTanker'));
    expect(sheet.root.textContent).toContain(getCopyText('onboarding.pickRoleTitle'));
    expect(sheet.root.textContent).toContain(getCopyText('onboarding.pickRoleHint'));
  });

  it('hide() re-hides the sheet', () => {
    const container = document.createElement('div');
    const sheet = mountClassSelect(container, () => undefined, FAKE_ASSETS);
    sheet.show();
    sheet.hide();
    expect(sheet.root.hidden).toBe(true);
  });

  // V-40 (art gate F04-F06-visual-gate.md §8, P2-X47): a manifest that arrives after this sheet
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
    const sheet = mountClassSelect(container, () => undefined, assets);
    const tankerBadge = sheet.root.querySelectorAll('img')[0] as HTMLImageElement;
    expect(tankerBadge.hidden).toBe(true);

    manifestRef.current = manifest;
    fireManifestReady();

    expect(tankerBadge.hidden).toBe(false);
    expect(tankerBadge.src).toContain('art/badge/tanker-48.png');
  });
});
