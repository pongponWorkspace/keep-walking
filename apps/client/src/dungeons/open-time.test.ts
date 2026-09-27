import { describe, expect, it } from 'vitest';
import { formatOpenTime } from './open-time';
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
