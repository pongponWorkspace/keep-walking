/**
 * `kw.p2.onboarding` (tech note F06 8.1) storage envelope, plus the `kw.p2.consent` reader every
 * caller of `onboarding-step.ts#currentOnboardingStep` needs for its `locationConsent` input. Both
 * keys are "client"-owned (tech note 8.1's own table), not `onboarding/onboarding-step.ts`'s
 * (P2-X28, pure, never edited by this task, never touches storage itself) — this module is the one
 * place that persists/reads them, mirroring `storage/interest.ts`'s own envelope pattern.
 */
import { readEnvelope, writeWithQuotaFallback } from './local-store';
import type { KeyValueStorage, QuotaFallbackDeps } from './local-store';
import type { OnboardingStorage } from '../onboarding/onboarding-step';
import { initialOnboardingStorage } from '../onboarding/onboarding-step';

export const ONBOARDING_STORAGE_KEY = 'kw.p2.onboarding';
export const CONSENT_STORAGE_KEY = 'kw.p2.consent';
const ONBOARDING_SCHEMA_VERSION = 1;
const CONSENT_SCHEMA_VERSION = 1;

function isOnboardingStorage(value: unknown): value is OnboardingStorage {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v['schemaVersion'] === 1 &&
    typeof v['introSeen'] === 'boolean' &&
    typeof v['ageGatePassed'] === 'boolean' &&
    typeof v['consentAnswered'] === 'boolean' &&
    typeof v['firstOpenAt_ms'] === 'number'
  );
}

/** `initialOnboardingStorage(now_ms)` when nothing has ever been written or the stored value is
 * corrupt/wrong-schema (fail-honest: same as never having started onboarding, never a crash). */
export function loadOnboardingStorage(storage: KeyValueStorage, now_ms: number): OnboardingStorage {
  const result = readEnvelope(
    storage,
    ONBOARDING_STORAGE_KEY,
    ONBOARDING_SCHEMA_VERSION,
    isOnboardingStorage,
  );
  return result.ok ? result.envelope.state : initialOnboardingStorage(now_ms);
}

export function saveOnboardingStorage(
  storage: KeyValueStorage,
  state: OnboardingStorage,
  now_ms: number,
  quotaDeps: QuotaFallbackDeps,
): void {
  const value = JSON.stringify({
    schemaVersion: ONBOARDING_SCHEMA_VERSION,
    savedAt_ms: now_ms,
    state,
  });
  writeWithQuotaFallback(storage, ONBOARDING_STORAGE_KEY, value, quotaDeps);
}

export type LocationConsent = 'granted' | 'declined' | 'withdrawn' | 'unanswered';
type AnsweredLocationConsent = Exclude<LocationConsent, 'unanswered'>;

/** `kw.p2.consent.location`, mapped to `onboarding-step.ts#OnboardingStepInput.locationConsent`.
 * A *missing* key (nobody has ever answered, including every player before P2-X38 builds a real
 * consent screen) reads as `'unanswered'` — the step machine treats that the same as `'declined'`
 * (fail-closed on `permission`/`map`, per its own doc comment), matching `f04-app.ts`'s existing,
 * separate `locationConsentGranted()` interim default of "missing means proceed" for the *home
 * state* (a different, more lenient read for a display-only screen) — the two are intentionally
 * not the same predicate: this one is honest about "nobody has actually answered yet". */
export function readLocationConsent(storage: KeyValueStorage): LocationConsent {
  const result = readEnvelope(
    storage,
    CONSENT_STORAGE_KEY,
    CONSENT_SCHEMA_VERSION,
    (v): v is { readonly location: string } =>
      typeof v === 'object' &&
      v !== null &&
      typeof (v as { location?: unknown }).location === 'string',
  );
  if (!result.ok) return 'unanswered';
  const location = result.envelope.state.location;
  return location === 'granted' || location === 'declined' || location === 'withdrawn'
    ? location
    : 'unanswered';
}

/** Writes `kw.p2.consent = { schemaVersion: 1, location: value }` — the one function every consent
 * screen/withdraw call site uses (`S-00-consent-location`'s accept/decline, `S-23-privacy`'s
 * withdraw/re-grant, `docs/tech/F06-hp-damage-onboarding.md` 8.4 step 4's own "เขียน kw.p2.consent").
 * Never writes `'unanswered'` (that value only ever comes from a *missing* key, `readLocationConsent`
 * above — there is no reason to persist it explicitly). */
export function writeLocationConsent(
  storage: KeyValueStorage,
  value: AnsweredLocationConsent,
  now_ms: number,
  quotaDeps: QuotaFallbackDeps,
): void {
  const json = JSON.stringify({
    schemaVersion: CONSENT_SCHEMA_VERSION,
    savedAt_ms: now_ms,
    state: { location: value },
  });
  writeWithQuotaFallback(storage, CONSENT_STORAGE_KEY, json, quotaDeps);
}
