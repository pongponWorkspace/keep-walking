// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { mountTickToast } from './tick-toast';
import { getCopyText } from '../copy/load';
import type { AssetRuntime } from '../assets/icon-dom';
import type { AudioPlayer } from '../assets/audio-player';

const NO_MANIFEST_ASSETS: AssetRuntime = {
  getManifest: () => undefined,
  basePath: '/kw/',
  scale: 1,
  isProduction: false,
};

function fakeAudio(): { submitted: { cueId: string; at: number }[]; audio: AudioPlayer } {
  const submitted: { cueId: string; at: number }[] = [];
  return { submitted, audio: { submit: (cueId, at) => submitted.push({ cueId, at }) } };
}

describe('mountTickToast', () => {
  it('shows the plain granted copy and submits the tick cue, with no loot row for an empty tick', () => {
    const container = document.createElement('div');
    const { submitted, audio } = fakeAudio();
    const toast = mountTickToast(container, {
      assets: NO_MANIFEST_ASSETS,
      audio,
      holdDurationMs: 1000,
      maxIconsShown: 3,
      hpLowHoldDurationMs: 3200,
    });

    toast.showGranted({ loot: [], firstEver: false, levelBefore: 1, levelAfter: 1, at_ms: 0 });

    const el = container.querySelector('.toast');
    expect(el).not.toBeNull();
    expect(el?.className).not.toMatch(/faded/);
    expect(el?.querySelector('.toast-loot-row')).toBeNull();
    expect(submitted).toEqual([{ cueId: 'run.tickGranted', at: 0 }]);
  });

  it('uses the first-tick copy and a level-up line, never a different code path for the reward itself', () => {
    const container = document.createElement('div');
    const { submitted, audio } = fakeAudio();
    const toast = mountTickToast(container, {
      assets: NO_MANIFEST_ASSETS,
      audio,
      holdDurationMs: 1000,
      maxIconsShown: 3,
      hpLowHoldDurationMs: 3200,
    });

    toast.showGranted({
      loot: [{ id: 'elementDust', qty: 1 }],
      firstEver: true,
      levelBefore: 1,
      levelAfter: 2,
      at_ms: 500,
    });

    const el = container.querySelector('.toast');
    expect(el?.querySelector('.toast-level-up')).not.toBeNull();
    expect(el?.querySelectorAll('.toast-loot-row .item-icon-frame').length).toBe(1);
    expect(submitted[0]).toEqual({ cueId: 'run.tickGrantedFirst', at: 500 });
  });

  it('F05-N1: run.tickGrantedFirst and run.continueCta render as two separate lines, not one joined string', () => {
    const container = document.createElement('div');
    const { audio } = fakeAudio();
    const toast = mountTickToast(container, {
      assets: NO_MANIFEST_ASSETS,
      audio,
      holdDurationMs: 1000,
      maxIconsShown: 3,
      hpLowHoldDurationMs: 3200,
    });

    toast.showGranted({ loot: [], firstEver: true, levelBefore: 1, levelAfter: 1, at_ms: 0 });

    const el = container.querySelector('.toast');
    const lines = el?.querySelectorAll('.toast-line');
    expect(lines?.length).toBe(2);
    expect(lines?.[0]?.textContent).toBe(getCopyText('run.tickGrantedFirst'));
    expect(lines?.[1]?.textContent).toBe(getCopyText('run.continueCta'));
  });

  it('caps loot icons at maxIconsShown and submits the highest known rarity bonus cue', () => {
    const container = document.createElement('div');
    const { submitted, audio } = fakeAudio();
    const toast = mountTickToast(container, {
      assets: NO_MANIFEST_ASSETS,
      audio,
      holdDurationMs: 1000,
      maxIconsShown: 2,
      hpLowHoldDurationMs: 3200,
    });

    toast.showGranted({
      loot: [
        { id: 'elementDust', qty: 1 }, // common
        { id: 'elementCore', qty: 1 }, // uncommon
        { id: 'riftStone', qty: 1 }, // rare
      ],
      firstEver: false,
      levelBefore: 3,
      levelAfter: 3,
      at_ms: 10,
    });

    const el = container.querySelector('.toast');
    expect(el?.querySelectorAll('.toast-loot-row .item-icon-frame').length).toBe(2);
    // Highest rarity (rare) shown first, and its bonus cue submitted after the tick cue.
    expect(submitted).toEqual([
      { cueId: 'run.tickGranted', at: 10 },
      { cueId: 'drop.rarity.rare', at: 10 },
    ]);
  });

  it('shows the faded denied toast and submits the denied cue, no loot row ever', () => {
    const container = document.createElement('div');
    const { submitted, audio } = fakeAudio();
    const toast = mountTickToast(container, {
      assets: NO_MANIFEST_ASSETS,
      audio,
      holdDurationMs: 1000,
      maxIconsShown: 3,
      hpLowHoldDurationMs: 3200,
    });

    toast.showDenied({ at_ms: 20 });

    const el = container.querySelector('.toast');
    expect(el?.className).toContain('faded');
    expect(el?.querySelector('.toast-loot-row')).toBeNull();
    expect(submitted).toEqual([{ cueId: 'run.tickDenied', at: 20 }]);
  });

  it('a new toast replaces whatever was still showing (never stacks two at once)', () => {
    vi.useFakeTimers();
    try {
      const container = document.createElement('div');
      const { audio } = fakeAudio();
      const toast = mountTickToast(container, {
        assets: NO_MANIFEST_ASSETS,
        audio,
        holdDurationMs: 1000,
        maxIconsShown: 3,
        hpLowHoldDurationMs: 3200,
      });
      toast.showDenied({ at_ms: 0 });
      expect(container.querySelectorAll('.toast').length).toBe(1);
      toast.showGranted({ loot: [], firstEver: false, levelBefore: 1, levelAfter: 1, at_ms: 1 });
      expect(container.querySelectorAll('.toast').length).toBe(1);
      expect(container.querySelector('.toast')?.className).not.toMatch(/faded/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('showHpLow: the canon copy, .danger class, and the run.hpLow cue at its own (longer) hold time', () => {
    vi.useFakeTimers();
    try {
      const container = document.createElement('div');
      const { submitted, audio } = fakeAudio();
      const toast = mountTickToast(container, {
        assets: NO_MANIFEST_ASSETS,
        audio,
        holdDurationMs: 1000,
        maxIconsShown: 3,
        hpLowHoldDurationMs: 3200,
      });

      toast.showHpLow(42);

      const el = container.querySelector('.toast');
      expect(el?.className).toContain('danger');
      expect(el?.textContent).toBe(getCopyText('run.hpLow'));
      expect(submitted).toEqual([{ cueId: 'run.hpLow', at: 42 }]);

      // Still up just before its own (longer) hold elapses...
      vi.advanceTimersByTime(3199);
      expect(container.querySelector('.toast')).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('showAutoPotionUsed: faded toast, fixed copy (no {itemId} variable), submits run.autoPotionUsed', () => {
    const container = document.createElement('div');
    const { submitted, audio } = fakeAudio();
    const toast = mountTickToast(container, {
      assets: NO_MANIFEST_ASSETS,
      audio,
      holdDurationMs: 1000,
      maxIconsShown: 3,
      hpLowHoldDurationMs: 3200,
    });

    toast.showAutoPotionUsed('hpSmall', 7);

    const el = container.querySelector('.toast');
    expect(el?.className).toContain('faded');
    expect(el?.textContent).toBe(getCopyText('run.autoPotionUsed'));
    expect(submitted).toEqual([{ cueId: 'run.autoPotionUsed', at: 7 }]);
  });

  it('C-12: showStateResumed shows the run.stateResumed toast', () => {
    const container = document.createElement('div');
    const { audio } = fakeAudio();
    const toast = mountTickToast(container, {
      assets: NO_MANIFEST_ASSETS,
      audio,
      holdDurationMs: 1000,
      maxIconsShown: 3,
      hpLowHoldDurationMs: 3200,
    });

    toast.showStateResumed(3);

    const el = container.querySelector('.toast');
    expect(el?.textContent).toBe(getCopyText('run.stateResumed'));
  });

  // P2-H39 (design/ux/components.md 15.4): the pocket screen overlay hides the visible toast/vfx,
  // but audio/vibration must always fire.
  describe('isPocketOverlayShowing', () => {
    it('showGranted: no .toast DOM while the overlay is showing, but the cue(s) still submit', () => {
      const container = document.createElement('div');
      const { submitted, audio } = fakeAudio();
      const toast = mountTickToast(container, {
        assets: NO_MANIFEST_ASSETS,
        audio,
        holdDurationMs: 1000,
        maxIconsShown: 3,
        hpLowHoldDurationMs: 3200,
        isPocketOverlayShowing: () => true,
      });

      toast.showGranted({
        loot: [{ id: 'riftStone', qty: 1 }],
        firstEver: false,
        levelBefore: 1,
        levelAfter: 1,
        at_ms: 5,
      });

      expect(container.querySelector('.toast')).toBeNull();
      expect(submitted).toEqual([
        { cueId: 'run.tickGranted', at: 5 },
        { cueId: 'drop.rarity.rare', at: 5 },
      ]);
    });

    it('showDenied: no .toast DOM, cue still submits', () => {
      const container = document.createElement('div');
      const { submitted, audio } = fakeAudio();
      const toast = mountTickToast(container, {
        assets: NO_MANIFEST_ASSETS,
        audio,
        holdDurationMs: 1000,
        maxIconsShown: 3,
        hpLowHoldDurationMs: 3200,
        isPocketOverlayShowing: () => true,
      });

      toast.showDenied({ at_ms: 6 });

      expect(container.querySelector('.toast')).toBeNull();
      expect(submitted).toEqual([{ cueId: 'run.tickDenied', at: 6 }]);
    });

    it('showHpLow: no .toast DOM, cue still submits', () => {
      const container = document.createElement('div');
      const { submitted, audio } = fakeAudio();
      const toast = mountTickToast(container, {
        assets: NO_MANIFEST_ASSETS,
        audio,
        holdDurationMs: 1000,
        maxIconsShown: 3,
        hpLowHoldDurationMs: 3200,
        isPocketOverlayShowing: () => true,
      });

      toast.showHpLow(7);

      expect(container.querySelector('.toast')).toBeNull();
      expect(submitted).toEqual([{ cueId: 'run.hpLow', at: 7 }]);
    });

    it('showAutoPotionUsed: no .toast DOM, cue still submits', () => {
      const container = document.createElement('div');
      const { submitted, audio } = fakeAudio();
      const toast = mountTickToast(container, {
        assets: NO_MANIFEST_ASSETS,
        audio,
        holdDurationMs: 1000,
        maxIconsShown: 3,
        hpLowHoldDurationMs: 3200,
        isPocketOverlayShowing: () => true,
      });

      toast.showAutoPotionUsed('hpSmall', 8);

      expect(container.querySelector('.toast')).toBeNull();
      expect(submitted).toEqual([{ cueId: 'run.autoPotionUsed', at: 8 }]);
    });

    it('showStateResumed: no .toast DOM (no cue exists for this one either way)', () => {
      const container = document.createElement('div');
      const { audio } = fakeAudio();
      const toast = mountTickToast(container, {
        assets: NO_MANIFEST_ASSETS,
        audio,
        holdDurationMs: 1000,
        maxIconsShown: 3,
        hpLowHoldDurationMs: 3200,
        isPocketOverlayShowing: () => true,
      });

      toast.showStateResumed(9);

      expect(container.querySelector('.toast')).toBeNull();
    });

    it('a toast shown while covered, then revealed by a later call once the overlay lifts, mounts normally', () => {
      const container = document.createElement('div');
      const { audio } = fakeAudio();
      let overlayShowing = true;
      const toast = mountTickToast(container, {
        assets: NO_MANIFEST_ASSETS,
        audio,
        holdDurationMs: 1000,
        maxIconsShown: 3,
        hpLowHoldDurationMs: 3200,
        isPocketOverlayShowing: () => overlayShowing,
      });

      toast.showDenied({ at_ms: 0 });
      expect(container.querySelector('.toast')).toBeNull();

      overlayShowing = false;
      toast.showGranted({ loot: [], firstEver: false, levelBefore: 1, levelAfter: 1, at_ms: 1 });
      expect(container.querySelector('.toast')).not.toBeNull();
    });
  });

  describe('hideScreenLockNotice (N2-02, F06 copy gate)', () => {
    it('calls hideScreenLockNotice once a new toast actually mounts', () => {
      const container = document.createElement('div');
      const { audio } = fakeAudio();
      const hideScreenLockNotice = vi.fn();
      const toast = mountTickToast(container, {
        assets: NO_MANIFEST_ASSETS,
        audio,
        holdDurationMs: 1000,
        maxIconsShown: 3,
        hpLowHoldDurationMs: 3200,
        hideScreenLockNotice,
      });

      toast.showGranted({ loot: [], firstEver: false, levelBefore: 1, levelAfter: 1, at_ms: 0 });

      expect(hideScreenLockNotice).toHaveBeenCalledTimes(1);
    });

    it('never calls hideScreenLockNotice while the pocket overlay hides the toast (nothing visually overlaps)', () => {
      const container = document.createElement('div');
      const { audio } = fakeAudio();
      const hideScreenLockNotice = vi.fn();
      const toast = mountTickToast(container, {
        assets: NO_MANIFEST_ASSETS,
        audio,
        holdDurationMs: 1000,
        maxIconsShown: 3,
        hpLowHoldDurationMs: 3200,
        isPocketOverlayShowing: () => true,
        hideScreenLockNotice,
      });

      toast.showDenied({ at_ms: 0 });

      expect(hideScreenLockNotice).not.toHaveBeenCalled();
    });

    it('is optional: every existing caller/test with no pocket screen keeps working unchanged', () => {
      const container = document.createElement('div');
      const { audio } = fakeAudio();
      const toast = mountTickToast(container, {
        assets: NO_MANIFEST_ASSETS,
        audio,
        holdDurationMs: 1000,
        maxIconsShown: 3,
        hpLowHoldDurationMs: 3200,
      });

      expect(() =>
        toast.showGranted({ loot: [], firstEver: false, levelBefore: 1, levelAfter: 1, at_ms: 0 }),
      ).not.toThrow();
    });
  });

  it('an hp-low toast replaces a still-showing tick toast (one shared slot, F06-R16)', () => {
    const container = document.createElement('div');
    const { audio } = fakeAudio();
    const toast = mountTickToast(container, {
      assets: NO_MANIFEST_ASSETS,
      audio,
      holdDurationMs: 1000,
      maxIconsShown: 3,
      hpLowHoldDurationMs: 3200,
    });
    toast.showGranted({ loot: [], firstEver: false, levelBefore: 1, levelAfter: 1, at_ms: 0 });
    toast.showHpLow(1);
    expect(container.querySelectorAll('.toast').length).toBe(1);
    expect(container.querySelector('.toast')?.className).toContain('danger');
  });
});
