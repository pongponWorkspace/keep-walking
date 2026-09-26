// Golden vectors of P2-F05-T20, part 2: run-state.json, check-in.json, speed-lock.json,
// opening-hours.json. Same conventions as vectors-gate.ts (reference output, tolerance 1e-6,
// parameters inline from GateConfig, example inputs named in objects below).
import type { OpeningHours } from './opening-hours';
import type { GateConfig } from './params-gate';
import type { PresenceSample } from './presence';
import { jsonSamples, offset, segment } from './synth';
import type { Segment } from './synth';
import { TEST_POLYGON, tracePath } from './traces';
import { CASE, simVec } from './vectors-gate';
import type { GateVector, GateVectorFile } from './vectors-gate';

type In = Record<string, unknown>;

/** Run-state geometry: 15 m inside / 15 m outside a straight edge, 30 m apart. */
const RS = {
  depth_m: 15,
  apart_m: -30,
  every_s: 5,
  outEvery_s: 20,
  exit_s: 100,
  tail_s: 100,
  graceEdge: { under_s: 179, at_s: 180, over_s: 181 },
  suspEdge: { under_s: 899, at_s: 900, over_s: 901 },
  interrupted: { chainStart_s: 278, chainSamples: 3, breakAfter_s: 15, returnAt_s: 298 },
  appClosed: { short_s: 300, long_s: 960, withinGap_s: 25 },
  hanging: { grace_s: 250, suspended_s: 290, ended_s: 1200 },
  stuckChain: { outUntil_s: 300, chainSamples: 3, backAt_s: 1500 },
  edgeWalkEnd_s: 1170,
  /** P-4 (F05-F06 flow approval): return into the inner band, 3 m inside the edge. */
  band: {
    from_s: 160,
    deepAt_s: 400,
    tail_s: 100,
    silentFrom_s: 1100,
    end_s: 1200,
    depth_m: 3,
    north_m: -12,
  },
  /** J-P2-T30-4 / F04 R15 item 7: no_evidence exit at 100 s, first usable sample after the gap. */
  gapReturn: {
    lastIn_s: 100,
    back_s: 220,
    shortReturn: 5,
    tail_s: 100,
    unusableAccuracy_m: 35,
    unusableLead_s: 5,
  },
} as const;

const IN = CASE.origin;
const OUT = offset(CASE.origin, RS.apart_m, 0);

function stay(
  from_s: number,
  to_s: number,
  inside: boolean,
  every_s: number = RS.every_s,
): PresenceSample[] {
  const g: Segment = {
    from_s,
    to_s,
    every_s,
    start: inside ? IN : OUT,
    accuracy_m: CASE.goodAccuracy_m,
    inside,
    boundaryDistance_m: RS.depth_m,
  };
  return to_s < from_s ? [] : segment(g);
}

/** Inside until exit, outside [exit, return), inside from return (null = never) to end. */
function episode(exit_s: number, return_s: number | null, end_s: number, outEvery_s: number) {
  // Opposite-side samples stay >= every_s apart so the 30 m step never trips the outlier filter.
  const outEnd = (return_s ?? end_s + RS.every_s) - RS.every_s;
  const out = stay(exit_s, outEnd, false, outEvery_s);
  return [
    ...stay(0, exit_s - RS.every_s, true),
    ...out,
    ...(return_s === null ? [] : stay(return_s, end_s, true)),
  ];
}

function tl(c: GateConfig, samples: PresenceSample[], now_s: number): In {
  return {
    fn: 'runTimeline',
    params: { ...c.run },
    confirmAt_ms: 0,
    now_ms: now_s * CASE.ms,
    samples: jsonSamples(samples, true),
  };
}

function outsideFor(c: GateConfig, outside_s: number, v: GateVector[], note: string) {
  const every = outside_s > c.run.graceMax_s * 2 ? RS.outEvery_s : RS.every_s;
  const ret = RS.exit_s + outside_s;
  const end = ret + RS.tail_s;
  v.push(simVec(tl(c, episode(RS.exit_s, ret, end, every), end), note));
}

const HYST = {
  far_m: 12,
  band_m: 3,
  bandRun: 20,
  bandLead: 3,
  shortRun: 5,
  every_ms: 1000,
} as const;

function obs(from: number, count: number, inside: boolean, boundaryDistance_m: number) {
  return Array.from({ length: count }, (_, i) => ({
    t_ms: (from + i) * HYST.every_ms,
    inside,
    boundaryDistance_m,
  }));
}

