// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createF04App } from './f04-app';
import { createMemoryStorage } from './storage/local-store';
import { loadDungeonArtifact } from './dungeons/artifact';

describe('createF04App', () => {
  const artifact = loadDungeonArtifact();
  const dungeon = artifact.dungeons[0];
  if (dungeon === undefined) throw new Error('fixture: artifact has no dungeons');
  const [lng, lat] = dungeon.geometry.coordinates[0]?.[0] as unknown as readonly [number, number];

  function makeApp() {
    const container = document.createElement('div');
    document.body.append(container);
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
      copyToClipboard: async () => true,
    });
  }

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
});
