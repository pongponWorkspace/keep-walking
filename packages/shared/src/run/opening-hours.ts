// Opening hours (F04-R25..R30, tech note F04 section 8, ADR 0003 9.2). Evaluated purely from
// now_ms + a fixed UTC offset (config balance.dungeons.openingHours.utcOffset_min): Bangkok has
// no daylight saving, and using the device time zone would make the same instant open on one
// phone and closed on another. Calendar constants below (minutes/day, days/week, epoch weekday)
// are algorithm constants, not balance values (ADR 0003 5.5 / 8.2 distinction).
import { MS_PER_S } from '@keep-walking/geo';

const MS_PER_MIN = 60_000;
const MIN_PER_DAY = 1440;
const MS_PER_DAY = MIN_PER_DAY * MS_PER_MIN;
const DAYS_PER_WEEK = 7;
/** 1970-01-01 (day 0) was a Thursday: ISO weekday = ((day + shift) mod 7) + 1. */
const EPOCH_WEEKDAY_SHIFT = 3;
/** Search horizon of `openingChangeAfter`: one week + one day is enough for a weekly table plus
 * one day's exceptions either side (tech note F04 8.2; an algorithm constant, not balance). */
export const OPENING_HORIZON_DAYS = 8;
const ISO_DATE_LENGTH = 10;

/** [start_min, end_min) in local minutes since midnight, half-open, non-overlapping. */
export type OpeningInterval = readonly [number, number];

export interface OpeningHours {
  /** ISO weekday "1".."7" (1 = Monday) -> the day's intervals. */
  readonly weekly: Readonly<Record<string, readonly OpeningInterval[]>>;
  /** Local dates ("YYYY-MM-DD") whose intervals replace `weekly` for that day. */
  readonly exceptions?: readonly {
    readonly date: string;
    readonly intervals: readonly OpeningInterval[];
  }[];
}

const modPositive = (a: number, n: number): number => ((a % n) + n) % n;

function localDay(t_ms: number, utcOffset_min: number): number {
  return Math.floor((t_ms + utcOffset_min * MS_PER_MIN) / MS_PER_DAY);
}

function isoWeekday(day: number): number {
  return modPositive(day + EPOCH_WEEKDAY_SHIFT, DAYS_PER_WEEK) + 1;
}

/** `new Date(ms)` (an explicit argument, not the banned zero-arg form) only to render a calendar
 * date string; no wall-clock read and no device time zone is involved. */
function isoDateOfDay(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, ISO_DATE_LENGTH);
}

function intervalsOfDay(hours: OpeningHours, day: number): readonly OpeningInterval[] {
  const exception = hours.exceptions?.find((e) => e.date === isoDateOfDay(day));
  return exception?.intervals ?? hours.weekly[String(isoWeekday(day))] ?? [];
}

/** Open when the local minute-of-day falls in some `[start, end)` (closing minute already closed,
 * R25); start minute is included (open exactly at open time). */
export function isOpenAt(hours: OpeningHours, utcOffset_min: number, t_ms: number): boolean {
  const local_ms = t_ms + utcOffset_min * MS_PER_MIN;
  const day = Math.floor(local_ms / MS_PER_DAY);
  const msOfDay = local_ms - day * MS_PER_DAY;
  return intervalsOfDay(hours, day).some(
    ([start, end]) => start * MS_PER_MIN <= msOfDay && msOfDay < end * MS_PER_MIN,
  );
}

/** Next instant after `t_ms` when open/closed flips (intervals touching midnight merge across the
 * day boundary, tech note 8.2), or null when nothing changes within `horizonDays`. */
export function openingChangeAfter(
  hours: OpeningHours,
  utcOffset_min: number,
  t_ms: number,
  horizonDays: number = OPENING_HORIZON_DAYS,
): number | null {
  const wasOpen = isOpenAt(hours, utcOffset_min, t_ms);
  const day0 = localDay(t_ms, utcOffset_min);
  const offset_ms = utcOffset_min * MS_PER_MIN;
  const candidates: number[] = [];
  for (let day = day0; day <= day0 + horizonDays; day += 1) {
    const dayStart_ms = day * MS_PER_DAY - offset_ms;
    candidates.push(dayStart_ms);
    for (const [start, end] of intervalsOfDay(hours, day)) {
      candidates.push(dayStart_ms + start * MS_PER_MIN, dayStart_ms + end * MS_PER_MIN);
    }
  }
  const sorted = [...new Set(candidates)].filter((c) => c > t_ms).sort((a, b) => a - b);
  return sorted.find((c) => isOpenAt(hours, utcOffset_min, c) !== wasOpen) ?? null;
}

/** R29 notice time, or null when it would fall before the run even started. */
export function closingSoonAt(
  closesAt_ms: number | null,
  startedAt_ms: number,
  closingSoonNotice_s: number,
): number | null {
  if (closesAt_ms === null) return null;
  const at_ms = closesAt_ms - closingSoonNotice_s * MS_PER_S;
  return at_ms > startedAt_ms ? at_ms : null;
}