export function runStateVectors(c: GateConfig): GateVectorFile {
  const v: GateVector[] = [];
  const N = c.run.edgeHysteresisSamples;
  const hp = { edgeHysteresisSamples: N, edgeHysteresis_m: c.run.edgeHysteresis_m };
  const hy = (initialSide: string, observations: unknown[], note: string, params: In = hp) =>
    v.push(simVec({ fn: 'edgeHysteresis', params, initialSide, observations }, note));
  hy(
    'in',
    [...obs(0, 1, false, HYST.far_m), ...obs(1, N, true, HYST.far_m)],
    'one far outside sample (drift): no transition',
  );
  hy(
    'in',
    obs(0, N, false, HYST.far_m),
    'N consecutive outside samples beyond the band: out, back-dated to the first',
  );
  hy(
    'in',
    obs(0, HYST.bandRun, false, HYST.band_m),
    'outside samples inside the band (<= edgeHysteresis_m) never count: stays in',
  );
  hy(
    'in',
    [...obs(0, HYST.bandLead, false, HYST.band_m), ...obs(HYST.bandLead, N, false, HYST.far_m)],
    'band samples then N beyond: out, back-dated to the first band sample (F04 R14; correction to geo, which back-dates to the first counted sample)',
  );
  hy(
    'in',
    [
      ...obs(0, HYST.shortRun, false, HYST.far_m),
      ...obs(HYST.shortRun, 1, true, HYST.band_m),
      ...obs(HYST.shortRun + 1, HYST.shortRun, false, HYST.far_m),
    ],
    'an inside sample (any depth) resets the pending run: 5 + 5 beyond does not confirm',
  );
  hy(
    'out',
    obs(0, N, true, HYST.far_m),
    'return uses the same rule inward: in, back-dated to the first inside sample',
  );
  hy('in', obs(0, N, false, HYST.band_m), 'edgeHysteresis_m = 0: count only (band samples count)', {
    ...hp,
    edgeHysteresis_m: 0,
  });
  hy('in', obs(0, 1, false, HYST.far_m), 'edgeHysteresisSamples = 1: distance only', {
    ...hp,
    edgeHysteresisSamples: 1,
  });
  const g = RS.graceEdge;
  outsideFor(
    c,
    g.under_s,
    v,
    'outside 179 s then back (acceptance 4, 2:59): Grace then Active; the return run is confirmed after the 180 s edge but back-dated, so no Suspended',
  );
  outsideFor(c, g.at_s, v, 'outside exactly graceMax_s (180 s): still only Grace (<=)');
  outsideFor(c, g.over_s, v, 'outside 181 s (3:01): Suspended at exit + 180.001 s, then Active');
  const s = RS.suspEdge;
  outsideFor(c, s.under_s, v, 'outside 899 s (14:59): Suspended then Active');
  outsideFor(c, s.at_s, v, 'outside exactly suspendedMax_s (900 s): back to Active (<=)');
  outsideFor(
    c,
    s.over_s,
    v,
    'outside 901 s (15:01): Ended timeout at exit + 900 s (R18), later samples ignored',
  );
  const it = RS.interrupted;
  const inter = [
    ...stay(0, RS.exit_s - RS.every_s, true),
    ...stay(RS.exit_s, it.chainStart_s - RS.every_s, false),
    ...stay(it.chainStart_s, it.chainStart_s + (it.chainSamples - 1) * RS.every_s, true),
    ...stay(it.chainStart_s + it.breakAfter_s, it.chainStart_s + it.breakAfter_s, false),
    ...stay(it.returnAt_s, it.returnAt_s + RS.tail_s, true),
  ];
  v.push(
    simVec(
      tl(c, inter, it.returnAt_s + RS.tail_s),
      'a return run starting at 2:58 that fails (one outside sample) does not hold the timer: Suspended at 3:00.001, Active at the later run (3:18)',
    ),
  );
  const ac = RS.appClosed;
  const closed = (gap_s: number) => [
    ...stay(0, RS.exit_s, true),
    ...stay(RS.exit_s + gap_s, RS.exit_s + gap_s + RS.tail_s, true),
  ];
  v.push(
    simVec(
      tl(c, closed(ac.short_s), RS.exit_s + ac.short_s + RS.tail_s),
      'app closed 5 min then reopened inside (acceptance 6): no_evidence exit at the last usable sample, Suspended, back to Active at the first sample (run kept)',
    ),
  );
  v.push(
    simVec(
      tl(c, closed(ac.long_s), RS.exit_s + ac.long_s + RS.tail_s),
      'app closed 16 min: Ended timeout at last usable sample + 900 s (acceptance 6)',
    ),
  );
  v.push(
    simVec(
      tl(c, closed(ac.withinGap_s), RS.exit_s + ac.withinGap_s + RS.tail_s),
      'a 25 s gap (<= maxSamplePairGap_s) is not an exit',
    ),
  );
  const hang = stay(0, RS.exit_s, true);
  const h = RS.hanging;
  v.push(simVec(tl(c, hang, h.grace_s), 'no sample since 100 s, now 250 s: Grace (settled)'));
  v.push(simVec(tl(c, hang, h.suspended_s), 'no sample since 100 s, now 290 s: Suspended'));
  v.push(
    simVec(tl(c, hang, h.ended_s), 'no sample since 100 s, now 1,200 s: Ended timeout at 1,000 s'),
  );
  const st = RS.stuckChain;
  const stuck = [
    ...stay(0, RS.exit_s - RS.every_s, true),
    ...stay(RS.exit_s, st.outUntil_s - RS.every_s, false),
    ...stay(st.outUntil_s, st.outUntil_s + (st.chainSamples - 1) * RS.every_s, true),
    ...stay(st.backAt_s, st.backAt_s + RS.tail_s, true),
  ];
  v.push(
    simVec(
      tl(c, stuck, st.backAt_s + RS.tail_s),
      'a half-built return run followed by a 20-minute gap is dropped at the gap (proposed correction): timeout at exit + 900 s, not revived by later samples',
    ),
  );
  for (const every of [1, CASE.sample02Hz_s]) {
    v.push(
      simVec(
        {
          fn: 'runTimeline',
          params: { ...c.run },
          confirmAt_ms: 0,
          now_ms: RS.edgeWalkEnd_s * CASE.ms,
          trace: tracePath('synthetic-edge-walk-01'),
          polygon: TEST_POLYGON,
          every,
          phase: 0,
        },
        `edge-walk at ${every === 1 ? '1 Hz' : '0.2 Hz'} (acceptance 5): real exits give Grace 140 s and Suspended at 180.001 s; drift exits all shorter than graceMax_s`,
      ),
    );
  }
  const tg = (
    t_ms: number,
    lastSample_ms: number | null,
    settled_ms: number | null,
    note: string,
  ) =>
    v.push(
      simVec(
        {
          fn: 'sampleTimeGate',
          t_ms,
          now_ms: TG.now_ms,
          lastSample_ms,
          settled_ms,
          clockSkewTolerance_s: c.clockSkewTolerance_s,
        },
        note,
      ),
    );
  const tol = c.clockSkewTolerance_s * CASE.ms;
  tg(TG.now_ms + tol, null, null, 'sample exactly clockSkewTolerance_s in the future is accepted');
  tg(TG.now_ms + tol + 1, null, null, '1 ms beyond the tolerance: future');
  tg(TG.last_ms, TG.last_ms, null, 't equal to the last sample: non_monotonic');
  tg(TG.settled_ms, TG.earlier_ms, TG.settled_ms, 't at the settled horizon: late');
  tg(TG.now_ms, TG.last_ms, TG.settled_ms, 'ordinary sample: ok');
  const cc = (now_ms: number, note: string) =>
    v.push(
      simVec(
        {
          fn: 'clockCheck',
          now_ms,
          lastNow_ms: TG.now_ms,
          clockSkewTolerance_s: c.clockSkewTolerance_s,
        },
        note,
      ),
    );
  cc(TG.now_ms - tol, 'now_ms back by exactly the tolerance: held (time stands, no event)');
  cc(TG.now_ms - tol - 1, 'now_ms back by more than the tolerance: invalid (clock_invalid, E10)');
  cc(TG.now_ms + tol, 'forward: ok');
  // Appended at the end so the indices of earlier run-state vectors stay the same.
  hy(
    'out',
    obs(0, N, true, 0),
    'edgeHysteresis_m = 0: samples exactly on the boundary count (A-P2-X03-3, tech note F04 5.2): in, back-dated to the first',
    { ...hp, edgeHysteresis_m: 0 },
  );
  const b = RS.band;
  const inBand = (from_s: number, to_s: number, every_s: number) =>
    segment({
      from_s,
      to_s,
      every_s,
      start: offset(CASE.origin, b.north_m, 0),
      accuracy_m: CASE.goodAccuracy_m,
      inside: true,
      boundaryDistance_m: b.depth_m,
    });
  const exitTo = (s_: number) => [
    ...stay(0, RS.exit_s - RS.every_s, true),
    ...stay(RS.exit_s, s_ - RS.every_s, false),
  ];
  const bandOnly = [...exitTo(b.from_s), ...inBand(b.from_s, b.end_s, RS.outEvery_s)];
  v.push(
    simVec(
      tl(c, bandOnly, b.end_s),
      'P-4: return into the inner band (3 m <= edgeHysteresis_m) at 160 s and still there at 1,200 s (> graceMax_s, > suspendedMax_s): band samples neither count nor reset, so the settled view holds Grace with pendingSince_ms = 160 s (A-P2-X04-1, Phase 2 has no cap). The Phase 3 pendingSetMax_s cap (J-9) changes this vector to a timeout',
    ),
  );
  v.push(
    simVec(
      tl(
        c,
        bandOnly.filter((x) => x.t_ms <= b.silentFrom_s * CASE.ms),
        b.end_s,
      ),
      'P-4: the same band return, samples stop at 1,100 s and now = 1,200 s: the gap > maxSamplePairGap_s drops the pending run (D-104), so the timers settle back-dated: Suspended at exit + 180.001 s, Ended timeout at exit + 900 s (items kept, R18)',
    ),
  );
  v.push(
    simVec(
      tl(
        c,
        [
          ...exitTo(b.from_s),
          ...inBand(b.from_s, b.deepAt_s - RS.every_s, RS.every_s),
          ...stay(b.deepAt_s, b.deepAt_s + b.tail_s, true),
        ],
        b.deepAt_s + b.tail_s,
      ),
      'P-4: return into the inner band at 160 s, 240 s in the band (> graceMax_s), then deeper: Phase 2 has no pending-run cap (A-P2-X04-1), so the return is back-dated to the first band sample and there is no Suspended. The Phase 3 pendingSetMax_s cap (J-9) changes this vector',
    ),
  );
  gapReturnVectors(c, v, inBand);
  return { formula: 'run-state', vectors: v };
}

