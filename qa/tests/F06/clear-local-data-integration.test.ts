/**
 * P2-F06-T17 acceptance: "delete-local-data button/function clears everything (test the
 * P2-F04-T25 function; the settings screen itself comes in P2-X38)".
 *
 * The developer's own `apps/client/src/storage/clear-local-data.test.ts` (never modified here)
 * already proves `clearLocalData` removes every `kw.p2.*` key against a synthetic storage. This
 * file is QA's own, black-box addition: seed the *real* storage shapes every real module in this
 * feature actually writes (`kw.p2.session` via `saveSession`/`toPersisted`, `kw.p2.onboarding` +
 * `kw.p2.consent` via `storage/onboarding.ts`, `kw.p2.interest` via `storage/interest.ts`), call
 * the real `clearLocalData` with the real `config/app/privacy.json#localData.storageKeyPrefix`,
 * and confirm every one of those real read paths comes back empty/fresh afterward — "clears
 * everything" proven end-to-end through the real modules a player's data actually lives in, not
 * just against a hand-typed key list.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  createMemoryStorage,
  readEnvelope,
  serializeEnvelope,
} from '../../../apps/client/src/storage/local-store';
import { clearLocalData } from '../../../apps/client/src/storage/clear-local-data';
import { isTelemetryRecordArray } from '../../../apps/client/src/telemetry/sink';
import { saveSession, loadSession } from '../../../apps/client/src/session/persist';
import {
  loadOnboardingStorage,
  saveOnboardingStorage,
  readLocationConsent,
} from '../../../apps/client/src/storage/onboarding';
import { loadInterest, saveInterest } from '../../../apps/client/src/storage/interest';
import { selectCanClearLocalData } from '@keep-walking/shared/session';
import { qaSessionParams, QA_RECT_DUNGEON_ID } from '../F04/lib/qa-session-params';
import { confirmAndReplay } from '../F05/lib/confirm-and-replay';
import { loadCommittedTrace } from '../traces/lib/load-trace';

const START_EPOCH_MS = Date.UTC(2026, 9, 2, 6, 0, 0);
const SESSION_KEY = 'kw.p2.session';
const TELEMETRY_KEY = 'kw.p2.telemetry';

function realStorageKeyPrefix(): string {
  const privacy = JSON.parse(readFileSync('config/app/privacy.json', 'utf8')) as {
    readonly localData: { readonly storageKeyPrefix: string };
  };
  return privacy.localData.storageKeyPrefix;
}

describe('clearLocalData (P2-F04-T25) clears every real kw.p2.* shape this feature writes (C2-6)', () => {
  it('a real session (with a player who has played), onboarding progress, consent, and an interest registration all disappear; an unrelated key survives', () => {
    const storage = createMemoryStorage();
    const prefix = realStorageKeyPrefix();

    // 1. A real, played SessionState (not an empty stand-in) via the real trace + engine.
    const params = qaSessionParams();
    const trace = loadCommittedTrace('data/gps-traces/qa/qa-gate-normalwalk-gap-01.trace.json');
    const { state } = confirmAndReplay(trace, params, QA_RECT_DUNGEON_ID, START_EPOCH_MS, 1);
    saveSession(storage, SESSION_KEY, state, START_EPOCH_MS, {
      trimTelemetryHalf: () => undefined,
      clearTelemetryAll: () => undefined,
    });
    expect(loadSession(storage, SESSION_KEY, params)?.ok).toBe(true);

    // 2. Real onboarding progress + consent.
    const onboarding = loadOnboardingStorage(storage, START_EPOCH_MS);
    saveOnboardingStorage(
      storage,
      { ...onboarding, introSeen: true, ageGatePassed: true, consentAnswered: true },
      START_EPOCH_MS,
      { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined },
    );
    storage.setItem('kw.p2.consent', serializeEnvelope(1, { location: 'granted' }, START_EPOCH_MS));
    expect(loadOnboardingStorage(storage, START_EPOCH_MS).introSeen).toBe(true);
    expect(readLocationConsent(storage)).toBe('granted');

    // 3. A real interest registration.
    saveInterest(
      storage,
      { schemaVersion: 1, scope: 'district', areaId: 'chatuchak' },
      START_EPOCH_MS,
      { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined },
    );
    expect(loadInterest(storage)?.areaId).toBe('chatuchak');

    // 4. An unrelated, non-`kw.p2.*` key that must survive (a hostile "clear everything" would be
    // its own bug — the contract is "everything this game wrote", not "everything in storage").
    storage.setItem('some-other-app.unrelated', 'still here');

    clearLocalData({
      storage,
      storageKeyPrefix: prefix,
      telemetryStorageKey: TELEMETRY_KEY,
      telemetrySchemaVersion: 1,
      sink: {
        config: { ringBufferMaxEvents: 3000, ringBufferMaxChars: 600000 },
        forbiddenPropertyNames: ['lat', 'lng'],
        coordinateGuard: { minDecimals: 4, latRange_deg: [5, 21], lngRange_deg: [97, 106] },
        knownEventNames: new Set(['local_data_cleared']),
        sessionId: 'abcd1234',
        platform: 'android-chrome',
        appVersion: 'deadbee',
        now: () => START_EPOCH_MS,
      },
      now: () => START_EPOCH_MS,
      // R2-N2 (tech gate F06 round 2): `canClear` is optional with an "always allowed" default
      // only so a caller with no run-state concept does not have to invent a trivial function --
      // this QA call site is not that caller (it is exactly the check `selectCanClearLocalData`
      // exists for, `qa-tester`'s own second describe block below), so it always sends a real one.
      canClear: () => true,
    });

    // Every real read path comes back as "nothing here" / a fresh default, not a leftover value.
    expect(loadSession(storage, SESSION_KEY, params)).toBeUndefined();
    const freshOnboarding = loadOnboardingStorage(storage, START_EPOCH_MS + 1);
    expect(freshOnboarding.introSeen).toBe(false);
    expect(freshOnboarding.ageGatePassed).toBe(false);
    expect(freshOnboarding.consentAnswered).toBe(false);
    expect(readLocationConsent(storage)).toBe('unanswered');
    expect(loadInterest(storage)).toBeNull();

    // The unrelated key survives (scoped clear, not a storage-wide wipe).
    expect(storage.getItem('some-other-app.unrelated')).toBe('still here');

    // The telemetry buffer was re-seeded with exactly `local_data_cleared`, no coordinates.
    const result = readEnvelope(storage, TELEMETRY_KEY, 1, isTelemetryRecordArray);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.state).toHaveLength(1);
      expect(result.envelope.state[0]).toMatchObject({ event_name: 'local_data_cleared' });
    }
    const raw = storage.getItem(TELEMETRY_KEY) ?? '';
    expect(raw).not.toMatch(/"lat"|"lng"/);
  });

  it('calls reload exactly once, after every key is gone (afterClear: reloadToOnboarding)', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.session', 'x');
    const reload = vi.fn();
    clearLocalData({
      storage,
      storageKeyPrefix: realStorageKeyPrefix(),
      telemetryStorageKey: TELEMETRY_KEY,
      telemetrySchemaVersion: 1,
      sink: {
        config: { ringBufferMaxEvents: 3000, ringBufferMaxChars: 600000 },
        forbiddenPropertyNames: ['lat', 'lng'],
        coordinateGuard: { minDecimals: 4, latRange_deg: [5, 21], lngRange_deg: [97, 106] },
        knownEventNames: new Set(['local_data_cleared']),
        sessionId: 'abcd1234',
        platform: 'android-chrome',
        appVersion: 'deadbee',
        now: () => START_EPOCH_MS,
      },
      now: () => START_EPOCH_MS,
      reload,
      canClear: () => true,
    });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(storage.getItem('kw.p2.session')).toBeNull();
  });

  it('canClear: () => false is a true no-op -- no key removed, no telemetry write, no reload (F06-TG-06, H-E23)', () => {
    const storage = createMemoryStorage();
    storage.setItem('kw.p2.session', 'x');
    const reload = vi.fn();
    clearLocalData({
      storage,
      storageKeyPrefix: realStorageKeyPrefix(),
      telemetryStorageKey: TELEMETRY_KEY,
      telemetrySchemaVersion: 1,
      sink: {
        config: { ringBufferMaxEvents: 3000, ringBufferMaxChars: 600000 },
        forbiddenPropertyNames: ['lat', 'lng'],
        coordinateGuard: { minDecimals: 4, latRange_deg: [5, 21], lngRange_deg: [97, 106] },
        knownEventNames: new Set(['local_data_cleared']),
        sessionId: 'abcd1234',
        platform: 'android-chrome',
        appVersion: 'deadbee',
        now: () => START_EPOCH_MS,
      },
      now: () => START_EPOCH_MS,
      reload,
      canClear: () => false,
    });
    expect(reload).not.toHaveBeenCalled();
    expect(storage.getItem('kw.p2.session')).toBe('x');
    expect(storage.getItem(TELEMETRY_KEY)).toBeNull();
  });
});

describe('selectCanClearLocalData — the button must be disabled mid-run (H-E23, R49)', () => {
  it('false while a run is open, true again once it ends (auto_retreat keeps it enabled the same way)', () => {
    const params = qaSessionParams();
    const trace = loadCommittedTrace('data/gps-traces/qa/qa-gate-normalwalk-gap-01.trace.json');
    const { state } = confirmAndReplay(trace, params, QA_RECT_DUNGEON_ID, START_EPOCH_MS, 1);
    // The trace ends mid-run for a still-open case; qa-gate-normalwalk-gap-01 does not itself
    // auto-retreat/die (a short 32-minute walk, F06 survival is much longer), so `run` is open.
    if (state.run !== null) {
      expect(selectCanClearLocalData(state)).toBe(false);
    }
    // A freshly created, no-run session must always allow it (never fail-closed on a fresh player).
    expect(selectCanClearLocalData({ ...state, run: null })).toBe(true);
  });
});
