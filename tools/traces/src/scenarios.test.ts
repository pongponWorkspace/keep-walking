// P1-F02-T04: each synthetic trace does what its README row says. Thresholds come from config
// (dungeons.json#movementGate, runState.graceMax_s; anticheat.json#speedLock, checkIn).
// Prints the table trace -> expected -> actual.
import type { GpsTrace, TraceSample } from '@keep-walking/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { generateAll } from './catalog';
import { loadTraceConfig } from './config';
import { haversine_m } from './geo';
import { MS_PER_S, gateWindows, toKmh, traceStats } from './metrics';
import { insideTestRect } from './places';
import { outsideRuns } from './stats';

const cfg = loadTraceConfig();
const traces = new Map(generateAll(cfg).map((g) => [g.def.id, g] as const));
const rows: string[] = [];

function get(id: string): GpsTrace {
  const g = traces.get(id);
  if (g === undefined) throw new Error(`missing scenario ${id}`);
  return g.trace;
}

function markT(id: string, prefix: string): number {
  const m = traces.get(id)?.marks.find((x) => x.label.startsWith(prefix));
  if (m === undefined) throw new Error(`missing mark ${prefix} in ${id}`);
  return m.t_ms;
}

function gate(trace: GpsTrace) {
  return gateWindows(trace.samples, {
    window_s: cfg.gateWindow_s,
    minDistance_m: cfg.gateMinDistance_m,
    comparison: cfg.gateComparison,
  });
}

function row(id: string, expected: string, actual: string) {
  rows.push(`| ${id} | ${expected} | ${actual} |`);
}

const lockMs = cfg.speedLock_kmh / toKmh(1);
const G = cfg.gateMinDistance_m;

afterAll(() => {
  console.log(['| trace | expected | actual |', '| --- | --- | --- |', ...rows].join('\n'));
});

describe('movement gate traces', () => {
  it('park loop: every window passes', () => {
    const w = gate(get('synthetic-park-loop-01'));
    const pass = w.filter((x) => x.pass).length;
    row(
      'synthetic-park-loop-01',
      'ผ่านทุกหน้าต่าง',
      `${pass}/${w.length}, ต่ำสุด ${Math.min(...w.map((x) => x.distance_m)).toFixed(1)} ม.`,
    );
    expect(pass).toBe(w.length);
  });

  it('bench with jitter: windows pass (GDD: a bench still earns ticks)', () => {
    const w = gate(get('synthetic-bench-jitter-01'));
    const pass = w.filter((x) => x.pass).length;
    const min = Math.min(...w.map((x) => x.distance_m));
    const max = Math.max(...w.map((x) => x.distance_m));
    row(
      'synthetic-bench-jitter-01',
      'pass > 0%',
      `${pass}/${w.length}, ${min.toFixed(1)}-${max.toFixed(1)} ม.`,
    );
    expect(pass).toBeGreaterThan(0);
  });

  it('phone on a table: zero windows pass, far below the threshold', () => {
    const t = get('synthetic-table-still-01');
    const w = gate(t);
    const max = Math.max(...w.map((x) => x.distance_m));
    const first = t.samples[0] as TraceSample;
    const spread = Math.max(...t.samples.map((s) => haversine_m(first, s)));
    row(
      'synthetic-table-still-01',
      'pass 0%, สูงสุด < 20% ของเกณฑ์',
      `0/${w.length} ผ่าน, สูงสุด ${max.toFixed(2)} ม., ห่างจุดแรกไม่เกิน ${spread.toFixed(2)} ม.`,
    );
    expect(w.filter((x) => x.pass)).toEqual([]);
    expect(max).toBeLessThan(G * 0.2);
    expect(traceStats(t).duration_s).toBeGreaterThanOrEqual(600);
  });

  it('boundary: a window at the threshold fails, one just above passes', () => {
    const w = gate(get('synthetic-boundary-50m-01'));
    const atMax = Math.max(...w.filter((x) => x.distance_m <= G).map((x) => x.distance_m));
    const above = w.filter((x) => x.distance_m > G);
    row(
      'synthetic-boundary-50m-01',
      `หน้าต่าง = ${G} ม. ไม่ผ่าน, ${G}.01+ ม. ผ่าน`,
      `สูงสุดที่ไม่เกิน ${atMax.toFixed(4)} ม. (ไม่ผ่าน), เกิน ${above.length} หน้าต่าง = ${above[0]?.distance_m.toFixed(4)} ม. (ผ่าน)`,
    );
    expect(atMax).toBeGreaterThanOrEqual(G - 0.001);
    expect(w.find((x) => x.distance_m === atMax)?.pass).toBe(
      cfg.gateComparison !== 'greaterThan' && atMax === G,
    );
    expect(above.length).toBeGreaterThan(0);
    for (const x of above) {
      expect(x.distance_m).toBeGreaterThanOrEqual(G + 0.01);
      expect(x.distance_m).toBeLessThanOrEqual(G + 0.02);
      expect(x.pass).toBe(true);
    }
  });
});

