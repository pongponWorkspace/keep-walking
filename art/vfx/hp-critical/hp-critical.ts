// art/vfx/hp-critical/hp-critical.ts
//
// HP-low / auto-retreat / death (art/vfx/specs/motion-direction.md §6, §9; design/ux/flows/
// F06-hp-damage-onboarding.md Flow C; design/ux/wireframes/F06-03-*.html; D-096, D-089).
//
// Tone rule that shapes every function below (motion-direction §1 rule 4, §6 opening line):
// "แห้ง ตรงไปตรงมา ไม่ปลอบ ไม่ตกใจเกินจริง" — no screen shake, no vignette, no slow-motion, no
// "GAME OVER" stamp anywhere in this file (§6.2/§6.3 "ห้ามเด็ดขาด" lists). Auto-retreat reads as
// "pulled back politely"; death reads as "stopped working", never as a loss screen.
//
// DOM contract (three different targets, one per registered effect — see each function's doc):
//   - `run.hpLow` — target is the toast root (`.toast.danger`, design/ux/components.md §6).
//   - `run.autoRetreat` — target is the run-state status frame that visually "gets pulled"
//     (`.run-state-pill`/header frame per components.md §13.2), not the HP bar itself (HP is
//     already ≤ 25% and does not move again in this sequence).
//   - `run.death` — target is `.hp-fill` itself (same element `hp-bar.ts` operates on): the
//     hard-cut and the grayscale tween both run on it, as two independent `.animate()` calls
//     (transform vs filter — different CSS properties, no interference even running at once).
//
// Screen-transition hand-off: `run.autoRetreat`'s final beat and (as an integration note only)
// death's hand-off to the run summary both reuse `screenTransitionOut`/`screenTransitionIn` from
// `../core/beats.js` — this module never swaps screens itself (out of scope for `art/vfx/`; see
// that file's comment for the full contract).

import { registerEffect, type EffectRun } from '../core/vfx.js';
import {
  screenTransitionOut,
  screenTransitionIn,
  screenCrossFadeOut,
  screenCrossFadeIn,
  type ScreenTransitionOptions,
} from '../core/beats.js';
import { tweenHpFill, hardCutHpFill, setHpFillReduced } from '../hp-bar/hp-bar.js';

const EASING = 'ease-out';
const REDUCED_DURATION_MS = 100;
const NEUTRAL_SCALE = 1;

// === run.hpLow (motion-direction §6.1; audio/cue-list.md vibration_ms [80,80,80,80,80]) ========
// Toast enters exactly like every other toast (§3 "Toast เข้า/ออก"), then — starting the instant
// it settles — the toast pulses 3 times matching the cue's 3 on-beats, then holds perfectly
// still ("จบ 3 จังหวะแล้วหยุดนิ่งสนิท") until the caller's own dismiss timer removes it (this
// module does not manage that timer, same division of labor as tick-feedback.ts's `exitToast`).
const HP_LOW_ENTER_DURATION_MS = 150;
const HP_LOW_ENTER_TRANSLATE_PX = 8;
const HP_LOW_PULSE_PEAK = 1.06;
// Literal beat offsets copied from the cue's own ms values (not proportionally scaled — unlike
// the rarity tiers, motion-direction §6.1 asks for "จังหวะห่างเท่ากัน" at the cue's own pace, not
// a different visual total), summing to the pattern's 400 ms total.
const HP_LOW_BEAT_1_MS = 80;
const HP_LOW_GAP_1_MS = 80;
const HP_LOW_BEAT_2_MS = 80;
const HP_LOW_GAP_2_MS = 80;
const HP_LOW_BEAT_3_MS = 80;
const HP_LOW_PULSE_DURATION_MS =
  HP_LOW_BEAT_1_MS + HP_LOW_GAP_1_MS + HP_LOW_BEAT_2_MS + HP_LOW_GAP_2_MS + HP_LOW_BEAT_3_MS;
