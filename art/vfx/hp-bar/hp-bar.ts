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
//
// P2-H42 (visual gate V-39, re-checking P2-X42's `.hp-fill-edge-marker`): components.md §13.6
// asked for a 2px `ink.900` line at the fill's own edge, as a sibling of `.hp-fill` rather than its
// `::after` (correct — `.hp-fill`'s own `scaleX()` would squash a pseudo-element's width along with
// it, same reasoning as this file's own header comment). The client's first pass (A-P2-X42-2) moved
// that sibling with a CSS `left` transition instead of `transform`, to avoid needing the track's
// real pixel width. That trade is rejected: §2's property budget bans `width/height/top/left/margin`
// for *any* continuously-animated element, with no carve-out for a 2px node — the same layout-reflow
// cost the fill itself was moved off `width` to avoid applies here too, at the same event frequency
// (every HP change). `tweenHpEdgeMarker`/`setHpEdgeMarkerReduced` below give the marker the same
// `transform`-only treatment as the fill: the caller measures `.hp-track`'s pixel width once per
// update (a single synchronous `getBoundingClientRect().width` read, not a per-frame layout query)
// and passes it in; this module converts ratio + track width into a `translateX(px)` pair. See
// `art/vfx/specs/hp-bar.md` "เส้นแบ่งปลายแถบ (V-39)" for the accepted contract and the handoff this
// leaves for gameplay-programmer.

const TWEEN_DURATION_MS = 200;
const HARD_CUT_DURATION_MS = 0;
const TWEEN_EASING = 'ease-out';
/** `.hp-fill-edge-marker` is a 2px-wide line (`app.css`); centering it on the fill's exact edge
 * means shifting it left by half its own width, same as the marker's previous static
 * `transform: translateX(-1px)` rule — folded into every computed position below instead of left
 * as a separate CSS rule, since this module now owns 100% of the marker's `transform`. */
const EDGE_MARKER_WIDTH_PX = 2;
const EDGE_MARKER_CENTER_OFFSET_PX = EDGE_MARKER_WIDTH_PX / 2;

function edgeMarkerTranslateXPx(ratio: number, trackWidthPx: number): number {
  return ratio * trackWidthPx - EDGE_MARKER_CENTER_OFFSET_PX;
}

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

export interface HpEdgeMarkerOptions {
  fromRatio: number;
  toRatio: number;
  /** `.hp-track.getBoundingClientRect().width` at call time — a plain number, not re-measured by
   * this module (this module has no DOM query of its own beyond `target` itself, matching every
   * other function in this file). */
  trackWidthPx: number;
}

/**
 * `.hp-fill-edge-marker`'s counterpart to `tweenHpFill`: same 200ms/ease-out timing, same trigger
 * (every HP change except death), `transform: translateX()` instead of `left` (V-39, see header
 * comment). Always call this alongside `tweenHpFill` on the same event so both nodes move in lockstep.
 */
export function tweenHpEdgeMarker(target: Element, opts: HpEdgeMarkerOptions): Animation {
  return target.animate(
    [
      { transform: `translateX(${edgeMarkerTranslateXPx(opts.fromRatio, opts.trackWidthPx)}px)`, offset: 0 },
      { transform: `translateX(${edgeMarkerTranslateXPx(opts.toRatio, opts.trackWidthPx)}px)`, offset: 1 },
    ],
    { duration: TWEEN_DURATION_MS, easing: TWEEN_EASING, fill: 'forwards' },
  );
}

export interface HpEdgeMarkerSnapOptions {
  toRatio: number;
  trackWidthPx: number;
}

/** Death's exception, mirroring `hardCutHpFill`: the marker jumps straight to 0 with the fill,
 * no drain. */
export function hardCutHpEdgeMarker(target: Element, opts: HpEdgeMarkerSnapOptions): Animation {
  return target.animate(
    [{ transform: `translateX(${edgeMarkerTranslateXPx(opts.toRatio, opts.trackWidthPx)}px)`, offset: 1 }],
    { duration: HARD_CUT_DURATION_MS, fill: 'forwards' },
  );
}

/** Reduced motion: same end state as `tweenHpEdgeMarker`, no intermediate tween — mirrors
 * `setHpFillReduced`. Also the function to call for a fresh mount / `instant` update (no previous
 * ratio to tween from yet), same as `setHpFillReduced` is today. */
export function setHpEdgeMarkerReduced(target: Element, opts: HpEdgeMarkerSnapOptions): Animation {
  return target.animate(
    [{ transform: `translateX(${edgeMarkerTranslateXPx(opts.toRatio, opts.trackWidthPx)}px)`, offset: 1 }],
    { duration: HARD_CUT_DURATION_MS, fill: 'forwards' },
  );
}
