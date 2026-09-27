/**
 * The `start` and `seed` query test hooks (docs/tech/F04-dungeon-presence.md section 17, ADR 0003
 * section 6), read only when `loc=mock` (Web always uses `Date.now()` and
 * `crypto.getRandomValues`, so these two parsers are never even called for it — see the call sites
 * in `apps/client/src/main.ts`/`location/select.ts`). Param names come from
 * `config/app/client.json#providerQuery.paramNames.{start,seed}`, never a literal.
 *
 * Pure (no `window`, no `Date.now()` default baked in) so a test can pass any `search` string and
 * any `now` function.
 */

const ISO_LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const INTEGER = /^-?\d+$/;
const MS_PER_MIN = 60_000;
/** The largest `runSeed` this task accepts: a uint32 (ADR 0003 section 6 item 1). */
const UINT32_MAX = 0xffffffff;

function warnUnknown(paramName: string, value: string): void {
  console.warn(`unknown value "${value}" for query param "${paramName}"; ignoring it`);
}

/**
 * Parses `client.json#providerQuery.paramNames.start`: either an integer epoch-ms string, or a
 * `YYYY-MM-DDTHH:mm` local time interpreted with `utcOffsetMin` minutes east of UTC
 * (`config/balance.ts`'s `balanceOpeningHoursConfig.utcOffsetMin`, sourced from
 * `config/balance/dungeons.json#openingHours.utcOffset_min` — Bangkok has no DST). Returns
 * `undefined` when the param is absent or does not match either form (with a console warning for
 * the latter, same convention as `location/select.ts`'s `warnUnknown`).
 */
export function parseReplayStartParam(
  search: string,
  paramName: string,
  utcOffsetMin: number,
): number | undefined {
  const raw = new URLSearchParams(search).get(paramName);
  if (raw === null) {
    return undefined;
  }
  if (INTEGER.test(raw)) {
    return Number(raw);
  }
  const match = ISO_LOCAL_DATE_TIME.exec(raw);
  if (match === null) {
    warnUnknown(paramName, raw);
    return undefined;
  }
  const [, year, month, day, hour, minute] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  const asIfUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  return asIfUtc - utcOffsetMin * MS_PER_MIN;
}

/** `replayStart_ms` for the game clock: the parsed `start` param, or `now()` (defaults to
 * `Date.now`) when absent/invalid — a fresh Mock run without `?start=` still starts "now". */
export function resolveReplayStartMs(
  search: string,
  paramName: string,
  utcOffsetMin: number,
  now: () => number = Date.now,
): number {
  return parseReplayStartParam(search, paramName, utcOffsetMin) ?? now();
}

/** Parses `client.json#providerQuery.paramNames.seed` as a uint32 `runSeed` (ADR 0003 section 6
 * item 1). `undefined` when absent, not a plain non-negative integer, or out of uint32 range
 * (with a console warning for the latter two, same convention as the rest of this module). */
export function parseRunSeedParam(search: string, paramName: string): number | undefined {
  const raw = new URLSearchParams(search).get(paramName);
  if (raw === null) {
    return undefined;
  }
  if (!/^\d+$/.test(raw)) {
    warnUnknown(paramName, raw);
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value > UINT32_MAX) {
    warnUnknown(paramName, raw);
    return undefined;
  }
  return value;
}

/** No real onboarding path sets `PlayerState.classId` from a URL — this is a test-only escape
 * hatch (P2-F05-T10) for driving a whole run through an e2e spec before F06-T10's real class-
 * picker screen exists. `session/engine.ts`'s boot sequence dispatches `chooseClass` with this
 * value once, only when the loaded player has no class yet — the exact same `sessionStep` input a
 * future real picker screen would send, never a separate code path. The param *name* comes from
 * `config/app/client.json#providerQuery.paramNames.e2eClassId` (tech gate P2-F05-T15 TG-04), never
 * a literal — `f04-app.ts`'s `resolveE2eClassId` is the one call site, gated to the Mock provider
 * only (decision 6.2). */
const KNOWN_E2E_CLASS_IDS = ['tanker', 'ranged', 'support', 'magic'] as const;

/** Parses `?<paramName>=` as one of the four known `PlayerClass` values (same "warn and ignore an
 * unrecognized value" convention as the rest of this module). */
export function parseE2eClassIdParam(
  search: string,
  paramName: string,
): (typeof KNOWN_E2E_CLASS_IDS)[number] | undefined {
  const raw = new URLSearchParams(search).get(paramName);
  if (raw === null) {
    return undefined;
  }
  if ((KNOWN_E2E_CLASS_IDS as readonly string[]).includes(raw)) {
    return raw as (typeof KNOWN_E2E_CLASS_IDS)[number];
  }
  warnUnknown(paramName, raw);
  return undefined;
}
