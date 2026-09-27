// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountInterestRegister } from './interest-register';
import { createMemoryStorage } from '../storage/local-store';
import { loadInterest } from '../storage/interest';

const NOOP_QUOTA = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };

function mount(onConfirmed = vi.fn(), onClose = vi.fn()) {
  const container = document.createElement('div');
  const storage = createMemoryStorage();
  const screen = mountInterestRegister(container, {
    storage,
    now: () => 1000,
    quotaDeps: NOOP_QUOTA,
    onConfirmed,
    onClose,
  });
  return { container, storage, screen, onConfirmed, onClose };
}

describe('mountInterestRegister (S-09)', () => {
  it('has no free-text input anywhere (R53)', () => {
    const { container } = mount();
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('textarea')).toBeNull();
  });

  it('confirm is disabled until an option is picked', () => {
    const { container, screen } = mount();
    screen.show('district', [
      { groupKey: 'TH-10', options: [{ id: 'chatuchak', label: 'Chatuchak' }] },
    ]);
    const confirm = container.querySelector<HTMLButtonElement>('.interest-confirm');
    expect(confirm?.disabled).toBe(true);
    container.querySelector<HTMLButtonElement>('.interest-option')?.click();
    expect(confirm?.disabled).toBe(false);
  });

  it('confirming persists to storage with no coordinates and calls onConfirmed', () => {
    const { container, storage, screen, onConfirmed } = mount();
    screen.show('district', [
      { groupKey: 'TH-10', options: [{ id: 'chatuchak', label: 'Chatuchak' }] },
    ]);
    container.querySelector<HTMLButtonElement>('.interest-option')?.click();
    container.querySelector<HTMLButtonElement>('.interest-confirm')?.click();
    expect(loadInterest(storage)).toEqual({
      schemaVersion: 1,
      scope: 'district',
      areaId: 'chatuchak',
    });
    expect(onConfirmed).toHaveBeenCalledWith({
      schemaVersion: 1,
      scope: 'district',
      areaId: 'chatuchak',
    });
    const raw = storage.getItem('kw.p2.interest') ?? '';
    expect(raw).not.toMatch(/"lat"|"lng"/);
  });

  it('district scope confirmed line names the chosen area (interest.confirmedArea)', () => {
    const { container, screen } = mount();
    screen.show('district', [
      { groupKey: 'TH-10', options: [{ id: 'chatuchak', label: 'Chatuchak' }] },
    ]);
    container.querySelector<HTMLButtonElement>('.interest-option')?.click();
    container.querySelector<HTMLButtonElement>('.interest-confirm')?.click();
    expect(container.querySelector('.interest-confirmed-line')?.textContent).toContain('Chatuchak');
  });

  it('shows the empty-list copy when every group has zero options', () => {
    const { container, screen } = mount();
    screen.show('district', [{ groupKey: 'TH-10', options: [] }]);
    expect(container.querySelector('.interest-list')?.textContent?.length).toBeGreaterThan(0);
    expect(container.querySelector('.interest-confirm')).not.toBeNull();
  });

  it('hide() sets root.hidden', () => {
    const { screen } = mount();
    screen.show('district', []);
    screen.hide();
    expect(screen.root.hidden).toBe(true);
  });

  it('close button calls onClose', () => {
    const { container, onClose } = mount();
    container.querySelectorAll('button').forEach((b) => {
      if (b.textContent === 'common.close' || b.className.includes('btn-secondary')) b.click();
    });
    expect(onClose).toHaveBeenCalled();
  });
});
