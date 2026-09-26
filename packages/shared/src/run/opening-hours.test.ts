// Direct unit tests of the midnight-crossing merge in `openingChangeAfter` (tech note F04 8.2):
// design/systems/test-vectors/opening-hours.json exercises isOpenAt / closingSoonAt and the
// non-crossing case of openingChangeAfter exhaustively; this file adds the one shape those
// vectors do not: a night market that closes after midnight, split by `tools/dungeons` into two
// weekday intervals that must still read as ONE uninterrupted open period.
import { describe, expect, it } from 'vitest';
import { openingChangeAfter, type OpeningHours } from './opening-hours';

const UTC_OFFSET_BANGKOK_MIN = 420;
const MS_PER_MIN = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MIN;

/** 2026-01-05 (Mon) 00:00 Bangkok, as an epoch ms (deliberately not `new Date()`: fixed offset
 * arithmetic only, matching the run module's own rule against reading the device time zone). */
const MON_2026_01_05_MIDNIGHT_BANGKOK_MS = 1_767_546_000_000;

/** Open 18:00 Sat through 02:00 Sun: split at midnight into Sat [1080,1440) + Sun [0,120). */
const NIGHT_MARKET: OpeningHours = {
  weekly: {
    '1': [],
    '2': [],
    '3': [],
    '4': [],
    '5': [],
    '6': [[1080, 1440]],
    '7': [[0, 120]],
  },
};

describe('openingChangeAfter (midnight-crossing merge)', () => {
  it('a run started mid-evening on Saturday sees one continuous close at 02:00 Sunday', () => {
    const saturdayEighteenTen_ms =
      MON_2026_01_05_MIDNIGHT_BANGKOK_MS +
      5 * 24 * MS_PER_HOUR +
      18 * MS_PER_HOUR +
      10 * MS_PER_MIN;
    const closesAt_ms = openingChangeAfter(
      NIGHT_MARKET,
      UTC_OFFSET_BANGKOK_MIN,
      saturdayEighteenTen_ms,
    );
    const expectedClose_ms =
      MON_2026_01_05_MIDNIGHT_BANGKOK_MS + 6 * 24 * MS_PER_HOUR + 2 * MS_PER_HOUR;
    expect(closesAt_ms).toBe(expectedClose_ms);
  });

  it('the market is still open right at midnight (the two halves are one period)', () => {
    const midnight_ms = MON_2026_01_05_MIDNIGHT_BANGKOK_MS + 6 * 24 * MS_PER_HOUR;
    const closesAt_ms = openingChangeAfter(NIGHT_MARKET, UTC_OFFSET_BANGKOK_MIN, midnight_ms);
    const expectedClose_ms = midnight_ms + 2 * MS_PER_HOUR;
    expect(closesAt_ms).toBe(expectedClose_ms);
  });

  it('null when nothing changes within the search horizon (never open, e.g. a draft dungeon)', () => {
    const neverOpen: OpeningHours = {
      weekly: { '1': [], '2': [], '3': [], '4': [], '5': [], '6': [], '7': [] },
    };
    expect(
      openingChangeAfter(neverOpen, UTC_OFFSET_BANGKOK_MIN, MON_2026_01_05_MIDNIGHT_BANGKOK_MS),
    ).toBeNull();
  });
});