/**
 * P2-X17 (J-P2-T30-4, F04 R15 item 7, tech note F06 15.1): return after a no_evidence exit.
 * Appended after [35]; every case has the last usable sample before the gap at 100 s.
 */
function gapReturnVectors(
  c: GateConfig,
  v: GateVector[],
  inBand: (from_s: number, to_s: number, every_s: number) => PresenceSample[],
) {
  const r = RS.gapReturn;
  const N = c.run.edgeHysteresisSamples;
  const before = stay(0, r.lastIn_s, true);
  const push = (samples: PresenceSample[], now_s: number, note: string) =>
    v.push(simVec(tl(c, [...before, ...samples], now_s), `P2-X17 J-P2-T30-4 · ${note}`));
  push(
    stay(r.back_s, r.back_s, true),
    r.back_s,
    '(a) 120 s gap, then ONE usable sample deep inside at 220 s: Active at 220 s without hysteresis (fewer than edgeHysteresisSamples samples), no pending run',
  );
  push(
    inBand(r.back_s, r.back_s + r.tail_s, RS.every_s),
    r.back_s + r.tail_s,
    '(b) 120 s gap, then only inner-band samples (3 m <= edgeHysteresis_m): the band counts as inside, Active at the first band sample (220 s). Contrast [33]: after a left_polygon exit the same band return holds Grace',
  );
  const outThenBack = (count: number) => [
    ...stay(r.back_s, r.back_s, false),
    ...stay(r.back_s + RS.every_s, r.back_s + count * RS.every_s, true),
  ];
  const shortEnd = r.back_s + r.shortReturn * RS.every_s;
  push(
    outThenBack(r.shortReturn),
    shortEnd,
    `(c) 120 s gap, first usable sample OUTSIDE at 220 s (real exit), then ${r.shortReturn} deep inside samples (< edgeHysteresisSamples ${N}): still Grace, exitStartedAt_ms stays 100 s (R14), pendingSince_ms = 225 s`,
  );
  push(
    outThenBack(N),
    r.back_s + N * RS.every_s,
    `(c2) as (c) with ${N} inside samples: the full hysteresis run confirms, Active back-dated to the first sample of the run (225 s)`,
  );
  const sus = c.run.suspendedMax_s;
  push(
    stay(r.lastIn_s + sus + 1, r.lastIn_s + sus + 1 + r.tail_s, true),
    r.lastIn_s + sus + 1 + r.tail_s,
    '(d) gap of suspendedMax_s + 1 s, first sample inside: Suspended at 280.001 s, Ended timeout at 100 s + suspendedMax_s = 1,000 s (R18, run loot kept per F05 3.5), later samples not fed to the run',
  );
  push(
    stay(r.lastIn_s + sus + 1, r.lastIn_s + sus + 1 + r.tail_s, false),
    r.lastIn_s + sus + 1 + r.tail_s,
    '(d2) as (d) with the first sample outside: the same timeout at 1,000 s whatever side the first sample is on (R15 item 7.3)',
  );
  push(
    stay(r.lastIn_s + sus, r.lastIn_s + sus, true),
    r.lastIn_s + sus,
    '(d3) boundary: first sample inside at exactly 100 s + suspendedMax_s (outside time = 900 s, <=): Suspended then Active at 1,000 s, no timeout',
  );
  const unusable: PresenceSample = {
    ...(stay(r.back_s - r.unusableLead_s, r.back_s - r.unusableLead_s, false)[0] as PresenceSample),
    accuracy_m: r.unusableAccuracy_m,
  };
  push(
    [unusable, ...stay(r.back_s, r.back_s, true)],
    r.back_s,
    '(e) an outside sample with accuracy 35 m (> maxSampleAccuracy_m, not usable, R16) at 215 s, then one deep inside sample at 220 s: the first USABLE sample decides, Active at 220 s',
  );
}

