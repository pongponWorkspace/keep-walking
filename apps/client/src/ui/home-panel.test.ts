// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountHomePanel } from './home-panel';
import type { HomePanelDeps } from './home-panel';
import type { AssetRuntimeController } from '../assets/runtime';
import { getCopyText } from '../copy/load';
import { formatCopyText } from '../copy/format';
import { formatDistanceText } from '../dungeons/distance';

function fakeAssets(loadAvatarPart = vi.fn().mockResolvedValue(undefined)): AssetRuntimeController {
  return {
    getManifest: () => undefined,
    basePath: '/kw/',
    scale: 1,
    isProduction: false,
    load: () => Promise.resolve(),
    getAvatarPart: () => undefined,
    loadAvatarPart,
  } as unknown as AssetRuntimeController;
}

function mount(overrides: Partial<HomePanelDeps> = {}) {
  const container = document.createElement('div');
  const assets = fakeAssets();
  const deps: HomePanelDeps = {
    assets,
    utcOffsetMin: 420,
    distanceDisplaySteps_m: [{ upTo_m: null, step_m: 50 }],
    onOpenRoleInfo: vi.fn(),
    onOpenInventory: vi.fn(),
    onOpenRecentRuns: vi.fn(),
    onRegisterDistrict: vi.fn(),
    onRegisterProvince: vi.fn(),
    onRequestConsent: vi.fn(),
    ...overrides,
  };
  const panel = mountHomePanel(container, deps);
  return { container, panel, deps, assets };
}

