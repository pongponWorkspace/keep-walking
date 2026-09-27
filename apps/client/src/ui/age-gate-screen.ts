/**
 * `S-00-age-gate` + its terminal `underage` state (design/features/F06-hp-damage-onboarding.md R45/
 * R46; design/ux/flows/F06-hp-damage-onboarding.md A2/A2b; copy.th.json `age.*`). Two mutually
 * exclusive views in one screen (`showGate()`/`showUnderage()`), the same "one screen, two
 * frames" shape the wireframe (`design/ux/wireframes/F06-01-onboarding-intro-age-consent.html`)
 * draws them as.
 *
 * The birth-year `<select>` (never a text input, F06-R45 "เลือกปีเกิดจากรายการ ไม่พิมพ์") starts with
 * no option selected — the confirm button stays `.btn-disabled` until a real year is picked (design
 * gate A 4.8/F-07: "แตะตัวเลือกอย่างเดียวไม่ไปต่อ", a separate confirm tap is required). Options come
 * from `age-gate.ts#ageGateBirthYearOptions` (this module's own doc comment explains why that list
 * spans failing years too), never invented here.
 *
 * Never computes pass/fail itself: `onConfirm(birthYear)` hands the raw picked year to the caller
 * (`onboarding-flow.ts#confirmAge`, which owns `config: privacy.minAge_yr`/`minAgeComparison` and
 * the storage write) — this module only collects the one input a real config-driven gate needs.
 */
import { getCopyText } from '../copy/load';
import { formatCopyText } from '../copy/format';
import { ageGateBirthYearOptions } from '../age-gate';

export interface AgeGateScreenDeps {
  /** `config/balance/privacy.json#minAge_yr` — `age.gateBody`'s `{minAge}` variable. */
  readonly minAge_yr: number;
  /** The game clock's own `now()` (ADR 0003 C1-3), never `Date.now()` read here directly — only
   * used to compute the birth-year list's own "newest" end (`age-gate.ts`'s own doc comment). */
  readonly now: () => number;
  readonly onConfirm: (birthYear: number) => void;
  readonly onUnderageBack: () => void;
}

export interface AgeGateScreen {
  readonly root: HTMLElement;
  showGate(): void;
  showUnderage(): void;
  hide(): void;
}

export function mountAgeGateScreen(container: HTMLElement, deps: AgeGateScreenDeps): AgeGateScreen {
  const root = document.createElement('div');
  root.className = 'screen age-gate-screen';
  root.hidden = true;

  // --- gate view (A2) ---
  const gateView = document.createElement('div');
  gateView.className = 'age-gate-view';
  const title = document.createElement('h1');
  title.textContent = getCopyText('age.gateTitle');
  const body = document.createElement('p');
  body.textContent = formatCopyText('age.gateBody', { minAge: deps.minAge_yr });
  const optionsLabel = document.createElement('div');
  optionsLabel.className = 'age-gate-options-label';
  optionsLabel.textContent = getCopyText('age.gateOptions');
  const select = document.createElement('select');
  select.className = 'age-gate-birth-year-select';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '';
  select.append(placeholder);
  const confirmButton = document.createElement('button');
  confirmButton.className = 'btn btn-primary btn-disabled age-gate-confirm';
  confirmButton.textContent = getCopyText('age.gateConfirm');
  confirmButton.disabled = true;
  gateView.append(title, body, optionsLabel, select, confirmButton);

  select.addEventListener('change', () => {
    const hasSelection = select.value !== '';
    confirmButton.disabled = !hasSelection;
    confirmButton.classList.toggle('btn-disabled', !hasSelection);
  });
  confirmButton.addEventListener('click', () => {
    if (select.value === '') return;
    deps.onConfirm(Number(select.value));
  });

  // --- underage view (A2b, R46) ---
  const underageView = document.createElement('div');
  underageView.className = 'age-gate-underage-view';
  underageView.hidden = true;
  const underageTitle = document.createElement('h1');
  underageTitle.textContent = getCopyText('age.underMinTitle');
  const underageBody = document.createElement('p');
  underageBody.textContent = formatCopyText('age.underMinBody', { minAge: deps.minAge_yr });
  const backButton = document.createElement('button');
  backButton.className = 'btn btn-secondary age-gate-underage-back';
  backButton.textContent = getCopyText('age.underMinBack');
  backButton.addEventListener('click', () => deps.onUnderageBack());
  underageView.append(underageTitle, underageBody, backButton);

  root.append(gateView, underageView);
  container.append(root);

  function populateOptions(): void {
    while (select.options.length > 1) select.remove(1);
    const nowYear = new Date(deps.now()).getFullYear();
    for (const year of ageGateBirthYearOptions(nowYear)) {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = String(year);
      select.append(option);
    }
  }

  return {
    root,
    showGate() {
      populateOptions();
      select.value = '';
      confirmButton.disabled = true;
      confirmButton.classList.add('btn-disabled');
      gateView.hidden = false;
      underageView.hidden = true;
      root.hidden = false;
    },
    showUnderage() {
      gateView.hidden = true;
      underageView.hidden = false;
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
  };
}
