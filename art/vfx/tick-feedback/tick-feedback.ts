// art/vfx/tick-feedback/tick-feedback.ts
//
// Tick toast motion (art/vfx/specs/motion-direction.md §3, §9; design/ux/flows/
// F05-movement-gate-reward.md Flow A; design/ux/wireframes/F05-01-tick-feedback.html).
//
// Scope note: this module only animates the *toast shell* (enter/exit + first-tick emphasis)
// and the inline level-up signal. The reward icon(s) shown inside a granted-tick toast get their
// own motion from `../rarity-reveal/rarity-reveal.ts` (`drop.rarity.<tier>`), played separately
// per icon by the integrator — "got a tick" and "got loot of rarity X" are two different effects
// per board acceptance, wired together by whoever renders the toast.
//
// DOM contract: `target` is the toast root element (`.toast` per design/ux/components.md §6);
// this module never creates the toast, only animates the element the caller already mounted
// (and, for `run.levelUp`, an inline child label already appended inside it — flow F05 A4).
//
// `.toast` transform ownership (P2-H53, root cause of visual-gate round-2 finding R2-1 — art/
// reviews/F04-F06-visual-gate.md §7.3/§7.4, same rule as D-137 for `.hp-fill-edge-marker`):
// `runTickGranted`/`runTickDenied`/`runTickGrantedFirst`/`exitToast` in this file — together with
// `runHpLow` in `../hp-critical/hp-critical.ts` — are the ONLY code allowed to set `transform` on
// `.toast`. CSS must never declare `transform` (or `transition: transform`) on `.toast`; centering
// is done in CSS with `left: 0; right: 0; margin-inline: auto; width: max-content` (no transform
// needed to center an abspos box that has an explicit width). Every WAAPI call here uses
// `element.animate({ transform: 'translateY(...)' }, { fill: 'forwards' })`, and per WAAPI's
// default `composite: 'replace'`, a `fill: 'forwards'` transform animation replaces whatever
// `transform` the CSS cascade would otherwise apply for as long as it stays in effect — if CSS
// also set `transform: translateX(-50%)` for centering, that value would be wiped out and held
// wiped out permanently (exactly what happened in R2-1: the toast's horizontal centering
// disappeared the instant any of these effects played, not just during the animation). Every
// keyframe list below starts and ends its transform at the identity position (`translateY(0)`,
// i.e. no offset) so there is no leftover positional offset once an effect settles — the one
// deliberate exception is `exitToast`'s final frame (`translateY(8px)`, held via `fill:
// 'forwards'`), which is the toast's intentional exit motion and is never visible for long: the
// caller removes the `.toast` element from the DOM right after this animation finishes, so no
// user-visible state is ever "toast onscreen with a residual offset".

import { registerEffect, type EffectRun } from '../core/vfx.js';
import { buildPopAndBeats } from '../core/beats.js';

const EASING_ENTER = 'ease-out';
const EASING_EXIT = 'ease-in';

const ENTER_DURATION_MS = 150;
const EXIT_DURATION_MS = 200;
const LEVEL_UP_DURATION_MS = 200;
const REDUCED_DURATION_MS = 100;

const ENTER_TRANSLATE_PX = 8;
const LEVEL_UP_TRANSLATE_PX = 4;

// run.tickGrantedFirst pulse beats — copied verbatim from audio/cue-list.md
// `run.tickGrantedFirst` vibration_ms `[45,70,45,70,90]` (3 on-beats).
const FIRST_BEAT_1 = 45;
const FIRST_GAP_1 = 70;
const FIRST_BEAT_2 = 45;
const FIRST_GAP_2 = 70;
const FIRST_BEAT_3 = 90;
const FIRST_PATTERN_MS = [FIRST_BEAT_1, FIRST_GAP_1, FIRST_BEAT_2, FIRST_GAP_2, FIRST_BEAT_3];
const FIRST_PEAK_1 = 1.02;
const FIRST_PEAK_2 = 1.03;
const FIRST_PEAK_3 = 1.04;
const FIRST_PEAKS = [FIRST_PEAK_1, FIRST_PEAK_2, FIRST_PEAK_3];
const FIRST_TOTAL_DURATION_MS = ENTER_DURATION_MS + FIRST_PATTERN_MS.reduce((a, b) => a + b, 0);

const NEUTRAL_SCALE = 1;

