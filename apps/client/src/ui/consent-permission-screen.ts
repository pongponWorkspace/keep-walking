/**
 * `S-00-permission-browser` (design/ux/flows/F06-hp-damage-onboarding.md Flow A ข้อ A4, หัวข้อ
 * 18.1; copy.th.json `consent.browserPriming*`): the one blocking screen between accepting
 * location consent (`S-00-consent-location`) and the native OS/browser geolocation prompt — never
 * a passthrough. A player who just tapped "อนุญาต" in our own UI and is then immediately asked
 * again by the OS, with no warning, risks reflexively tapping "Block" (it looks like being asked
 * twice for no reason); this screen is the warning.
 *
 * `onContinue` is the caller's own `onboarding-flow.ts#confirmBrowserPriming` — this module never
 * calls `startLocationProvider`/`resolvePermission` itself (R47/CLAUDE.md "GPS never requested
 * without consent": the *caller*, not this screen, decides when the real request goes out, exactly
 * the same separation `consent-location-screen.ts` already keeps).
 */
import { getCopyText } from '../copy/load';

export interface ConsentPermissionScreenDeps {
  readonly onContinue: () => void;
}

export interface ConsentPermissionScreen {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
}

export function mountConsentPermissionScreen(
  container: HTMLElement,
  deps: ConsentPermissionScreenDeps,
): ConsentPermissionScreen {
  const root = document.createElement('div');
  root.className = 'screen consent-permission-screen';
  root.hidden = true;

  const title = document.createElement('h1');
  title.textContent = getCopyText('consent.browserPrimingTitle');

  const body = document.createElement('p');
  body.className = 'consent-permission-body';
  body.textContent = getCopyText('consent.browserPrimingBody');

  const continueButton = document.createElement('button');
  continueButton.className = 'btn btn-primary consent-permission-continue';
  continueButton.textContent = getCopyText('consent.browserPrimingContinue');
  continueButton.addEventListener('click', () => deps.onContinue());

  root.append(title, body, continueButton);
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
