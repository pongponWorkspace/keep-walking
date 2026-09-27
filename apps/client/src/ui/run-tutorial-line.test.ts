// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountRunTutorialLine } from './run-tutorial-line';
import { getCopyText } from '../copy/load';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('mountRunTutorialLine', () => {
  it('starts hidden with the canon N-3 line, shows on show(), auto-hides after holdDurationMs', () => {
    const container = document.createElement('div');
    const line = mountRunTutorialLine(container, 3000);
    expect(line.root.hidden).toBe(true);
    expect(line.root.textContent).toBe(getCopyText('dungeon.confirmTutorialLine'));

    line.show();
    expect(line.root.hidden).toBe(false);
    vi.advanceTimersByTime(2999);
    expect(line.root.hidden).toBe(false);
    vi.advanceTimersByTime(1);
    expect(line.root.hidden).toBe(true);
  });

  it('a second show() resets the hold timer instead of stacking', () => {
    const container = document.createElement('div');
    const line = mountRunTutorialLine(container, 1000);
    line.show();
    vi.advanceTimersByTime(900);
    line.show();
    vi.advanceTimersByTime(900);
    expect(line.root.hidden).toBe(false);
    vi.advanceTimersByTime(100);
    expect(line.root.hidden).toBe(true);
  });

  it('hide() cancels the timer and hides immediately', () => {
    const container = document.createElement('div');
    const line = mountRunTutorialLine(container, 1000);
    line.show();
    line.hide();
    expect(line.root.hidden).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(line.root.hidden).toBe(true);
  });
});
