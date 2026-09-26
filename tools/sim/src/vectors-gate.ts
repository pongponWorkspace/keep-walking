// Golden vectors of P2-F05-T20, part 1: movement-gate.json, reward-window.json, partial-tick.json.
// Expected values come from the reference implementation (gate.ts, rng-contract.ts), rounded to
// 6 decimals, tolerance 1e-6 (exact for integers, strings and booleans). Every parameter a vector
// needs is copied inline from GateConfig; the numbers written here are example inputs (CASE).
import type { GoldenVector, GoldenVectorFile } from '@keep-walking/shared';
import type { ClockInterval } from './gate';
import type { GateConfig } from './params-gate';
import type { LootRarity } from './rng-contract';
import { endOf, jsonSamples, offset, segment } from './synth';
import type { LatLng, Segment } from './synth';
import { TEST_POLYGON, tracePath } from './traces';
import { evaluateGateVector } from './vector-eval-gate';
import { runTimeline } from './presence';
import { loadTraceSamples } from './traces';

type In = Record<string, unknown>;
export type GateVector = GoldenVector<In, unknown>;
export type GateVectorFile = GoldenVectorFile<In, unknown>;

export const GATE_TOLERANCE = 1e-6;
const DECIMALS = 6;
const BASE = 10;
const SIM = 'sim run P2-F05-T20 (reference tools/sim/src/gate.ts, presence.ts, rng-contract.ts)';

export function roundDeep(v: unknown): unknown {
  if (typeof v === 'number') return Math.round(v * BASE ** DECIMALS) / BASE ** DECIMALS;
  if (Array.isArray(v)) return v.map(roundDeep);
  if (v !== null && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, roundDeep(x)]));
  return v;
}

/** Vector whose expected value is the reference implementation's output for the input. */
export function simVec(input: In, note: string): GateVector {
  return {
    input,
    expected: roundDeep(evaluateGateVector(input)),
    tolerance: GATE_TOLERANCE,
    source: `${SIM} · ${note}`,
  };
}

/** Example inputs (not balance values). */
export const CASE = {
  origin: { lat: 13.73, lng: 100.5415 },
  ms: 1000,
  goodAccuracy_m: 6,
  slowWalk_mps: 0.2,
  walk_mps: 1.3,
  run15min_s: 900,
  sample1Hz_s: 1,
  sample02Hz_s: 5,
  sample10s_s: 10,
  gapWalk: { before_s: 150, gap_s: 300, jump_m: 400, after_s: 200, mps: 0.1 },
  spike: { at_s: 100, fixes: 3, north_m: 300, accuracy_m: 12, still_s: 320 },
  fastPair: { at_s: 150, east_m: 8 },
  accuracyEdge: { kept_m: 30, dropped_m: 30.1 },
  pause: { exit_s: 120, return_s: 240, end_s: 780 },
  preConfirm_s: -120,
  edge: { move_from_s: 295, move_to_s: 305, east_m: 20, end_s: 400, offset_s: 5 },
  appClosed: { last_s: 299, back_s: 500, end_s: 620 },
  exactly: { at_m: 50, above_m: 50.000001, below_m: 49.999999 },
  tau: { inFirst_ms: 100000, paused_ms: 200000, resume_ms: 240000, later_ms: 420000 },
  windowIndex: { first_ms: 1, end0_ms: 300000, start1_ms: 300001, end1_ms: 600000, zero_ms: 0 },
} as const;

const clockFrom = (start_ms: number): ClockInterval[] => [{ start_ms, end_ms: null }];

function traceIn(id: string, every: number, phase: number, polygon: string | null): In {
  return { trace: tracePath(id), polygon, every, phase };
}

function gateIn(c: GateConfig, clock: ClockInterval[], extra: In): In {
  return { fn: 'gateWindows', params: { ...c.gate }, clock, endAt_ms: null, ...extra };
}

const seg = (g: Omit<Segment, 'accuracy_m'> & { accuracy_m?: number }) =>
  segment({ accuracy_m: CASE.goodAccuracy_m, ...g });

