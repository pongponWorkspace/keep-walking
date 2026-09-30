// P2-H57: two more real-dungeon runs for the F04-F06 visual gate (qa request P2-H55,
// art/reviews/screens/F04-F06/README.md sections 7.2 and 7.5). Same real polygon, anchor point,
// cadence and approach as the P2-H52 tick-denied trace (`leelawadee-lawn`, open 05:00-21:00,
// level range 1-5):
//  - suspended-leelawadee: enter, walk inside, walk out and stay outside longer than
//    runState.graceMax_s (Grace -> Suspended), then walk back in (Suspended -> Active).
//  - hp-low-leelawadee: enter and keep walking inside, with no loop and no exit, long enough that
//    a level-1 character reaches the low-HP band and then auto-retreat.
//
// Every phase length comes from config at generation time (checkIn.minContinuousApproach_s,
// runState.graceMax_s, rewardTick.rewardTickInterval_s) except the hp-low walk length, which comes
// from an offline sessionStep replay (README section 7) and is checked there.
import type { LatLng } from '../geo';
import { Polyline, offset } from '../geo';
import { MS_PER_S } from '../metrics';
import { Recorder, walk } from './common';
import type { WalkOptions } from './common';
import type { ScenarioContext } from './common';
import type { TraceBuilder } from '../builder';
import type { ScenarioDef } from './types';
import { LEELAWADEE_INTERIOR } from './tick-denied';

const RUN = {
  /** One fix per movementGate.sampleCadence_s-sized step, like tick-denied. */
  interval_s: 5,
  walkSpeed_ms: 1.3,
  walkSpeedSd_ms: 0.1,
  walkNoise: { sigma_m: 1.5, tau_s: 20 },
  walkAccuracyMin_m: 5,
  walkAccuracyMax_m: 9,
  /** Approach length = this many times checkIn.minContinuousApproach_s of walking, from outside. */
  approachFactor: 2,
  /** Metres from the interior point to the south edge along the approach line (about 23 m). */
  interiorToSouthEdge_m: 23,
  /** Walking loop around the interior point: at least 14.7 m from the edge (tick-denied check). */
  loopRadius_m: 6,
} as const;

const SUSPENDED = {
  /** Walking inside before leaving = one reward window, so a late tap on "enter" (Mock speed=60
   * turns 1 s of real time into 60 s of trace time) still confirms well before the exit. */
  insideWindows: 1,
  /** Where the player waits outside: this far beyond the south edge (well past
   * runState.edgeHysteresis_m plus GPS noise plus the small loop below). */
  outsideBeyondEdge_m: 40,
  outsideLoopRadius_m: 5,
  outsideSpeed_ms: 0.6,
  /** Time outside after Grace ends, so Suspended stays on screen: 300 s of trace = 5 s real at
   * speed=60 (30 s at speed=10). graceMax_s + this stays far under suspendedMax_s (900). */
  suspendedHold_s: 300,
  /** Walking inside after coming back: one reward window + slack, so the resumed run shows. */
  afterReturnWindows: 1,
  afterReturnSlack_s: 60,
} as const;

const HP_LOW = {
  /** Walking inside after arrival, seconds of trace. Picked from the offline sessionStep replay
   * (README section 7): long enough that the recommended seed/class pair reaches the low-HP band
   * and then auto-retreat with trace left over, so the Mock clock (which stops at the last sample
   * with loop=0) keeps running through both. */
  walkInside_s: 5400,
} as const;

function loopAround(center: LatLng, r: number): Polyline {
  const corners = 8;
  const pts: LatLng[] = [];
  for (let i = 0; i < corners; i += 1) {
    const a = (2 * Math.PI * i) / corners;
    pts.push(offset(center, r * Math.cos(a), r * Math.sin(a)));
  }
  return new Polyline(pts, true);
}

const WALK: WalkOptions = {
  speed_ms: RUN.walkSpeed_ms,
  speedSd_ms: RUN.walkSpeedSd_ms,
  interval_s: RUN.interval_s,
  reportMotion: true,
};

/** Laps `loop` from distance `d` until `end_ms`; returns the distance reached. */
function lapUntil(
  rec: Recorder,
  loop: Polyline,
  d: number,
  end_ms: number,
  opts: WalkOptions = WALK,
): number {
  let at = d;
  while (rec.t_ms < end_ms) {
    at = walk(rec, loop, at, at + loop.length_m, opts);
  }
  return at;
}

