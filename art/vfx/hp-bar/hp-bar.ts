// art/vfx/hp-bar/hp-bar.ts
//
// The one HP-bar motion primitive every other F06 effect module builds on (art/vfx/specs/
// motion-direction.md §3 row "HP bar เปลี่ยนค่า", §13.6 of design/ux/components.md): `.hp-fill`
// always moves via `transform: scaleX()` from `transform-origin: left`, never `width` (layout
// reflow is banned by §2's property budget). This module has no cue id of its own — it is a
// plain helper (same pattern as `tick-feedback.ts`'s `exitToast`), not a `registerEffect()` entry,
// because every call needs two runtime numbers (`fromRatio`/`toRatio`) that `play(id, target)`
// has no way to pass through its fixed two-argument signature.
//
// Used by: `hp-critical.ts` (`run.hpLow` reads the bar but does not move it; `run.death` hard-cuts
// it; `run.autoRetreat` does not move it either — HP is already ≤ threshold when it fires, the
// bar's last honest value stays visible) and by the "ฟื้น" (recovery) moment named in this task's
// board acceptance: passive Recovering regen and `inventory.useRevivePotionButton` both call
// `tweenHpFill` with the engine's before/after ratio — there is no dedicated audio cue for either
// (checked against every cue id in audio/cue-list.md; none exists for a manual/revive potion use
// today), so per motion-direction §9's "เอกสารนี้ไม่ขอ cue ใหม่" rule this module does not invent
// one — it only re-runs the same generic value-change tween the HP bar already needs for every
// other change (damage, auto-potion, Support heal in a later phase). See
// `art/vfx/specs/hp-bar.md` "ช่องว่าง cue" for the handoff this leaves for sound-designer.
//
// DOM contract: `target` is the `.hp-fill` element (design/ux/components.md §7). Ratios are
// 0..1 (already-known engine values — server-authoritative, this module never guesses/
// interpolates an unknown value, components.md §7). Caller is responsible for the `.hp-fill.low`
// class swap at/under `lowHpWarningThreshold_pct` (a static CSS/color concern, not motion) and for
// keeping `transform-origin: left` on `.hp-fill` in CSS.

const TWEEN_DURATION_MS = 200;
const HARD_CUT_DURATION_MS = 0;
const TWEEN_EASING = 'ease-out';

export interface HpFillOptions {
  fromRatio: number;
  toRatio: number;
}

/**
 * Standard HP value change (motion-direction §3: 200 ms, ease-out, `scaleX`). Used for every
 * change *except* death's hard-cut (§6.3 point 1) — damage decreases, auto-potion/heal increases,
 * and passive Recovering regen ticks all animate through here.
 */
export function tweenHpFill(target: Element, opts: HpFillOptions): Animation {
  return target.animate(
    [
      { transform: `scaleX(${opts.fromRatio})`, offset: 0 },
      { transform: `scaleX(${opts.toRatio})`, offset: 1 },
    ],
    { duration: TWEEN_DURATION_MS, easing: TWEEN_EASING, fill: 'forwards' },
  );
}

/**
 * Death's exception (motion-direction §6.3 point 1): the bar jumps straight to 0, no drain
 * animation — "ไม่มี 'ค่อย ๆ ตาย' ให้ดูดราม่า" — because the server has already reported 0 by the
 * time the client knows the run ended (server-authoritative).
 */
export function hardCutHpFill(target: Element, toRatio: number): Animation {
  return target.animate([{ transform: `scaleX(${toRatio})`, offset: 1 }], {
    duration: HARD_CUT_DURATION_MS,
    fill: 'forwards',
  });
}

/** Reduced motion: value still snaps to the same end state, just without an intermediate tween
 * (motion-direction §2: "0 motion ก็ยอมรับได้" — the numeric %/color already carry the info). */
export function setHpFillReduced(target: Element, toRatio: number): Animation {
  return target.animate([{ transform: `scaleX(${toRatio})`, offset: 1 }], {
    duration: HARD_CUT_DURATION_MS,
    fill: 'forwards',
  });
}
