/**
 * `S-26-credits` (flow F06 G6): a read-only screen, one `common.close` button, reachable from
 * `settings.creditsLink` without any consent/unlock gate. This task lands the screen itself; the
 * settings entry point that opens it belongs to `P2-F06-T09` (the settings screen does not exist
 * yet) — handoff in this task's REPORT.
 */
import { getCopyText } from '../copy/load';
import { creditsGroupViews } from './credits-view';

export interface CreditsScreen {
  readonly root: HTMLElement;
  show(): void;
  hide(): void;
}

export function mountCredits(container: HTMLElement, onClose: () => void): CreditsScreen {
  const root = document.createElement('div');
  root.className = 'screen credits-screen';
  root.hidden = true;

  const title = document.createElement('h1');
  title.textContent = getCopyText('credits.title');

  const body = document.createElement('div');
  body.className = 'credits-body';

  const closeButton = document.createElement('button');
  closeButton.className = 'btn btn-secondary';
  closeButton.textContent = getCopyText('common.close');
  closeButton.addEventListener('click', () => onClose());

  root.append(title, body, closeButton);
  container.append(root);

  function render(): void {
    body.innerHTML = '';
    for (const group of creditsGroupViews()) {
      const heading = document.createElement('h2');
      heading.textContent = group.heading;
      body.append(heading);
      for (const entry of group.entries) {
        const row = document.createElement('div');
        row.className = 'credits-entry';
        const titleEl = document.createElement('a');
        titleEl.href = entry.attributionUrl;
        titleEl.target = '_blank';
        titleEl.rel = 'noopener noreferrer';
        titleEl.referrerPolicy = 'no-referrer';
        // Verbatim license/attribution text (data, not copy — credits-view.ts's own doc comment).
        titleEl.textContent = entry.title;
        const licenseEl = document.createElement('div');
        licenseEl.textContent = entry.licenseLine;
        row.append(titleEl, licenseEl);
        body.append(row);
      }
    }
  }

  return {
    root,
    show() {
      render();
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
  };
}
