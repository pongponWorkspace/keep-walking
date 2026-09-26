// Time gates of one sample and of the host clock (tech note F04-dungeon-presence.md sections
// 4.2 and 4.4; ADR 0003 section 3.2 point 3-4). Pure: every threshold and every clock reading
// arrives as a parameter, nothing here reads Date.now or any ambient clock (ADR 0003 C1-2).
import { MS_PER_S } from '@keep-walking/geo';

/** Why a sample never reaches the geo filters (tech note F04 4.2). Order = order of the checks. */
export type SampleTimeGateResult = 'ok' | 'future' | 'non_monotonic' | 'late';

/**
 * Time gate of one sample before it is fed to any geo function. `lastSample_ms` is the
 * `t_ms` of the last sample that passed this gate; `settled_ms` is the settled horizon `H`
 * (tech note 4.3): a sample at or before it is re-litigating a past that is already decided.
 */
export function sampleTimeGate(
  t_ms: number,
  now_ms: number,
  lastSample_ms: number | null,
  settled_ms: number | null,
  clockSkewTolerance_s: number,
): SampleTimeGateResult {
  if (t_ms > now_ms + clockSkewTolerance_s * MS_PER_S) return 'future';
  if (lastSample_ms !== null && t_ms <= lastSample_ms) return 'non_monotonic';
  if (settled_ms !== null && t_ms <= settled_ms) return 'late';
  return 'ok';
}

/** Whether the host clock read at this step can be trusted (tech note F04 4.4, D-094). */
export type ClockCheckResult =
  /** `now_ms` moved forward, or did not move: business as usual. */
  | 'ok'
  /** `now_ms` went back within tolerance: time stands still, no event. */
  | 'held'
  /** `now_ms` went back beyond tolerance: the run ends with `clock_invalid` (E10). */
  | 'invalid';

export function clockCheck(
  now_ms: number,
  lastNow_ms: number | null,
  clockSkewTolerance_s: number,
): ClockCheckResult {
  if (lastNow_ms === null || now_ms >= lastNow_ms) return 'ok';
  return now_ms < lastNow_ms - clockSkewTolerance_s * MS_PER_S ? 'invalid' : 'held';
}
