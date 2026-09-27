/**
 * `S-00-consent-location` (design/features/F06-hp-damage-onboarding.md R47/R48; design/ux/flows/
 * F06-hp-damage-onboarding.md A3; copy.th.json `consent.location*`) — the one, separate screen a
 * player sees before the app ever requests real GPS (CLAUDE.md: "GPS never requested without
 * consent"). Reused for the re-consent path too (a returning player who declined/withdrew earlier,
 * `home.unknownCta`/`privacy.locationStatusNotGranted`'s own "ปุ่มกลับไปให้ consent" — R48 "ไม่ถามซ้ำ
 * เอง", the player must tap something first), never a second, forked screen for that case.
 *
 * `onAccept`/`onDecline` are the caller's own `onboarding-flow.ts#acceptConsent`/`declineConsent` —
 * this module never writes `kw.p2.consent` itself and never touches `LocationProvider` (CLAUDE.md
 * "Use the LocationProvider interface only", and even indirectly: only the accept path's *caller*
 * decides to start it, this screen just reports the tap).
 */
import { getCopyText } from '../copy/load';
import { formatCopyText } from '../copy/format';
import { positionLogTtlText } from '../copy/position-log-ttl';

export interface ConsentLocationScreenDeps {
  readonly onAccept: () => void;
  readonly onDecline: () => void;
}

export interface ConsentLocationScreen {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
}

export function mountConsentLocationScreen(
  container: HTMLElement,
  deps: ConsentLocationScreenDeps,
): ConsentLocationScreen {
  const root = document.createElement('div');
  root.className = 'screen consent-location-screen';
  root.hidden = true;

  const header = document.createElement('div');
  header.className = 'consent-header-label';
  header.textContent = getCopyText('consent.headerLabel');

  const title = document.createElement('h1');
  title.textContent = getCopyText('consent.locationTitle');

  const body = document.createElement('p');
  body.className = 'consent-location-body';
  body.textContent = formatCopyText('consent.locationBody', { ttlText: positionLogTtlText() });

  const buttonRow = document.createElement('div');
  buttonRow.className = 'consent-location-buttons';
  const acceptButton = document.createElement('button');
  // NN-7: accept/decline carry equal visual weight — never a `.btn-primary`-vs-`.btn-secondary`
  // pair here (both stay plain `.btn`, sized/ordered identically by the caller's own stylesheet).
  acceptButton.className = 'btn consent-location-accept';
  acceptButton.textContent = getCopyText('consent.locationAccept');
  acceptButton.addEventListener('click', () => deps.onAccept());
  const declineButton = document.createElement('button');
  declineButton.className = 'btn consent-location-decline';
  declineButton.textContent = getCopyText('consent.locationDecline');
  declineButton.addEventListener('click', () => deps.onDecline());
  buttonRow.append(acceptButton, declineButton);

  root.append(header, title, body, buttonRow);
  container.append(root);

  return {
    root,
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
  };
}
