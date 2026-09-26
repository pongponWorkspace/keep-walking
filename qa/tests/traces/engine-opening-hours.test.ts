// Real engine assertions for board acceptance "เข้าตอนปิดทำการ (ใช้ hook เวลาเริ่มของ T25)" and
// spec F04 R25-R31 / E11-E12: entry rejected while closed, the closing-soon threshold, a run that
// closes mid-run, overnight wraparound, and a manual exception date — through the actual
// `isOpenAt` / `openingChangeAfter` / `closingSoonAt` (packages/shared/src/run/opening-hours.ts,
// P2-F04-T20 DONE), not a description of expected behaviour.
//
// This does not need a GPS trace: opening hours are evaluated purely from now_ms (tech note F04
// 8.2), and Mock's `start` query hook (docs/tech/F04-dungeon-presence.md section 17) is exactly
// "pick an epoch ms and feed it as now_ms" — which this file does directly against the engine, the
// same way the black-box replay (P2-F04-T22) will pick `start` and pair it with any short walk-in
// trace (synthetic-walk-in-01 is a ready pairing; see qa/plans/F04-test-plan.md case F04-C15).
import { describe, expect, it } from 'vitest';
import type { OpeningHours } from '@keep-walking/shared/run';
import { closingSoonAt, isOpenAt, openingChangeAfter } from '@keep-walking/shared/run';
import { loadQaEngineParams } from './lib/engine-config';

const p = loadQaEngineParams();
const MS_PER_S = 1000;
const MS_PER_MIN = 60 * MS_PER_S;

/** 2026-09-28 is a Monday (weekday "1"); local 09:00-18:00 every day except Wednesday (closed)
 * and Sunday (24 h), plus one exception day fully closed (a public holiday, R26 manual_required
 * pattern once level-designer fills it in). Same [start_min, end_min) shape tools/dungeons emits
 * (tech note F04 8.1). */
const QA_HOURS: OpeningHours = {
  weekly: {
    '1': [[540, 1080]],
    '2': [[540, 1080]],
    '3': [],
    '4': [[540, 1080]],
    '5': [[540, 1080]],
    '6': [[540, 1080]],
    '7': [[0, 1440]],
  },
  exceptions: [{ date: '2026-09-30', intervals: [] }],
};

/** Local midnight of 2026-09-28 (a Monday), in epoch ms, using the same fixed UTC+7 offset the
 * engine uses (utcOffset_min, tech note F04 8.2: never the device time zone). */
const MONDAY_LOCAL_MIDNIGHT_MS = Date.UTC(2026, 8, 28, 0, 0, 0) - p.utcOffset_min * MS_PER_MIN;

function localTimeOnMonday(hh: number, mm: number): number {
  return MONDAY_LOCAL_MIDNIGHT_MS + (hh * 60 + mm) * MS_PER_MIN;
}

describe('isOpenAt — a dungeon entered while closed shows no "enter" button (F04-R27)', () => {
  it('is closed before opening and at/after closing (half-open [start, end))', () => {
    expect(isOpenAt(QA_HOURS, p.utcOffset_min, localTimeOnMonday(8, 59))).toBe(false);
    expect(isOpenAt(QA_HOURS, p.utcOffset_min, localTimeOnMonday(9, 0))).toBe(true);
    expect(isOpenAt(QA_HOURS, p.utcOffset_min, localTimeOnMonday(17, 59))).toBe(true);
    expect(isOpenAt(QA_HOURS, p.utcOffset_min, localTimeOnMonday(18, 0))).toBe(false);
  });

  it('is closed all day on the weekly-empty day (Wednesday)', () => {
    const wednesdayNoon_ms = localTimeOnMonday(12, 0) + 2 * 24 * 60 * MS_PER_MIN;
    expect(isOpenAt(QA_HOURS, p.utcOffset_min, wednesdayNoon_ms)).toBe(false);
  });

  it('is open 24 h on Sunday ([[0, 1440]], R26 "เปิด 24 ชม. ต้องระบุชัด")', () => {
    const sundayMidnight_ms = MONDAY_LOCAL_MIDNIGHT_MS + 6 * 24 * 60 * MS_PER_MIN;
    expect(isOpenAt(QA_HOURS, p.utcOffset_min, sundayMidnight_ms)).toBe(true);
    expect(isOpenAt(QA_HOURS, p.utcOffset_min, sundayMidnight_ms + 23 * 60 * MS_PER_MIN)).toBe(
      true,
    );
  });

  it('an exception date overrides the weekly table even though that weekday is normally open (2026-09-30 is a Wednesday, already closed weekly — use the Thursday exception instead)', () => {
    const exceptionHours: OpeningHours = {
      ...QA_HOURS,
      exceptions: [{ date: '2026-10-01', intervals: [] }],
    };
    const thursdayNoon_ms = localTimeOnMonday(12, 0) + 3 * 24 * 60 * MS_PER_MIN;
    expect(isOpenAt(QA_HOURS, p.utcOffset_min, thursdayNoon_ms)).toBe(true);
    expect(isOpenAt(exceptionHours, p.utcOffset_min, thursdayNoon_ms)).toBe(false);
  });
});

describe('openingChangeAfter / closingSoonAt — closing mid-run pays a partial tick, warns once (F04-R28-R31, D-059)', () => {
  it('finds the closing instant from inside the open interval', () => {
    const openNow_ms = localTimeOnMonday(10, 0);
    expect(openingChangeAfter(QA_HOURS, p.utcOffset_min, openNow_ms)).toBe(
      localTimeOnMonday(18, 0),
    );
  });

  it('finds the next opening instant from inside a closed interval (Wednesday -> Thursday 09:00)', () => {
    const wednesdayNoon_ms = localTimeOnMonday(12, 0) + 2 * 24 * 60 * MS_PER_MIN;
    const nextOpen_ms = openingChangeAfter(QA_HOURS, p.utcOffset_min, wednesdayNoon_ms);
    expect(nextOpen_ms).toBe(localTimeOnMonday(9, 0) + 3 * 24 * 60 * MS_PER_MIN);
  });

  it('the closing-soon notice fires closingSoonNotice_s before close, and never before the run started', () => {
    const startedAt_ms = localTimeOnMonday(10, 0);
    const closesAt_ms = localTimeOnMonday(18, 0);
    expect(closingSoonAt(closesAt_ms, startedAt_ms, p.closingSoonNotice_s)).toBe(
      closesAt_ms - p.closingSoonNotice_s * MS_PER_S,
    );
    // Entering with less than the notice window left to closing (E12 "เข้า 1 นาทีก่อนปิด"): the
    // notice instant would be before the run even started, so no extra warning fires.
    const startedRightBeforeClose_ms = closesAt_ms - 60 * MS_PER_S;
    expect(
      closingSoonAt(closesAt_ms, startedRightBeforeClose_ms, p.closingSoonNotice_s),
    ).toBeNull();
  });

  it('confirm is rejected exactly at the closing minute; one second earlier it is still open (half-open interval, R25)', () => {
    expect(isOpenAt(QA_HOURS, p.utcOffset_min, localTimeOnMonday(18, 0))).toBe(false);
    expect(isOpenAt(QA_HOURS, p.utcOffset_min, localTimeOnMonday(18, 0) - MS_PER_S)).toBe(true);
  });
});
