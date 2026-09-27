// art/vfx/quick-command/quick-command.ts
//
// Quick-command emotes, 10 commands (art/vfx/specs/motion-direction.md §5; art/direction/
// avatar-spec.md §10 "Pose kit สำหรับ quick command 10 ตัว"; audio/cue-list.md §3 `qc.sent`/
// `qc.received`). This is the "pose kit" bucket of this task's board acceptance ("ใช้ pose kit
// ของ avatar-spec §10").
//
// Scope note (matches this package's own established precedent — rarity-reveal.ts and
// tick-feedback.ts were both built and demoed ahead of their client-integration tasks,
// P2-F05-T10): live wiring into a Nearby Party card is Phase 3 F09 scope (board 1.9: "artist
// ยืนยันท่า quick-command 10 ตัว → เลื่อน Phase 3"), because Phase 2 has no Nearby Party UI to
// mount these into (design/features/F04-dungeon-presence.md §6) and final pose-kit sprite art is
// not signed off yet. What *is* fully specified today and does not depend on either of those is
// the motion choreography itself (avatar-spec §10's table is a complete, frozen data source) —
// this module implements exactly that: 10 one-shot, non-looping root/limb transforms, playable on
// any generic layered DOM stand-in today and swapped to real sprite layers without touching this
// file once F09 mounts it.
//
// DOM contract: `target` is the avatar root wrapper (`.avatar-root`, transform pivot per
// avatar-spec §10 "ท่า = transform ของทั้งตัว ... รอบ root"). Each function also looks for an
// optional child (`.pose-hand` or `.arm-p`, whichever the table calls for) and animates it too if
// present — mirrors rarity-reveal.ts's `createCorners` pattern (decorate additively, never
// require the extra element to exist). Face (`.face`) and prop (`.pose-prop`) swaps are a caller-
// side **discrete class/attribute swap, not a tween** ("จบ emote กลับเป็น neutral ... ทันที ไม่
// loop", avatar-spec §10) — this module never animates `.face`/`.pose-prop` opacity or transform,
// only documents which face/prop each emote pairs with (spec file, not code).

import { registerEffect, type EffectRun } from '../core/vfx.js';

const EASING = 'ease-out';
const REDUCED_DURATION_MS = 100;
const NEUTRAL_SCALE = 1;
const POSE_HAND_SELECTOR = '.pose-hand';
const ARM_SELECTOR = '.arm-p';

function optionalChild(target: Element, selector: string): Element | null {
  return target.querySelector(selector);
}

/** Shared reduced-motion variant for every emote below: the end state (neutral pose, whatever
 * face/prop the caller already swapped in discretely) cross-fades in instead of animating through
 * the full gesture (motion-direction §2). Glyph + copy text carry the command's meaning either
 * way (§5: "ท่าเป็นช่องทางเสริม glyph + ข้อความ copy key คือข้อมูลหลัก"). */
function reducedFade(target: Element): EffectRun {
  const anim = target.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: REDUCED_DURATION_MS,
    easing: 'linear',
    fill: 'forwards',
  });
  return { animations: [anim] };
}

// === qc.arrived — "มาแล้วจ้า" (avatar-spec §10 row 1) ===========================================
const ARRIVED_DURATION_MS = 700;
const ARRIVED_LEAN_DEG = 4;
const ARRIVED_LEAN_PEAK_OFFSET = 0.3;
const ARRIVED_WAVE_DEG = 15;

