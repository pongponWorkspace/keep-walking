import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from './local-store';
import { CHARACTER_STORAGE_KEY, loadCharacter, markStoryDone, saveCharacter } from './character';

const NOOP_QUOTA = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };

describe('storage/character', () => {
  it('loadCharacter returns null before any write', () => {
    expect(loadCharacter(createMemoryStorage())).toBeNull();
  });

  it('round-trips a saved character', () => {
    const storage = createMemoryStorage();
    saveCharacter(storage, { name: 'player-one', storyDone: false }, 1000, NOOP_QUOTA);
    expect(loadCharacter(storage)).toEqual({ name: 'player-one', storyDone: false });
  });

  it('rejects a corrupt value (fail-honest, treated as no character)', () => {
    const storage = createMemoryStorage();
    storage.setItem(CHARACTER_STORAGE_KEY, 'not json');
    expect(loadCharacter(storage)).toBeNull();
  });

  it('rejects an object with an extra key', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      CHARACTER_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        savedAt_ms: 1000,
        state: { name: 'x', storyDone: false, classId: 'tanker' },
      }),
    );
    expect(loadCharacter(storage)).toBeNull();
  });

  describe('markStoryDone', () => {
    it('flips storyDone to true, keeping the same name (R27)', () => {
      const storage = createMemoryStorage();
      saveCharacter(storage, { name: 'player-two', storyDone: false }, 1000, NOOP_QUOTA);
      markStoryDone(storage, 2000, NOOP_QUOTA);
      expect(loadCharacter(storage)).toEqual({ name: 'player-two', storyDone: true });
    });

    it('is a no-op with no character yet', () => {
      const storage = createMemoryStorage();
      markStoryDone(storage, 2000, NOOP_QUOTA);
      expect(loadCharacter(storage)).toBeNull();
    });

    it('is a no-op when already done', () => {
      const storage = createMemoryStorage();
      saveCharacter(storage, { name: 'player-three', storyDone: true }, 1000, NOOP_QUOTA);
      markStoryDone(storage, 2000, NOOP_QUOTA);
      expect(loadCharacter(storage)).toEqual({ name: 'player-three', storyDone: true });
    });
  });
});
