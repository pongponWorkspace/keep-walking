// Evaluates the P2-F05-T20 vectors (movement-gate, reward-window, run-state, check-in, speed-lock,
// partial-tick, opening-hours) from their self-contained input. input.fn names the function.
// Samples come inline (`samples`) or from a committed trace (`trace`, `polygon`, `every`, `phase`).
// Returns undefined for an fn this module does not own.
import type { ClockInterval, GateParams, PartialTickParams, Sample } from './gate';
import { MS_PER_S, partialTick, passesGate, runGate, tauAt } from './gate';
import type { DistanceStep, OpeningHours } from './opening-hours';
import { closingSoonAt, displayDistance_m, isOpenAt, openingChangeAfter } from './opening-hours';
import type {
  CheckInParams,
  HysteresisParams,
  PresenceSample,
  RunStateParams,
  Side,
  SpeedLockParams,
} from './presence';
import {
  Hysteresis,
  checkIn,
  clockCheck,
  runTimeline,
  sampleTimeGate,
  speedLockTransitions,
} from './presence';
import type { LootRarity } from './rng-contract';
import { deriveSeed, streamRng } from '@keep-walking/shared/formulas';
import type { StreamTag } from '@keep-walking/shared/formulas';
import { rollTickLoot } from './rng-contract';
import { loadTraceSamples } from './traces';

type In = Record<string, unknown>;

function n(input: In, key: string): number {
  const v = input[key];
  if (typeof v !== 'number') throw new Error(`vector input "${key}" must be a number`);
  return v;
}
function nOrNull(input: In, key: string): number | null {
  const v = input[key];
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number') throw new Error(`vector input "${key}" must be a number or null`);
  return v;
}
function s(input: In, key: string): string {
  const v = input[key];
  if (typeof v !== 'string') throw new Error(`vector input "${key}" must be a string`);
  return v;
}
/** ADR 0003 6.2 stream tags; anything else is a vector error, not a new stream. */
export function streamTagOf(input: In): StreamTag {
  const tag = s(input, 'streamTag');
  if (tag !== 'drop' && tag !== 'hit') throw new Error(`unknown streamTag "${tag}"`);
  return tag;
}
function o<T>(input: In, key: string): T {
  const v = input[key];
  if (typeof v !== 'object' || v === null)
    throw new Error(`vector input "${key}" must be an object`);
  return v as T;
}

/** Inline samples (boundaryDistance_m defaults to +Infinity when a vector does not need it). */
export function samplesOf(input: In): PresenceSample[] {
  if (typeof input['trace'] === 'string') {
    return loadTraceSamples({
      trace: s(input, 'trace'),
      polygon: (input['polygon'] as string | null | undefined) ?? null,
      every: n(input, 'every'),
      phase: n(input, 'phase'),
    });
  }
  return o<In[]>(input, 'samples').map((x) => ({
    t_ms: n(x, 't_ms'),
    lat: n(x, 'lat'),
    lng: n(x, 'lng'),
    accuracy_m: n(x, 'accuracy_m'),
    inside: x['inside'] !== false,
    boundaryDistance_m: nOrNull(x, 'boundaryDistance_m') ?? Number.POSITIVE_INFINITY,
  }));
}

function windowEnds(clock: readonly ClockInterval[], tau_ms: number): number | null {
  let acc = 0;
  for (const c of clock) {
    const len = c.end_ms === null ? Number.POSITIVE_INFINITY : c.end_ms - c.start_ms;
    if (acc + len >= tau_ms) return c.start_ms + (tau_ms - acc);
    acc += len;
  }
  return null;
}

function gateWindows(input: In) {
  const p = o<GateParams>(input, 'params');
  const clock = o<ClockInterval[]>(input, 'clock');
  const r = runGate(samplesOf(input) as Sample[], clock, p, nOrNull(input, 'endAt_ms'));
  const window_ms = p.window_s * MS_PER_S;
  return {
    windows: r.windows.map((w) => ({ ...w, endAt_ms: windowEnds(clock, (w.k + 1) * window_ms) })),
    open: r.open,
    droppedAccuracy: r.droppedAccuracy,
    droppedSpeed: r.droppedSpeed,
  };
}

