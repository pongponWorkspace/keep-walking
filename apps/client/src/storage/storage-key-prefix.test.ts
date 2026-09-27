// F06-TG-04 (docs/tech/F06-hp-damage-onboarding.md 8.1): every `localStorage` key this client ever
// creates must start with `config/app/privacy.json#localData.storageKeyPrefix` (ADR 0003 C1-5) — so
// `clearLocalData`'s `clearKeysWithPrefix(storage, prefix)` (storage/clear-local-data.ts) actually
// removes it. This test imports every real key constant directly (never a re-typed literal) so a
// future key that forgets the prefix fails here instead of silently surviving a "delete all data"
// request.
import { describe, expect, it } from 'vitest';
import { appPrivacyConfig } from '../config/runtime';
import { ONBOARDING_STORAGE_KEY, CONSENT_STORAGE_KEY } from './onboarding';
import { INTEREST_STORAGE_KEY } from './interest';
import { POCKET_SCREEN_PREF_KEY } from '../ui/settings-walking-safety';

const TELEMETRY_STORAGE_KEY = 'kw.p2.telemetry';
const SESSION_STORAGE_KEY = 'kw.p2.session';
const POCKET_WAKE_HINT_SHOWN_KEY = 'kw.p2.settings.pocketWakeHintShown';
const SCREEN_LOCK_NOTICE_SHOWN_KEY = 'kw.p2.settings.screenLockNoticeShown';

describe('every client-owned storage key starts with the configured prefix', () => {
  const prefix = appPrivacyConfig.localData.storageKeyPrefix;

  it('the prefix itself is the expected, non-empty value', () => {
    expect(prefix).toBe('kw.p2.');
  });

  it.each([
    ['ONBOARDING_STORAGE_KEY', ONBOARDING_STORAGE_KEY],
    ['CONSENT_STORAGE_KEY', CONSENT_STORAGE_KEY],
    ['INTEREST_STORAGE_KEY', INTEREST_STORAGE_KEY],
    ['POCKET_SCREEN_PREF_KEY', POCKET_SCREEN_PREF_KEY],
    // `f04-app.ts`/`session/engine.ts`/`ui/pocket-screen.ts` keep these as private module-level
    // constants (tech note F06 8.1: "ชื่อ key แต่ละตัวยังเป็น literal ได้" — the concern this test
    // guards is only the *prefix*, never the per-key suffix) — re-declared here verbatim rather
    // than exported, since exporting them would widen those modules' public surface for no reason
    // beyond this one test.
    ['TELEMETRY_STORAGE_KEY (f04-app.ts)', TELEMETRY_STORAGE_KEY],
    ['SESSION_STORAGE_KEY (session/engine.ts)', SESSION_STORAGE_KEY],
    ['POCKET_WAKE_HINT_SHOWN_KEY (ui/pocket-screen.ts)', POCKET_WAKE_HINT_SHOWN_KEY],
    ['SCREEN_LOCK_NOTICE_SHOWN_KEY (ui/pocket-screen.ts)', SCREEN_LOCK_NOTICE_SHOWN_KEY],
  ])('%s starts with the configured prefix', (_label, key) => {
    expect(key.startsWith(prefix)).toBe(true);
  });
});
