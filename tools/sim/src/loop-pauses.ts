// A seeded run with outside periods (P2-H47, tech note F06 13.5, spec F06 R06-R07/R10, D-094,
// D-096, combat.json#attackCheck._note). Grace and Suspended stop active time tau: no reward tick,
// no attempt, no Support heal, no regen (dungeons.json#runState rewardTickDuring* = false,
// suspendedTimeCounts = false). The hit clock and the reward windows resume where they stopped,
// never reset. So the run in tau is exactly `runLoop` without pauses; only the real time of each
// event moves. Real time rule: real(tau) = tau + sum of duration_s of every pause with
// atTau_s < tau (strict: an event due at exactly atTau_s happens before the player leaves).
import type { LoopEvent, LoopInput, LoopResult } from './loop';
import { runLoop } from './loop';

export interface Pause {
  /** Active time at which the player leaves the dungeon. */
  atTau_s: number;
  /** Real seconds outside before coming back (Grace up to graceMax_s, then Suspended). */
  duration_s: number;
}

export interface PauseParams {
  graceMax_s: number;
  suspendedMax_s: number;
}

export interface PauseSummary {
  atTau_s: number;
  duration_s: number;
  /** false when the run ended (in tau) at or before atTau_s: the pause never happened. */
  reached: boolean;
  /** Real time at which the player leaves (null when not reached). */
  leftAtReal_s: number | null;
  grace_s: number;
  suspended_s: number;
}

export type PausedEvent = LoopEvent & { at_s: number };

export interface PausedLoopResult extends Omit<LoopResult, 'events'> {
  events: PausedEvent[] | null;
  pauses: PauseSummary[];
  paused_s: number;
  /** Real seconds from confirm to the end of the run (end_s stays in active time). */
  realEnd_s: number;
}

export function pauseProblems(pauses: readonly Pause[], pp: PauseParams): string[] {
  const out: string[] = [];
  pauses.forEach((q, i) => {
    if (!(q.duration_s > 0)) out.push(`pauses[${i}].duration_s must be > 0`);
    if (q.duration_s > pp.suspendedMax_s)
      out.push(`pauses[${i}].duration_s > suspendedMax_s: that is a timeout (Ended), not a pause`);
    if (!(q.atTau_s > 0)) out.push(`pauses[${i}].atTau_s must be > 0`);
    const prev = pauses[i - 1];
    if (prev !== undefined && !(q.atTau_s > prev.atTau_s))
      out.push(
        `pauses[${i}].atTau_s must be after pauses[${i - 1}] (two outside periods at one tau are one period)`,
      );
  });
  return out;
}

function realAt(tau: number, pauses: readonly Pause[]): number {
  return pauses.reduce((t, q) => (q.atTau_s < tau ? t + q.duration_s : t), tau);
}

export function runLoopWithPauses(
  input: LoopInput,
  pauses: readonly Pause[],
  pp: PauseParams,
): PausedLoopResult {
  const problems = pauseProblems(pauses, pp);
  if (problems.length > 0) throw new Error(problems.join('; '));
  const r = runLoop(input);
  const reachedPauses = pauses.filter((q) => q.atTau_s < r.end_s);
  const summaries = pauses.map((q) => {
    const reached = q.atTau_s < r.end_s;
    return {
      atTau_s: q.atTau_s,
      duration_s: q.duration_s,
      reached,
      leftAtReal_s: reached ? realAt(q.atTau_s, pauses) : null,
      grace_s: reached ? Math.min(q.duration_s, pp.graceMax_s) : 0,
      suspended_s: reached ? Math.max(0, q.duration_s - pp.graceMax_s) : 0,
    };
  });
  const events =
    r.events === null ? null : r.events.map((e) => ({ ...e, at_s: realAt(e.t_s, pauses) }));
  return {
    ...r,
    events,
    pauses: summaries,
    paused_s: reachedPauses.reduce((s, q) => s + q.duration_s, 0),
    realEnd_s: realAt(r.end_s, pauses),
  };
}
