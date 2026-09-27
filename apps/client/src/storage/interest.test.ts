import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from './local-store';
import { loadInterest, saveInterest } from './interest';

const NOOP_QUOTA = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };

describe('interest storage (kw.p2.interest, tech note F06 8.1)', () => {
  it('is null before anything is ever saved', () => {
    expect(loadInterest(createMemoryStorage())).toBeNull();
  });

  it('round-trips a district registration', () => {
    const storage = createMemoryStorage();
    saveInterest(
      storage,
      { schemaVersion: 1, scope: 'district', areaId: 'chatuchak' },
      0,
      NOOP_QUOTA,
    );
    expect(loadInterest(storage)).toEqual({
      schemaVersion: 1,
      scope: 'district',
      areaId: 'chatuchak',
    });
  });

  it('overwrites the previous choice rather than appending (R53: change/withdraw anytime)', () => {
    const storage = createMemoryStorage();
    saveInterest(
      storage,
      { schemaVersion: 1, scope: 'province', areaId: 'nonthaburi' },
      0,
      NOOP_QUOTA,
    );
    saveInterest(
      storage,
      { schemaVersion: 1, scope: 'district', areaId: 'bangKapi' },
      1,
      NOOP_QUOTA,
    );
    expect(loadInterest(storage)).toEqual({
      schemaVersion: 1,
      scope: 'district',
      areaId: 'bangKapi',
    });
  });

  it('never stores a coordinate-shaped field (only scope/areaId)', () => {
    const storage = createMemoryStorage();
    saveInterest(storage, { schemaVersion: 1, scope: 'district', areaId: 'dusit' }, 0, NOOP_QUOTA);
    const raw = storage.getItem('kw.p2.interest') ?? '';
    expect(raw).not.toMatch(/"lat"|"lng"/);
  });

  it('is null (not a crash) on corrupt stored JSON', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.interest', 'not json');
    expect(loadInterest(storage)).toBeNull();
  });
});
