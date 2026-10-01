import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from './local-store';
import { ACCOUNT_STORAGE_KEY, loadAccount, saveAccount, signOut } from './account';

const NOOP_QUOTA = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };

describe('storage/account', () => {
  it('loadAccount returns null before any write', () => {
    expect(loadAccount(createMemoryStorage())).toBeNull();
  });

  it('round-trips a saved account', () => {
    const storage = createMemoryStorage();
    saveAccount(storage, { provider: 'google', signedIn: true }, 1000, NOOP_QUOTA);
    expect(loadAccount(storage)).toEqual({ provider: 'google', signedIn: true });
  });

  it('rejects a corrupt value (fail-honest, treated as no account)', () => {
    const storage = createMemoryStorage();
    storage.setItem(ACCOUNT_STORAGE_KEY, 'not json');
    expect(loadAccount(storage)).toBeNull();
  });

  it('rejects an object with an extra key (R13/R41/R49: no future field sneaks in unnoticed)', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        savedAt_ms: 1000,
        state: { provider: 'google', signedIn: true, email: 'leak@example.com' },
      }),
    );
    expect(loadAccount(storage)).toBeNull();
  });

  it('rejects an unknown provider value', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        savedAt_ms: 1000,
        state: { provider: 'facebook', signedIn: true },
      }),
    );
    expect(loadAccount(storage)).toBeNull();
  });

  describe('signOut', () => {
    it('flips signedIn to false, keeping the same provider (R41, D-158)', () => {
      const storage = createMemoryStorage();
      saveAccount(storage, { provider: 'apple', signedIn: true }, 1000, NOOP_QUOTA);
      signOut(storage, 2000, NOOP_QUOTA);
      expect(loadAccount(storage)).toEqual({ provider: 'apple', signedIn: false });
    });

    it('is a no-op with no account yet', () => {
      const storage = createMemoryStorage();
      signOut(storage, 2000, NOOP_QUOTA);
      expect(loadAccount(storage)).toBeNull();
    });

    it('is a no-op when already signed out', () => {
      const storage = createMemoryStorage();
      saveAccount(storage, { provider: 'email', signedIn: false }, 1000, NOOP_QUOTA);
      signOut(storage, 2000, NOOP_QUOTA);
      expect(loadAccount(storage)).toEqual({ provider: 'email', signedIn: false });
    });
  });
});
