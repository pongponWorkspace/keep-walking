// createCueFeedback / safeVibrate (audio/cue-list.md sections 4, 4.4). Fixtures mirror
// assets/audio-player.test.ts (the module this one wraps) so the two stay comparable.
import { describe, expect, it } from 'vitest';
import { createCueFeedback, safeVibrate } from './cue-feedback';
import type { AssetRuntime } from '../assets/icon-dom';
import type { RuntimeManifest } from '../assets/manifest';

interface FakeCue {
  readonly url: string;
  readonly priority: number;
  readonly durationMs: number;
  readonly [field: string]: unknown;
}

function fakeManifest(cues: Readonly<Record<string, FakeCue>>): RuntimeManifest {
  return { runtimeVersion: 1, avatarRig: 1, assets: {}, fonts: [], audio: cues, credits: [] };
}

function fakeAssets(manifest: RuntimeManifest | undefined): AssetRuntime {
  return { getManifest: () => manifest, basePath: '/kw/', scale: 1, isProduction: false };
}

function fakeTimers() {
  let now = 0;
  let nextHandle = 1;
  const scheduled = new Map<number, { readonly run: () => void; readonly at: number }>();
  return {
    now: () => now,
    setTimer: (run: () => void, delay_ms: number): number => {
      const handle = nextHandle;
      nextHandle += 1;
      scheduled.set(handle, { run, at: now + delay_ms });
      return handle;
    },
    clearTimer: (handle: number): void => {
      scheduled.delete(handle);
    },
    advanceTo(at_ms: number): void {
      now = at_ms;
      for (const [handle, entry] of Array.from(scheduled.entries())) {
        if (entry.at <= now) {
          scheduled.delete(handle);
          entry.run();
        }
      }
    },
  };
}

describe('safeVibrate', () => {
  it('is a silent no-op when navigator.vibrate is missing (iOS Safari/WebKit, cue-list 4.4)', () => {
    expect(() => safeVibrate({})(45)).not.toThrow();
  });

  it('forwards the pattern verbatim when navigator.vibrate exists', () => {
    const calls: (number | readonly number[])[] = [];
    const vibrate = safeVibrate({
      vibrate: (p) => {
        calls.push(p);
        return true;
      },
    });
    vibrate([45, 70, 45]);
    expect(calls).toEqual([[45, 70, 45]]);
  });
});

describe('createCueFeedback', () => {
  it('fires visual, vibration and sound together for one cue (the fire-together unit)', () => {
    const manifest = fakeManifest({
      'run.tickGranted': {
        url: 'audio/run.tickGranted.wav',
        priority: 6,
        durationMs: 45,
        vibration_ms: [45],
      },
    });
    const timers = fakeTimers();
    const played: string[] = [];
    const vibrated: (number | readonly number[])[] = [];
    const shown: string[] = [];
    const feedback = createCueFeedback({
      assets: fakeAssets(manifest),
      nav: {
        vibrate: (p) => {
          vibrated.push(p);
          return true;
        },
      },
      showVisual: (cueId) => shown.push(cueId),
      playUrl: (url) => played.push(url),
      now: timers.now,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    feedback.submit('run.tickGranted', 0);

    expect(played).toEqual(['/kw/audio/run.tickGranted.wav']);
    expect(vibrated).toEqual([45]);
    expect(shown).toEqual(['run.tickGranted']);
  });

  it('still fires the visual and sound legs when navigator.vibrate is missing (cue-list 4.4)', () => {
    const manifest = fakeManifest({
      'run.death': {
        url: 'audio/run.death.wav',
        priority: 0,
        durationMs: 870,
        vibration_ms: [150, 120, 600],
      },
    });
    const timers = fakeTimers();
    const played: string[] = [];
    const shown: string[] = [];
    const feedback = createCueFeedback({
      assets: fakeAssets(manifest),
      nav: {},
      showVisual: (cueId) => shown.push(cueId),
      playUrl: (url) => played.push(url),
      now: timers.now,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    expect(() => feedback.submit('run.death', 0)).not.toThrow();
    expect(played).toEqual(['/kw/audio/run.death.wav']);
    expect(shown).toEqual(['run.death']);
  });

  it('shows the visual for a queued cue only once the queue actually starts it, not at submit time', () => {
    const manifest = fakeManifest({
      'run.tickGranted': { url: 'audio/run.tickGranted.wav', priority: 6, durationMs: 100 },
      'drop.rarity.rare': { url: 'audio/drop.rarity.rare.wav', priority: 6, durationMs: 275 },
    });
    const timers = fakeTimers();
    const shown: string[] = [];
    const feedback = createCueFeedback({
      assets: fakeAssets(manifest),
      nav: {},
      showVisual: (cueId) => shown.push(cueId),
      playUrl: () => undefined,
      now: timers.now,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    feedback.submit('run.tickGranted', 0);
    feedback.submit('drop.rarity.rare', 0);
    expect(shown).toEqual(['run.tickGranted']);

    timers.advanceTo(100);
    expect(shown).toEqual(['run.tickGranted', 'drop.rarity.rare']);
  });

  it('a safety cue hard-cuts the visual too (its own showVisual fires immediately)', () => {
    const manifest = fakeManifest({
      'run.tickGranted': { url: 'audio/run.tickGranted.wav', priority: 6, durationMs: 1000 },
      'run.death': { url: 'audio/run.death.wav', priority: 0, durationMs: 870 },
    });
    const timers = fakeTimers();
    const shown: string[] = [];
    const feedback = createCueFeedback({
      assets: fakeAssets(manifest),
      nav: {},
      showVisual: (cueId) => shown.push(cueId),
      playUrl: () => undefined,
      now: timers.now,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    feedback.submit('run.tickGranted', 0);
    feedback.submit('run.death', 10);
    expect(shown).toEqual(['run.tickGranted', 'run.death']);
  });

  it('is a silent no-op for an id the manifest does not know (never blocks gameplay)', () => {
    const timers = fakeTimers();
    const shown: string[] = [];
    const feedback = createCueFeedback({
      assets: fakeAssets(undefined),
      nav: {},
      showVisual: (cueId) => shown.push(cueId),
      playUrl: () => undefined,
      now: timers.now,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    expect(() => feedback.submit('run.tickGranted', 0)).not.toThrow();
    expect(shown).toEqual([]);
  });
});
