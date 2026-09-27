import { describe, expect, it } from 'vitest';
import { createMemoryStorage } from './local-store';
import {
  loadOnboardingStorage,
  readLocationConsent,
  saveOnboardingStorage,
  CONSENT_STORAGE_KEY,
} from './onboarding';
import { applyOnboardingEvent } from '../onboarding/onboarding-step';

const NOOP_QUOTA = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };

describe('loadOnboardingStorage/saveOnboardingStorage', () => {
  it('returns a fresh initial value when nothing has been saved yet', () => {
    const storage = createMemoryStorage();
    const state = loadOnboardingStorage(storage, 1000);
    expect(state).toEqual({
      schemaVersion: 1,
      introSeen: false,
      ageGatePassed: false,
      consentAnswered: false,
      firstOpenAt_ms: 1000,
    });
  });

  it('round-trips a saved value', () => {
    const storage = createMemoryStorage();
    const initial = loadOnboardingStorage(storage, 1000);
    const next = applyOnboardingEvent(initial, { type: 'introSeen' });
    saveOnboardingStorage(storage, next, 2000, NOOP_QUOTA);
    expect(loadOnboardingStorage(storage, 9999)).toEqual(next);
  });

  it('falls back to a fresh value on corrupt JSON, never crashing', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.onboarding', '{not json');
    expect(loadOnboardingStorage(storage, 500).introSeen).toBe(false);
  });
});

describe('readLocationConsent', () => {
  it('reads unanswered when nothing has ever been written', () => {
    expect(readLocationConsent(createMemoryStorage())).toBe('unanswered');
  });

  it('reads granted/declined/withdrawn straight through', () => {
    for (const location of ['granted', 'declined', 'withdrawn'] as const) {
      const storage = createMemoryStorage();
      storage.setItem(
        CONSENT_STORAGE_KEY,
        JSON.stringify({ schemaVersion: 1, savedAt_ms: 1, state: { location } }),
      );
      expect(readLocationConsent(storage)).toBe(location);
    }
  });

  it('reads unanswered on a corrupt or unrecognized value', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, savedAt_ms: 1, state: { location: 'nonsense' } }),
    );
    expect(readLocationConsent(storage)).toBe('unanswered');
  });
});