const TG = {
  now_ms: 1_000_000,
  last_ms: 990_000,
  settled_ms: 980_000,
  earlier_ms: 970_000,
} as const;

/** Check-in geometry: walk north at 1.3 m/s, outside for 0-40 s, inside from 45 s (0.2 Hz). */
const CI = {
  outTo_s: 40,
  inFrom_s: 45,
  inTo_s: 90,
  early_s: 55,
  ready_s: 60,
  accuracyBad_m: 35,
  accuracyEdge_m: 30,
  accuracyOk_m: 29.9,
  gap: { at_s: 20, resume_s: 51 },
  teleport: { far_m: 1300, jumpAt_s: 65, early_s: 90, late_s: 150 },
  drive: { mps: 12, to_s: 60, walkTo_s: 120, at_s: 90 },
} as const;

function approach(lastAccuracy_m: number | null = null): PresenceSample[] {
  const base: Omit<Segment, 'from_s' | 'to_s'> = {
    every_s: CASE.sample02Hz_s,
    start: CASE.origin,
    vNorth_mps: CASE.walk_mps,
    accuracy_m: CASE.goodAccuracy_m,
  };
  const out = segment({ ...base, from_s: 0, to_s: CI.outTo_s, inside: false });
  const ins = segment({
    ...base,
    from_s: CI.inFrom_s,
    to_s: CI.inTo_s,
    start: offset(CASE.origin, CASE.walk_mps * CI.inFrom_s, 0),
    inside: true,
  });
  const all = [...out, ...ins];
  if (lastAccuracy_m === null) return all;
  return all.map((s) =>
    s.t_ms === CI.ready_s * CASE.ms ? { ...s, accuracy_m: lastAccuracy_m } : s,
  );
}

