import { describe, expect, it, vi } from 'vitest';
import { resolveStringList } from '@keep-walking/shared/character';
import characterNamesThJson from '../../../../config/content/character-names.th.json';
import { balanceCharacterNameParamsConfig } from '../config/balance';
import { createMemoryStorage } from '../storage/local-store';
import { loadAccount } from '../storage/account';
import { loadCharacter } from '../storage/character';
import { seedE2eSkipOnboardingAccount } from './e2e-skip-seed';

const NOOP_QUOTA = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };

describe('seedE2eSkipOnboardingAccount', () => {
  it('writes a signed-in account and a storyDone character when neither key exists', () => {
    const storage = createMemoryStorage();
    seedE2eSkipOnboardingAccount(storage, 1000, NOOP_QUOTA);
    expect(loadAccount(storage)).toEqual({ provider: 'google', signedIn: true });
    const character = loadCharacter(storage);
    expect(character?.storyDone).toBe(true);
    expect(typeof character?.name).toBe('string');
    expect(character?.name.length).toBeGreaterThan(0);
  });

  it('seeds the first entry of the config/balance/character.json#random.fallbackKey list', () => {
    const storage = createMemoryStorage();
    seedE2eSkipOnboardingAccount(storage, 1000, NOOP_QUOTA);
    const fallbackNames = resolveStringList(
      characterNamesThJson,
      balanceCharacterNameParamsConfig.random.fallbackKey,
    );
    expect(loadCharacter(storage)?.name).toBe(fallbackNames[0]);
  });

  it('throws rather than seeding a hardcoded name when the fallback list is empty', async () => {
    vi.resetModules();
    vi.doMock('@keep-walking/shared/character', () => ({ resolveStringList: () => [] }));
    const { seedE2eSkipOnboardingAccount: seedWithEmptyFallback } = await import('./e2e-skip-seed');
    const storage = createMemoryStorage();
    expect(() => seedWithEmptyFallback(storage, 1000, NOOP_QUOTA)).toThrow(
      /fallback character name list is empty/,
    );
    vi.doUnmock('@keep-walking/shared/character');
    vi.resetModules();
  });

  it('never overwrites an existing account (a spec that seeds its own values wins)', () => {
    const storage = createMemoryStorage();
    seedE2eSkipOnboardingAccount(storage, 1000, NOOP_QUOTA);
    storage.setItem(
      'kw.p2.account',
      JSON.stringify({
        schemaVersion: 1,
        savedAt_ms: 1,
        state: { provider: 'apple', signedIn: false },
      }),
    );
    seedE2eSkipOnboardingAccount(storage, 2000, NOOP_QUOTA);
    expect(loadAccount(storage)).toEqual({ provider: 'apple', signedIn: false });
  });

  it('never overwrites an existing character', () => {
    const storage = createMemoryStorage();
    storage.setItem(
      'kw.p2.character',
      JSON.stringify({
        schemaVersion: 1,
        savedAt_ms: 1,
        state: { name: 'custom-name', storyDone: false },
      }),
    );
    seedE2eSkipOnboardingAccount(storage, 2000, NOOP_QUOTA);
    expect(loadCharacter(storage)).toEqual({ name: 'custom-name', storyDone: false });
  });
});