const HP_LOW_OFFSET_1 = HP_LOW_BEAT_1_MS / HP_LOW_PULSE_DURATION_MS;
const HP_LOW_OFFSET_2 = (HP_LOW_BEAT_1_MS + HP_LOW_GAP_1_MS) / HP_LOW_PULSE_DURATION_MS;
const HP_LOW_OFFSET_3 =
  (HP_LOW_BEAT_1_MS + HP_LOW_GAP_1_MS + HP_LOW_BEAT_2_MS) / HP_LOW_PULSE_DURATION_MS;
const HP_LOW_OFFSET_4 =
  (HP_LOW_BEAT_1_MS + HP_LOW_GAP_1_MS + HP_LOW_BEAT_2_MS + HP_LOW_GAP_2_MS) /
  HP_LOW_PULSE_DURATION_MS;
const HP_LOW_TOTAL_DURATION_MS = HP_LOW_ENTER_DURATION_MS + HP_LOW_PULSE_DURATION_MS;

function runHpLow(target: Element): EffectRun {
  const enter = target.animate(
    [
      { transform: `translateY(${HP_LOW_ENTER_TRANSLATE_PX}px)`, opacity: 0, offset: 0 },
      { transform: 'translateY(0)', opacity: 1, offset: 1 },
    ],
    { duration: HP_LOW_ENTER_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  // Explicit keyframes (not `buildPopAndBeats`): that helper's trailing behavior holds the final
  // peak forever (correct for rarity's "settled, slightly larger frame" look — see
  // rarity-reveal.ts) but wrong here, where §6.1 requires returning to and holding at neutral
  // scale after the 3rd beat, not staying enlarged.
  const pulse = target.animate(
    [
      { transform: `scale(${NEUTRAL_SCALE})`, offset: 0 },
      { transform: `scale(${HP_LOW_PULSE_PEAK})`, offset: HP_LOW_OFFSET_1 },
      { transform: `scale(${NEUTRAL_SCALE})`, offset: HP_LOW_OFFSET_2 },
      { transform: `scale(${HP_LOW_PULSE_PEAK})`, offset: HP_LOW_OFFSET_3 },
      { transform: `scale(${NEUTRAL_SCALE})`, offset: HP_LOW_OFFSET_4 },
      { transform: `scale(${HP_LOW_PULSE_PEAK})`, offset: 1 },
      { transform: `scale(${NEUTRAL_SCALE})`, offset: 1 },
    ],
    { duration: HP_LOW_PULSE_DURATION_MS, delay: HP_LOW_ENTER_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  return { animations: [enter, pulse] };
}

function runHpLowReduced(target: Element): EffectRun {
  const anim = target.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: REDUCED_DURATION_MS,
    easing: 'linear',
    fill: 'forwards',
  });
  return { animations: [anim] };
}

registerEffect({
  id: 'run.hpLow',
  durationMs: HP_LOW_TOTAL_DURATION_MS,
  run: runHpLow,
  reducedMotion: runHpLowReduced,
});

// === run.autoRetreat (motion-direction §6.2; vibration_ms [100,80,100,80,100,80,350]) ===========
// "ระบบดึงผู้เล่นออกเอง ... ไม่ใช่บทลงโทษ" — 3 short nudges reading as "pulled out politely", not
// a shake. This registered effect covers only the 3-nudge phase (the cue's first 5 elements, 3
// on-beats); the final 350 ms beat *is* the real screen swap to `S-04-run-summary`, performed by
// the caller via `screenTransitionOut`/`screenTransitionIn` (re-exported above from
// `core/beats.js`) — never invented as decoration here (§6.2 point 2: "ไม่ใช่ effect ตกแต่ง เป็น
// การเปลี่ยนหน้าจอจริงที่ต้องเกิดอยู่แล้ว").
//
// Budget note: motion-direction §3's summary table caps the full sequence at "รวม ≤700 ms". The
// cue's own nudge-phase ms (100+80+100+80+100 = 460) plus the documented 350 ms transition would
// total 810 ms, over budget — so (like the rarity tiers' proportional scaling, art/vfx/core/
// beats.ts `buildPopAndBeats` callers) the nudge phase is scaled down to fit: 700 − 350 = 350 ms,
// keeping the exact 3-on-beat *shape* (short-short-short, each beat followed by a settle) that the
// cue's vibration pattern defines, at a proportionally faster pace.
const RETREAT_TRANSITION_DURATION_MS = 350;
const RETREAT_TRANSITION_TRANSLATE_PX = 24;
const RETREAT_RAW_BEAT_1 = 100;
const RETREAT_RAW_GAP_1 = 80;
const RETREAT_RAW_BEAT_2 = 100;
const RETREAT_RAW_GAP_2 = 80;
const RETREAT_RAW_BEAT_3 = 100;
const RETREAT_RAW_TOTAL_MS =
  RETREAT_RAW_BEAT_1 + RETREAT_RAW_GAP_1 + RETREAT_RAW_BEAT_2 + RETREAT_RAW_GAP_2 + RETREAT_RAW_BEAT_3;
const RETREAT_NUDGE_TARGET_DURATION_MS = 350;
const RETREAT_SCALE = RETREAT_NUDGE_TARGET_DURATION_MS / RETREAT_RAW_TOTAL_MS;
const RETREAT_OFFSET_1 = (RETREAT_RAW_BEAT_1 * RETREAT_SCALE) / RETREAT_NUDGE_TARGET_DURATION_MS;
const RETREAT_OFFSET_2 =
  ((RETREAT_RAW_BEAT_1 + RETREAT_RAW_GAP_1) * RETREAT_SCALE) / RETREAT_NUDGE_TARGET_DURATION_MS;
const RETREAT_OFFSET_3 =
  ((RETREAT_RAW_BEAT_1 + RETREAT_RAW_GAP_1 + RETREAT_RAW_BEAT_2) * RETREAT_SCALE) /
  RETREAT_NUDGE_TARGET_DURATION_MS;
const RETREAT_OFFSET_4 =
  ((RETREAT_RAW_BEAT_1 + RETREAT_RAW_GAP_1 + RETREAT_RAW_BEAT_2 + RETREAT_RAW_GAP_2) *
    RETREAT_SCALE) /
  RETREAT_NUDGE_TARGET_DURATION_MS;
const RETREAT_NUDGE_TRANSLATE_PX = 3;

function runAutoRetreat(target: Element): EffectRun {
  const nudge = target.animate(
    [
      { transform: 'translateY(0)', offset: 0 },
      { transform: `translateY(-${RETREAT_NUDGE_TRANSLATE_PX}px)`, offset: RETREAT_OFFSET_1 },
      { transform: 'translateY(0)', offset: RETREAT_OFFSET_2 },
      { transform: `translateY(-${RETREAT_NUDGE_TRANSLATE_PX}px)`, offset: RETREAT_OFFSET_3 },
      { transform: 'translateY(0)', offset: RETREAT_OFFSET_4 },
      { transform: `translateY(-${RETREAT_NUDGE_TRANSLATE_PX}px)`, offset: 1 },
      { transform: 'translateY(0)', offset: 1 },
    ],
    { duration: RETREAT_NUDGE_TARGET_DURATION_MS, easing: EASING, fill: 'forwards' },
  );
  return { animations: [nudge] };
}

function runAutoRetreatReduced(target: Element): EffectRun {
  const anim = target.animate([{ opacity: 1 }, { opacity: 1 }], {
    duration: REDUCED_DURATION_MS,
  });
  return { animations: [anim] };
}

registerEffect({
  id: 'run.autoRetreat',
  durationMs: RETREAT_NUDGE_TARGET_DURATION_MS + RETREAT_TRANSITION_DURATION_MS,
  run: runAutoRetreat,
  reducedMotion: runAutoRetreatReduced,
});

/** Convenience wrapper so a caller wires the documented final beat with one call instead of
 * re-deriving `{ durationMs, translateYPx }` by hand. Not itself a registered effect (it needs
 * the caller's own outgoing/incoming DOM nodes, same reasoning as `hp-bar.ts`'s tween helpers). */
export function runAutoRetreatScreenTransition(outgoing: Element, incoming: Element): Animation[] {
  const opts: ScreenTransitionOptions = {
    durationMs: RETREAT_TRANSITION_DURATION_MS,
    translateYPx: RETREAT_TRANSITION_TRANSLATE_PX,
  };
  return [screenTransitionOut(outgoing, opts), screenTransitionIn(incoming, opts)];
}

/** Reduced-motion pair for the same hand-off (opacity-only cross-fade, no translateY). */
export function runAutoRetreatScreenTransitionReduced(
  outgoing: Element,
  incoming: Element,
): Animation[] {
  return [screenCrossFadeOut(outgoing), screenCrossFadeIn(incoming)];
}

// === run.death (motion-direction §6.3; vibration_ms [150,120,600]; D-096, D-089) ================
// Phase 2 override (design/ux/flows/F06-hp-damage-onboarding.md "หมายเหตุ override" #2, D-096):
// death ends the run immediately — there is no "3-way recovery choice" step inside the run
// anymore (that UI is reserved for Phase 3 F09's in-dungeon-down state). This effect therefore
// only covers §6.3 points 1–3 (hard-cut, silent gap, grayscale settle); point 4 (recovery options
// fading in on the *same* screen) does not apply in Phase 2 — once the grayscale tween finishes,
// the caller hands off straight to `S-04-run-summary` via `screenTransitionOut`/`screenTransitionIn`
// (re-exported above), matching the death wireframe (`F06-03-*.html` frame C6): no intermediate
// screen at all.
//
// The one `filter` exception this tier of the game is allowed (motion-direction §2's table,
// D-076/D-077): `grayscale()` ramping 0→1, one-shot, never mid-sequence, never looping.
const DEATH_HARD_CUT_TO_RATIO = 0;
const DEATH_GAP_MS = 120;
const DEATH_GRAYSCALE_DURATION_MS = 600;
const DEATH_GRAYSCALE_START = 0;
const DEATH_GRAYSCALE_END = 1;
const DEATH_TOTAL_DURATION_MS = DEATH_GAP_MS + DEATH_GRAYSCALE_DURATION_MS;

function runDeath(target: Element): EffectRun {
  const cut = hardCutHpFill(target, DEATH_HARD_CUT_TO_RATIO);
  const grayscale = target.animate(
    [
      { filter: `grayscale(${DEATH_GRAYSCALE_START})`, offset: 0 },
      { filter: `grayscale(${DEATH_GRAYSCALE_END})`, offset: 1 },
    ],
    { duration: DEATH_GRAYSCALE_DURATION_MS, delay: DEATH_GAP_MS, easing: 'linear', fill: 'forwards' },
  );
  return { animations: [cut, grayscale] };
}

/** Reduced motion: same end state (HP at 0, fully desaturated) with no intermediate tween at all
 * — grayscale is not `transform`, but §2's reduced-motion rule ("0 motion ก็ยอมรับได้") still
 * applies: nothing here needs to ease in for the information (HP=0, run ended) to read instantly. */
function runDeathReduced(target: Element): EffectRun {
  const cut = setHpFillReduced(target, DEATH_HARD_CUT_TO_RATIO);
  const grayscale = target.animate([{ filter: `grayscale(${DEATH_GRAYSCALE_END})`, offset: 1 }], {
    duration: REDUCED_DURATION_MS,
    fill: 'forwards',
  });
  return { animations: [cut, grayscale] };
}

registerEffect({
  id: 'run.death',
  durationMs: DEATH_TOTAL_DURATION_MS,
  run: runDeath,
  reducedMotion: runDeathReduced,
});

export {
  runHpLow,
  runHpLowReduced,
  runAutoRetreat,
  runAutoRetreatReduced,
  runDeath,
  runDeathReduced,
  tweenHpFill,
  hardCutHpFill,
  setHpFillReduced,
  screenTransitionOut,
  screenTransitionIn,
  screenCrossFadeOut,
  screenCrossFadeIn,
  type ScreenTransitionOptions,
};