/** Active intervals of the window clock implied by a runTimeline result (for edge-walk). */
function clockOfTimeline(events: ReturnType<typeof runTimeline>['events']): ClockInterval[] {
  const out: ClockInterval[] = [{ start_ms: 0, end_ms: null }];
  for (const e of events) {
    if (e.type !== 'run_state_changed') continue;
    const last = out.at(-1) as ClockInterval;
    if (e.from === 'active') last.end_ms = e.at_ms;
    if (e.to === 'active') out.push({ start_ms: e.at_ms, end_ms: null });
  }
  return out;
}

function gapWalk(c: GateConfig): In {
  const g = CASE.gapWalk;
  const a: Segment = {
    from_s: 0,
    to_s: g.before_s,
    every_s: CASE.sample02Hz_s,
    start: CASE.origin,
    vNorth_mps: g.mps,
    accuracy_m: CASE.goodAccuracy_m,
  };
  const resume = g.before_s + g.gap_s;
  const b: Segment = {
    ...a,
    from_s: resume,
    to_s: resume + g.after_s,
    start: offset(endOf(a), g.jump_m, 0),
  };
  const clock: ClockInterval[] = [
    { start_ms: 0, end_ms: g.before_s * CASE.ms },
    { start_ms: resume * CASE.ms, end_ms: null },
  ];
  return gateIn(c, clock, { samples: jsonSamples([...segment(a), ...segment(b)], false) });
}

function stillWithSpike(c: GateConfig): In {
  const k = CASE.spike;
  const still = seg({ from_s: 0, to_s: k.still_s, every_s: CASE.sample1Hz_s, start: CASE.origin });
  const jumped = offset(CASE.origin, k.north_m, 0);
  const samples = still.map((s) =>
    s.t_ms >= k.at_s * CASE.ms && s.t_ms < (k.at_s + k.fixes) * CASE.ms
      ? { ...s, lat: jumped.lat, lng: jumped.lng, accuracy_m: k.accuracy_m }
      : s,
  );
  return gateIn(c, clockFrom(0), { samples: jsonSamples(samples, false) });
}

function walkWithFastPair(c: GateConfig): In {
  const f = CASE.fastPair;
  const a: Segment = {
    from_s: 0,
    to_s: f.at_s,
    every_s: CASE.sample1Hz_s,
    start: CASE.origin,
    vNorth_mps: CASE.slowWalk_mps,
    accuracy_m: CASE.goodAccuracy_m,
  };
  const b: Segment = {
    ...a,
    from_s: f.at_s + CASE.sample1Hz_s,
    to_s: c.gate.window_s,
    start: offset(endOf(a), CASE.slowWalk_mps * CASE.sample1Hz_s, f.east_m),
  };
  return gateIn(c, clockFrom(0), { samples: jsonSamples([...segment(a), ...segment(b)], false) });
}

function accuracyEdge(c: GateConfig, accuracy_m: number): In {
  const walk = seg({
    from_s: 0,
    to_s: c.gate.window_s,
    every_s: CASE.sample02Hz_s,
    start: CASE.origin,
    vNorth_mps: CASE.slowWalk_mps,
    accuracy_m,
  });
  return gateIn(c, clockFrom(0), { samples: jsonSamples(walk, false) });
}

