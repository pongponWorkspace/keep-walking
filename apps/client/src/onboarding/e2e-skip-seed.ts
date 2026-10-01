/**
 * `?e2eSkipOnboarding=1` boot-time seed (tech note docs/tech/F10-account-shell.md section 9.1,
 * D-130, Mock-only — gated by the caller's own `e2eSkipOnboarding` flag the same way every other
 * `?e2e*` hook already is, never read from `window.location` directly here). Writes
 * `kw.p2.account`/`kw.p2.character` only when neither key exists yet, so the pre-existing
 * `apps/client/e2e/` specs that boot straight past onboarding with this hook keep working against
 * the new step machine without editing a single one of them — and so a spec that seeds its own
 * values first (`e2e/fixtures/f10-seed.ts#seedLegacyPlayer`) always wins over this default.
 *
 * The fallback character name reads `config/content/character-names.th.json#randomName.fallback.
 * names[0]` directly (the literal list `config/balance/character.json#random.fallbackKey` points
 * at today) — this is a content file read for test-infrastructure purposes only, not a gameplay
 * path, so it never needs the full `@keep-walking/shared/character` filter/lexicon machinery T15
 * wires up for the real create-character screen; the name is never shown anywhere, only present so
 * the step machine's `character`/`story` steps read as already passed.
 */
import characterNamesThJson from '../../../../config/content/character-names.th.json';
import { loadAccount, saveAccount } from '../storage/account';
import { loadCharacter, saveCharacter } from '../storage/character';
import type { KeyValueStorage, QuotaFallbackDeps } from '../storage/local-store';

function firstFallbackCharacterName(): string {
  const names = (
    characterNamesThJson as {
      readonly randomName?: { readonly fallback?: { readonly names?: unknown } };
    }
  ).randomName?.fallback?.names;
  return Array.isArray(names) && typeof names[0] === 'string' ? names[0] : 'player';
}

export function seedE2eSkipOnboardingAccount(
  storage: KeyValueStorage,
  now_ms: number,
  quotaDeps: QuotaFallbackDeps,
): void {
  if (loadAccount(storage) === null) {
    saveAccount(storage, { provider: 'google', signedIn: true }, now_ms, quotaDeps);
  }
  if (loadCharacter(storage) === null) {
    saveCharacter(
      storage,
      { name: firstFallbackCharacterName(), storyDone: true },
      now_ms,
      quotaDeps,
    );
  }
}
