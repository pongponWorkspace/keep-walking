// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountClassSelect } from './class-select';
import type { AssetRuntime } from '../assets/icon-dom';
import { getCopyText } from '../copy/load';

const FAKE_ASSETS: AssetRuntime = {
  getManifest: () => undefined,
  basePath: '/assets/',
  scale: 1,
  isProduction: false,
};

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
});