describe('edge, check-in and anti-cheat traces', () => {
  it('edge walk: drift outside stays under grace; exit 1 under grace; exit 2 over grace', () => {
    const t = get('synthetic-edge-walk-01');
    const exit1 = markT('synthetic-edge-walk-01', 'ออกครั้งที่ 1: เริ่ม') / MS_PER_S;
    const exit2 = markT('synthetic-edge-walk-01', 'ออกครั้งที่ 2: เริ่ม') / MS_PER_S;
    const runs = outsideRuns(t.samples);
    const drift = runs.filter(
      (r) => r.start_s < exit1 || (r.start_s > exit1 + cfg.graceMax_s && r.start_s < exit2),
    );
    const r1 = Math.max(
      ...runs
        .filter((r) => r.start_s >= exit1 && r.start_s < exit1 + cfg.graceMax_s)
        .map((r) => r.length_s),
    );
    const r2 = Math.max(...runs.filter((r) => r.start_s >= exit2).map((r) => r.length_s));
    const driftMax = Math.max(...drift.map((r) => r.length_s));
    row(
      'synthetic-edge-walk-01',
      `drift นอกขอบ < ${cfg.graceMax_s} วิ, ออก 1 < ${cfg.graceMax_s} วิ, ออก 2 > ${cfg.graceMax_s} วิ`,
      `drift ${drift.length} ช่วง ยาวสุด ${driftMax} วิ, ออก 1 = ${r1} วิ, ออก 2 = ${r2} วิ`,
    );
    expect(drift.length).toBeGreaterThan(0);
    expect(driftMax).toBeLessThan(cfg.graceMax_s);
    expect(r1).toBeLessThan(cfg.graceMax_s);
    expect(r2).toBeGreaterThan(cfg.graceMax_s);
  });

  it('walk-in: continuous approach from outside, longer than the check-in minimum, accuracy below max', () => {
    const t = get('synthetic-walk-in-01');
    const firstIn = t.samples.findIndex((s) => insideTestRect(s));
    const approach = t.samples.slice(0, firstIn);
    const approach_s =
      ((t.samples[firstIn] as TraceSample).t - (t.samples[0] as TraceSample).t) / MS_PER_S;
    const worstAcc = Math.max(...t.samples.map((s) => s.accuracy));
    const maxStep = Math.max(
      ...t.samples.slice(1).map((s, i) => haversine_m(t.samples[i] as TraceSample, s)),
    );
    row(
      'synthetic-walk-in-01',
      `เดินเข้าต่อเนื่อง >= ${cfg.checkInMinApproach_s} วิ, accuracy < ${cfg.checkInMaxAccuracy_m} ม.`,
      `เดินจากนอก ${approach_s} วิ (${approach.length} fix), accuracy สูงสุด ${worstAcc} ม., ก้าวยาวสุด ${maxStep.toFixed(1)} ม.`,
    );
    expect(approach.every((s) => !insideTestRect(s))).toBe(true);
    expect(approach_s).toBeGreaterThanOrEqual(cfg.checkInMinApproach_s);
    expect(worstAcc).toBeLessThan(cfg.checkInMaxAccuracy_m);
    expect(maxStep).toBeLessThan(50);
  });

  it('teleport: the first fix inside comes from a jump no walker can make', () => {
    const t = get('synthetic-teleport-spoof-01');
    const i = t.samples.findIndex((s) => insideTestRect(s));
    const a = t.samples[i - 1] as TraceSample;
    const b = t.samples[i] as TraceSample;
    const speed = haversine_m(a, b) / ((b.t - a.t) / MS_PER_S);
    row(
      'synthetic-teleport-spoof-01',
      'fix แรกในพื้นที่มาจากการกระโดด (ต้องปฏิเสธ check-in)',
      `กระโดด ${haversine_m(a, b).toFixed(0)} ม. ใน ${(b.t - a.t) / MS_PER_S} วิ = ${toKmh(speed).toFixed(0)} กม./ชม., accuracy ${b.accuracy} ม.`,
    );
    expect(speed).toBeGreaterThan(lockMs);
    expect(b.accuracy).toBeLessThan(cfg.checkInMaxAccuracy_m);
  });

  it('driving: reported speed stays above the speed lock for minutes', () => {
    const t = get('synthetic-driving-40kmh-01');
    const fast = t.samples.filter((s) => (s.speed ?? 0) > lockMs);
    const st = traceStats(t);
    row(
      'synthetic-driving-40kmh-01',
      `speed > ${cfg.speedLock_kmh} กม./ชม. เป็นช่วงยาว`,
      `${fast.length} fix เกิน lock, speed สูงสุด ${st.maxReportedSpeed_kmh?.toFixed(1)} กม./ชม.`,
    );
    expect(fast.length).toBeGreaterThan(120);
  });

  it('drift spikes: big jumps with implied speed above the lock while the walker is slow', () => {
    const t = get('synthetic-drift-spike-01');
    const st = traceStats(t);
    row(
      'synthetic-drift-spike-01',
      'มี spike ที่ความเร็วแฝงเกิน lock แต่ speed ที่รายงาน < lock',
      `ความเร็วแฝงสูงสุด ${st.maxImpliedSpeed_kmh.toFixed(0)} กม./ชม., speed ที่รายงานสูงสุด ${st.maxReportedSpeed_kmh?.toFixed(1)} กม./ชม., ระยะดิบ ${st.pathLength_m.toFixed(0)} ม.`,
    );
    expect(st.maxImpliedSpeed_kmh).toBeGreaterThan(cfg.speedLock_kmh);
    expect(st.maxReportedSpeed_kmh ?? 0).toBeLessThan(cfg.speedLock_kmh);
  });
});

