/**
 * `?e2eSkipOnboarding=1` boot-time seed (tech note docs/tech/F10-account-shell.md section 9.1,
 * D-130, Mock-only — gated by the caller's own `e2eSkipOnboarding` flag the same way every other
 * `?e2e*` hook already is, never read from `window.location` directly here). Writes
 * `kw.p2.account`/`kw.p2.character` only when neither key exists yet, so the pre-existing
 * `apps/client/e2e/` specs that boot straight past onboarding with this hook keep working against
 * the new step machine without editing a single one of them — and so a spec that seeds its own
 * values first (`e2e/fixtures/f10-seed.ts#seedLegacyPlayer`) always wins over this default.
 *
 * The fallback character name resolves `config/balance/character.json#random.fallbackKey`
 * (`randomName.fallback.names` today) through the same `resolveStringList` lexicon reader T15
 * wires up for the real create-character screen, then takes its first entry — this is a
 * test-infrastructure seed, not a gameplay path, so it never needs the rest of the
 * `@keep-walking/shared/character` filter/RNG machinery; the name is never shown anywhere, only
 * present so the step machine's `character`/`story` steps read as already passed. An empty list is
 * a config error (config-lint's job to catch), so this throws rather than seeding a name that
 * never came from the content file (CLAUDE.md non-negotiable 3: no hardcoded names).
 */
import { resolveStringList } from '@keep-walking/shared/character';
import characterNamesThJson from '../../../../config/content/character-names.th.json';
import { balanceCharacterNameParamsConfig } from '../config/balance';
import { loadAccount, saveAccount } from '../storage/account';
import { loadCharacter, saveCharacter } from '../storage/character';
import type { KeyValueStorage, QuotaFallbackDeps } from '../storage/local-store';

function firstFallbackCharacterName(): string {
  const names = resolveStringList(
    characterNamesThJson,
    balanceCharacterNameParamsConfig.random.fallbackKey,
  );
  const first = names[0];
  if (first === undefined) {
    throw new Error('e2e-skip-seed: fallback character name list is empty (config error)');
  }
  return first;
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