/** Shared start: walk north from outside the south edge to the interior point. */
function approach({ rng, cfg }: ScenarioContext, b: TraceBuilder): Recorder {
  const rec = new Recorder(b, rng, RUN.walkNoise, (r) =>
    r.uniform(RUN.walkAccuracyMin_m, RUN.walkAccuracyMax_m),
  );
  const approach_m = RUN.walkSpeed_ms * RUN.approachFactor * cfg.checkInMinApproach_s;
  const start = offset(LEELAWADEE_INTERIOR, -(approach_m + RUN.interiorToSouthEdge_m), 0);
  const inLine = new Polyline([start, LEELAWADEE_INTERIOR]);
  rec.mark(`เริ่มนอก leelawadee-lawn ทางใต้ ${Math.round(approach_m)} ม. จากขอบ เดินเข้า`);
  walk(rec, inLine, 0, inLine.length_m, WALK);
  return rec;
}

export const suspendedScenario: ScenarioDef = {
  id: 'synthetic-suspended-leelawadee-01',
  scenario: 'suspended-leelawadee',
  seed: 602,
  environment: 'park',
  description:
    'เดินจากนอก leelawadee-lawn (dungeon จริงที่เปิดอยู่) เข้ามา เดินวนข้างใน 1 หน้าต่าง reward แล้วเดินออกไปทางใต้ รออยู่นอกขอบนานกว่า graceMax_s (Grace แล้ว Suspended) จากนั้นเดินกลับเข้ามาเดินวนต่อ ใช้กับภาพ 09b-run-suspended',
  build: (ctx, b) => {
    const { cfg } = ctx;
    const S = SUSPENDED;
    const rec = approach(ctx, b);

    rec.mark('ถึงกลาง dungeon เดินวนรัศมี 6 ม.');
    const loop = loopAround(LEELAWADEE_INTERIOR, RUN.loopRadius_m);
    const toLoop = new Polyline([LEELAWADEE_INTERIOR, loop.at(0).point]);
    walk(rec, toLoop, 0, toLoop.length_m, WALK);
    const dIn = lapUntil(
      rec,
      loop,
      0,
      rec.t_ms + S.insideWindows * cfg.rewardTickInterval_s * MS_PER_S,
    );

    const outside = offset(
      LEELAWADEE_INTERIOR,
      -(RUN.interiorToSouthEdge_m + S.outsideBeyondEdge_m),
      0,
    );
    const outLoop = loopAround(outside, S.outsideLoopRadius_m);
    rec.mark(`เดินออกไปทางใต้ ${S.outsideBeyondEdge_m} ม. จากขอบ`);
    const outLine = new Polyline([loop.at(dIn).point, outLoop.at(0).point]);
    walk(rec, outLine, 0, outLine.length_m, WALK);

    rec.mark('รอนอกขอบ เดินช้า ๆ วนรัศมี 5 ม. (เกิน graceMax_s)');
    const outsideEnd_ms = rec.t_ms + (cfg.graceMax_s + S.suspendedHold_s) * MS_PER_S;
    const dOut = lapUntil(rec, outLoop, 0, outsideEnd_ms, {
      ...WALK,
      speed_ms: S.outsideSpeed_ms,
      speedSd_ms: 0,
    });

    rec.mark('เดินกลับเข้า dungeon');
    const backLine = new Polyline([outLoop.at(dOut).point, loop.at(0).point]);
    walk(rec, backLine, 0, backLine.length_m, WALK);
    rec.mark('กลับถึงข้างใน เดินวนต่อ');
    const afterEnd_ms =
      rec.t_ms +
      (S.afterReturnWindows * cfg.rewardTickInterval_s + S.afterReturnSlack_s) * MS_PER_S;
    lapUntil(rec, loop, 0, afterEnd_ms);
    rec.mark('จบ trace');
    return rec.marks;
  },
};

export const hpLowScenario: ScenarioDef = {
  id: 'synthetic-hp-low-leelawadee-01',
  scenario: 'hp-low-leelawadee',
  seed: 603,
  environment: 'park',
  description:
    'เดินจากนอก leelawadee-lawn (dungeon จริงที่เปิดอยู่ ช่วงเลเวล 1-5) เข้ามาแล้วเดินวนข้างในต่อเนื่องไม่ออก ไม่วนซ้ำ trace ยาวพอให้ตัวละครเลเวล 1 HP ลงถึงช่วงเตือน (30%) แล้วถึง auto-retreat ใช้กับภาพ 12-hp-low',
  build: (ctx, b) => {
    const rec = approach(ctx, b);
    rec.mark('ถึงกลาง dungeon เดินวนรัศมี 6 ม. ต่อเนื่อง');
    const loop = loopAround(LEELAWADEE_INTERIOR, RUN.loopRadius_m);
    const toLoop = new Polyline([LEELAWADEE_INTERIOR, loop.at(0).point]);
    walk(rec, toLoop, 0, toLoop.length_m, WALK);
    lapUntil(rec, loop, 0, rec.t_ms + HP_LOW.walkInside_s * MS_PER_S);
    rec.mark('จบ trace');
    return rec.marks;
  },
};
