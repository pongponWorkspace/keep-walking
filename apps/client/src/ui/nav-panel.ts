/**
 * The A2 nearby panel (distance chip + direction arrow + nav button + `nav.returnBeforeArrive`)
 * and the A3 fallback panel (tech note F04 section 14, F04 flow sections 2, C-1/C-2). The nav
 * link is a real `<a target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">`
 * the player taps themselves (tech note 14.1: never `window.open` outside a gesture).
 */
import { formatCopyText } from '../copy/format';
import { getCopyText } from '../copy/load';
import { getDungeonShortName, getItemName, isResolvedDungeonName } from '../copy/names';
import type { CompassPoint } from '../dungeons/direction';
import { DIRECTION_COPY_KEY } from '../dungeons/direction';
import { navUrlFor, primaryNavTarget } from '../nav/links';
import type { NavTarget } from '../nav/links';
import { closedChipIconTone, NIGHT_BACKING_PLATE_COLOR_CSS } from './icon-tone';
import type { IconGlyphRenderer } from '../assets/icon-glyph';

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
  /** `setIconGlyph` (P2-F06-T14, components.md 13.1/13.9): renders `icon.ui.closed` next to the
   * closed-dungeon line (`setClosed`). */
  readonly iconGlyph: IconGlyphRenderer;
}

export interface NavPanelDestination {
  readonly lat: number;
  readonly lng: number;
  readonly searchNameKey: string;
  /** `ArtifactDungeon.name_key` (A2, copy gate P2-X37): the destination name line hides entirely
   * when this does not resolve through `names.th.json` (never a raw key on screen). */
  readonly nameKey: string;
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

  // A2 (copy gate P2-X37): the destination's own name line — hidden entirely (never a raw key)
  // when `setDestination`'s `nameKey` does not resolve through `names.th.json`.
  const destinationName = document.createElement('div');
  destinationName.className = 'nav-panel-destination-name';
  destinationName.hidden = true;

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
  closedLine.className = 'chip-status closed nav-panel-closed';
  closedLine.hidden = true;
  const closedIcon = document.createElement('span');
  closedIcon.className = 'chip-status-icon';
  const closedText = document.createElement('span');
  closedText.className = 'chip-status-text';
  closedLine.append(closedIcon, closedText);

  const navLink = document.createElement('a');
  navLink.className = 'btn btn-primary nav-navigate-button';
  navLink.target = '_blank';
  navLink.rel = 'noopener noreferrer';
  navLink.referrerPolicy = 'no-referrer';
  navLink.textContent = getCopyText('map.navigateButton');

  const returnBeforeArrive = document.createElement('div');
  returnBeforeArrive.className = 'nav-return-before-arrive';
  returnBeforeArrive.textContent = getCopyText('nav.returnBeforeArrive');

  // C-07 (copy gate P2-X37): this link opens the copy-name fallback panel, so it must read
  // `nav.copyPlaceLink` ("คัดลอกชื่อสถานที่") — `nav.fallbackOtherApp` is reserved for a real
  // "open a different maps app" link (iOS only, not built yet).
  const fallbackOpenLink = document.createElement('button');
  fallbackOpenLink.className = 'nav-fallback-open-link';
  fallbackOpenLink.textContent = getCopyText('nav.copyPlaceLink');

  root.append(
    destinationName,
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
  // C-08: how to use what gets copied — shown under the title in every state.
  const fallbackBody = document.createElement('div');
  fallbackBody.textContent = getCopyText('nav.fallbackBody');
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
    fallbackBody,
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
      // C-08: `navigator.clipboard` unavailable — the button becomes a read-only, pre-selected
      // input (tech note F04 14.3) with `nav.fallbackManualCopy` telling the player what to do
      // with it, instead of a silent field.
      const wrapper = document.createElement('div');
      const label = document.createElement('div');
      label.textContent = getCopyText('nav.fallbackManualCopy');
      const input = document.createElement('input');
      input.readOnly = true;
      input.value = text;
      wrapper.append(label, input);
      button.replaceWith(wrapper);
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
        closedText.textContent =
          openTime === undefined
            ? getCopyText('dungeon.closedEmergencyBody')
            : formatCopyText('dungeon.closedBody', { openTime });
        // [ASSUMPTION A-P2-F06-T14-1 (icon-tone.ts): no night theme exists yet, always day colour.]
        const tone = closedChipIconTone(false);
        void deps.iconGlyph.setIconGlyph(closedIcon, tone.id, {
          altText: getCopyText('dungeon.closedTitle'),
          colorCss: tone.colorCss,
          onNightBackground: false,
          nightPlateColorCss: NIGHT_BACKING_PLATE_COLOR_CSS,
        });
      },
      setDestination(next) {
        destination = next;
        currentTarget = primaryNavTarget(deps.userAgent, deps.maxTouchPoints);
        navLink.href = navUrlFor(currentTarget, next.lat, next.lng);
        // C-02 (copy gate P2-X37): `dungeon.<id>.search` is a `names.th.json` key (artifact
        // `search_name_key`), not a `copy.th.json` one — `getCopyText` had no entry for it at all
        // and fell back to the raw key.
        const searchName = getItemName(next.searchNameKey);
        fallbackDestValue.textContent = searchName;
        const DECIMALS = 5;
        fallbackCoordValue.textContent = `${next.lat.toFixed(DECIMALS)}, ${next.lng.toFixed(DECIMALS)}`;
        fallbackCopyName.onclick = () => void copyWithToast(fallbackCopyName, searchName);
        fallbackCopyCoord.onclick = () =>
          void copyWithToast(fallbackCopyCoord, fallbackCoordValue.textContent ?? '');
        // A2: the destination name line hides entirely rather than show a raw, unresolved key.
        const shortName = getDungeonShortName(next.nameKey);
        destinationName.hidden = !isResolvedDungeonName(next.nameKey, shortName);
        destinationName.textContent = shortName;
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
