import { describe, expect, it } from 'vitest';
import { createAudioPlayer } from './audio-player';
import type { AssetRuntime } from './icon-dom';
import type { RuntimeManifest } from './manifest';

interface FakeCue {
  readonly url: string;
  readonly priority: number;
  readonly durationMs: number;
  readonly vibration_ms: readonly number[];
  readonly [field: string]: unknown;
}

function fakeManifest(cues: Readonly<Record<string, FakeCue>>): RuntimeManifest {
  return {
    runtimeVersion: 1,
    avatarRig: 1,
    assets: {},
    fonts: [],
    audio: cues,
    credits: [],
  };
}

function fakeAssets(manifest: RuntimeManifest | undefined): AssetRuntime {
  return { getManifest: () => manifest, basePath: '/kw/', scale: 1, isProduction: false };
}

/** A tiny deterministic timer harness: `setTimer` records `{ run, at }` instead of scheduling a
 * real callback; the test drives time forward explicitly with `runDue`. */
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
    /** Advances the fake clock to `at_ms` and runs every timer due by then, in due-time order. */
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

describe('createAudioPlayer', () => {
  it('plays a known cue immediately and vibrates once for a single-beat pattern', () => {
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
    const player = createAudioPlayer({
      assets: fakeAssets(manifest),
      vibrate: (p) => vibrated.push(p),
      playUrl: (url) => played.push(url),
      now: timers.now,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    player.submit('run.tickGranted', 0);

    expect(played).toEqual(['/kw/audio/run.tickGranted.wav']);
    expect(vibrated).toEqual([45]);
  });

  it('vibrates with the full pattern array for a multi-beat cue', () => {
    const manifest = fakeManifest({
      'run.tickGrantedFirst': {
        url: 'audio/run.tickGrantedFirst.wav',
        priority: 6,
        durationMs: 320,
        vibration_ms: [45, 70, 45, 70, 90],
      },
    });
    const timers = fakeTimers();
    const vibrated: (number | readonly number[])[] = [];
    const player = createAudioPlayer({
      assets: fakeAssets(manifest),
      vibrate: (p) => vibrated.push(p),
      playUrl: () => undefined,
      now: timers.now,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    player.submit('run.tickGrantedFirst', 0);

    expect(vibrated).toEqual([[45, 70, 45, 70, 90]]);
  });

  it('is a silent no-op for an id the manifest does not know', () => {
    const timers = fakeTimers();
    const played: string[] = [];
    const player = createAudioPlayer({
      assets: fakeAssets(undefined),
      vibrate: () => undefined,
      playUrl: (url) => played.push(url),
      now: timers.now,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    expect(() => player.submit('run.tickGranted', 0)).not.toThrow();
    expect(played).toEqual([]);
  });

  it('queues an equal-priority cue behind the one already playing and starts it once the first ends', () => {
    const manifest = fakeManifest({
      'run.tickGranted': {
        url: 'audio/run.tickGranted.wav',
        priority: 6,
        durationMs: 100,
        vibration_ms: [45],
      },
      'drop.rarity.rare': {
        url: 'audio/drop.rarity.rare.wav',
        priority: 6,
        durationMs: 275,
        vibration_ms: [45, 70, 45, 70, 45],
      },
    });
    const timers = fakeTimers();
    const played: string[] = [];
    const player = createAudioPlayer({
      assets: fakeAssets(manifest),
      vibrate: () => undefined,
      playUrl: (url) => played.push(url),
      now: timers.now,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    player.submit('run.tickGranted', 0);
    player.submit('drop.rarity.rare', 0);
    expect(played).toEqual(['/kw/audio/run.tickGranted.wav']);

    timers.advanceTo(100);
    expect(played).toEqual(['/kw/audio/run.tickGranted.wav', '/kw/audio/drop.rarity.rare.wav']);
  });

  it('hard-cuts to a strictly more urgent (lower priority number) cue', () => {
    const manifest = fakeManifest({
      'run.tickGranted': {
        url: 'audio/run.tickGranted.wav',
        priority: 6,
        durationMs: 1000,
        vibration_ms: [45],
      },
      'run.death': {
        url: 'audio/run.death.wav',
        priority: 0,
        durationMs: 870,
        vibration_ms: [150, 120, 600],
      },
    });
    const timers = fakeTimers();
    const played: string[] = [];
    const player = createAudioPlayer({
      assets: fakeAssets(manifest),
      vibrate: () => undefined,
      playUrl: (url) => played.push(url),
      now: timers.now,
      setTimer: timers.setTimer,
      clearTimer: timers.clearTimer,
    });

    player.submit('run.tickGranted', 0);
    player.submit('run.death', 10);
    expect(played).toEqual(['/kw/audio/run.tickGranted.wav', '/kw/audio/run.death.wav']);
  });
});