/** `run.tickGranted` — plain toast entrance, 150 ms in. Exit is caller-driven (see `exitToast`). */
function runTickGranted(target: Element): EffectRun {
  const anim = target.animate(
    [
      { transform: `translateY(${ENTER_TRANSLATE_PX}px)`, opacity: 0, offset: 0 },
      { transform: 'translateY(0)', opacity: 1, offset: 1 },
    ],
    { duration: ENTER_DURATION_MS, easing: EASING_ENTER, fill: 'forwards' },
  );
  return { animations: [anim] };
}

/** `run.tickDenied` — opacity-only entrance (no translate), reading as quieter/neutral, matching
 * `.toast.faded` chrome and the "not a punishment" rule (flow F05 A3). */
function runTickDenied(target: Element): EffectRun {
  const anim = target.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: ENTER_DURATION_MS,
    easing: EASING_ENTER,
    fill: 'forwards',
  });
  return { animations: [anim] };
}

/**
 * `run.tickGrantedFirst` — same data/copy path as a normal tick (D-089: still a normal tick),
 * just a more prominent entrance: the standard entrance immediately followed by a 3-beat
 * emphasis pulse matching the cue's vibration pattern (audio/cue-list.md
 * `run.tickGrantedFirst`), so the extra beats are not invented separately from what sound/
 * vibration already decided.
 */
function runTickGrantedFirst(target: Element): EffectRun {
  const enter = target.animate(
    [
      { transform: `translateY(${ENTER_TRANSLATE_PX}px) scale(${NEUTRAL_SCALE})`, opacity: 0, offset: 0 },
      { transform: `translateY(0) scale(${NEUTRAL_SCALE})`, opacity: 1, offset: 1 },
    ],
    { duration: ENTER_DURATION_MS, easing: EASING_ENTER, fill: 'forwards' },
  );
  const { keyframes, durationMs } = buildPopAndBeats(FIRST_PATTERN_MS, FIRST_PEAKS, {
    enterScale: NEUTRAL_SCALE,
    restScale: NEUTRAL_SCALE,
    easing: EASING_ENTER,
  });
  const pulse = target.animate(keyframes, { duration: durationMs, delay: ENTER_DURATION_MS });
  return { animations: [enter, pulse] };
}

/** `run.levelUp` — one-shot inline signal appended inside an already-visible toast (flow A4). */
function runLevelUp(target: Element): EffectRun {
  const anim = target.animate(
    [
      { transform: `translateY(${LEVEL_UP_TRANSLATE_PX}px)`, opacity: 0, offset: 0 },
      { transform: 'translateY(0)', opacity: 1, offset: 1 },
    ],
    { duration: LEVEL_UP_DURATION_MS, easing: EASING_ENTER, fill: 'forwards' },
  );
  return { animations: [anim] };
}

/** Shared reduced-motion variant: instant, data still fully legible, no transform. */
function runReducedFade(target: Element): EffectRun {
  const anim = target.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: REDUCED_DURATION_MS,
    easing: 'linear',
    fill: 'forwards',
  });
  return { animations: [anim] };
}

/**
 * Not a registered effect (no cue id of its own) — the standard toast *exit* motion shared by
 * every tick toast (motion-direction §3: "ออก 200 ms", ease-in). Exported as a plain helper
 * because the caller decides *when* a toast should leave (its own hold-duration timer), not this
 * module — `play()` is for one-shot effects tied to a cue id, not for timers.
 */
export function exitToast(target: Element): Animation {
  return target.animate(
    [
      { transform: 'translateY(0)', opacity: 1, offset: 0 },
      { transform: `translateY(${ENTER_TRANSLATE_PX}px)`, opacity: 0, offset: 1 },
    ],
    { duration: EXIT_DURATION_MS, easing: EASING_EXIT, fill: 'forwards' },
  );
}

registerEffect({
  id: 'run.tickGranted',
  durationMs: ENTER_DURATION_MS,
  run: runTickGranted,
  reducedMotion: runReducedFade,
});
registerEffect({
  id: 'run.tickDenied',
  durationMs: ENTER_DURATION_MS,
  run: runTickDenied,
  reducedMotion: runReducedFade,
});
registerEffect({
  id: 'run.tickGrantedFirst',
  durationMs: FIRST_TOTAL_DURATION_MS,
  run: runTickGrantedFirst,
  reducedMotion: runReducedFade,
});
registerEffect({
  id: 'run.levelUp',
  durationMs: LEVEL_UP_DURATION_MS,
  run: runLevelUp,
  reducedMotion: runReducedFade,
});

export { runTickGranted, runTickDenied, runTickGrantedFirst, runLevelUp };
