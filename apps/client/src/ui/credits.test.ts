// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mountCredits } from './credits';

describe('mountCredits', () => {
  it('is hidden until show() is called', () => {
    const container = document.createElement('div');
    const screen = mountCredits(container, () => undefined);
    expect(screen.root.hidden).toBe(true);
    screen.show();
    expect(screen.root.hidden).toBe(false);
  });

  it('renders at least one group heading and one entry link', () => {
    const container = document.createElement('div');
    const screen = mountCredits(container, () => undefined);
    screen.show();
    expect(screen.root.querySelectorAll('h2').length).toBeGreaterThan(0);
    expect(screen.root.querySelectorAll('.credits-entry a').length).toBeGreaterThan(0);
  });

  it('calls onClose when the close button is clicked', () => {
    const container = document.createElement('div');
    let closed = false;
    const screen = mountCredits(container, () => {
      closed = true;
    });
    screen.show();
    (screen.root.querySelector('button') as HTMLButtonElement).click();
    expect(closed).toBe(true);
  });

  it('every attribution link opens safely (target=_blank, noopener, no-referrer)', () => {
    const container = document.createElement('div');
    const screen = mountCredits(container, () => undefined);
    screen.show();
    for (const link of Array.from(screen.root.querySelectorAll('a'))) {
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
      expect(link.referrerPolicy).toBe('no-referrer');
    }
  });
});