export function movementGateVectors(c: GateConfig): GateVectorFile {
  const v: GateVector[] = [];
  const t = (id: string, every: number, phase: number, note: string) =>
    v.push(simVec(gateIn(c, clockFrom(0), traceIn(id, every, phase, null)), note));
  t(
    'synthetic-table-still-01',
    CASE.sample1Hz_s,
    0,
    'table-still 1 Hz: 0 reward windows pass (ADR 0003 5.5)',
  );
  t('synthetic-table-still-01', CASE.sample02Hz_s, 0, 'table-still decimated to 0.2 Hz: 0 pass');
  t(
    'synthetic-bench-jitter-01',
    CASE.sample1Hz_s,
    0,
    'bench-jitter 1 Hz: >= 1 window passes (GDD bench still earns; margin finding F-16)',
  );
  t(
    'synthetic-bench-jitter-01',
    CASE.sample02Hz_s,
    0,
    'bench-jitter 0.2 Hz phase 0: same grid as 1 Hz, same result',
  );
  t('synthetic-park-loop-01', CASE.sample1Hz_s, 0, 'park-loop 1 Hz: every window passes');
  t(
    'synthetic-park-loop-01',
    CASE.sample02Hz_s,
    0,
    '1 Hz vs 0.2 Hz: park-loop decimated phase 0 gives the same windows (grid = samples)',
  );
  t(
    'synthetic-park-loop-01',
    CASE.sample02Hz_s,
    2,
    '1 Hz vs 0.2 Hz: park-loop decimated phase 2 (off-grid samples): every judged window passes, distance within 3% of 1 Hz (interpolation cuts corners); window 5 waits for a sample past 1,800 s',
  );
  t(
    'synthetic-drift-spike-01',
    CASE.sample1Hz_s,
    0,
    'drift-spike 1 Hz: S1 (accuracy 35) and S2 (3 fixes at 1,080 km/h) dropped; filtered total 1,008 m vs raw 2,123 m (true walk about 940 m, the slow S3 drift is below outlierSpeed_kmh and partly counts)',
  );
  t(
    'synthetic-drift-spike-01',
    CASE.sample02Hz_s,
    0,
    'drift-spike 0.2 Hz: S1 and S2 dropped, filtered total 1,015 m (the S3 snap-back at 43 km/h is kept by the filter but adds 0 m because it is faster than speedLock_kmh)',
  );
  t(
    'synthetic-boundary-50m-01',
    CASE.sample1Hz_s,
    0,
    'boundary-50m filtered: raw bursts 49.9994 / 50.0101 m become 48.1 / 49.0 m after resampling, 0 windows pass (location-engineer note 4; greaterThan at exactly 50 m is tested with passesGate)',
  );
  const edge = loadTraceSamples({
    trace: tracePath('synthetic-edge-walk-01'),
    polygon: TEST_POLYGON,
    every: 1,
    phase: 0,
  });
  const edgeTl = runTimeline(edge, 0, edge.at(-1)?.t_ms ?? 0, c.run);
  v.push(
    simVec(
      gateIn(
        c,
        clockOfTimeline(edgeTl.events),
        traceIn('synthetic-edge-walk-01', 1, 0, TEST_POLYGON),
      ),
      'edge-walk 1 Hz with the window clock from its run-state timeline: pairs with a sample outside the polygon add 0, no spike across the edge counts',
    ),
  );
  v.push(
    simVec(
      stillWithSpike(c),
      'still phone + one 3-fix 300 m spike at accuracy 12: 0 m, no tick from the spike (raw would add 1,200 m)',
    ),
  );
  v.push(
    simVec(
      gapWalk(c),
      'GD B-04 / G2: 150 s walk, 5-minute gap ending 400 m away, 200 s walk; the gap pair is not counted (window 0 = 30 m, fails), clock paused during the gap',
    ),
  );
  v.push(
    simVec(
      walkWithFastPair(c),
      'one pair at 28.8 km/h (< outlierSpeed_kmh, > speedLock_kmh) adds 0 m and breaks the chain (tech note F05 3.1 item 5)',
    ),
  );
  v.push(
    simVec(
      accuracyEdge(c, CASE.accuracyEdge.kept_m),
      'accuracy exactly maxSampleAccuracy_m is kept (equal counts)',
    ),
  );
  v.push(
    simVec(
      accuracyEdge(c, CASE.accuracyEdge.dropped_m),
      'accuracy above maxSampleAccuracy_m: every fix dropped, 0 m',
    ),
  );
  const pg = (distance_m: number, comparison: string, note: string) =>
    v.push(
      simVec(
        { fn: 'passesGate', distance_m, minDistance_m: c.gate.minDistancePerWindow_m, comparison },
        note,
      ),
    );
  pg(
    CASE.exactly.at_m,
    c.gate.comparison,
    'G1: distance exactly minDistancePerWindow_m does not pass (greaterThan)',
  );
  pg(CASE.exactly.above_m, c.gate.comparison, 'just above the threshold passes');
  pg(CASE.exactly.below_m, c.gate.comparison, 'just below the threshold fails');
  pg(
    CASE.exactly.above_m,
    'atLeast',
    'unknown comparison: null = the engine must throw (fail closed, ADR 0003 5.2 item 4)',
  );
  return { formula: 'movement-gate', vectors: v };
}

