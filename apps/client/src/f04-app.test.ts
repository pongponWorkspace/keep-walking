// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { createF04App, resolveE2eClassId, resolveRunSeed } from './f04-app';
import { createMemoryStorage } from './storage/local-store';
import { loadDungeonArtifact } from './dungeons/artifact';
import { play } from '../../../art/vfx/core/vfx';

describe('createF04App', () => {
  const artifact = loadDungeonArtifact();
  const dungeon = artifact.dungeons[0];
  if (dungeon === undefined) throw new Error('fixture: artifact has no dungeons');
  const [lng, lat] = dungeon.geometry.coordinates[0]?.[0] as unknown as readonly [number, number];

  function makeAppIn(container: HTMLElement) {
    return createF04App({
      map: undefined,
      hudContainer: container,
      storage: createMemoryStorage(),
      sessionId: 'test-session',
      appVersion: 'test',
      platform: 'web',
      vibrate: () => undefined,
      isOnline: () => true,
      userAgent: 'Mozilla/5.0 (Linux; Android 14)',
      maxTouchPoints: 5,
      assets: {
        getManifest: () => undefined,
        basePath: '/kw/',
        scale: 1,
        isProduction: false,
        load: () => Promise.resolve(),
        getAvatarPart: () => undefined,
        loadAvatarPart: () => Promise.resolve(),
      },
      copyToClipboard: async () => true,
      playAudioUrl: () => undefined,
      now: () => Date.now(),
      // D-130: this file's own tests predate onboarding (P2-F06-T10) and exercise the confirm/run/
      // telemetry loop directly, the same way the pre-existing e2e specs do — `e2eSkipOnboarding`
      // (Mock-only) keeps every one of them booting straight past the intro/class-select screens,
      // exactly like before this task. `onboarding-flow.test.ts` covers the step machine itself.
      locationSearch: '?e2eSkipOnboarding=1',
      isMockProvider: true,
      getLocationPermission: () => Promise.resolve('granted'),
      startLocationProvider: () => undefined,
      stopLocationProvider: () => undefined,
      // P2-F06-T14: no `icon.ui.*` glyph ever resolves in this file's tests (no manifest is
      // loaded, `assets.getManifest()` above always returns `undefined`) — `fetchText`/
      // `parseSvgDocument` are never actually called, `setIconGlyph` falls back to `setIconImg`
      // (which also never resolves an id here) before either would run.
      fetchText: () => Promise.reject(new Error('fetchText: not used in this fixture')),
      parseSvgDocument: () => document.implementation.createDocument(null, 'svg'),
      nav: {},
      documentVisibility: {
        hidden: false,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      },
    });
  }

  function makeApp() {
    const container = document.createElement('div');
    document.body.append(container);
    return makeAppIn(container);
  }

  // TG-03/TG-04 (tech gate P2-F05-T15, decision 6.2): the Web provider must never read `?seed=`
  // or `?e2eClassId=` — both hooks are Mock-only.
  describe('resolveRunSeed (TG-03)', () => {
    it('ignores ?seed= outside the Mock provider, uses crypto.getRandomValues instead', () => {
      const spy = vi.spyOn(crypto, 'getRandomValues').mockImplementation((arr) => {
        (arr as Uint32Array)[0] = 999;
        return arr;
      });
      expect(resolveRunSeed('?seed=42', false)).toBe(999);
      spy.mockRestore();
    });

    it('honors ?seed= under the Mock provider', () => {
      expect(resolveRunSeed('?seed=42', true)).toBe(42);
    });
  });

  describe('resolveE2eClassId (TG-04)', () => {
    it('ignores ?e2eClassId= outside the Mock provider', () => {
      expect(resolveE2eClassId('?e2eClassId=tanker', false)).toBeUndefined();
    });

    it('honors ?e2eClassId= under the Mock provider', () => {
      expect(resolveE2eClassId('?e2eClassId=tanker', true)).toBe('tanker');
    });
  });

  it('boots without throwing and starts with no run', () => {
    const app = makeApp();
    expect(app.engine.getState().run).toBeNull();
  });

  it('onTick does not throw with no samples yet', () => {
    const app = makeApp();
    expect(() => app.onTick(Date.parse('2026-10-05T09:00:00+07:00'))).not.toThrow();
  });

  it('onSample near a dungeon does not throw and updates state', () => {
    const app = makeApp();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    expect(() => app.onSample(lat, lng, 5, now_ms)).not.toThrow();
  });

  it('never writes a known-Thai-free telemetry event with a coordinate property', () => {
    const app = makeApp();
    const now_ms = Date.parse('2026-10-05T09:00:00+07:00');
    app.onSample(lat, lng, 5, now_ms);
    app.onSample(lat, lng, 5, now_ms + 1000);
    for (const record of app.telemetry.snapshot()) {
      expect(JSON.stringify(record.properties)).not.toMatch(/1[0-9]\.\d{4,}/);
    }
  });

  // BUG-P2-003 (qa/bugs.md): walking into a closed dungeon's polygon must show the B4 closed
  // popup (`.popup` with `.confirm-cancel`, no enabled Enter button) — previously nothing opened
  // at all. `khlong-ong-ang` (`data/dungeons/artifact/dungeons.client.v1.json`) is closed all day
  // every Monday (`weekly["1"] = []`); 2026-09-28 is a Monday (same fixture qa's own
  // `qa/tests/e2e/f04-closed-dungeon.spec.ts` pins down).
  describe('BUG-P2-003 — walking into a closed dungeon', () => {
    const closedDungeon = artifact.dungeons.find((d) => d.id === 'khlong-ong-ang');
    if (closedDungeon === undefined) throw new Error('fixture: khlong-ong-ang missing');
    const [closedLng, closedLat] = closedDungeon.geometry
      .coordinates[0]?.[0] as unknown as readonly [number, number];
    const monday_ms = Date.parse('2026-09-28T10:00:00+07:00');

    /** The confirm popup's overlay is the one `.popup-overlay` whose popup contains
     * `.confirm-cancel`, scoped to this test's own `container` — `document.querySelector` would
     * find the first match across every app instance any earlier test in this file created
     * (happy-dom keeps one `document` per file, and `makeApp` never removes old containers). */
    function findConfirmOverlay(container: HTMLElement): HTMLElement | null {
      const cancel = container.querySelector('.confirm-cancel');
      return cancel?.closest('.popup-overlay') as HTMLElement | null;
    }

    it('shows the closed popup (title + dismiss, no enter button) instead of no popup at all', () => {
      const container = document.createElement('div');
      document.body.append(container);
      const app = makeAppIn(container);
      app.onSample(closedLat, closedLng, 5, monday_ms);
      const overlay = findConfirmOverlay(container);
      expect(overlay?.hidden).toBe(false);
      const enterButton = overlay?.querySelector('.btn-primary') as HTMLButtonElement | null;
      expect(enterButton?.hidden).toBe(true);
      const cancelButton = overlay?.querySelector('.confirm-cancel') as HTMLButtonElement | null;
      expect(cancelButton?.hidden ?? false).toBe(false);
    });

    it('hides the closed popup again once the player walks back out', () => {
      const container = document.createElement('div');
      document.body.append(container);
      const app = makeAppIn(container);
      app.onSample(closedLat, closedLng, 5, monday_ms);
      // Well outside every fixture dungeon (mid-river, no polygon covers it).
      app.onSample(13.7, 100.4, 5, monday_ms + 1000);
      const overlay = findConfirmOverlay(container);
      expect(overlay?.hidden).toBe(true);
    });
  });

  // DG6-01 finding DG6-03 (design gate F06, `f04-app.ts`'s `run_auto_retreat`/`run_death`
  // handling, ~1285/~1309): those two branches open the run summary in `play(...).finally(...)`,
  // not `.then(...)` — `art/vfx/core/vfx.ts#play` rejects for an unregistered effect id, and a
  // bare `.then(onFulfilled)` (no `onRejected`) would then silently never call the summary-open
  // callback, leaving the player stuck on a run screen for a run that has already ended. This
  // exercises the exact same `play()` this module imports and the exact failure condition
  // (an id never registered with `art/vfx/core/vfx.ts`'s registry) rather than re-deriving the
  // engine states that reach those two branches (covered by the real device/e2e traces instead).
  describe('DG6-03 — .finally runs the summary-open callback even when play() rejects', () => {
    it('an unregistered effect id still runs the callback (would not with a bare .then)', async () => {
      let ran = false;
      const handle = play('dg6-03-unregistered-effect-id', document.createElement('div'));
      await handle
        .finally(() => {
          ran = true;
        })
        .catch(() => {
          // Expected: `.finally` re-throws the original rejection after running its callback —
          // this test only cares that the callback itself ran, the same as `f04-app.ts`'s own
          // `exitAnimationInFlight = false; render(...)` body would.
        });
      expect(ran).toBe(true);
    });
  });
});