export function checkInVectors(c: GateConfig): GateVectorFile {
  const v: GateVector[] = [];
  const ci = (samples: PresenceSample[], now_s: number, note: string) =>
    v.push(
      simVec(
        {
          fn: 'checkIn',
          params: { ...c.checkIn },
          now_ms: now_s * CASE.ms,
          samples: jsonSamples(samples, false),
        },
        note,
      ),
    );
  ci(
    approach(),
    CI.ready_s,
    'walked in from outside for exactly minContinuousApproach_s (60 s), last sample inside, accuracy 6 m: ok',
  );
  ci(approach(), CI.early_s, 'same walk at 55 s: not_enough_trace, readyIn_s 5 (R09 countdown)');
  ci(approach(CI.accuracyBad_m), CI.ready_s, 'E6: last sample accuracy 35 m: poor_accuracy');
  ci(
    approach(CI.accuracyEdge_m),
    CI.ready_s,
    'E6: accuracy exactly maxAccuracy_m (30 m) is rejected (strict less-than)',
  );
  ci(approach(CI.accuracyOk_m), CI.ready_s, 'accuracy 29.9 m: ok');
  const gapped = approach().filter(
    (s) => s.t_ms <= CI.gap.at_s * CASE.ms || s.t_ms >= CI.gap.resume_s * CASE.ms,
  );
  ci(
    gapped,
    CI.inTo_s,
    'a pair gap > maxSamplePairGap_s breaks the approach: the run restarts inside, not_enough_trace',
  );
  const standing = stay(0, CI.inTo_s, true);
  ci(
    standing,
    CI.inTo_s,
    'E4: app opened in the middle of the park, 90 s of samples all inside: no_approach_from_outside',
  );
  const tp = CI.teleport;
  const far = segment({
    from_s: 0,
    to_s: tp.jumpAt_s - CASE.sample02Hz_s,
    every_s: CASE.sample02Hz_s,
    start: offset(CASE.origin, tp.far_m, 0),
    accuracy_m: CASE.goodAccuracy_m,
    inside: false,
  });
  const tele = [...far, ...stay(tp.jumpAt_s, tp.late_s, true)];
  ci(
    tele,
    tp.jumpAt_s,
    'E5 teleport: the jump fix is dropped by the outlier filter, so the latest fix breaks the run: not_enough_trace with no countdown',
  );
  ci(
    tele,
    tp.early_s,
    'E5 teleport after re-anchor (5 consistent drops): run restarted inside, not_enough_trace',
  );
  ci(
    tele,
    tp.late_s,
    'E5 teleport 85 s later: no_approach_from_outside (no outside sample in the new run)',
  );
  const d = CI.drive;
  const car = segment({
    from_s: 0,
    to_s: d.to_s,
    every_s: CASE.sample02Hz_s,
    start: CASE.origin,
    vNorth_mps: d.mps,
    accuracy_m: CASE.goodAccuracy_m,
    inside: false,
  });
  const walkAfter = segment({
    from_s: d.to_s + CASE.sample02Hz_s,
    to_s: d.walkTo_s,
    every_s: CASE.sample02Hz_s,
    start: offset(CASE.origin, d.mps * d.to_s, 0),
    vNorth_mps: CASE.walk_mps,
    accuracy_m: CASE.goodAccuracy_m,
    inside: true,
  });
  ci(
    [...car, ...walkAfter],
    d.at_s,
    'still speed-locked after driving (unlock needs 60 s slow): speed_lock comes first (R08 order)',
  );
  const tr = (id: string, note: string) =>
    v.push(
      simVec(
        {
          fn: 'checkInTimeline',
          params: { ...c.checkIn },
          trace: tracePath(id),
          polygon: TEST_POLYGON,
          every: 1,
          phase: 0,
        },
        note,
      ),
    );
  tr(
    'synthetic-walk-in-01',
    'walk-in trace (acceptance 3): result at every sample, listed when it changes; ok from the first fix inside (the fix at 123000 lies exactly on the polygon edge and counts as inside, same rule as packages/geo, P2-X06)',
  );
  tr('synthetic-teleport-spoof-01', 'teleport-spoof trace (acceptance 3, E5): never ok');
  tr(
    'synthetic-warmup-accuracy-01',
    'warmup-accuracy trace: poor_accuracy until the first fix under 30 m, then waits for the approach (outside the test polygon: never ok)',
  );
  return { formula: 'check-in', vectors: v };
}

