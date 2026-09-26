// CLI: evidence for the P2-F05-T20 values (cadence, outlier filter, hysteresis, speed lock).
// Run from the repo root: pnpm exec tsx tools/sim/src/report-gate.ts
// Sweep candidates below are what-if inputs for the report, never written to config.
import { loadBalanceConfig } from './config';
import { MS_PER_S, filterSamples, runGate } from './gate';
import type { GateParams } from './gate';
import { gateConfigFromConfig, gateConfigProblems } from './params-gate';
import { Hysteresis, checkIn, runTimeline, speedLockTransitions } from './presence';
import type { PresenceSample, RunStateParams } from './presence';
import { TEST_POLYGON, loadTraceSamples, tracePath } from './traces';

const WHAT_IF = {
  cadences_s: { a: 1, b: 2, c: 3, d: 5, e: 10 },
  outlierSpeeds_kmh: { a: 30, b: 40, c: 50, d: 60, e: 80 },
  hysteresis: [
    { edgeHysteresisSamples: 3, edgeHysteresis_m: 5 },
    { edgeHysteresisSamples: 6, edgeHysteresis_m: 5 },
    { edgeHysteresisSamples: 10, edgeHysteresis_m: 5 },
    { edgeHysteresisSamples: 6, edgeHysteresis_m: 10 },
    { edgeHysteresisSamples: 6, edgeHysteresis_m: 0 },
  ],
  lock: [
    { lockSustained_s: 10, unlockSustained_s: 40 },
    { lockSustained_s: 15, unlockSustained_s: 60 },
    { lockSustained_s: 20, unlockSustained_s: 90 },
  ],
  every: { hz1: 1, hz02: 5 },
  decimals: 1,
  pad: { id: 13, speed: 3, time: 8 },
  msPerS: 1000,
  edgeWalkEnd_ms: 1_170_000,
  /** J-9 what-if caps on a pending confirmation set (s); proposal only, not in config. */
  pendingCaps_s: { a: 30, b: 45, c: 60, d: 90 },
} as const;

const c = gateConfigFromConfig(loadBalanceConfig());
const always = [{ start_ms: 0, end_ms: null }];
const load = (id: string, every: number, polygon: string | null = null) =>
  loadTraceSamples({ trace: tracePath(`synthetic-${id}-01`), polygon, every, phase: 0 });
const fmt = (x: number) => x.toFixed(WHAT_IF.decimals);
const sec = (ms: number) => fmt(ms / WHAT_IF.msPerS);

function windowsLine(s: PresenceSample[], p: GateParams): string {
  const w = runGate(s, always, p).windows;
  return `${w.filter((x) => x.passed).length}/${w.length} [${w.map((x) => fmt(x.distance_m)).join(' ')}]`;
}

function section1(): void {
  console.log('\n1. sampleCadence_s: reward windows passed / judged [distance m per window]');
  for (const id of ['table-still', 'bench-jitter', 'park-loop', 'boundary-50m']) {
    for (const cad of Object.values(WHAT_IF.cadences_s)) {
      const p = { ...c.gate, sampleCadence_s: cad };
      const mark = cad === c.gate.sampleCadence_s ? ' <- config' : '';
      console.log(
        `  ${id.padEnd(WHAT_IF.pad.id)} cadence ${String(cad).padStart(2)} s  1 Hz ${windowsLine(load(id, WHAT_IF.every.hz1), p)}${mark}`,
      );
    }
    console.log(
      `  ${id.padEnd(WHAT_IF.pad.id)} config cadence 0.2 Hz ${windowsLine(load(id, WHAT_IF.every.hz02), c.gate)}`,
    );
  }
}

function approachDone(s: PresenceSample[], p: typeof c.checkIn): string {
  for (const x of s) {
    const r = checkIn(s, x.t_ms, p);
    if (r.ok || r.reason === 'no_approach_from_outside') return `${sec(x.t_ms)} s`;
  }
  return 'never';
}

function section2(): void {
  console.log(
    '\n2. outlierSpeed_kmh: warm-up approach reaches minContinuousApproach_s at; drift-spike filtered total',
  );
  const warm = load('warmup-accuracy', WHAT_IF.every.hz1);
  for (const o of Object.values(WHAT_IF.outlierSpeeds_kmh)) {
    const p = { ...c.checkIn, outlierSpeed_kmh: o };
    const total = (every: number) => {
      const r = runGate(load('drift-spike', every), always, { ...c.gate, outlierSpeed_kmh: o });
      return fmt(
        [...r.windows.map((w) => w.distance_m), r.open.distance_m].reduce((a, b) => a + b, 0),
      );
    };
    const mark = o === c.gate.outlierSpeed_kmh ? ' <- config' : '';
    console.log(
      `  ${String(o).padStart(WHAT_IF.pad.speed)} km/h  warm-up ${approachDone(warm, p).padEnd(WHAT_IF.pad.time)} drift 1 Hz ${total(WHAT_IF.every.hz1)} m, 0.2 Hz ${total(WHAT_IF.every.hz02)} m${mark}`,
    );
  }
}

