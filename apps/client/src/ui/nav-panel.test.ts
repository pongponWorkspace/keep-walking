// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mountNavPanel } from './nav-panel';
import { getDungeonShortName } from '../copy/names';
import { getCopyText } from '../copy/load';

function baseDeps(overrides: Partial<Parameters<typeof mountNavPanel>[1]> = {}) {
  return {
    externalOpenTimeout_ms: 2500,
    onNavigationLinkOpened: () => undefined,
    isOnline: () => true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14)',
    maxTouchPoints: 5,
    copyToClipboard: async () => true,
    ...overrides,
  };
}

describe('mountNavPanel', () => {
  it('builds a Google Maps walking link with no player position (Android UA)', () => {
    const container = document.createElement('div');
    const panel = mountNavPanel(container, baseDeps());
    panel.setDestination({
      lat: 13.7627981,
      lng: 100.4944865,
      searchNameKey: 'dungeon.baanPhraAthit.search',
      nameKey: 'dungeon.baanPhraAthit',
    });
    const link = panel.root.querySelector('.nav-navigate-button') as HTMLAnchorElement;
    expect(link.href).toContain('google.com/maps/dir');
    expect(link.href).toContain('travelmode=walking');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('builds an Apple Maps link on iOS UA', () => {
    const container = document.createElement('div');
    const panel = mountNavPanel(
      container,
      baseDeps({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }),
    );
    panel.setDestination({
      lat: 13.7627981,
      lng: 100.4944865,
      searchNameKey: 'dungeon.baanPhraAthit.search',
      nameKey: 'dungeon.baanPhraAthit',
    });
    const link = panel.root.querySelector('.nav-navigate-button') as HTMLAnchorElement;
    expect(link.href).toContain('maps.apple.com');
    expect(link.href).toContain('dirflg=w');
  });

  it('C-2: nav.returnBeforeArrive line appears both in the A2 panel and the A3 fallback popup', () => {
    const container = document.createElement('div');
    mountNavPanel(container, baseDeps());
    expect(container.querySelectorAll('.nav-return-before-arrive').length).toBe(2);
  });

  it('opening the fallback panel manually reports fallback_auto=false', () => {
    let lastAuto: boolean | undefined;
    const container = document.createElement('div');
    const panel = mountNavPanel(
      container,
      baseDeps({ onNavigationLinkOpened: (_t, auto) => (lastAuto = auto) }),
    );
    panel.setDestination({
      lat: 13.76,
      lng: 100.49,
      searchNameKey: 'dungeon.baanPhraAthit.search',
      nameKey: 'dungeon.baanPhraAthit',
    });
    (container.querySelector('.nav-fallback-open-link') as HTMLElement).click();
    expect(lastAuto).toBe(false);
  });

  it('C-02: the fallback destination name comes from names.th.json, never the raw key', () => {
    const container = document.createElement('div');
    mountNavPanel(container, baseDeps()).setDestination({
      lat: 13.76,
      lng: 100.49,
      searchNameKey: 'dungeon.rommaninatPark.search',
      nameKey: 'dungeon.rommaninatPark',
    });
    expect(container.textContent).not.toContain('dungeon.rommaninatPark.search');
  });

  it('C-07: the secondary link reads nav.copyPlaceLink, not nav.fallbackOtherApp', () => {
    const container = document.createElement('div');
    mountNavPanel(container, baseDeps());
    const link = container.querySelector('.nav-fallback-open-link') as HTMLElement;
    expect(link.textContent).toBe(getCopyText('nav.copyPlaceLink'));
  });

  it('C-08: the fallback panel shows nav.fallbackBody', () => {
    const container = document.createElement('div');
    mountNavPanel(container, baseDeps());
    expect(container.textContent).toContain(getCopyText('nav.fallbackBody'));
  });

  it('A2: shows the resolved destination name line', () => {
    const container = document.createElement('div');
    const panel = mountNavPanel(container, baseDeps());
    panel.setDestination({
      lat: 13.76,
      lng: 100.49,
      searchNameKey: 'dungeon.baanPhraAthit.search',
      nameKey: 'dungeon.baanPhraAthit',
    });
    const line = container.querySelector('.nav-panel-destination-name') as HTMLElement;
    expect(line.hidden).toBe(false);
    expect(line.textContent).toBe(getDungeonShortName('dungeon.baanPhraAthit'));
  });

  it('A2: hides the destination name line entirely when it does not resolve', () => {
    const container = document.createElement('div');
    const panel = mountNavPanel(container, baseDeps());
    panel.setDestination({
      lat: 13.76,
      lng: 100.49,
      searchNameKey: 'dungeon.doesNotExist.search',
      nameKey: 'dungeon.doesNotExist',
    });
    const line = container.querySelector('.nav-panel-destination-name') as HTMLElement;
    expect(line.hidden).toBe(true);
  });

  it('offline shows the fallback panel immediately on tap (tech note 14.2)', () => {
    const container = document.createElement('div');
    const panel = mountNavPanel(container, baseDeps({ isOnline: () => false }));
    panel.setDestination({
      lat: 13.76,
      lng: 100.49,
      searchNameKey: 'dungeon.baanPhraAthit.search',
      nameKey: 'dungeon.baanPhraAthit',
    });
    const link = container.querySelector('.nav-navigate-button') as HTMLAnchorElement;
    link.addEventListener('click', (e) => e.preventDefault());
    link.click();
    const overlays = container.querySelectorAll('.popup-overlay');
    const fallbackOverlay = overlays[overlays.length - 1] as HTMLElement;
    expect(fallbackOverlay.hidden).toBe(false);
  });
});