describe('mountHomePanel', () => {
  it('is hidden for `near` and for undefined (masks not loaded yet)', () => {
    const { panel } = mount();
    panel.render({ kind: 'near', dungeonId: 'x' }, 0, false);
    expect(panel.root.hidden).toBe(true);
    panel.render(undefined, 0, false);
    expect(panel.root.hidden).toBe(true);
  });

  it('unknown: shows the consent CTA and the province register card', () => {
    const { container, panel, deps } = mount();
    panel.render({ kind: 'unknown' }, 0, false);
    expect(panel.root.hidden).toBe(false);
    container.querySelector<HTMLButtonElement>('.home-primary-cta')?.click();
    expect(deps.onRequestConsent).toHaveBeenCalled();
    container.querySelector<HTMLButtonElement>('.home-register-cta')?.click();
    expect(deps.onRegisterProvince).toHaveBeenCalled();
  });

  it('out_of_area: primary CTA registers by province', () => {
    const { container, panel, deps } = mount();
    panel.render({ kind: 'out_of_area' }, 0, false);
    container.querySelector<HTMLButtonElement>('.home-primary-cta')?.click();
    expect(deps.onRegisterProvince).toHaveBeenCalled();
  });

  it('far: shows distanceText from state.distance_m, no register card', () => {
    const { container, panel } = mount();
    panel.render({ kind: 'far', dungeonId: 'd1', distance_m: 1234 }, 0, false);
    expect(container.querySelector('.home-panel-body')?.textContent).toContain('1');
    expect(container.querySelector<HTMLElement>('.home-panel-register-card')?.hidden).toBe(true);
  });

  // C6-06 (F06 copy gate, components.md 13.8): a new line right after body, never mid-sentence.
  it('far: shows the straight-line distance chip on its own new line, straightLineTag always shown', () => {
    const { container, panel } = mount();
    panel.render({ kind: 'far', dungeonId: 'd1', distance_m: 1234 }, 0, false);
    const line = container.querySelector<HTMLElement>('.home-panel-distance-line');
    expect(line?.hidden).toBe(false);
    expect(line?.querySelector('.chip-distance-tag')?.textContent).toBe(
      getCopyText('nav.straightLineTag'),
    );
    const distanceText = formatDistanceText(1234, [{ upTo_m: null, step_m: 50 }]);
    expect(line?.querySelector('.chip-distance')?.textContent).toBe(distanceText);
  });

  it('far: low accuracy switches the chip number to nav.distanceApprox, same rule as nav-panel', () => {
    const { container, panel } = mount();
    panel.render({ kind: 'far', dungeonId: 'd1', distance_m: 1234 }, 0, true);
    const chip = container.querySelector('.home-panel-distance-line .chip-distance');
    const distanceText = formatDistanceText(1234, [{ upTo_m: null, step_m: 50 }]);
    expect(chip?.textContent).toBe(formatCopyText('nav.distanceApprox', { distanceText }));
  });

  it('outside_launch_district: also shows the distance chip (the other kind home.farBody covers)', () => {
    const { container, panel } = mount();
    panel.render({ kind: 'outside_launch_district', dungeonId: 'd1', distance_m: 2000 }, 0, false);
    expect(container.querySelector<HTMLElement>('.home-panel-distance-line')?.hidden).toBe(false);
  });

  it('temporarilyClosed/out_of_area/unknown: never show the distance chip (no home.farBody there)', () => {
    const { container, panel } = mount();
    panel.render({ kind: 'temporarilyClosed', dungeonId: 'd1', nextOpenAt_ms: null }, 0, false);
    expect(container.querySelector<HTMLElement>('.home-panel-distance-line')?.hidden).toBe(true);
    panel.render({ kind: 'out_of_area' }, 0, false);
    expect(container.querySelector<HTMLElement>('.home-panel-distance-line')?.hidden).toBe(true);
    panel.render({ kind: 'unknown' }, 0, false);
    expect(container.querySelector<HTMLElement>('.home-panel-distance-line')?.hidden).toBe(true);
  });

  it('outside_launch_district: shows the district register card (secondary CTA) with its own body', () => {
    const { container, panel, deps } = mount();
    panel.render({ kind: 'outside_launch_district', dungeonId: 'd1', distance_m: 2000 }, 0, false);
    expect(container.querySelector<HTMLElement>('.home-panel-register-card')?.hidden).toBe(false);
    expect(
      container.querySelector('.home-panel-register-card')?.textContent?.length,
    ).toBeGreaterThan(0);
    container.querySelector<HTMLButtonElement>('.home-register-cta')?.click();
    expect(deps.onRegisterDistrict).toHaveBeenCalled();
  });

  it('temporarilyClosed: shows the next-open line, no primary CTA', () => {
    const { container, panel } = mount();
    panel.render({ kind: 'temporarilyClosed', dungeonId: 'd1', nextOpenAt_ms: 60_000 }, 0, false);
    expect(container.querySelector<HTMLElement>('.home-panel-next-open')?.hidden).toBe(false);
    expect(container.querySelector<HTMLElement>('.home-primary-cta')?.hidden).toBe(true);
  });

  // F06 copy gate C6-04: `nextOpenAt_ms: null` must use `home.farNextOpenUnknown`, never
  // `home.farNextOpen` with an empty `{openTime}` (a dangling "เปิดอีกที " on screen).
  it('temporarilyClosed with nextOpenAt_ms null: uses home.farNextOpenUnknown, never an empty {openTime}', () => {
    const { container, panel } = mount();
    panel.render({ kind: 'temporarilyClosed', dungeonId: 'd1', nextOpenAt_ms: null }, 0, false);
    const line = container.querySelector<HTMLElement>('.home-panel-next-open');
    expect(line?.hidden).toBe(false);
    expect(line?.textContent).toBe(getCopyText('home.farNextOpenUnknown'));
    expect(line?.textContent).not.toContain('{openTime}');
    // Never the old `home.farNextOpen` template with an empty `{openTime}` substitution (which
    // would leave a trailing space before the closing quote of that key's own text).
    expect(line?.textContent?.endsWith(' ')).toBe(false);
  });

  it('lazily loads the avatar part exactly once, on the first non-hidden render', () => {
    const { panel, assets } = mount();
    panel.render({ kind: 'unknown' }, 0, false);
    panel.render({ kind: 'out_of_area' }, 0, false);
    expect(
      (assets as unknown as { loadAvatarPart: ReturnType<typeof vi.fn> }).loadAvatarPart,
    ).toHaveBeenCalledTimes(1);
  });

  it('shortcuts call their own handlers', () => {
    const { container, panel, deps } = mount();
    panel.render({ kind: 'unknown' }, 0, false);
    container.querySelector<HTMLButtonElement>('.home-role-info-link')?.click();
    container.querySelector<HTMLButtonElement>('.home-inventory-link')?.click();
    container.querySelector<HTMLButtonElement>('.home-recent-runs-link')?.click();
    expect(deps.onOpenRoleInfo).toHaveBeenCalled();
    expect(deps.onOpenInventory).toHaveBeenCalled();
    expect(deps.onOpenRecentRuns).toHaveBeenCalled();
  });
});