function hysteresis(input: In) {
  const h = new Hysteresis(s(input, 'initialSide') as Side, o<HysteresisParams>(input, 'params'));
  const out: { to: Side; at_ms: number }[] = [];
  for (const x of o<In[]>(input, 'observations')) {
    const at = h.feed({
      t_ms: n(x, 't_ms'),
      lat: 0,
      lng: 0,
      accuracy_m: 0,
      inside: x['inside'] === true,
      boundaryDistance_m: n(x, 'boundaryDistance_m'),
    });
    if (at !== null) out.push({ to: h.side, at_ms: at });
  }
  return out;
}

function checkInTimeline(input: In) {
  const p = o<CheckInParams>(input, 'params');
  const all = samplesOf(input);
  const out: { t_ms: number; ok: boolean; reason: string | null; readyIn_s: number | null }[] = [];
  for (const x of all) {
    const r = checkIn(all, x.t_ms, p);
    const last = out.at(-1);
    if (last === undefined || last.ok !== r.ok || last.reason !== r.reason)
      out.push({ t_ms: x.t_ms, ...r });
  }
  return out;
}

export function evaluateGateVector(input: In): unknown {
  switch (input['fn']) {
    case 'passesGate':
      return passesGate(n(input, 'distance_m'), n(input, 'minDistance_m'), s(input, 'comparison'));
    case 'gateWindows':
      return gateWindows(input);
    case 'tauAt':
      return tauAt(n(input, 't_ms'), o<ClockInterval[]>(input, 'clock'));
    case 'windowIndexOf':
      return Math.ceil(n(input, 'tau_ms') / (n(input, 'window_s') * MS_PER_S)) - 1;
    case 'partialTick':
      return partialTick(
        n(input, 'elapsed_ms'),
        n(input, 'distance_m'),
        o<PartialTickParams>(input, 'params'),
      );
    case 'edgeHysteresis':
      return hysteresis(input);
    case 'runTimeline':
      return runTimeline(
        samplesOf(input),
        n(input, 'confirmAt_ms'),
        n(input, 'now_ms'),
        o<RunStateParams>(input, 'params'),
      );
    case 'sampleTimeGate':
      return sampleTimeGate(
        n(input, 't_ms'),
        n(input, 'now_ms'),
        nOrNull(input, 'lastSample_ms'),
        nOrNull(input, 'settled_ms'),
        n(input, 'clockSkewTolerance_s'),
      );
    case 'clockCheck':
      return clockCheck(
        n(input, 'now_ms'),
        nOrNull(input, 'lastNow_ms'),
        n(input, 'clockSkewTolerance_s'),
      );
    case 'checkIn':
      return checkIn(samplesOf(input), n(input, 'now_ms'), o<CheckInParams>(input, 'params'));
    case 'checkInTimeline':
      return checkInTimeline(input);
    case 'speedLock':
      return speedLockTransitions(samplesOf(input), o<SpeedLockParams>(input, 'params'));
    case 'deriveSeed':
      return deriveSeed(n(input, 'runSeed'), streamTagOf(input), n(input, 'index'));
    case 'streamDraws': {
      const rng = streamRng(n(input, 'runSeed'), streamTagOf(input), n(input, 'index'));
      return Array.from({ length: n(input, 'count') }, () => rng());
    }
    case 'rollTickLoot':
      return rollTickLoot(
        n(input, 'runSeed'),
        n(input, 'dropIndex'),
        o<LootRarity[]>(input, 'table'),
        n(input, 'f'),
      );
    case 'isOpenAt':
      return isOpenAt(o<OpeningHours>(input, 'hours'), n(input, 'utcOffset_min'), n(input, 't_ms'));
    case 'openingChangeAfter':
      return openingChangeAfter(
        o<OpeningHours>(input, 'hours'),
        n(input, 'utcOffset_min'),
        n(input, 't_ms'),
      );
    case 'closingSoonAt':
      return closingSoonAt(
        nOrNull(input, 'closesAt_ms'),
        n(input, 'startedAt_ms'),
        n(input, 'closingSoonNotice_s'),
      );
    case 'displayDistance':
      return displayDistance_m(n(input, 'distance_m'), o<DistanceStep[]>(input, 'steps'));
    default:
      return undefined;
  }
}
