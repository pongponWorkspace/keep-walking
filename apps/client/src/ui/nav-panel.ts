/**
 * The A2 nearby panel (distance chip + direction arrow + nav button + `nav.returnBeforeArrive`)
 * and the A3 fallback panel (tech note F04 section 14, F04 flow sections 2, C-1/C-2). The nav
 * link is a real `<a target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">`
 * the player taps themselves (tech note 14.1: never `window.open` outside a gesture).
 */
import { formatCopyText } from '../copy/format';
import { getCopyText } from '../copy/load';
import type { CompassPoint } from '../dungeons/direction';
import { DIRECTION_COPY_KEY } from '../dungeons/direction';
import { navUrlFor, primaryNavTarget } from '../nav/links';
import type { NavTarget } from '../nav/links';

export interface NavPanelDeps {
  readonly externalOpenTimeout_ms: number;
  readonly onNavigationLinkOpened: (
    target: NavTarget | 'copy_fallback',
    fallbackAuto: boolean,
  ) => void;
  readonly isOnline: () => boolean;
  readonly userAgent: string;
  readonly maxTouchPoints: number;
  readonly copyToClipboard: (text: string) => Promise<boolean>;
}

export interface NavPanelDestination {
  readonly lat: number;
  readonly lng: number;
  readonly searchNameKey: string;
}

export interface NavPanel {
  readonly root: HTMLElement;
  /** `direction`/`distanceText` are `undefined` when inside the polygon or position unknown (the
   * arrow/chip hide; caller shows the "in zone" chip or `icon.ui.location-off` instead). */
  setDistance(distanceText: string | undefined, approximate: boolean): void;
  setDirection(direction: CompassPoint | undefined): void;
  setClosed(closed: boolean, openTime: string | undefined): void;
  setDestination(destination: NavPanelDestination): void;
  openFallbackPanel(fallbackAuto: boolean): void;
  hideFallbackPanel(): void;
}

