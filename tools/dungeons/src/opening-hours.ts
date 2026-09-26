// OSM opening_hours → normalized weekly table (docs/tech/F04-dungeon-presence.md 8.1).
// Restricted grammar only (ADR 0003 9.2, no opening_hours library):
//   text  := "24/7" | rule (";" rule)*
//   rule  := [days] spans | days ("off" | "closed")
//   days  := day ["-" day] ("," day ["-" day])*        day := Mo Tu We Th Fr Sa Su
//   spans := HH:MM "-" HH:MM ("," HH:MM "-" HH:MM)*
// Semantics: days not named by any rule are closed; a later rule replaces the times of the days
// it names; a rule without days names every day. A span that ends at or before its start, or
// after 24:00, runs past midnight: the part after midnight is added to the next day after all
// rules are applied (a later "Sa off" does not remove Friday's spill-over into Saturday).
// Anything else (PH, SH, sunrise, sunset, comments, weeks, months, "+", "||") is outside the
// grammar and returns { ok: false } so the record becomes manual_required.
import type { HoursException, Interval, IsoWeekday, Weekly } from './types';

export const MINUTES_PER_DAY = 1440;
const MINUTES_PER_HOUR = 60;
const DAYS_PER_WEEK = 7;
const MAX_END_HOUR = 48;
const ALL_DAYS = Array.from({ length: DAYS_PER_WEEK }, (_, i) => i);
export const ISO_WEEKDAYS: readonly IsoWeekday[] = ['1', '2', '3', '4', '5', '6', '7'];
const DAY_TOKENS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

export type HoursParse = { ok: true; weekly: Weekly } | { ok: false; reason: string };

