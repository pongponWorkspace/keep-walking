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
