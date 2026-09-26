// Unit suffix rule of ADR 0001 3.10.3. A numeric value key needs a unit suffix unless the name
// itself says what it is (one of the exemptions written in 3.10.3). New suffix = edit the ADR
// table and UNIT_SUFFIX below together (tech-lead).
import type { Json } from './types';

/** Regex of 3.10.3, verbatim. */
export const UNIT_SUFFIX = /_(m|m2|ms|s|min|h|days|yr|deg|kmh|pct|ratio|gold|levels|bytes)$/;
export const COMPOUND_PCT_SUFFIX = /_pct[A-Z][A-Za-z]*$/;
const RATIO_SUFFIX = '_ratio';
/** `_bytes` counts whole bytes (3.10.3, P2-X12): integer and >= 0. */
const BYTES_SUFFIX = '_bytes';

/**
 * Unit-less names allowed by 3.10.3: camelCase `...Ratio` (named numerator/denominator, not tied
 * to 0-1), multipliers (`Mult`, `Coef`, `Divisor`, or a key that is exactly `mult`), percentiles,
 * copy lengths (`Cells`).
 * Also allowed by 3.10.3 since P2-X04: `Exponent` (a power is dimensionless), `IoU` and `Share`
 * (a named 0-1 share of a named whole; range-checked like `_ratio`). Unit suffixes `_min` and
 * `_deg` were added to UNIT_SUFFIX in P2-X07 to match the 3.10.3 table; `_bytes` in P2-X12
 * (ADR 0003 section 10 bundle budgets).
 */
const UNITLESS_NAME = /(Ratio$|Mult|Coef|Divisor|Percentile$|Cells|Exponent|IoU|Share)|^mult$/;
const ZERO_TO_ONE_NAME = /(IoU|Share)$/;

/**
 * Counts "whose name says what is counted" (3.10.3: maxMembers, durationTicks, spawnPointsMin,
 * reportThreshold). A count is an integer and its name ends with the counted noun; a name that
 * ends with one of these words is a measured quantity instead, so it needs a suffix
 * (`cooldownTime` -> `cooldown_s`, `radius` -> `radius_m`).
 */
const MEASURE_WORD =
  /(Time|Duration|Delay|Interval|Timeout|Age|Period|Distance|Radius|Length|Width|Height|Speed|Window|Cooldown|Area|Price|Cost|Offset|Gap|Accuracy|Chance|Probability|Percent|Rate)$/;

export function hasUnitSuffix(key: string): boolean {
  return UNIT_SUFFIX.test(key) || COMPOUND_PCT_SUFFIX.test(key);
}

function numericValues(value: Json): number[] | null {
  if (typeof value === 'number') return [value];
  if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === 'number')) {
    return value as number[];
  }
  return null;
}

/** True when the key itself names a unit or a unit-less kind (children of it inherit that). */
export function namesUnitOrKind(key: string): boolean {
  return hasUnitSuffix(key) || UNITLESS_NAME.test(key);
}

/**
 * Returns messages (empty = pass). `null` values are checked as numbers-to-be. `inherited` = the
 * value sits in a map object whose own key names the unit (`baseChancePerRewardTick_pct.epic`,
 * `roleMult.ranged`, `successRateByTargetLevel_pct.3`): the map key is an id, not a name.
 */
export function checkNumericKeyName(key: string, value: Json, inherited = false): string[] {
  const numbers = value === null ? [] : numericValues(value);
  if (numbers === null) return [];
  if (key.endsWith(BYTES_SUFFIX) && numbers.some((n) => !Number.isInteger(n) || n < 0)) {
    return [`${key} must be an integer >= 0 (3.10.3 _bytes)`];
  }
  if (inherited || namesUnitOrKind(key)) return [];
  const allIntegers = numbers.every((n) => Number.isInteger(n));
  const capitalized = `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  if (allIntegers && !MEASURE_WORD.test(capitalized)) return [];
  if (!allIntegers) {
    return [
      `non-integer value without a unit suffix: add _<unit> (3.10.3 regex) or name it ...Ratio/Mult/Coef/Divisor/Percentile`,
    ];
  }
  return [`"${key}" names a measured quantity: add a unit suffix (3.10.3)`];
}

/**
 * Anything after `_` in a numeric (or unset `null`) value key must be a unit of the 3.10.3 table.
 * String/boolean/object values are skipped: map keys such as OSM tags (`railway_station`) are
 * data ids, not value names.
 */
export function checkSuffixKnown(key: string, value: Json): string[] {
  if (value !== null && numericValues(value) === null) return [];
  if (!key.includes('_') || hasUnitSuffix(key)) return [];
  return [
    `unknown unit suffix "${key.slice(key.indexOf('_'))}": use the 3.10.3 table or ask tech-lead to extend it`,
  ];
}

/** `_ratio` is reserved for a 0-1 share of a whole (3.10.3); `...Share`/`...IoU` likewise. */
export function checkRatioRange(key: string, value: Json): string[] {
  if (!key.endsWith(RATIO_SUFFIX) && !ZERO_TO_ONE_NAME.test(key)) return [];
  const numbers = numericValues(value);
  if (numbers === null) return [];
  return numbers.some((n) => n < 0 || n > 1)
    ? [`${key} must be within 0-1 (3.10.3 _ratio / named share)`]
    : [];
}