const OUTSIDE_GRAMMAR =
  /\b(PH|SH|sunrise|sunset|dawn|dusk|week|easter|open|unknown|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|["[\]+|]/;
const TIME = /^([0-9]{1,2}):([0-5][0-9])$/;

export function emptyWeekly(): Weekly {
  return { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [], '7': [] };
}

function dayIndex(token: string): number {
  return DAY_TOKENS.indexOf(token as (typeof DAY_TOKENS)[number]);
}

/** "Mo-Fr,Su" → [0,1,2,3,4,6]; wraps (Sa-Mo = Sa, Su, Mo). null when a token is not a day. */
function parseDays(text: string): number[] | null {
  const out = new Set<number>();
  for (const part of text.split(',')) {
    const [from, to, extra] = part.split('-');
    if (extra !== undefined || from === undefined) return null;
    const a = dayIndex(from);
    const b = to === undefined ? a : dayIndex(to);
    if (a < 0 || b < 0) return null;
    for (let d = a; ; d = (d + 1) % DAYS_PER_WEEK) {
      out.add(d);
      if (d === b) break;
    }
  }
  return [...out].sort((x, y) => x - y);
}

function parseTime(text: string, maxHour: number): number | null {
  const m = TIME.exec(text);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > maxHour || (h === maxHour && min > 0)) return null;
  return h * MINUTES_PER_HOUR + min;
}

/** "07:00-12:00,13:00-02:00" → [[420,720],[780,1560]] (end > 1440 = runs past midnight). */
function parseSpans(text: string): Interval[] | string {
  const out: Interval[] = [];
  for (const span of text.split(',')) {
    const [a, b, extra] = span.split('-');
    if (a === undefined || b === undefined || extra !== undefined) return `bad time span "${span}"`;
    const start = parseTime(a, MINUTES_PER_DAY / MINUTES_PER_HOUR - 1);
    let end = parseTime(b, MAX_END_HOUR);
    if (start === null || end === null) return `bad time span "${span}"`;
    if (end === start) return `zero-length or ambiguous span "${span}"`;
    if (end < start) end += MINUTES_PER_DAY;
    if (end - start > MINUTES_PER_DAY) return `span longer than a day "${span}"`;
    out.push([start, end]);
  }
  return out;
}

/** Sort and merge overlapping or touching intervals of one day. */
export function mergeIntervals(intervals: readonly Interval[]): Interval[] {
  const sorted = [...intervals].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const out: Interval[] = [];
  for (const [s, e] of sorted) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

export function parseOpeningHours(raw: string): HoursParse {
  const text = raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/ ?([,-]) ?/g, '$1');
  if (text === '24/7') {
    const weekly = emptyWeekly();
    for (const d of ISO_WEEKDAYS) weekly[d] = [[0, MINUTES_PER_DAY]];
    return { ok: true, weekly };
  }
  const bad = OUTSIDE_GRAMMAR.exec(text);
  if (bad) return { ok: false, reason: `outside the restricted grammar: "${bad[0]}"` };
  const own: Interval[][] = Array.from({ length: DAYS_PER_WEEK }, () => []);
  const rules = text.split(';').map((r) => r.trim());
  if (rules.some((r) => r === '')) return { ok: false, reason: 'empty rule' };
  for (const rule of rules) {
    const words = rule.split(' ');
    if (words.length > 2) return { ok: false, reason: `unsupported rule "${rule}"` };
    const hasDays = words.length === 2;
    const days = hasDays ? parseDays(words[0] as string) : ALL_DAYS;
    if (days === null) return { ok: false, reason: `bad day selector in "${rule}"` };
    const body = words[words.length - 1] as string;
    let spans: Interval[];
    if (body === 'off' || body === 'closed') {
      if (!hasDays) return { ok: false, reason: `"${body}" without days` };
      spans = [];
    } else {
      const parsed = parseSpans(body);
      if (typeof parsed === 'string') return { ok: false, reason: parsed };
      spans = parsed;
    }
    for (const d of days) own[d] = spans;
  }
  const perDay: Interval[][] = Array.from({ length: DAYS_PER_WEEK }, () => []);
  own.forEach((spans, d) => {
    for (const [s, e] of spans) {
      perDay[d]?.push([s, Math.min(e, MINUTES_PER_DAY)]);
      if (e > MINUTES_PER_DAY) perDay[(d + 1) % DAYS_PER_WEEK]?.push([0, e - MINUTES_PER_DAY]);
    }
  });
  const weekly = emptyWeekly();
  ISO_WEEKDAYS.forEach((key, d) => {
    weekly[key] = mergeIntervals(perDay[d] ?? []);
  });
  return { ok: true, weekly };
}

const DATE = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/;
const MONTHS_PER_YEAR = 12;
/** Real calendar date (UTC arithmetic, no timezone involved). */
function isRealDate(date: string): boolean {
  const m = DATE.exec(date);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return mo >= 1 && mo <= MONTHS_PER_YEAR && d >= 1 && d <= daysInMonth;
}

function intervalProblems(where: string, intervals: readonly Interval[]): string[] {
  return intervals.flatMap(([s, e]) =>
    Number.isInteger(s) && Number.isInteger(e) && s >= 0 && s < e && e <= MINUTES_PER_DAY
      ? []
      : [`${where}: interval [${s}, ${e}] is not 0 <= start < end <= ${MINUTES_PER_DAY}`],
  );
}

export interface NormalizedHours {
  weekly: Weekly;
  exceptions: HoursException[];
  problems: string[];
}

/**
 * Check and canonicalize a weekly table plus exceptions (manual tables, and exceptions attached to
 * an OSM text): intervals merged and sorted per day, exceptions sorted by date without notes.
 */
export function normalizeTable(
  weekly: Weekly,
  exceptions: readonly HoursException[] = [],
): NormalizedHours {
  const problems: string[] = [];
  const out = emptyWeekly();
  for (const d of ISO_WEEKDAYS) {
    problems.push(...intervalProblems(`weekday ${d}`, weekly[d]));
    out[d] = mergeIntervals(weekly[d]);
  }
  const seen = new Set<string>();
  const ex: HoursException[] = [];
  for (const e of exceptions) {
    if (!isRealDate(e.date)) problems.push(`exception date ${e.date} is not a calendar date`);
    if (seen.has(e.date)) problems.push(`exception date ${e.date} appears twice`);
    seen.add(e.date);
    problems.push(...intervalProblems(`exception ${e.date}`, e.intervals));
    ex.push({ date: e.date, intervals: mergeIntervals(e.intervals) });
  }
  ex.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { weekly: out, exceptions: ex, problems };
}