const slow = (from_s: number, to_s: number, start: LatLng, inside = true): Segment => ({
  from_s,
  to_s,
  every_s: CASE.sample02Hz_s,
  start,
  vNorth_mps: CASE.slowWalk_mps,
  accuracy_m: CASE.goodAccuracy_m,
  inside,
});

export function rewardWindowVectors(c: GateConfig): GateVectorFile {
  const v: GateVector[] = [];
  const W = c.gate.window_s;
  const three = segment(slow(0, W * (1 + 2), CASE.origin));
  v.push(
    simVec(
      gateIn(c, clockFrom(0), { samples: jsonSamples(three, false) }),
      'non-overlapping windows (kW, (k+1)W]: 15 min walk gives windows 0, 1, 2 of equal distance, each judged once',
    ),
  );
  const pre = segment(slow(CASE.preConfirm_s, W, CASE.origin));
  v.push(
    simVec(
      gateIn(c, clockFrom(0), { samples: jsonSamples(pre, false) }),
      'window 0 starts at confirm (t = 0): samples before confirm add nothing (F05 R02, tech note F04 7.4)',
    ),
  );
  const p = CASE.pause;
  const a = slow(0, p.exit_s, CASE.origin);
  const out = slow(
    p.exit_s + CASE.sample02Hz_s,
    p.return_s - CASE.sample02Hz_s,
    offset(endOf(a), 0, 0),
    false,
  );
  const back = slow(p.return_s, p.end_s, endOf(out));
  const paused: ClockInterval[] = [
    { start_ms: 0, end_ms: p.exit_s * CASE.ms },
    { start_ms: p.return_s * CASE.ms, end_ms: null },
  ];
  const pauseSamples = jsonSamples([...segment(a), ...segment(out), ...segment(back)], false);
  v.push(
    simVec(
      gateIn(c, paused, { samples: pauseSamples }),
      'Grace 2 min (exit 120 s, back 240 s): the clock pauses and resumes from where it stopped, distance kept, window 0 ends at real 420 s (tick moved by 2 min), outside walk adds 0',
    ),
  );
  const e = CASE.edge;
  const still1 = segment({
    ...slow(e.offset_s, e.move_from_s, CASE.origin),
    vNorth_mps: 0,
    every_s: CASE.sample10s_s,
  });
  const moved = offset(CASE.origin, 0, e.east_m);
  const still2 = segment({
    ...slow(e.move_to_s, e.end_s, moved),
    vNorth_mps: 0,
    every_s: CASE.sample10s_s,
  });
  v.push(
    simVec(
      gateIn(c, clockFrom(0), { samples: jsonSamples([...still1, ...still2], false) }),
      'a sample pair straddling a window edge (295 s -> 305 s, 20 m): the grid point at 300 s splits it, 10 m to window 0 and 10 m to window 1 (each grid pair counts toward the window of its end point)',
    ),
  );
  const ac = CASE.appClosed;
  const before = segment(slow(0, ac.last_s, CASE.origin));
  const after = segment(slow(ac.back_s, ac.end_s, offset(CASE.origin, 0, 0)));
  const closed: ClockInterval[] = [
    { start_ms: 0, end_ms: ac.last_s * CASE.ms },
    { start_ms: ac.back_s * CASE.ms, end_ms: null },
  ];
  v.push(
    simVec(
      gateIn(c, closed, { samples: jsonSamples([...before, ...after], false) }),
      'G8: app closed at 4:59, clock stopped at the last usable sample, back later: window 0 is judged about 1 s of active time after the return, the pair across the gap adds 0',
    ),
  );
  const tau = (t_ms: number, note: string) =>
    v.push(simVec({ fn: 'tauAt', t_ms, clock: paused }, note));
  tau(CASE.tau.inFirst_ms, 'tau inside the first running interval');
  tau(CASE.tau.paused_ms, 'tau while paused stays at the stop value');
  tau(CASE.tau.resume_ms, 'tau at the resume instant');
  tau(CASE.tau.later_ms, 'tau after resuming: 120 s + 180 s = 300 s');
  const wi = (tau_ms: number, note: string) =>
    v.push(simVec({ fn: 'windowIndexOf', tau_ms, window_s: W }, note));
  wi(CASE.windowIndex.first_ms, 'first ms of active time belongs to window 0');
  wi(CASE.windowIndex.end0_ms, 'tau = window_s belongs to window 0 (closed right)');
  wi(CASE.windowIndex.start1_ms, 'tau = window_s + 1 ms belongs to window 1');
  wi(CASE.windowIndex.end1_ms, 'tau = 2 window_s belongs to window 1');
  wi(
    CASE.windowIndex.zero_ms,
    'tau = 0 belongs to no window (-1): the confirm instant is the open left edge',
  );
  return { formula: 'reward-window', vectors: v };
}