function exits(p: RunStateParams, every: number): string {
  const s = load('edge-walk', every, TEST_POLYGON);
  const ev = runTimeline(s, 0, WHAT_IF.edgeWalkEnd_ms, p).events;
  return ev
    .filter((e) => e.type === 'run_state_changed')
    .map((e) => `${e.type === 'run_state_changed' ? e.to[0] : ''}@${sec(e.at_ms)}`)
    .join(' ');
}

function section3(): void {
  console.log(
    '\n3. edge hysteresis on synthetic-edge-walk-01 (g = grace, s = suspended, a = active; real exits at 532 s and 853 s)',
  );
  for (const h of WHAT_IF.hysteresis) {
    const p = { ...c.run, ...h };
    const mark =
      h.edgeHysteresisSamples === c.run.edgeHysteresisSamples &&
      h.edgeHysteresis_m === c.run.edgeHysteresis_m
        ? ' <- config'
        : '';
    console.log(
      `  N ${String(h.edgeHysteresisSamples).padStart(2)} d ${String(h.edgeHysteresis_m).padStart(2)} m${mark}`,
    );
    console.log(`     1 Hz   ${exits(p, WHAT_IF.every.hz1)}`);
    console.log(`     0.2 Hz ${exits(p, WHAT_IF.every.hz02)}`);
  }
}

function section4(): void {
  console.log('\n4. speed lock transitions (enter / exit at s)');
  for (const l of WHAT_IF.lock) {
    const p = { ...c.lock, ...l };
    const mark =
      l.lockSustained_s === c.lock.lockSustained_s &&
      l.unlockSustained_s === c.lock.unlockSustained_s
        ? ' <- config'
        : '';
    const line = (id: string, every: number) =>
      speedLockTransitions(load(id, every), p)
        .map((t) => `${t.phase}@${sec(t.at_ms)}`)
        .join(' ') || 'none';
    console.log(
      `  lock ${l.lockSustained_s} s / unlock ${l.unlockSustained_s} s${mark}: driving 1 Hz ${line('driving-40kmh', WHAT_IF.every.hz1)} · 0.2 Hz ${line('driving-40kmh', WHAT_IF.every.hz02)} · drift-spike 0.2 Hz ${line('drift-spike', WHAT_IF.every.hz02)} · edge-walk ${line('edge-walk', WHAT_IF.every.hz1)}`,
    );
  }
}

interface PendingSet {
  start_ms: number;
  last_ms: number;
  confirmed: boolean;
}

/** Pending confirmation sets of the edge hysteresis (tech note F04 5.2) over one trace. */
function pendingSets(samples: PresenceSample[], p: RunStateParams): PendingSet[] {
  const verdicts = filterSamples(samples, p);
  const usable = samples.filter((_, i) => verdicts[i]?.kept === true);
  const h = new Hysteresis('in', p);
  const sets: PendingSet[] = [];
  let open: PendingSet | null = null;
  let last: number | null = null;
  for (const x of usable) {
    if (last !== null && x.t_ms - last > p.maxSamplePairGap_s * MS_PER_S) {
      h.reset();
      open = null;
    }
    last = x.t_ms;
    const before = h.firstAt_ms;
    const at = h.feed(x);
    if (at !== null) {
      if (open) [open.last_ms, open.confirmed] = [x.t_ms, true];
      else sets.push({ start_ms: at, last_ms: x.t_ms, confirmed: true });
      open = null;
    } else if (h.firstAt_ms === null) open = null;
    else if (before === null || open === null) {
      open = { start_ms: h.firstAt_ms, last_ms: x.t_ms, confirmed: false };
      sets.push(open);
    } else open.last_ms = x.t_ms;
  }
  return sets;
}

function section5(): void {
  console.log(
    '\n5. J-9: pending confirmation sets on synthetic-edge-walk-01 (duration = first sample of the set -> confirming or last sample)',
  );
  for (const every of Object.values(WHAT_IF.every)) {
    const sets = pendingSets(load('edge-walk', every, TEST_POLYGON), c.run);
    const conf = sets
      .filter((x) => x.confirmed)
      .map((x) => (x.last_ms - x.start_ms) / WHAT_IF.msPerS);
    const drop = sets
      .filter((x) => !x.confirmed)
      .map((x) => (x.last_ms - x.start_ms) / WHAT_IF.msPerS);
    const max = (a: number[]) => (a.length ? fmt(Math.max(...a)) : '-');
    const caps = Object.values(WHAT_IF.pendingCaps_s)
      .map((cap) => `${cap} s cuts ${conf.filter((d) => d > cap).length} confirmed`)
      .join(' · ');
    console.log(
      `  every ${every} sample(s): ${sets.length} sets · confirmed ${conf.length} (longest ${max(conf)} s) · abandoned ${drop.length} (longest ${max(drop)} s) · ${caps}`,
    );
  }
}

function main(): void {
  console.log('P2-F05-T20 gate / run state / check-in evidence (config/balance, synthetic traces)');
  const problems = gateConfigProblems(c);
  console.log(
    `0. config consistency rules: ${problems.length === 0 ? 'all pass' : problems.join('; ')}`,
  );
  section1();
  section2();
  section3();
  section4();
  section5();
}

main();
