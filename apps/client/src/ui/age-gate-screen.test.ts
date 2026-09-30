// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountAgeGateScreen } from './age-gate-screen';
import { getCopyText } from '../copy/load';

const NOW_MS = Date.parse('2026-10-02T12:00:00+07:00');

function mount(overrides: { onConfirm?: (y: number) => void; onUnderageBack?: () => void } = {}) {
  const container = document.createElement('div');
  const onConfirm = overrides.onConfirm ?? vi.fn();
  const onUnderageBack = overrides.onUnderageBack ?? vi.fn();
  const screen = mountAgeGateScreen(container, {
    minAge_yr: 15,
    now: () => NOW_MS,
    onConfirm,
    onUnderageBack,
  });
  return { container, screen, onConfirm, onUnderageBack };
}

describe('mountAgeGateScreen', () => {
  it('starts hidden, shows the gate copy and a disabled confirm button with no selection', () => {
    const { screen } = mount();
    expect(screen.root.hidden).toBe(true);
    screen.showGate();
    expect(screen.root.hidden).toBe(false);
    expect(screen.root.textContent).toContain(getCopyText('age.gateTitle'));
    const confirmButton = screen.root.querySelector<HTMLButtonElement>('.age-gate-confirm');
    expect(confirmButton?.disabled).toBe(true);
  });

  it('never a text input for birth year — a <select>, not typed (F06-R45)', () => {
    const { screen } = mount();
    screen.showGate();
    expect(screen.root.querySelector('select.age-gate-birth-year-select')).not.toBeNull();
    expect(screen.root.querySelector('input')).toBeNull();
  });

  it('enables confirm only after a real year is picked, and passes the picked year through', () => {
    const { screen, onConfirm } = mount();
    screen.showGate();
    const select = screen.root.querySelector<HTMLSelectElement>('.age-gate-birth-year-select');
    const confirmButton = screen.root.querySelector<HTMLButtonElement>('.age-gate-confirm');
    expect(select).not.toBeNull();
    expect(confirmButton).not.toBeNull();

    // Picking an option alone must not advance (design gate A 4.8/F-07).
    confirmButton?.click();
    expect(onConfirm).not.toHaveBeenCalled();

    if (select !== null && confirmButton !== null) {
      select.value = '2000';
      select.dispatchEvent(new Event('change'));
      expect(confirmButton.disabled).toBe(false);
      confirmButton.click();
      expect(onConfirm).toHaveBeenCalledWith(2000);
    }
  });

  it('the birth-year list includes the current year down to 99 years back, newest first', () => {
    const { screen } = mount();
    screen.showGate();
    const options = [
      ...screen.root.querySelectorAll<HTMLOptionElement>('.age-gate-birth-year-select option'),
    ]
      .map((o) => o.value)
      .filter((v) => v !== '');
    expect(options[0]).toBe('2026');
    expect(options[options.length - 1]).toBe(String(2026 - 99));
  });

  // F06 copy gate C6-09 (flow F06 A2, P2-H40): the visible year is Buddhist Era (year + 543), the
  // value `onConfirm` receives stays Gregorian — same option, two different numbers.
  it('shows birth years in Buddhist Era (year + 543) while the confirmed value stays Gregorian', () => {
    const { screen, onConfirm } = mount();
    screen.showGate();
    const select = screen.root.querySelector<HTMLSelectElement>('.age-gate-birth-year-select');
    const options = [
      ...screen.root.querySelectorAll<HTMLOptionElement>('.age-gate-birth-year-select option'),
    ].filter((o) => o.value !== '');
    const first = options[0];
    expect(first?.value).toBe('2026');
    expect(first?.textContent).toBe('2569'); // 2026 + 543
    expect(select).not.toBeNull();
    if (select !== null) {
      select.value = '2000';
      select.dispatchEvent(new Event('change'));
      screen.root.querySelector<HTMLButtonElement>('.age-gate-confirm')?.click();
      // Confirmed with the raw Gregorian value (2000), never the Buddhist-Era display number (2543).
      expect(onConfirm).toHaveBeenCalledWith(2000);
    }
  });

  it('showUnderage shows the under-min copy and a single back button, hides the gate view', () => {
    const { screen, onUnderageBack } = mount();
    screen.showGate();
    screen.showUnderage();
    expect(screen.root.hidden).toBe(false);
    expect(screen.root.textContent).toContain(getCopyText('age.underMinTitle'));
    const gateView = screen.root.querySelector<HTMLElement>('.age-gate-view');
    expect(gateView?.hidden).toBe(true);
    const backButton = screen.root.querySelector<HTMLButtonElement>('.age-gate-underage-back');
    backButton?.click();
    expect(onUnderageBack).toHaveBeenCalledTimes(1);
  });

  it('hide() hides the whole screen regardless of which view was last shown', () => {
    const { screen } = mount();
    screen.showUnderage();
    screen.hide();
    expect(screen.root.hidden).toBe(true);
  });

  it('repeated showGate() while already open keeps the pick (render() calls it every state change)', () => {
    const { screen } = mount();
    screen.showGate();
    const select = screen.root.querySelector<HTMLSelectElement>('.age-gate-birth-year-select');
    const confirmButton = screen.root.querySelector<HTMLButtonElement>('.age-gate-confirm');
    expect(select).not.toBeNull();
    if (select === null || confirmButton === null) return;
    const firstOption = select.options[1];
    select.value = '2000';
    select.dispatchEvent(new Event('change'));
    screen.showGate();
    screen.showGate();
    expect(select.value).toBe('2000');
    expect(confirmButton.disabled).toBe(false);
    // The option nodes themselves are not rebuilt, so an open native picker is not disturbed.
    expect(select.options[1]).toBe(firstOption);
  });

  it('re-showing the gate resets the previous selection (no stale confirm state)', () => {
    const { screen } = mount();
    screen.showGate();
    const select = screen.root.querySelector<HTMLSelectElement>('.age-gate-birth-year-select');
    const confirmButton = screen.root.querySelector<HTMLButtonElement>('.age-gate-confirm');
    if (select !== null && confirmButton !== null) {
      select.value = '2000';
      select.dispatchEvent(new Event('change'));
      expect(confirmButton.disabled).toBe(false);
    }
    screen.showUnderage();
    screen.showGate();
    expect(screen.root.querySelector<HTMLButtonElement>('.age-gate-confirm')?.disabled).toBe(true);
  });
});