function runArrived(target: Element): EffectRun {
  const root = target.animate(
    [
      { transform: 'rotate(0deg)', offset: 0 },
      { transform: `rotate(${ARRIVED_LEAN_DEG}deg)`, offset: ARRIVED_LEAN_PEAK_OFFSET },
      { transform: 'rotate(0deg)', offset: 1 },
    ],
    { duration: ARRIVED_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  const animations = [root];
  const hand = optionalChild(target, POSE_HAND_SELECTOR);
  if (hand) {
    animations.push(
      hand.animate(
        [
          { transform: 'rotate(0deg)', offset: 0 },
          { transform: `rotate(${ARRIVED_WAVE_DEG}deg)`, offset: 0.25 },
          { transform: `rotate(-${ARRIVED_WAVE_DEG}deg)`, offset: 0.5 },
          { transform: `rotate(${ARRIVED_WAVE_DEG}deg)`, offset: 0.75 },
          { transform: 'rotate(0deg)', offset: 1 },
        ],
        { duration: ARRIVED_DURATION_MS, easing: EASING, fill: 'forwards' },
      ),
    );
  }
  return { animations };
}

registerEffect({ id: 'qc.arrived', durationMs: ARRIVED_DURATION_MS, run: runArrived, reducedMotion: reducedFade });

// === qc.onMyWay — "กำลังไป รอแป๊บ" (avatar-spec §10 row 2) ======================================
const ON_MY_WAY_DURATION_MS = 900;
const ON_MY_WAY_LEAN_DEG = 6;
const ON_MY_WAY_BOUNCE_PX = 3;
const ON_MY_WAY_ARM_DEG = 20;

function runOnMyWay(target: Element): EffectRun {
  const lean = `rotate(${ON_MY_WAY_LEAN_DEG}deg)`;
  const root = target.animate(
    [
      { transform: 'rotate(0deg) translateY(0)', offset: 0 },
      { transform: `${lean} translateY(0)`, offset: 0.15 },
      { transform: `${lean} translateY(-${ON_MY_WAY_BOUNCE_PX}px)`, offset: 0.4 },
      { transform: `${lean} translateY(0)`, offset: 0.65 },
      { transform: `${lean} translateY(-${ON_MY_WAY_BOUNCE_PX}px)`, offset: 1 },
    ],
    { duration: ON_MY_WAY_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  const animations = [root];
  const arm = optionalChild(target, ARM_SELECTOR);
  if (arm) {
    animations.push(
      arm.animate(
        [
          { transform: 'rotate(0deg)', offset: 0 },
          { transform: `rotate(${ON_MY_WAY_ARM_DEG}deg)`, offset: 0.25 },
          { transform: `rotate(-${ON_MY_WAY_ARM_DEG}deg)`, offset: 0.5 },
          { transform: `rotate(${ON_MY_WAY_ARM_DEG}deg)`, offset: 0.75 },
          { transform: 'rotate(0deg)', offset: 1 },
        ],
        { duration: ON_MY_WAY_DURATION_MS, easing: EASING, fill: 'forwards' },
      ),
    );
  }
  return { animations };
}

registerEffect({ id: 'qc.onMyWay', durationMs: ON_MY_WAY_DURATION_MS, run: runOnMyWay, reducedMotion: reducedFade });

// === qc.goOn — "ไปต่อ" (avatar-spec §10 row 3) ==================================================
// "translateX +4px หยุดกะทันหัน (ease-out แรง ไม่มี overshoot)" — short and decisive, matching the
// command's meaning; `pose_hand point` is a static discrete pose swap (no motion of its own).
const GO_ON_DURATION_MS = 400;
const GO_ON_TRANSLATE_PX = 4;

function runGoOn(target: Element): EffectRun {
  const root = target.animate(
    [
      { transform: 'translateX(0)', offset: 0 },
      { transform: `translateX(${GO_ON_TRANSLATE_PX}px)`, offset: 1 },
    ],
    { duration: GO_ON_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  return { animations: [root] };
}

registerEffect({ id: 'qc.goOn', durationMs: GO_ON_DURATION_MS, run: runGoOn, reducedMotion: reducedFade });

// === qc.needHeal — "ขอเลือดหน่อย" (avatar-spec §10 row 4) =======================================
// "เอนหน้า 3°" holds (no "แล้วคืน" in the table — resets to neutral discretely once the caller's
// hold window ends, same closing convention every emote here shares); `pose_hand reach` is static.
const NEED_HEAL_DURATION_MS = 800;
const NEED_HEAL_LEAN_DEG = 3;

function runNeedHeal(target: Element): EffectRun {
  const root = target.animate(
    [
      { transform: 'rotate(0deg)', offset: 0 },
      { transform: `rotate(${NEED_HEAL_LEAN_DEG}deg)`, offset: 1 },
    ],
    { duration: NEED_HEAL_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  return { animations: [root] };
}

registerEffect({ id: 'qc.needHeal', durationMs: NEED_HEAL_DURATION_MS, run: runNeedHeal, reducedMotion: reducedFade });

// === qc.hpCritical — "เลือดจะหมดแล้ว" (avatar-spec §10 row 5) ===================================
// "เซ rotate ±5° 3 ครั้งแล้วหยุด (ไม่ล้ม)" — a wobble, explicitly *not* a fall (motion-direction
// P5/§1 rule 4: dry tone, never melodrama even for a party-facing "I'm about to die" ping);
// `pose_hand clutch` is static.
const HP_CRITICAL_DURATION_MS = 600;
const HP_CRITICAL_WOBBLE_DEG = 5;

function runHpCritical(target: Element): EffectRun {
  const root = target.animate(
    [
      { transform: 'rotate(0deg)', offset: 0 },
      { transform: `rotate(${HP_CRITICAL_WOBBLE_DEG}deg)`, offset: 0.15 },
      { transform: `rotate(-${HP_CRITICAL_WOBBLE_DEG}deg)`, offset: 0.35 },
      { transform: `rotate(${HP_CRITICAL_WOBBLE_DEG}deg)`, offset: 0.55 },
      { transform: `rotate(-${HP_CRITICAL_WOBBLE_DEG}deg)`, offset: 0.75 },
      { transform: 'rotate(0deg)', offset: 1 },
    ],
    { duration: HP_CRITICAL_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  return { animations: [root] };
}

registerEffect({
  id: 'qc.hpCritical',
  durationMs: HP_CRITICAL_DURATION_MS,
  run: runHpCritical,
  reducedMotion: reducedFade,
});

// === qc.needCover — "ช่วยบังหน่อย" (avatar-spec §10 row 6) ======================================
// "ย่อตัว scaleY 0.92" holds; `pose_hand hold` + `pose_prop shield` are static (prop swap only).
const NEED_COVER_DURATION_MS = 500;
const NEED_COVER_SCALE_Y = 0.92;

function runNeedCover(target: Element): EffectRun {
  const root = target.animate(
    [
      { transform: `scaleY(${NEUTRAL_SCALE})`, offset: 0 },
      { transform: `scaleY(${NEED_COVER_SCALE_Y})`, offset: 1 },
    ],
    { duration: NEED_COVER_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  return { animations: [root] };
}

registerEffect({
  id: 'qc.needCover',
  durationMs: NEED_COVER_DURATION_MS,
  run: runNeedCover,
  reducedMotion: reducedFade,
});

// === qc.needBreak — "ขอพักแป๊บ" (avatar-spec §10 row 7) =========================================
// "เอนหลัง rotate −6° + scaleY 0.96 ... ease-in-out นุ่ม ไม่มี snap" — the one emote in the set
// that intentionally does not use this module's default `ease-out` (every other emote is brisk;
// this one is the slowest and softest by design, avatar-spec §10). `pose_hand hold` +
// `pose_prop cup` are static.
const NEED_BREAK_DURATION_MS = 900;
const NEED_BREAK_ROTATE_DEG = -6;
const NEED_BREAK_SCALE_Y = 0.96;
const NEED_BREAK_EASING = 'ease-in-out';

function runNeedBreak(target: Element): EffectRun {
  const root = target.animate(
    [
      { transform: `rotate(0deg) scaleY(${NEUTRAL_SCALE})`, offset: 0 },
      { transform: `rotate(${NEED_BREAK_ROTATE_DEG}deg) scaleY(${NEED_BREAK_SCALE_Y})`, offset: 1 },
    ],
    { duration: NEED_BREAK_DURATION_MS, easing: NEED_BREAK_EASING, fill: 'forwards' },
  );
  return { animations: [root] };
}

registerEffect({
  id: 'qc.needBreak',
  durationMs: NEED_BREAK_DURATION_MS,
  run: runNeedBreak,
  reducedMotion: reducedFade,
});

// === qc.retreating — "ขอถอยก่อนนะ" (avatar-spec §10 row 8) ======================================
// "translateX −6px แล้วคืน (ก้าวถอย)"; `arm_p` แกว่ง ±12° 1 รอบ.
const RETREATING_DURATION_MS = 700;
const RETREATING_TRANSLATE_PX = 6;
const RETREATING_ARM_DEG = 12;

function runRetreating(target: Element): EffectRun {
  const root = target.animate(
    [
      { transform: 'translateX(0)', offset: 0 },
      { transform: `translateX(-${RETREATING_TRANSLATE_PX}px)`, offset: 0.5 },
      { transform: 'translateX(0)', offset: 1 },
    ],
    { duration: RETREATING_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  const animations = [root];
  const arm = optionalChild(target, ARM_SELECTOR);
  if (arm) {
    animations.push(
      arm.animate(
        [
          { transform: 'rotate(0deg)', offset: 0 },
          { transform: `rotate(${RETREATING_ARM_DEG}deg)`, offset: 0.5 },
          { transform: 'rotate(0deg)', offset: 1 },
        ],
        { duration: RETREATING_DURATION_MS, easing: EASING, fill: 'forwards' },
      ),
    );
  }
  return { animations };
}

registerEffect({
  id: 'qc.retreating',
  durationMs: RETREATING_DURATION_MS,
  run: runRetreating,
  reducedMotion: reducedFade,
});

// === qc.goodDrop — "ของออกแล้ว" (avatar-spec §10 row 9) =========================================
// "เด้ง translateY −6px 1 ครั้ง"; `pose_hand fist` is static (raised to shoulder height, not a
// full overhead cheer — avatar-spec §10: "ไม่ชูสุดแขน", keeping this celebratory but not gloating).
const GOOD_DROP_DURATION_MS = 500;
const GOOD_DROP_TRANSLATE_PX = 6;

function runGoodDrop(target: Element): EffectRun {
  const root = target.animate(
    [
      { transform: 'translateY(0)', offset: 0 },
      { transform: `translateY(-${GOOD_DROP_TRANSLATE_PX}px)`, offset: 0.4 },
      { transform: 'translateY(0)', offset: 1 },
    ],
    { duration: GOOD_DROP_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  return { animations: [root] };
}

registerEffect({
  id: 'qc.goodDrop',
  durationMs: GOOD_DROP_DURATION_MS,
  run: runGoodDrop,
  reducedMotion: reducedFade,
});

// === qc.thanks — "ขอบคุณ" (avatar-spec §10 row 10) ==============================================
// "scale 1 → 1.04 → 1" — shortest gesture in the set; `pose_hand thumb` is static.
const THANKS_DURATION_MS = 350;
const THANKS_PEAK_SCALE = 1.04;

function runThanks(target: Element): EffectRun {
  const root = target.animate(
    [
      { transform: `scale(${NEUTRAL_SCALE})`, offset: 0 },
      { transform: `scale(${THANKS_PEAK_SCALE})`, offset: 0.5 },
      { transform: `scale(${NEUTRAL_SCALE})`, offset: 1 },
    ],
    { duration: THANKS_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  return { animations: [root] };
}

registerEffect({ id: 'qc.thanks', durationMs: THANKS_DURATION_MS, run: runThanks, reducedMotion: reducedFade });

export {
  runArrived,
  runOnMyWay,
  runGoOn,
  runNeedHeal,
  runHpCritical,
  runNeedCover,
  runNeedBreak,
  runRetreating,
  runGoodDrop,
  runThanks,
  reducedFade,
};
