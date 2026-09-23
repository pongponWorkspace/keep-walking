// Provider behaviour: screen lock and GPS errors, permission revoked, and the accuracy warm-up
// after the GPS starts (TTFF to the check-in accuracy).
import { MS_PER_S } from '../metrics';
import type { Rng } from '../rng';
import { Recorder, walk } from './common';
import { parkLoop } from './park';
import type { ScenarioDef } from './types';

const WALK = {
  speed_ms: 1.3,
  speedSd_ms: 0.1,
  interval_s: 1,
  noise: { sigma_m: 2, tau_s: 20 },
  accuracyMin_m: 4,
  accuracyMax_m: 9,
} as const;

const walkAcc = (r: Rng) => r.uniform(WALK.accuracyMin_m, WALK.accuracyMax_m);
const walkOpts = {
  speed_ms: WALK.speed_ms,
  speedSd_ms: WALK.speedSd_ms,
  interval_s: WALK.interval_s,
  reportMotion: true,
};

const LOCK = {
  duration_s: 720,
  hidden_s: 240,
  visible_s: 360,
  unavailable_s: 500,
  timeout_s: 520,
} as const;

export const screenLockScenario: ScenarioDef = {
  id: 'synthetic-screen-lock-01',
  scenario: 'screen-lock',
  seed: 501,
  environment: 'park',
  description:
    'เดินวนในสวน 12 นาที ล็อกจอช่วง 4:00-6:00 (sample ยังมีในไฟล์ แต่ Mock ต้องไม่ส่ง) และ GPS error ชั่วคราว position-unavailable ที่ 8:20 กับ timeout ที่ 8:40',
  build: ({ rng }, b) => {
    const rec = new Recorder(b, rng, WALK.noise, walkAcc);
    const endMs = LOCK.duration_s * MS_PER_S;
    b.event(LOCK.hidden_s * MS_PER_S, 'visibility-hidden');
    b.event(LOCK.visible_s * MS_PER_S, 'visibility-visible');
    b.event(LOCK.unavailable_s * MS_PER_S, 'position-unavailable');
    b.event(LOCK.timeout_s * MS_PER_S, 'timeout');
    const loop = parkLoop();
    walk(rec, loop, 0, loop.length_m, { ...walkOpts, drop: (t) => t > endMs });
    return rec.marks;
  },
};

const DENIED = {
  duration_s: 90,
  denied_s: 60,
} as const;

export const permissionDeniedScenario: ScenarioDef = {
  id: 'synthetic-permission-denied-01',
  scenario: 'permission-denied',
  seed: 502,
  environment: 'park',
  description:
    'เดินในสวน 90 วินาที ผู้ใช้ถอนสิทธิ์ตำแหน่งที่วินาทีที่ 60 (event permission-denied) sample หลังจากนั้นยังมีในไฟล์ แต่ provider ต้องหยุดและเข้า error',
  build: ({ rng }, b) => {
    const rec = new Recorder(b, rng, WALK.noise, walkAcc);
    const endMs = DENIED.duration_s * MS_PER_S;
    b.event(DENIED.denied_s * MS_PER_S, 'permission-denied');
    const loop = parkLoop();
    walk(rec, loop, 0, loop.length_m, { ...walkOpts, drop: (t) => t > endMs });
    return rec.marks;
  },
};

const WARMUP = {
  duration_s: 300,
  startAccuracy_m: 150,
  /** First fix at or below checkIn.maxAccuracy_m (config) lands exactly at this second. */
  reachCheckIn_s: 45,
  settled_s: 60,
  /** Right after reaching the check-in accuracy the value keeps improving from this fraction of it. */
  afterReachFrac: 0.9,
  settledAccuracy_m: 6,
  /** The position error scales with the reported accuracy during warm-up. */
  errorPerAccuracy: 0.5,
} as const;

/** Accuracy schedule: strictly decreasing until settled, exactly maxAcc at reachCheckIn_s. */
export function warmupAccuracy(t_s: number, maxAcc: number, rng: Rng): number {
  const { startAccuracy_m, reachCheckIn_s, settled_s, afterReachFrac, settledAccuracy_m } = WARMUP;
  if (t_s < reachCheckIn_s) {
    const f = (reachCheckIn_s - t_s) / reachCheckIn_s;
    return maxAcc + (startAccuracy_m - maxAcc) * f * f;
  }
  if (t_s === reachCheckIn_s) return maxAcc;
  if (t_s <= settled_s) {
    const top = maxAcc * afterReachFrac;
    return (
      settledAccuracy_m +
      ((top - settledAccuracy_m) * (settled_s - t_s)) / (settled_s - reachCheckIn_s - 1)
    );
  }
  return rng.uniform(WALK.accuracyMin_m, WALK.accuracyMax_m);
}

export const warmupScenario: ScenarioDef = {
  id: 'synthetic-warmup-accuracy-01',
  scenario: 'warmup-accuracy',
  seed: 503,
  environment: 'park',
  description:
    'เปิด GPS แล้วเดินในสวน 5 นาที accuracy เริ่ม 150 ม. ลดลงต่อเนื่อง fix แรกที่ถึงเกณฑ์ check-in (config) อยู่ที่วินาทีที่ 45 พอดี และนิ่งที่ราว 6 ม. หลังวินาทีที่ 60',
  build: ({ rng, cfg }, b) => {
    const maxAcc = cfg.checkInMaxAccuracy_m;
    const rec = new Recorder(b, rng, WALK.noise, walkAcc);
    const endMs = WARMUP.duration_s * MS_PER_S;
    const loop = parkLoop();
    const start = loop.length_m / 2;
    walk(rec, loop, start, start + loop.length_m, {
      ...walkOpts,
      reportMotion: false,
      drop: (t) => t > endMs,
      bias: (t) => {
        const acc = warmupAccuracy(t / MS_PER_S, maxAcc, rng);
        const err = acc * WARMUP.errorPerAccuracy;
        return { north: rng.gaussian(0, err), east: rng.gaussian(0, err), accuracy: acc };
      },
    });
    return [];
  },
};
