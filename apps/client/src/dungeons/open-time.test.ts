import { describe, expect, it } from 'vitest';
import { formatOpenTime, formatPastTime } from './open-time';
import { formatCopyText } from '../copy/format';
import { getCopyText } from '../copy/load';

const BANGKOK_UTC_OFFSET_MIN = 420;

describe('formatOpenTime (copy gate C-04)', () => {
  it('formats a same local-day change as unit.today + HH:mm', () => {
    const now_ms = Date.parse('2026-09-28T10:00:00+07:00');
    const changesAt_ms = Date.parse('2026-09-28T16:00:00+07:00');
    const text = formatOpenTime(changesAt_ms, now_ms, BANGKOK_UTC_OFFSET_MIN);
    expect(text).toBe(formatCopyText('unit.today', { clockText: '16:00' }));
    expect(text).not.toMatch(/^\d+$/);
  });

  it('formats a next local-day change as unit.tomorrow + HH:mm', () => {
    const now_ms = Date.parse('2026-09-28T23:00:00+07:00');
    const changesAt_ms = Date.parse('2026-09-29T05:00:00+07:00');
    expect(formatOpenTime(changesAt_ms, now_ms, BANGKOK_UTC_OFFSET_MIN)).toBe(
      formatCopyText('unit.tomorrow', { clockText: '05:00' }),
    );
  });

  it('formats a change more than a day out as unit.onWeekday + weekday name + HH:mm', () => {
    // 2026-09-28 is a Monday (qa's own fixture assumption, f04-app.test.ts); the following
    // Saturday is 2026-10-03.
    const now_ms = Date.parse('2026-09-28T10:00:00+07:00');
    const changesAt_ms = Date.parse('2026-10-03T09:00:00+07:00');
    const text = formatOpenTime(changesAt_ms, now_ms, BANGKOK_UTC_OFFSET_MIN);
    expect(text).toBe(
      formatCopyText('unit.onWeekday', {
        weekdayName: getCopyText('weekday.saturday'),
        clockText: '09:00',
      }),
    );
  });

  it('never leaves a raw epoch-ms number on screen (C-04)', () => {
    const now_ms = Date.parse('2026-09-28T10:00:00+07:00');
    const changesAt_ms = Date.parse('2026-09-28T16:00:00+07:00');
    const text = formatOpenTime(changesAt_ms, now_ms, BANGKOK_UTC_OFFSET_MIN);
    expect(text).not.toContain(String(changesAt_ms));
  });

  it('zero-pads minutes and hours', () => {
    const now_ms = Date.parse('2026-09-28T00:00:00+07:00');
    const changesAt_ms = Date.parse('2026-09-28T05:05:00+07:00');
    expect(formatOpenTime(changesAt_ms, now_ms, BANGKOK_UTC_OFFSET_MIN)).toBe(
      formatCopyText('unit.today', { clockText: '05:05' }),
    );
  });
});

describe('formatPastTime (F06 copy gate C6-07, flow F06 20.3)', () => {
  it('formats a same local-day past instant as unit.today + HH:mm', () => {
    const now_ms = Date.parse('2026-09-28T20:00:00+07:00');
    const pastMs = Date.parse('2026-09-28T16:00:00+07:00');
    expect(formatPastTime(pastMs, now_ms, BANGKOK_UTC_OFFSET_MIN)).toBe(
      formatCopyText('unit.today', { clockText: '16:00' }),
    );
  });

  it('a clock-skew instant that reads as "later today" still uses unit.today, never a negative day', () => {
    const now_ms = Date.parse('2026-09-28T10:00:00+07:00');
    const pastMs = Date.parse('2026-09-28T16:00:00+07:00');
    expect(formatPastTime(pastMs, now_ms, BANGKOK_UTC_OFFSET_MIN)).toBe(
      formatCopyText('unit.today', { clockText: '16:00' }),
    );
  });

  it('formats yesterday as unit.yesterday + HH:mm', () => {
    const now_ms = Date.parse('2026-09-28T10:00:00+07:00');
    const pastMs = Date.parse('2026-09-27T18:30:00+07:00');
    expect(formatPastTime(pastMs, now_ms, BANGKOK_UTC_OFFSET_MIN)).toBe(
      formatCopyText('unit.yesterday', { clockText: '18:30' }),
    );
  });

  it('formats 2+ days back as unit.onWeekday + weekday name of the past instant + HH:mm', () => {
    // 2026-09-28 is a Monday (qa's own fixture assumption, f04-app.test.ts); the previous Saturday
    // is 2026-09-26.
    const now_ms = Date.parse('2026-09-28T10:00:00+07:00');
    const pastMs = Date.parse('2026-09-26T09:00:00+07:00');
    expect(formatPastTime(pastMs, now_ms, BANGKOK_UTC_OFFSET_MIN)).toBe(
      formatCopyText('unit.onWeekday', {
        weekdayName: getCopyText('weekday.saturday'),
        clockText: '09:00',
      }),
    );
  });

  it('formats a past instant more than 7 days back with the same unit.onWeekday rule (flow F06 20.3 item 2)', () => {
    const now_ms = Date.parse('2026-09-28T10:00:00+07:00');
    const pastMs = Date.parse('2026-09-10T09:00:00+07:00'); // a Thursday, 18 days back
    expect(formatPastTime(pastMs, now_ms, BANGKOK_UTC_OFFSET_MIN)).toBe(
      formatCopyText('unit.onWeekday', {
        weekdayName: getCopyText('weekday.thursday'),
        clockText: '09:00',
      }),
    );
  });

  it('never leaves a raw epoch-ms number on screen', () => {
    const now_ms = Date.parse('2026-09-28T10:00:00+07:00');
    const pastMs = Date.parse('2026-09-28T09:00:00+07:00');
    const text = formatPastTime(pastMs, now_ms, BANGKOK_UTC_OFFSET_MIN);
    expect(text).not.toContain(String(pastMs));
  });
});
