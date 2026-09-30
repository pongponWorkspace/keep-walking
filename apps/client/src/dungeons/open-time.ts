/**
 * Formats `OpeningView.changesAt_ms`/`selectOpening`'s next-change instant (`@keep-walking/shared/
 * session`) into `{openTime}` (copy gate P2-X37 C-04, `copy.th.json#_variables.openTime`): never a
 * raw epoch-ms number on screen. Uses `unit.today`/`unit.tomorrow`/`unit.onWeekday` + a zero-padded
 * 24h HH:mm clock, evaluated at the fixed Bangkok offset (`config/balance/dungeons.json#
 * openingHours.utcOffset_min`, ADR 0003 9.2 — Bangkok has no DST, so this never reads the device's
 * own time zone).
 */
import { formatCopyText } from '../copy/format';
import { getCopyText } from '../copy/load';

const MS_PER_MIN = 60_000;
const MIN_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MIN_PER_DAY = HOURS_PER_DAY * MIN_PER_HOUR;
const MS_PER_DAY = MIN_PER_DAY * MS_PER_MIN;
const DAYS_TO_TOMORROW = 1;
/** `Date.UTC(1970, 0, 1)` (epoch day 0) is a Thursday — index 4 of this array (`weekday.<enum>`,
 * `copy.th.json`, Sunday-first per the GDD's own `weekday.*` table). */
const WEEKDAY_KEYS = [
  'weekday.sunday',
  'weekday.monday',
  'weekday.tuesday',
  'weekday.wednesday',
  'weekday.thursday',
  'weekday.friday',
  'weekday.saturday',
] as const;
const EPOCH_DAY_ZERO_WEEKDAY_INDEX = 4;
const DAYS_PER_WEEK = 7;

function localDayIndex(ms: number, utcOffsetMin: number): number {
  return Math.floor((ms + utcOffsetMin * MS_PER_MIN) / MS_PER_DAY);
}

function localClockText(ms: number, utcOffsetMin: number): string {
  const localMs = ms + utcOffsetMin * MS_PER_MIN;
  const minuteOfDay =
    ((Math.floor(localMs / MS_PER_MIN) % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
  const hh = Math.floor(minuteOfDay / MIN_PER_HOUR);
  const mm = minuteOfDay % MIN_PER_HOUR;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}`;
}

function localWeekdayIndex(ms: number, utcOffsetMin: number): number {
  const dayIndex = localDayIndex(ms, utcOffsetMin);
  return (
    (((dayIndex + EPOCH_DAY_ZERO_WEEKDAY_INDEX) % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK
  );
}

/** `changesAt_ms` must be a real instant (`OpeningView.changesAt_ms !== null`, checked by the
 * caller) — this module never guesses a time. */
export function formatOpenTime(changesAt_ms: number, now_ms: number, utcOffsetMin: number): string {
  const clockText = localClockText(changesAt_ms, utcOffsetMin);
  const dayDiff = localDayIndex(changesAt_ms, utcOffsetMin) - localDayIndex(now_ms, utcOffsetMin);
  if (dayDiff <= 0) {
    return formatCopyText('unit.today', { clockText });
  }
  if (dayDiff === DAYS_TO_TOMORROW) {
    return formatCopyText('unit.tomorrow', { clockText });
  }
  const weekdayKey = WEEKDAY_KEYS[localWeekdayIndex(changesAt_ms, utcOffsetMin)] ?? WEEKDAY_KEYS[0];
  const weekdayName = getCopyText(weekdayKey);
  return formatCopyText('unit.onWeekday', { weekdayName, clockText });
}

const DAYS_SINCE_YESTERDAY = 1;
const DAYS_SINCE_TODAY_OR_LATER = 0;

/**
 * The past-time counterpart of `formatOpenTime` (C6-07, F06 copy gate, flow F06 20.3): `pastMs` is
 * an instant already in the past (`RunSummary.endedAt_ms`) rather than a future opening-hours
 * change, so the day-diff direction flips (`now` minus `past`, not `past` minus `now`) and the
 * middle bucket is `unit.yesterday` instead of `unit.tomorrow`. `dayDiff <= 0` (same local day, or a
 * clock skew that puts `pastMs` in "the future" of today) still reads as `unit.today` — reuses every
 * private helper above verbatim, no new export beyond this one function (flow F06 20.3 item 2).
 */
export function formatPastTime(pastMs: number, nowMs: number, utcOffsetMin: number): string {
  const clockText = localClockText(pastMs, utcOffsetMin);
  const dayDiff = localDayIndex(nowMs, utcOffsetMin) - localDayIndex(pastMs, utcOffsetMin);
  if (dayDiff <= DAYS_SINCE_TODAY_OR_LATER) {
    return formatCopyText('unit.today', { clockText });
  }
  if (dayDiff === DAYS_SINCE_YESTERDAY) {
    return formatCopyText('unit.yesterday', { clockText });
  }
  const weekdayKey = WEEKDAY_KEYS[localWeekdayIndex(pastMs, utcOffsetMin)] ?? WEEKDAY_KEYS[0];
  const weekdayName = getCopyText(weekdayKey);
  return formatCopyText('unit.onWeekday', { weekdayName, clockText });
}