const SL = {
  walkTo_s: 30,
  fast_mps: 10,
  shortFastTo_s: 44,
  fastTo_s: 45,
  slowFor: { under_s: 59, at_s: 60 },
  gapFast: { firstTo_s: 40, resume_s: 71, secondTo_s: 80 },
  badAccuracy_m: 35,
  tail_s: 20,
} as const;

/** Walk to 30 s, fast (36 km/h) to fastTo_s, then walk for slow_s. 1 Hz, positions chained. */
function drive(fastTo_s: number, slow_s: number) {
  const w: Segment = {
    from_s: 0,
    to_s: SL.walkTo_s,
    every_s: CASE.sample1Hz_s,
    start: CASE.origin,
    vNorth_mps: CASE.walk_mps,
    accuracy_m: CASE.goodAccuracy_m,
  };
  const f: Segment = {
    ...w,
    from_s: SL.walkTo_s + 1,
    to_s: fastTo_s,
    start: offset(CASE.origin, CASE.walk_mps * SL.walkTo_s + SL.fast_mps, 0),
    vNorth_mps: SL.fast_mps,
  };
  const fEnd = offset(f.start, SL.fast_mps * (fastTo_s - f.from_s), 0);
  const s: Segment = {
    ...w,
    from_s: fastTo_s + 1,
    to_s: fastTo_s + slow_s,
    start: offset(fEnd, CASE.walk_mps, 0),
  };
  return [...segment(w), ...segment(f), ...segment(s)];
}