describe('weak signal and provider-event traces', () => {
  it('soi: poor accuracy, irregular fixes, three gaps with provider errors', () => {
    const t = get('synthetic-soi-occluded-01');
    const st = traceStats(t);
    const types = (t.events ?? []).map((e) => e.type);
    row(
      'synthetic-soi-occluded-01',
      'accuracy กลาง > 20 ม., gap > 10 วิ 3 ช่วง, มี timeout/position-unavailable',
      `accuracy กลาง ${st.accuracyMedian_m} ม. (${st.accuracyMin_m}-${st.accuracyMax_m}), gap ${st.gaps} ช่วง ยาวสุด ${st.maxGap_s} วิ, event ${types.join(', ')}`,
    );
    expect(st.accuracyMedian_m).toBeGreaterThan(20);
    expect(st.gaps).toBe(3);
    expect(types).toEqual(['timeout', 'position-unavailable']);
  });

  it('screen lock: samples exist while hidden (the Mock must drop them)', () => {
    const t = get('synthetic-screen-lock-01');
    const ev = t.events ?? [];
    const hidden = ev.find((e) => e.type === 'visibility-hidden')?.t ?? -1;
    const visible = ev.find((e) => e.type === 'visibility-visible')?.t ?? -1;
    const inside = t.samples.filter((s) => s.t >= hidden && s.t < visible).length;
    row(
      'synthetic-screen-lock-01',
      'มี sample ในช่วงซ่อนจอ, event 4 รายการ',
      `ซ่อน ${hidden / MS_PER_S}-${visible / MS_PER_S} วิ มี ${inside} sample (Mock ต้องไม่ส่ง), ส่งได้ ${t.samples.length - inside}/${t.samples.length}`,
    );
    expect(ev.map((e) => e.type)).toEqual([
      'visibility-hidden',
      'visibility-visible',
      'position-unavailable',
      'timeout',
    ]);
    expect(inside).toBeGreaterThan(0);
  });

  it('permission denied: event at 60 s with samples after it', () => {
    const t = get('synthetic-permission-denied-01');
    const at = t.events?.[0]?.t ?? -1;
    const after = t.samples.filter((s) => s.t > at).length;
    row(
      'synthetic-permission-denied-01',
      'permission-denied แล้วยังมี sample ต่อ (provider ต้องหยุด)',
      `event ที่ ${at / MS_PER_S} วิ, sample หลัง event ${after}`,
    );
    expect(t.events?.map((e) => e.type)).toEqual(['permission-denied']);
    expect(after).toBeGreaterThan(0);
  });

  it('warm-up: first fix at or below the check-in accuracy is at exactly 45 s', () => {
    const t = get('synthetic-warmup-accuracy-01');
    const i = t.samples.findIndex((s) => s.accuracy <= cfg.checkInMaxAccuracy_m);
    const s = t.samples[i] as TraceSample;
    const prev = t.samples[i - 1] as TraceSample;
    row(
      'synthetic-warmup-accuracy-01',
      `fix แรกที่ accuracy <= ${cfg.checkInMaxAccuracy_m} ม. ที่ 45 วิ`,
      `ที่ ${s.t / MS_PER_S} วิ accuracy ${s.accuracy} (ก่อนหน้า ${prev.accuracy}), เริ่มที่ ${t.samples[0]?.accuracy} ม.`,
    );
    expect(s.t).toBe(45 * MS_PER_S);
    expect(s.accuracy).toBe(cfg.checkInMaxAccuracy_m);
    expect(prev.accuracy).toBeGreaterThan(cfg.checkInMaxAccuracy_m);
    expect(t.samples.filter((x) => x.t > 60 * MS_PER_S).every((x) => x.accuracy < 10)).toBe(true);
  });
});
