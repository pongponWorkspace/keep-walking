// CLI: prints the measured numbers for every synthetic trace (the README table comes from here).
//   pnpm exec tsx tools/traces/src/stats.ts
import { pathToFileURL } from 'node:url';
import type { GpsTrace, TraceSample } from '@keep-walking/shared';
import type { Generated } from './catalog';
import { generateAll } from './catalog';
import type { TraceConfig } from './config';
import { loadTraceConfig } from './config';
import { haversine_m } from './geo';
import { MS_PER_S, gateWindows, traceStats } from './metrics';
import { insideTestRect } from './places';

const DIGITS = 1;
const FINE_DIGITS = 4;

export interface GateSummary {
  readonly total: number;
  readonly pass: number;
  readonly min_m: number;
  readonly max_m: number;
}

export function gateSummary(trace: GpsTrace, cfg: TraceConfig): GateSummary {
  const w = gateWindows(trace.samples, {
    window_s: cfg.gateWindow_s,
    minDistance_m: cfg.gateMinDistance_m,
    comparison: cfg.gateComparison,
  });
  const d = w.map((x) => x.distance_m);
  return {
    total: w.length,
    pass: w.filter((x) => x.pass).length,
    min_m: Math.min(...d),
    max_m: Math.max(...d),
  };
}

/** Runs of consecutive fixes reported outside the test rectangle: [start_s, length_s]. */
export function outsideRuns(
  samples: readonly TraceSample[],
): { start_s: number; length_s: number }[] {
  const runs: { start_s: number; length_s: number }[] = [];
  let startT: number | undefined;
  let prevT = 0;
  for (const s of samples) {
    const out = !insideTestRect(s);
    if (out && startT === undefined) startT = s.t;
    if (!out && startT !== undefined) {
      runs.push({ start_s: startT / MS_PER_S, length_s: (prevT - startT) / MS_PER_S });
      startT = undefined;
    }
    prevT = s.t;
  }
  if (startT !== undefined)
    runs.push({ start_s: startT / MS_PER_S, length_s: (prevT - startT) / MS_PER_S });
  return runs;
}

/** Largest single step between consecutive fixes (metres) and when it happens. */
export function largestStep(samples: readonly TraceSample[]): { at_s: number; distance_m: number } {
  let best = { at_s: 0, distance_m: 0 };
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1] as TraceSample;
    const b = samples[i] as TraceSample;
    const d = haversine_m(a, b);
    if (d > best.distance_m) best = { at_s: b.t / MS_PER_S, distance_m: d };
  }
  return best;
}

function describe(g: Generated, cfg: TraceConfig): string {
  const { trace, marks, def } = g;
  const st = traceStats(trace);
  const gate = gateSummary(trace, cfg);
  const step = largestStep(trace.samples);
  const f = (x: number, n = DIGITS) => x.toFixed(n);
  const lines = [
    `## ${def.id} (seed ${def.seed})`,
    `samples=${st.samples} duration_s=${f(st.duration_s)} path_m=${f(st.pathLength_m)} events=${st.events}`,
    `gate windows pass=${gate.pass}/${gate.total} min_m=${f(gate.min_m, FINE_DIGITS)} max_m=${f(gate.max_m, FINE_DIGITS)}`,
    `accuracy min=${st.accuracyMin_m} median=${f(st.accuracyMedian_m)} max=${st.accuracyMax_m}`,
    `maxImpliedSpeed_kmh=${f(st.maxImpliedSpeed_kmh)} maxReportedSpeed_kmh=${st.maxReportedSpeed_kmh === undefined ? '-' : f(st.maxReportedSpeed_kmh)}`,
    `gaps>10s=${st.gaps} maxGap_s=${f(st.maxGap_s)} largestStep_m=${f(step.distance_m)} at_s=${step.at_s}`,
  ];
  const runs = outsideRuns(trace.samples);
  if (def.environment !== 'soi' && runs.length > 0 && runs.length < trace.samples.length) {
    const longest = Math.max(...runs.map((r) => r.length_s));
    const list = runs.map((r) => `${r.start_s}+${r.length_s}`).join(' ');
    lines.push(
      `test-rect outside runs=${runs.length} longest_s=${longest} [start_s+length_s] ${list}`,
    );
  }
  for (const m of marks) lines.push(`  mark ${f(m.t_ms / MS_PER_S)} s: ${m.label}`);
  return lines.join('\n');
}

function main(): void {
  const cfg = loadTraceConfig();
  console.log(
    `config: gate ${cfg.gateComparison} ${cfg.gateMinDistance_m} m / ${cfg.gateWindow_s} s, grace ${cfg.graceMax_s} s, speedLock ${cfg.speedLock_kmh} km/h, checkIn acc ${cfg.checkInMaxAccuracy_m} m, approach ${cfg.checkInMinApproach_s} s\n`,
  );
  for (const g of generateAll(cfg)) console.log(`${describe(g, cfg)}\n`);
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