export function speedLockVectors(c: GateConfig): GateVectorFile {
  const v: GateVector[] = [];
  const sl = (samples: PresenceSample[], note: string) =>
    v.push(
      simVec(
        { fn: 'speedLock', params: { ...c.lock }, samples: jsonSamples(samples, false) },
        note,
      ),
    );
  sl(drive(SL.shortFastTo_s, SL.tail_s), 'fast pairs spanning 14 s (< lockSustained_s): no lock');
  sl(
    drive(SL.fastTo_s, SL.tail_s),
    'fast pairs spanning exactly lockSustained_s (15 s): enter, back-dated to the first sample of the first fast pair',
  );
  sl(drive(SL.fastTo_s, SL.slowFor.under_s), 'lock then 59 s of walking: still locked');
  sl(
    drive(SL.fastTo_s, SL.slowFor.at_s),
    'lock then walking with slow pairs spanning unlockSustained_s (60 s): exit, back-dated to the first sample of the slow run (D-094)',
  );
  const g = SL.gapFast;
  const gapped = drive(g.secondTo_s, SL.tail_s).filter(
    (s) => s.t_ms <= g.firstTo_s * CASE.ms || s.t_ms >= g.resume_s * CASE.ms,
  );
  sl(
    gapped,
    'a pair gap > maxSamplePairGap_s gives no speed and breaks the fast run: two short runs, no lock',
  );
  const walk = segment({
    from_s: 0,
    to_s: SL.fastTo_s + SL.tail_s,
    every_s: CASE.sample1Hz_s,
    start: CASE.origin,
    vNorth_mps: CASE.walk_mps,
    accuracy_m: CASE.goodAccuracy_m,
  });
  const noisy = walk.map((x) => {
    const t_s = x.t_ms / CASE.ms;
    if (t_s <= SL.walkTo_s || t_s > SL.fastTo_s) return x;
    const p = offset(x, 0, SL.fast_mps * (t_s - SL.walkTo_s));
    return { ...x, lat: p.lat, lng: p.lng, accuracy_m: SL.badAccuracy_m };
  });
  sl(
    noisy,
    'a walker whose fixes wander off at 36 km/h with accuracy 35 m (> maxSampleAccuracy_m) for 15 s: those fixes are ignored by the lock, no lock',
  );
  const tr = (id: string, every: number, note: string) =>
    v.push(
      simVec(
        {
          fn: 'speedLock',
          params: { ...c.lock },
          trace: tracePath(id),
          polygon: null,
          every,
          phase: 0,
        },
        note,
      ),
    );
  tr(
    'synthetic-driving-40kmh-01',
    1,
    'driving-40kmh (acceptance 7): lock at 84 s; the 45 s red light stays locked; parked at 400 s, then 120 s of walking (P2-X03) give slow pairs spanning unlockSustained_s: exit at 400 s, back-dated to the first sample of the slow run',
  );
  tr(
    'synthetic-driving-40kmh-01',
    CASE.sample02Hz_s,
    'driving-40kmh at 0.2 Hz: lock at 85 s; exit at 400 s, back-dated to the first sample of the slow run',
  );
  tr(
    'synthetic-drift-spike-01',
    1,
    'drift-spike 1 Hz: spikes give at most 2 fast pairs, never lockSustained_s: no lock (walker is not locked by GPS spikes)',
  );
  tr('synthetic-drift-spike-01', CASE.sample02Hz_s, 'drift-spike 0.2 Hz: no lock');
  tr('synthetic-edge-walk-01', 1, 'edge-walk 1 Hz (jitter up to 23 km/h): no lock');
  return { formula: 'speed-lock', vectors: v };
}

/** Bangkok wall-clock instants in October 2026 (2026-10-12 is a Monday). */
const OH = {
  year: 2026,
  monthIndex: 9,
  mon: 12,
  tue: 13,
  wed: 14,
  thu: 15,
  fri: 16,
  sat: 17,
  sun: 18,
  sec59: 59,
  ms999: 999,
  times: {
    open: 5,
    close: 21,
    noon: 12,
    late: 22,
    lateMin: 30,
    early: 4,
    sunLate: 1,
    sunClose: 2,
    ten: 10,
    beforeMid: 23,
  },
  mins: { m59: 59, m40: 40, m50: 50, m55: 55 },
} as const;

/** Local minutes of day used by the example schedule. */
const MIN = { h0: 0, h2: 120, h5: 300, h21: 1260, h22: 1320, h24: 1440 } as const;
const DAYS = ['1', '2', '3', '4', '5', '6', '7'];

/** Tech note F04 8.1 example: Mon/Tue/Fri 05-21, Wed closed, Thu 24 h, Sat 22-24 + Sun 00-02. */
const HOURS: OpeningHours = {
  weekly: {
    '1': [[MIN.h5, MIN.h21]],
    '2': [[MIN.h5, MIN.h21]],
    '3': [],
    '4': [[MIN.h0, MIN.h24]],
    '5': [[MIN.h5, MIN.h21]],
    '6': [[MIN.h22, MIN.h24]],
    '7': [[MIN.h0, MIN.h2]],
  },
  exceptions: [{ date: '2026-10-13', intervals: [] }],
};
const ALWAYS: OpeningHours = {
  weekly: Object.fromEntries(DAYS.map((d) => [d, [[MIN.h0, MIN.h24]]])),
};
const NEVER: OpeningHours = { weekly: Object.fromEntries(DAYS.map((d) => [d, []])) };

const MS_PER_MIN = 60_000;

const DIST = {
  zero: 0,
  example: 650,
  justOver: 651,
  bandEdge: 1000,
  justOverEdge: 1000.5,
  farThreshold: 1901,
  tenKm: 10000,
  overTenKm: 10000.1,
  far: 12345,
} as const;

