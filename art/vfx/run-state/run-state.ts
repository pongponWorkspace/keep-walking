// art/vfx/run-state/run-state.ts
//
// "เข้า dungeon / Grace" bucket of this task's board acceptance (P2-F06-T05) — every non-HP,
// non-reveal moment in art/vfx/specs/motion-direction.md §9's table that this package had not
// registered yet: `dungeon.confirmEnter`, `run.stateSuspended` (the "Grace→Suspended" row),
// `run.stateResumed`. `run.stateGrace` itself has no audio cue in audio/cue-list.md at all (only
// Suspended/Resumed do — Grace is a quiet GPS-drift state, per design/ux/flows/
// F04-dungeon-presence.md Flow E) but still gets its own banner-entrance motion for the same
// reason `run.levelUp` in tick-feedback.ts has `cueId: null`: a real on-screen moment, just not
// one sound/vibration marks.
//
// DOM contract:
//   - `run.stateGrace` / `run.stateSuspended` — target is the banner root (`.banner.info` /
//     `.banner.info-full`, design/ux/components.md §6, and the corrected variant name from
//     design/ux/flows/F04-dungeon-presence.md §6 "แก้ C-5"). Both use the identical entrance
//     motion (motion-direction §3 "Banner เข้า/ออก": opacity + translateY(4px), 200ms ease-out) —
//     they are registered separately only because they are separate cue ids (registerEffect
//     throws on a duplicate id; see art/vfx/core/vfx.ts), not because the motion differs.
//   - `run.stateResumed` — target is the toast root (`.toast`, generic neutral toast), same
//     150ms entrance every other granted-tick-style toast uses (§3 "Toast เข้า/ออก").
//   - `dungeon.confirmEnter` — target is the incoming `S-03-run` screen root. This is the only
//     screen-transition cue id in the whole package with its own sound (audio/cue-list.md: a
//     short "door" chime) — motion-direction §9's own row for it says the screen swap itself is
//     already "the fallback" (no extra vfx beyond the swap), so this registers the shared
//     `screenTransitionIn` primitive (../core/beats.js) as a one-shot entrance for that incoming
//     root, nothing more. The outgoing confirm popup is dismissed by its own existing popup-close
//     behavior (out of scope here — no exit motion is prescribed for it by any spec read for this
//     task).

import { registerEffect, type EffectRun } from '../core/vfx.js';
import { screenTransitionIn, screenCrossFadeIn } from '../core/beats.js';

const BANNER_ENTER_DURATION_MS = 200;
const BANNER_EXIT_DURATION_MS = 150;
const BANNER_TRANSLATE_PX = 4;
const TOAST_ENTER_DURATION_MS = 150;
const TOAST_TRANSLATE_PX = 8;
const REDUCED_DURATION_MS = 100;
const CONFIRM_ENTER_DURATION_MS = 300;
const CONFIRM_ENTER_TRANSLATE_PX = 16;

function bannerEnter(target: Element): EffectRun {
  const anim = target.animate(
    [
      { transform: `translateY(-${BANNER_TRANSLATE_PX}px)`, opacity: 0, offset: 0 },
      { transform: 'translateY(0)', opacity: 1, offset: 1 },
    ],
    { duration: BANNER_ENTER_DURATION_MS, easing: 'ease-out', fill: 'forwards' },
  );
  return { animations: [anim] };
}

/** Shared banner exit (not a registered effect — same division of labor as tick-feedback.ts's
 * `exitToast`: the caller's own state machine decides *when* Grace/Suspended ends). */
export function bannerExit(target: Element): Animation {
  return target.animate(
    [
      { transform: 'translateY(0)', opacity: 1, offset: 0 },
      { transform: `translateY(-${BANNER_TRANSLATE_PX}px)`, opacity: 0, offset: 1 },
    ],
    { duration: BANNER_EXIT_DURATION_MS, easing: 'ease-in', fill: 'forwards' },
  );
}

function reducedFade(target: Element): EffectRun {
  const anim = target.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: REDUCED_DURATION_MS,
    easing: 'linear',
    fill: 'forwards',
  });
  return { animations: [anim] };
}

registerEffect({ id: 'run.stateGrace', durationMs: BANNER_ENTER_DURATION_MS, run: bannerEnter, reducedMotion: reducedFade });
registerEffect({ id: 'run.stateSuspended', durationMs: BANNER_ENTER_DURATION_MS, run: bannerEnter, reducedMotion: reducedFade });

function toastEnterResumed(target: Element): EffectRun {
  const anim = target.animate(
    [
      { transform: `translateY(${TOAST_TRANSLATE_PX}px)`, opacity: 0, offset: 0 },
      { transform: 'translateY(0)', opacity: 1, offset: 1 },
    ],
    { duration: TOAST_ENTER_DURATION_MS, easing: 'ease-out', fill: 'forwards' },
  );
  return { animations: [anim] };
}

registerEffect({
  id: 'run.stateResumed',
  durationMs: TOAST_ENTER_DURATION_MS,
  run: toastEnterResumed,
  reducedMotion: reducedFade,
});

function confirmEnter(target: Element): EffectRun {
  const anim = screenTransitionIn(target, {
    durationMs: CONFIRM_ENTER_DURATION_MS,
    translateYPx: CONFIRM_ENTER_TRANSLATE_PX,
  });
  return { animations: [anim] };
}

function confirmEnterReduced(target: Element): EffectRun {
  const anim = screenCrossFadeIn(target);
  return { animations: [anim] };
}

registerEffect({
  id: 'dungeon.confirmEnter',
  durationMs: CONFIRM_ENTER_DURATION_MS,
  run: confirmEnter,
  reducedMotion: confirmEnterReduced,
});

export { bannerEnter, toastEnterResumed, confirmEnter, confirmEnterReduced };