/** Example loot table for the RNG-contract vectors: generic ids, rates in the GDD's shape. */
const EXAMPLE_TABLE: LootRarity[] = [
  {
    rarity: 'common',
    chance_pct: null,
    qtyMult: 1,
    chanceMult: 1,
    items: [
      { id: 'example.common.a', weight: 3, qtyMin: 1, qtyMax: 3 },
      { id: 'example.common.b', weight: 1, qtyMin: 1, qtyMax: 3 },
    ],
  },
  {
    rarity: 'uncommon',
    chance_pct: 30,
    qtyMult: 1,
    chanceMult: 1,
    items: [{ id: 'example.uncommon', weight: 1, qtyMin: 1, qtyMax: 1 }],
  },
  {
    rarity: 'rare',
    chance_pct: 8,
    qtyMult: 1,
    chanceMult: 1,
    items: [{ id: 'example.rare', weight: 1, qtyMin: 1, qtyMax: 1 }],
  },
  {
    rarity: 'epic',
    chance_pct: 1.2,
    qtyMult: 1,
    chanceMult: 1,
    items: [{ id: 'example.epic', weight: 1, qtyMin: 1, qtyMax: 1 }],
  },
  {
    rarity: 'legendary',
    chance_pct: 0.2,
    qtyMult: 1,
    chanceMult: 1,
    items: [{ id: 'example.legendary', weight: 1, qtyMin: 1, qtyMax: 1 }],
  },
];

const RNG = {
  seeds: { zero: 0, one: 1, example: 20260926, max: 4294967295 },
  indexes: { first: 0, second: 1, twelfth: 12 },
  draws: 5,
  lootIndexes: { a: 0, b: 1, c: 2, d: 3 },
  grantedBeforeClose: 3,
  partialF: 0.2,
  fullF: 1,
  sure: { chance_pct: 100 },
} as const;

const PARTIAL = {
  under_ms: 59000,
  at_ms: 60000,
  g9_ms: 180000,
  atRate_m: 10,
  aboveRate_m: 10.01,
  g9Pass_m: 31,
  g9Fail_m: 30,
  full_ms: 300000,
  closeAt_s: 363.5,
  walkTo_s: 400,
} as const;

