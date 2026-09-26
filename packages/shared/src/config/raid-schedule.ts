// H03: raid.schedule.endLocalTime must equal startLocalTime + durationTicks x raidTick_s
// (config/balance/raid.json _note). Pure: no Date, no timezone lookup, "HH:mm" arithmetic only,
// so it runs the same in a test, a build step, or a Worker (ADR 0003 C1-2).
import { ConfigTypeError } from './json';

const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = MINUTES_PER_HOUR * HOURS_PER_DAY;
const SECONDS_PER_MINUTE = 60;
const LOCAL_TIME_PATTERN = /^([0-9]{2}):([0-9]{2})$/;

export class RaidScheduleMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RaidScheduleMismatchError';
  }
}

export interface RaidScheduleInvariantInput {
  readonly startLocalTime: string;
  readonly endLocalTime: string;
  readonly durationTicks: number;
  readonly raidTick_s: number;
}

function parseLocalTime_min(value: string, field: string): number {
  const match = LOCAL_TIME_PATTERN.exec(value);
  if (match === null) {
    throw new ConfigTypeError(`${field} must be "HH:mm" (24 h), got "${value}"`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour >= HOURS_PER_DAY || minute >= MINUTES_PER_HOUR) {
    throw new ConfigTypeError(`${field} is out of range: "${value}"`);
  }
  return hour * MINUTES_PER_HOUR + minute;
}

function formatLocalTime(minutes: number): string {
  const hour = Math.floor(minutes / MINUTES_PER_HOUR);
  const minute = minutes % MINUTES_PER_HOUR;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Throws RaidScheduleMismatchError when endLocalTime does not equal
 * startLocalTime + durationTicks x raidTick_s (wrapped to a 24 h clock).
 * The config loader calls this once at load time so a bad edit fails loudly (H03).
 */
export function assertRaidScheduleConsistent(schedule: RaidScheduleInvariantInput): void {
  const startMin = parseLocalTime_min(schedule.startLocalTime, 'raid.schedule.startLocalTime');
  const endMin = parseLocalTime_min(schedule.endLocalTime, 'raid.schedule.endLocalTime');
  const durationSeconds = schedule.durationTicks * schedule.raidTick_s;
  if (durationSeconds % SECONDS_PER_MINUTE !== 0) {
    throw new RaidScheduleMismatchError(
      `raid.schedule.durationTicks (${schedule.durationTicks}) x raidTick_s (${schedule.raidTick_s}) ` +
        `must be a whole number of minutes, got ${durationSeconds} s`,
    );
  }
  const computedEndMin = (startMin + durationSeconds / SECONDS_PER_MINUTE) % MINUTES_PER_DAY;
  if (computedEndMin !== endMin) {
    throw new RaidScheduleMismatchError(
      `raid.schedule.endLocalTime ("${schedule.endLocalTime}") must equal startLocalTime + ` +
        `durationTicks x raidTick_s (computed "${formatLocalTime(computedEndMin)}")`,
    );
  }
}