export function openingHoursVectors(c: GateConfig): GateVectorFile {
  const v: GateVector[] = [];
  const off = c.utcOffset_min;
  const at = (day: number, h: number, m = 0, sec = 0, ms = 0) =>
    Date.UTC(OH.year, OH.monthIndex, day, h, m, sec, ms) - off * MS_PER_MIN;
  const T = OH.times;
  const open = (t_ms: number, note: string, hours: OpeningHours = HOURS) =>
    v.push(simVec({ fn: 'isOpenAt', hours, utcOffset_min: off, t_ms }, note));
  open(at(OH.mon, T.early, OH.mins.m59, OH.sec59, OH.ms999), 'Mon 04:59:59.999 Bangkok: closed');
  open(at(OH.mon, T.open), 'Mon 05:00 Bangkok: open (start minute included)');
  open(at(OH.mon, T.close - 1, OH.mins.m59, OH.sec59, OH.ms999), 'Mon 20:59:59.999: open');
  open(at(OH.mon, T.close), 'Mon 21:00: closed (closing minute is already closed, R25)');
  open(at(OH.tue, T.ten), 'Tue 2026-10-13 10:00: closed by the exception date');
  open(at(OH.wed, T.ten), 'Wed 10:00: closed all day ([])');
  open(at(OH.thu, T.beforeMid, OH.mins.m59), 'Thu 23:59: open (24 h day)');
  open(
    at(OH.sat, T.late, T.lateMin),
    'Sat 22:30: open (22:00-02:00 split at midnight by tools/dungeons)',
  );
  open(at(OH.sun, T.sunLate, OH.mins.m59), 'Sun 01:59: open');
  open(at(OH.sun, T.sunClose), 'Sun 02:00: closed');
  open(
    at(OH.fri, 0, T.lateMin),
    'Fri 00:30 Bangkok = Thu 17:30 UTC: closed; evaluating in UTC (device time zone bug) would read Thursday and say open',
  );
  const change = (t_ms: number, note: string, hours: OpeningHours = HOURS) =>
    v.push(simVec({ fn: 'openingChangeAfter', hours, utcOffset_min: off, t_ms }, note));
  change(at(OH.mon, T.noon), 'Mon 12:00 → closes Mon 21:00 (closesAt_ms of a run started now)');
  change(at(OH.mon, T.early), 'Mon 04:00 → opens Mon 05:00');
  change(
    at(OH.sat, T.late, T.lateMin),
    'Sat 22:30 → closes Sun 02:00 (intervals touching at midnight merge)',
  );
  change(at(OH.wed, T.ten), 'Wed 10:00 (closed) → opens Thu 00:00');
  change(at(OH.thu, T.noon), 'Thu 12:00 (24 h) → closes Fri 00:00');
  change(at(OH.mon, T.noon), 'open every day all day: null', ALWAYS);
  change(at(OH.mon, T.noon), 'closed every day: null', NEVER);
  const closesAt = at(OH.mon, T.close);
  const soon = (closes: number | null, started: number, note: string) =>
    v.push(
      simVec(
        {
          fn: 'closingSoonAt',
          closesAt_ms: closes,
          startedAt_ms: started,
          closingSoonNotice_s: c.closingSoonNotice_s,
        },
        note,
      ),
    );
  soon(
    closesAt,
    at(OH.mon, T.close - 1, OH.mins.m40),
    'run started 20:40, closes 21:00: notice at 20:50 (closingSoonNotice_s before)',
  );
  soon(
    closesAt,
    at(OH.mon, T.close - 1, OH.mins.m50),
    'run started exactly at the notice time: no notice (the popup already warned, R28)',
  );
  soon(closesAt, at(OH.mon, T.close - 1, OH.mins.m55), 'run started 20:55: no notice');
  soon(null, at(OH.mon, T.close - 1, OH.mins.m40), 'no closing time within the horizon: no notice');
  const dd = (distance_m: number, note: string) =>
    v.push(simVec({ fn: 'displayDistance', distance_m, steps: c.distanceSteps }, note));
  dd(DIST.zero, '0 m shows 0');
  dd(DIST.example, '650 m (GDD rift example) shows 650');
  dd(DIST.justOver, '651 m rounds up to 700, never below the truth (R34)');
  dd(DIST.bandEdge, '1,000 m is in the first band: 1,000');
  dd(DIST.justOverEdge, '1,000.5 m moves to the 100 m band: 1,100');
  dd(DIST.farThreshold, '1,901 m shows 2,000');
  dd(DIST.tenKm, '10,000 m shows 10,000');
  dd(DIST.overTenKm, '10,000.1 m moves to the 1 km band: 11,000');
  dd(DIST.far, '12,345 m shows 13,000');
  return { formula: 'opening-hours', vectors: v };
}
