/**
 * Renders the GPS pill (design/ux/components.md 2.2 `.gps-pill`), the offline banner (6, top
 * `.banner.info`), and the restored/suspended toast (6, `.toast`) from `GpsDisplayState`/`GpsToast`
 * (src/copy/gps-state.ts). Every string comes from `getCopyText` (src/copy/load.ts): a missing key
 * shows as its own name (TL-N06), never a hardcoded Thai literal (CLAUDE.md).
 *
 * DOM-only glue, not unit-tested at the Vitest level (same as src/map.ts): no DOM in this
 * workspace's Vitest environment (ADR 0001 3.6). Covered by e2e (apps/client/e2e/).
 */
import { getCopyText } from '../copy/load';
import type { GpsDisplayState, GpsToast } from '../copy/gps-state';
import { GPS_DISPLAY_COPY, GPS_OFFLINE_COPY_KEY, GPS_TOAST_COPY } from '../copy/gps-state';

/**
 * How long the restored/suspended toast stays up before it hides itself. `design/ux/tokens.json`
 * `motion` is explicitly unowned pending vfx-animator's P1-F03-T27 timing pass; this is a
 * clearly-marked placeholder, not a config value, per the "state an assumption, keep going" rule.
 */
const TOAST_AUTO_HIDE_MS = 4000;

/** Placeholder copy keys for two dev-only affordances this spike needs and no flow/copy doc has
 * assigned real Thai text to yet (handoff: narrative-designer, uiux-designer). */
const START_BUTTON_KEY = 'client.mapSpike.startLocation';
const FOLLOW_ON_KEY = 'client.mapSpike.followModeOn';
const FOLLOW_OFF_KEY = 'client.mapSpike.followModeOff';

export interface GpsUi {
  setDisplay(display: GpsDisplayState): void;
  showToast(toast: GpsToast): void;
  setOffline(offline: boolean): void;
  showStartButton(onStart: () => void): void;
  hideStartButton(): void;
  setFollowMode(enabled: boolean): void;
  onFollowToggle(listener: (enabled: boolean) => void): () => void;
}

function el(tag: string, className: string, id: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.id = id;
  node.hidden = true;
  return node;
}

/** Builds the GPS status DOM inside `container` (the `#hud` element, a sibling of `#map`). */
export function mountGpsUi(container: HTMLElement): GpsUi {
  const pillLabel = el('div', 'gps-pill', 'gps-pill-label');
  const pillBody = el('div', 'gps-pill-body', 'gps-pill-body');
  const banner = el('div', 'banner info', 'network-banner');
  const toast = el('div', 'toast neutral', 'gps-toast');
  const startButton = el('button', 'button', 'start-location') as HTMLButtonElement;
  const followButton = el('button', 'button', 'follow-toggle') as HTMLButtonElement;
  followButton.hidden = false;
  followButton.setAttribute('aria-pressed', 'true');
  followButton.textContent = getCopyText(FOLLOW_ON_KEY);

  container.append(pillLabel, pillBody, banner, toast, startButton, followButton);

  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const followListeners = new Set<(enabled: boolean) => void>();
  let followEnabled = true;

  followButton.addEventListener('click', () => {
    followEnabled = !followEnabled;
    followButton.setAttribute('aria-pressed', String(followEnabled));
    followButton.textContent = getCopyText(followEnabled ? FOLLOW_ON_KEY : FOLLOW_OFF_KEY);
    for (const listener of followListeners) {
      listener(followEnabled);
    }
  });

  return {
    setDisplay(display: GpsDisplayState): void {
      const copy = GPS_DISPLAY_COPY[display];
      if (copy === null) {
        pillLabel.hidden = true;
        pillBody.hidden = true;
        return;
      }
      pillLabel.hidden = false;
      pillLabel.textContent = getCopyText(copy.label);
      if (copy.body === undefined) {
        pillBody.hidden = true;
      } else {
        pillBody.hidden = false;
        pillBody.textContent = getCopyText(copy.body);
      }
    },
    showToast(toastKind: GpsToast): void {
      toast.hidden = false;
      toast.textContent = getCopyText(GPS_TOAST_COPY[toastKind]);
      if (toastTimer !== undefined) {
        clearTimeout(toastTimer);
      }
      toastTimer = setTimeout(() => {
        toast.hidden = true;
      }, TOAST_AUTO_HIDE_MS);
    },
    setOffline(offline: boolean): void {
      banner.hidden = !offline;
      banner.textContent = getCopyText(GPS_OFFLINE_COPY_KEY);
    },
    showStartButton(onStart: () => void): void {
      startButton.hidden = false;
      startButton.textContent = getCopyText(START_BUTTON_KEY);
      startButton.addEventListener('click', onStart, { once: true });
    },
    hideStartButton(): void {
      startButton.hidden = true;
    },
    setFollowMode(enabled: boolean): void {
      followEnabled = enabled;
      followButton.setAttribute('aria-pressed', String(enabled));
      followButton.textContent = getCopyText(enabled ? FOLLOW_ON_KEY : FOLLOW_OFF_KEY);
    },
    onFollowToggle(listener: (enabled: boolean) => void): () => void {
      followListeners.add(listener);
      return () => followListeners.delete(listener);
    },
  };
}
