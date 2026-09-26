// Opening hours reference (spec F04 R25-R30, tech note F04 8.1-8.3, P2-F05-T20) and the home
// screen distance display (spec F04 R34). Calendar constants are not balance values.
const MS_PER_MIN = 60_000;
const MS_PER_S = 1000;
const MIN_PER_DAY = 1440;
const MS_PER_DAY = MIN_PER_DAY * MS_PER_MIN;
const DAYS_PER_WEEK = 7;
/** 1970-01-01 was a Thursday: ISO weekday = ((day + EPOCH_WEEKDAY_SHIFT) mod 7) + 1. */
const EPOCH_WEEKDAY_SHIFT = 3;
/** Search horizon of openingChangeAfter: one week + one day (algorithm constant, tech note 8.2). */
export const OPENING_HORIZON_DAYS = 8;
const ISO_DATE_LENGTH = 10;

export type Interval = [number, number];
export interface OpeningHours {
  /** ISO weekday "1".."7" → [start_min, end_min) in local minutes. */
  weekly: Record<string, Interval[]>;
  exceptions?: { date: string; intervals: Interval[] }[];
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

export function localDay(t_ms: number, utcOffset_min: number): number {
  return Math.floor((t_ms + utcOffset_min * MS_PER_MIN) / MS_PER_DAY);
}

export function isoWeekday(day: number): number {
  return mod(day + EPOCH_WEEKDAY_SHIFT, DAYS_PER_WEEK) + 1;
}

function isoDate(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, ISO_DATE_LENGTH);
}

function intervalsOf(h: OpeningHours, day: number): Interval[] {
  const ex = h.exceptions?.find((e) => e.date === isoDate(day));
  return ex?.intervals ?? h.weekly[String(isoWeekday(day))] ?? [];
}

/** Open when some [s, e) holds the local ms of day (closing minute is already closed, R25). */
export function isOpenAt(h: OpeningHours, utcOffset_min: number, t_ms: number): boolean {
  const local = t_ms + utcOffset_min * MS_PER_MIN;
  const day = Math.floor(local / MS_PER_DAY);
  const msOfDay = local - day * MS_PER_DAY;
  return intervalsOf(h, day).some(
    ([s, e]) => s * MS_PER_MIN <= msOfDay && msOfDay < e * MS_PER_MIN,
  );
}

/** Next time after t when open/closed changes (intervals touching at midnight merge), or null. */
export function openingChangeAfter(
  h: OpeningHours,
  utcOffset_min: number,
  t_ms: number,
): number | null {
  const now = isOpenAt(h, utcOffset_min, t_ms);
  const day0 = localDay(t_ms, utcOffset_min);
  const offset_ms = utcOffset_min * MS_PER_MIN;
  const candidates: number[] = [];
  for (let d = day0; d <= day0 + OPENING_HORIZON_DAYS; d += 1) {
    const dayStart = d * MS_PER_DAY - offset_ms;
    candidates.push(dayStart);
    for (const [s, e] of intervalsOf(h, d)) {
      candidates.push(dayStart + s * MS_PER_MIN, dayStart + e * MS_PER_MIN);
    }
  }
  const sorted = [...new Set(candidates)].filter((c) => c > t_ms).sort((a, b) => a - b);
  return sorted.find((c) => isOpenAt(h, utcOffset_min, c) !== now) ?? null;
}

/** R29 notice time: closesAt - closingSoonNotice_s, only when it is after the run started. */
export function closingSoonAt(
  closesAt_ms: number | null,
  startedAt_ms: number,
  closingSoonNotice_s: number,
): number | null {
  if (closesAt_ms === null) return null;
  const at = closesAt_ms - closingSoonNotice_s * MS_PER_S;
  return at > startedAt_ms ? at : null;
}

export interface DistanceStep {
  /** Upper bound (inclusive) of the band in metres; null = no bound. */
  upTo_m: number | null;
  step_m: number;
}

/** Home screen distance (R34): always rounded UP to the step of its band, never below the truth. */
export function displayDistance_m(distance_m: number, steps: readonly DistanceStep[]): number {
  const band = steps.find((s) => s.upTo_m === null || distance_m <= s.upTo_m);
  if (band === undefined) throw new RangeError('distanceDisplaySteps_m has no open-ended band');
  return Math.ceil(distance_m / band.step_m) * band.step_m;
}
