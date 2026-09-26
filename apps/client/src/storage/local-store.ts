/**
 * Generic `kw.p2.*` localStorage envelope (ADR 0003 section 3.4 C1-5, docs/tech/
 * F04-dungeon-presence.md sections 10-11): every key this app writes starts with
 * `config/app/privacy.json#localData.storageKeyPrefix`. This module holds no game state itself —
 * `@keep-walking/shared/session` (not built yet) owns `SessionState`'s shape — it only provides the
 * envelope (`schemaVersion` + `savedAt_ms`), the "corrupt state never crashes the UI, just gets
 * discarded" read path (F04 section 10.2), and the storage-full fallback chain (F04 section 10.4)
 * that P2-F04-T20/T21 will call once the session reducer exists.
 *
 * Takes a `KeyValueStorage` parameter everywhere rather than reading `window.localStorage`
 * directly, so every function here is a plain unit test against an in-memory fake, no DOM needed
 * (ADR 0001 3.6) — and so a future call site can point it at a different `Storage` (e.g. a test's
 * own instance) without this module caring.
 */

/** The subset of the DOM `Storage` interface this module needs — satisfied by `window.localStorage`
 * and by a plain in-memory fake in tests. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

/** A trivial in-memory `KeyValueStorage`, for tests and for the storage-degraded in-memory
 * fallback (F04 section 10.4: "เก็บ session ในหน่วยความจำ ตั้งธง storageDegraded"). */
export function createMemoryStorage(): KeyValueStorage {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    get length() {
      return map.size;
    },
    key: (index) => Array.from(map.keys())[index] ?? null,
  };
}

export interface StoredEnvelope<T> {
  readonly schemaVersion: number;
  readonly savedAt_ms: number;
  readonly state: T;
}

export type LoadResult<T> =
  | { readonly ok: true; readonly envelope: StoredEnvelope<T> }
  | { readonly ok: false; readonly reason: 'missing' | 'corrupt' | 'schema_mismatch' };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `JSON.stringify({schemaVersion, savedAt_ms, state})`. Never throws on a serializable `state`
 * (ADR 0003 3.2 item 2 requires `state` to already be plain, JSON-serializable data). */
export function serializeEnvelope<T>(schemaVersion: number, state: T, savedAt_ms: number): string {
  const envelope: StoredEnvelope<T> = { schemaVersion, savedAt_ms, state };
  return JSON.stringify(envelope);
}

/**
 * Reads and parses a `kw.p2.*` key (F04 section 10.2's `fromPersisted` read path, generalized:
 * the actual `SessionState`-shaped `fromPersisted` belongs to `@keep-walking/shared/session`).
 * `isState` narrows the parsed `state` field; a `false` result is treated the same as `corrupt`
 * (F04 10.2: "ค่าผิดชนิด = corrupt"). Never throws.
 */
export function readEnvelope<T>(
  storage: KeyValueStorage,
  key: string,
  expectedSchemaVersion: number,
  isState: (value: unknown) => value is T,
): LoadResult<T> {
  const raw = storage.getItem(key);
  if (raw === null) {
    return { ok: false, reason: 'missing' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'corrupt' };
  }
  if (!isPlainObject(parsed)) {
    return { ok: false, reason: 'corrupt' };
  }
  const { schemaVersion, savedAt_ms, state } = parsed;
  if (typeof schemaVersion !== 'number' || typeof savedAt_ms !== 'number') {
    return { ok: false, reason: 'corrupt' };
  }
  if (schemaVersion !== expectedSchemaVersion) {
    return { ok: false, reason: 'schema_mismatch' };
  }
  if (!isState(state)) {
    return { ok: false, reason: 'corrupt' };
  }
  return { ok: true, envelope: { schemaVersion, savedAt_ms, state } };
}

export interface QuotaFallbackDeps {
  /** Drops roughly half of the telemetry ring buffer (oldest first) and persists it. */
  readonly trimTelemetryHalf: () => void;
  /** Drops the whole telemetry ring buffer and persists an empty one. */
  readonly clearTelemetryAll: () => void;
}

export type WriteResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: 'storageDegraded' };

/**
 * The session write's quota-exceeded fallback chain (F04 section 10.4): plain `setItem` first;
 * on failure (`QuotaExceededError`, Safari private mode's zero quota, or any other throw) trim the
 * telemetry ring buffer by half and retry; still failing, clear telemetry entirely and retry;
 * still failing, give up without touching `key` (session keeps living in memory only) and report
 * `storageDegraded` for the caller to flag in the UI/settings. Telemetry writes have their own,
 * separate eviction (`telemetry/sink.ts`) and never call this for their own write.
 */
export function writeWithQuotaFallback(
  storage: KeyValueStorage,
  key: string,
  value: string,
  deps: QuotaFallbackDeps,
): WriteResult {
  const attempts: readonly (() => void)[] = [
    () => undefined,
    deps.trimTelemetryHalf,
    deps.clearTelemetryAll,
  ];
  for (const beforeRetry of attempts) {
    beforeRetry();
    try {
      storage.setItem(key, value);
      return { ok: true };
    } catch {
      // fall through to the next step of the chain
    }
  }
  return { ok: false, reason: 'storageDegraded' };
}

/** Every stored key starting with `prefix` (C1-5). Used by `clearLocalData` and by tests. */
export function keysWithPrefix(storage: KeyValueStorage, prefix: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null && key.startsWith(prefix)) {
      keys.push(key);
    }
  }
  return keys;
}

/** Removes every key starting with `prefix` (config/app/privacy.json#localData.clearScope:
 * `allKeysWithPrefix`). Does not reload the page or touch telemetry re-seeding — see
 * `storage/clear-local-data.ts` for the composed C2-6 button behaviour. */
export function clearKeysWithPrefix(storage: KeyValueStorage, prefix: string): void {
  for (const key of keysWithPrefix(storage, prefix)) {
    storage.removeItem(key);
  }
}
