// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mountRecoveringBanner } from './recovering-banner';
import { getCopyText } from '../copy/load';
import { formatCopyText } from '../copy/format';

describe('mountRecoveringBanner (F06 copy gate C6-05)', () => {
  it('starts hidden', () => {
    const container = document.createElement('div');
    const banner = mountRecoveringBanner(container);
    expect(banner.root.hidden).toBe(true);
  });

  it('hides when not recovering', () => {
    const container = document.createElement('div');
    const banner = mountRecoveringBanner(container);
    banner.render({ recovering: false, recoveryTo_pct: 50, recoveryTimeLeft_ms: 60_000 });
    expect(banner.root.hidden).toBe(true);
  });

  it('hides when recoveryTimeLeft_ms is null (not recovering, or unknown)', () => {
    const container = document.createElement('div');
    const banner = mountRecoveringBanner(container);
    banner.render({ recovering: true, recoveryTo_pct: 50, recoveryTimeLeft_ms: null });
    expect(banner.root.hidden).toBe(true);
  });

  it('hides when recoveryTimeLeft_ms is 0 (crossing already happened, never shows "0 minutes")', () => {
    const container = document.createElement('div');
    const banner = mountRecoveringBanner(container);
    banner.render({ recovering: true, recoveryTo_pct: 50, recoveryTimeLeft_ms: 0 });
    expect(banner.root.hidden).toBe(true);
  });

  it('hide() hides it regardless of the last render() state', () => {
    const container = document.createElement('div');
    const banner = mountRecoveringBanner(container);
    banner.render({ recovering: true, recoveryTo_pct: 50, recoveryTimeLeft_ms: 90_000 });
    expect(banner.root.hidden).toBe(false);
    banner.hide();
    expect(banner.root.hidden).toBe(true);
  });

  it('shows home.recoveringLabel + home.recoveringDetail with recoverPct/timeLeft filled in', () => {
    const container = document.createElement('div');
    const banner = mountRecoveringBanner(container);
    banner.render({ recovering: true, recoveryTo_pct: 50, recoveryTimeLeft_ms: 90_000 });
    expect(banner.root.hidden).toBe(false);
    expect(banner.root.textContent).toContain(getCopyText('home.recoveringLabel'));
    expect(banner.root.textContent).toContain(
      formatCopyText('home.recoveringDetail', {
        recoverPct: 50,
        timeLeft: formatCopyText('unit.minutes', { value: 2 }), // ceil(90_000 / 60_000) = 2
      }),
    );
  });
});
