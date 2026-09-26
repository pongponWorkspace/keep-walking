/**
 * Opening-hours evaluation for **display only** (F04-R25..R30, tech note F04 section 8):
 * `dungeon.closedBody` ("เปิดอีกที {openTime}") and the map's `closed` chip (components.md 13.1)
 * need this before `sessionStep` enforces it.
 *
 * `packages/shared/src/session/reducer.ts` documents opening hours as a known Phase 2 gap
 * ("Opening hours ... are not wired in this pass: every dungeon is treated as always open") —
 * P2-F05-T08 has not composed `packages/shared/src/run/opening-hours.ts` into `sessionStep` yet,
 * and `apps/client` is banned by lint from importing `@keep-walking/shared/run` directly (ADR 0003
 * section 3). Until that lands, the F04-02 "closed" screen (B4) and the closing-soon chip need a
 * client-side answer *now*, so this file is a clean-room, algorithm-only port of that same module
 * (not a copy-paste — no `@keep-walking/shared` import at all) verified against the identical
 * golden vectors in `design/systems/test-vectors/opening-hours.json` (`isOpenAt`,
 * `openingChangeAfter`). When P2-F05-T08 wires the real thing into `session`'s selectors, this file
 * should be deleted and replaced by that selector's result (handoff in this task's report).
 *
 * apps/client never *decides check-in* from this (that would fork the movement-gate/check-in
 * logic) — it only decides what the map/popup shows before the player even tries to enter.
 */
import { MS_PER_S } from '@keep-walking/geo';

const MS_PER_MIN = 60_000;
const MIN_PER_DAY = 1440;
const MS_PER_DAY = MIN_PER_DAY * MS_PER_MIN;
const DAYS_PER_WEEK = 7;
/** 1970-01-01 (day 0) was a Thursday: ISO weekday = ((day + shift) mod 7) + 1. */
const EPOCH_WEEKDAY_SHIFT = 3;
export const OPENING_HORIZON_DAYS = 8;
const ISO_DATE_LENGTH = 10;

export type OpeningInterval = readonly [number, number];

export interface OpeningHours {
  readonly weekly: Readonly<Record<string, readonly OpeningInterval[]>>;
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

function isoDateOfDay(day: number): string {
  return new Date(day * MS_PER_DAY).toISOString().slice(0, ISO_DATE_LENGTH);
}

function intervalsOfDay(hours: OpeningHours, day: number): readonly OpeningInterval[] {
  const exception = hours.exceptions?.find((e) => e.date === isoDateOfDay(day));
  return exception?.intervals ?? hours.weekly[String(isoWeekday(day))] ?? [];
}

export function isOpenAt(hours: OpeningHours, utcOffset_min: number, t_ms: number): boolean {
  const local_ms = t_ms + utcOffset_min * MS_PER_MIN;
  const day = Math.floor(local_ms / MS_PER_DAY);
  const msOfDay = local_ms - day * MS_PER_DAY;
  return intervalsOfDay(hours, day).some(
    ([start, end]) => start * MS_PER_MIN <= msOfDay && msOfDay < end * MS_PER_MIN,
  );
}

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

export function closingSoonAt(
  closesAt_ms: number | null,
  startedAt_ms: number,
  closingSoonNotice_s: number,
): number | null {
  if (closesAt_ms === null) return null;
  const at_ms = closesAt_ms - closingSoonNotice_s * MS_PER_S;
  return at_ms > startedAt_ms ? at_ms : null;
}

/** Next instant the dungeon opens (or `null` within the horizon — B4's `dungeon.closedEmergencyBody`
 * fallback), for display only. `undefined` when already open at `t_ms`. */
export function nextOpenAt(
  hours: OpeningHours,
  utcOffset_min: number,
  t_ms: number,
): number | null | undefined {
  if (isOpenAt(hours, utcOffset_min, t_ms)) {
    return undefined;
  }
  return openingChangeAfter(hours, utcOffset_min, t_ms);
}