export function partialTickVectors(c: GateConfig): GateVectorFile {
  const v: GateVector[] = [];
  const pt = (elapsed_ms: number, distance_m: number, note: string) =>
    v.push(simVec({ fn: 'partialTick', elapsed_ms, distance_m, params: { ...c.partial } }, note));
  pt(
    PARTIAL.under_ms,
    PARTIAL.aboveRate_m,
    'D-059 / G10: 59 s elapsed pays nothing, not evaluated, no random draw',
  );
  pt(
    PARTIAL.at_ms,
    PARTIAL.aboveRate_m,
    'D-059 / G10: 60 s elapsed is evaluated, f = 0.2, needs > 10 m: 10.01 m passes',
  );
  pt(
    PARTIAL.at_ms,
    PARTIAL.atRate_m,
    'D-059: exactly minDistance x f (10 m at f = 0.2) fails (greaterThan)',
  );
  pt(PARTIAL.g9_ms, PARTIAL.g9Pass_m, 'G9: 3 minutes, f = 0.6, 31 m > 30 m passes');
  pt(PARTIAL.g9_ms, PARTIAL.g9Fail_m, 'G9: 3 minutes, 30 m = 0.6 x 50 fails');
  pt(
    PARTIAL.full_ms,
    c.gate.minDistancePerWindow_m,
    'a full window at close (e = window_s) behaves like a normal tick: exactly 50 m fails',
  );
  const walk = segment({ ...slow(0, PARTIAL.walkTo_s, CASE.origin) });
  v.push(
    simVec(
      gateIn(c, clockFrom(0), {
        samples: jsonSamples(walk, false),
        endAt_ms: PARTIAL.closeAt_s * CASE.ms,
      }),
      'dungeon_closed at 363.5 s (answers A-P2-F04-T14-7): window 0 judged normally, open window e = 63.5 s, distance counted to the last grid point <= close (360 s) from sample pairs that end at or before the close; samples after the close are ignored',
    ),
  );
  const seed = (runSeed: number, streamTag: string, index: number, note: string) =>
    v.push(simVec({ fn: 'deriveSeed', runSeed, streamTag, index }, note));
  seed(RNG.seeds.zero, 'drop', RNG.indexes.first, 'ADR 0003 6.2: FNV-1a of "0:drop:0"');
  seed(RNG.seeds.example, 'drop', RNG.indexes.first, 'FNV-1a of "20260926:drop:0"');
  seed(RNG.seeds.example, 'drop', RNG.indexes.twelfth, 'index is decimal without leading zeros');
  seed(
    RNG.seeds.example,
    'hit',
    RNG.indexes.first,
    'stream "hit" differs from "drop" at the same index',
  );
  seed(RNG.seeds.max, 'drop', RNG.indexes.second, 'runSeed at the uint32 maximum');
  v.push(
    simVec(
      {
        fn: 'streamDraws',
        runSeed: RNG.seeds.example,
        streamTag: 'drop',
        index: RNG.indexes.first,
        count: RNG.draws,
      },
      'first draws of mulberry32(deriveSeed(...)) in [0, 1)',
    ),
  );
  v.push(
    simVec(
      {
        fn: 'streamDraws',
        runSeed: RNG.seeds.one,
        streamTag: 'hit',
        index: RNG.indexes.second,
        count: RNG.draws,
      },
      'stream "hit", index 1',
    ),
  );
  const loot = (dropIndex: number, f: number, note: string, table: LootRarity[] = EXAMPLE_TABLE) =>
    v.push(simVec({ fn: 'rollTickLoot', runSeed: RNG.seeds.example, dropIndex, table, f }, note));
  loot(RNG.lootIndexes.a, RNG.fullF, 'ADR 0003 6.3 draw order on an example table, drop index 0');
  loot(RNG.lootIndexes.b, RNG.fullF, 'drop index 1 (next granted tick)');
  loot(RNG.lootIndexes.c, RNG.fullF, 'drop index 2');
  loot(
    RNG.grantedBeforeClose,
    RNG.partialF,
    'D-059 partial tick after 3 granted ticks uses the next drop index (3) and scales every rarity chance and the Common quantity by f = 0.2 (answers A-P2-F04-T14-6, confirms A-P2-F04-T01-4)',
  );
  loot(
    RNG.grantedBeforeClose,
    RNG.fullF,
    'same index at f = 1 for comparison: same draws, different thresholds',
  );
  const sure = EXAMPLE_TABLE.map((r) => (r.chance_pct === null ? r : { ...r, ...RNG.sure }));
  loot(
    RNG.lootIndexes.d,
    RNG.partialF,
    'every chance rarity at 100% x f = 0.2: chances scale with f, one draw per rarity still taken',
    sure,
  );
  return { formula: 'partial-tick', vectors: v };
}