export function mountNavPanel(container: HTMLElement, deps: NavPanelDeps): NavPanel {
  const root = document.createElement('div');
  root.className = 'nav-panel';

  const distanceChip = document.createElement('span');
  distanceChip.className = 'chip-distance';
  const straightLineTag = document.createElement('span');
  straightLineTag.className = 'chip-distance-tag';
  straightLineTag.textContent = getCopyText('nav.straightLineTag');

  const arrow = document.createElement('span');
  arrow.className = 'direction-arrow';
  const directionLabel = document.createElement('span');
  directionLabel.className = 'direction-label';

  const closedLine = document.createElement('div');
  closedLine.className = 'nav-panel-closed';
  closedLine.hidden = true;

  const navLink = document.createElement('a');
  navLink.className = 'btn btn-primary nav-navigate-button';
  navLink.target = '_blank';
  navLink.rel = 'noopener noreferrer';
  navLink.referrerPolicy = 'no-referrer';
  navLink.textContent = getCopyText('map.navigateButton');

  const returnBeforeArrive = document.createElement('div');
  returnBeforeArrive.className = 'nav-return-before-arrive';
  returnBeforeArrive.textContent = getCopyText('nav.returnBeforeArrive');

  const fallbackOpenLink = document.createElement('button');
  fallbackOpenLink.className = 'nav-fallback-open-link';
  fallbackOpenLink.textContent = getCopyText('nav.fallbackOtherApp');

  root.append(
    distanceChip,
    straightLineTag,
    arrow,
    directionLabel,
    closedLine,
    navLink,
    returnBeforeArrive,
    fallbackOpenLink,
  );
  container.append(root);

  // --- A3 fallback panel ---
  const fallbackOverlay = document.createElement('div');
  fallbackOverlay.className = 'popup-overlay';
  fallbackOverlay.hidden = true;
  const fallbackPopup = document.createElement('div');
  fallbackPopup.className = 'popup';
  const fallbackTitle = document.createElement('div');
  fallbackTitle.textContent = getCopyText('nav.fallbackTitle');
  const fallbackDestLabel = document.createElement('div');
  fallbackDestLabel.textContent = getCopyText('nav.fallbackDestinationLabel');
  const fallbackDestValue = document.createElement('div');
  const fallbackCopyName = document.createElement('button');
  fallbackCopyName.className = 'btn btn-secondary';
  fallbackCopyName.textContent = getCopyText('nav.fallbackCopyButton');
  const fallbackCoordLabel = document.createElement('div');
  fallbackCoordLabel.textContent = getCopyText('nav.fallbackCoordsLabel');
  const fallbackCoordValue = document.createElement('div');
  const fallbackCopyCoord = document.createElement('button');
  fallbackCopyCoord.className = 'btn btn-secondary';
  fallbackCopyCoord.textContent = getCopyText('nav.fallbackCopyCoordsButton');
  const fallbackReturnBeforeArrive = document.createElement('div');
  fallbackReturnBeforeArrive.className = 'nav-return-before-arrive';
  fallbackReturnBeforeArrive.textContent = getCopyText('nav.returnBeforeArrive');
  const fallbackClose = document.createElement('button');
  fallbackClose.className = 'btn btn-secondary';
  fallbackClose.textContent = getCopyText('common.close');
  const fallbackToast = document.createElement('div');
  fallbackToast.className = 'toast neutral';
  fallbackToast.hidden = true;

  fallbackPopup.append(
    fallbackTitle,
    fallbackDestLabel,
    fallbackDestValue,
    fallbackCopyName,
    fallbackCoordLabel,
    fallbackCoordValue,
    fallbackCopyCoord,
    // C-2 (design/reviews/F04-flow-approval.md R2-3): repeated here too, under the coordinate
    // copy button and above the close button, so someone who copies the name to their own maps
    // app hits the same "come back before you arrive" reminder as the deep-link path.
    fallbackReturnBeforeArrive,
    fallbackClose,
    fallbackToast,
  );
  fallbackOverlay.append(fallbackPopup);
  container.append(fallbackOverlay);
  fallbackClose.addEventListener('click', () => {
    fallbackOverlay.hidden = true;
  });

  async function copyWithToast(button: HTMLButtonElement, text: string): Promise<void> {
    const ok = await deps.copyToClipboard(text);
    if (ok) {
      fallbackToast.hidden = false;
      fallbackToast.textContent = getCopyText('nav.fallbackCopied');
    } else {
      const input = document.createElement('input');
      input.readOnly = true;
      input.value = text;
      button.replaceWith(input);
      input.select();
    }
  }

  let destination: NavPanelDestination | undefined;
  let currentTarget: NavTarget = primaryNavTarget(deps.userAgent, deps.maxTouchPoints);
  let openTimer: ReturnType<typeof setTimeout> | undefined;

  function clearOpenTimer(): void {
    if (openTimer !== undefined) {
      clearTimeout(openTimer);
      openTimer = undefined;
    }
  }

  function onVisibilityOrPagehide(): void {
    if (document.visibilityState === 'hidden') {
      clearOpenTimer();
    }
  }
  document.addEventListener('visibilitychange', onVisibilityOrPagehide);
  window.addEventListener('pagehide', onVisibilityOrPagehide);

  function api(): NavPanel {
    return {
      root,
      setDistance(distanceText, approximate) {
        if (distanceText === undefined) {
          distanceChip.hidden = true;
          straightLineTag.hidden = true;
          return;
        }
        distanceChip.hidden = false;
        straightLineTag.hidden = false;
        distanceChip.textContent = approximate
          ? formatCopyText('nav.distanceApprox', { distanceText })
          : distanceText;
      },
      setDirection(direction) {
        if (direction === undefined) {
          arrow.hidden = true;
          directionLabel.hidden = true;
          return;
        }
        arrow.hidden = false;
        directionLabel.hidden = false;
        arrow.dataset['direction'] = direction;
        directionLabel.textContent = formatCopyText('nav.directionLabel', {
          directionText: getCopyText(DIRECTION_COPY_KEY[direction]),
        });
      },
      setClosed(closed, openTime) {
        closedLine.hidden = !closed;
        if (!closed) return;
        closedLine.textContent =
          openTime === undefined
            ? getCopyText('dungeon.closedEmergencyBody')
            : formatCopyText('dungeon.closedBody', { openTime });
      },
      setDestination(next) {
        destination = next;
        currentTarget = primaryNavTarget(deps.userAgent, deps.maxTouchPoints);
        navLink.href = navUrlFor(currentTarget, next.lat, next.lng);
        fallbackDestValue.textContent = getCopyText(next.searchNameKey);
        const DECIMALS = 5;
        fallbackCoordValue.textContent = `${next.lat.toFixed(DECIMALS)}, ${next.lng.toFixed(DECIMALS)}`;
        fallbackCopyName.onclick = () =>
          void copyWithToast(fallbackCopyName, getCopyText(next.searchNameKey));
        fallbackCopyCoord.onclick = () =>
          void copyWithToast(fallbackCopyCoord, fallbackCoordValue.textContent ?? '');
      },
      openFallbackPanel(fallbackAuto) {
        clearOpenTimer();
        fallbackOverlay.hidden = false;
        fallbackToast.hidden = true;
        deps.onNavigationLinkOpened('copy_fallback', fallbackAuto);
      },
      hideFallbackPanel() {
        fallbackOverlay.hidden = true;
      },
    };
  }

  navLink.addEventListener('click', () => {
    if (destination === undefined) return;
    if (!deps.isOnline()) {
      // Offline: show the fallback panel immediately alongside the link (tech note 14.2), the tap
      // itself still opens whatever the OS can (may be nothing).
      api().openFallbackPanel(true);
      return;
    }
    deps.onNavigationLinkOpened(currentTarget, false);
    clearOpenTimer();
    openTimer = setTimeout(() => {
      api().openFallbackPanel(true);
    }, deps.externalOpenTimeout_ms);
  });
  fallbackOpenLink.addEventListener('click', () => api().openFallbackPanel(false));

  return api();
}
