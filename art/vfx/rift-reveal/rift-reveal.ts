// art/vfx/rift-reveal/rift-reveal.ts
//
// "รอยแตกกางออก" (crack unfold) — art/vfx/specs/motion-direction.md §8; decision D-076/D-077
// (studio/decisions/decision-log.md); art/direction/briefs/P2-assets.md 2.11.
//
// Bound to exactly one icon id: `icon.ui.rift` (art/assets/manifest.json). Never used for
// `icon.ui.in-run` or `icon.ui.closed` (P2-assets 2.11: "ไม่ใช้กับ in-run หรือ closed") and never
// used on the MapLibre canvas itself — the rift on the real map is a static image with zero
// motion, full stop, no exception (map-style.md §7/§11, pillars P4). This module only plays on
// the UI copy of that icon: the dungeon card in S-01-map and the S-02-dungeon-confirm header.
//
// No `audio/cue-list.md` cue id is bound to this moment (it is a silent, one-shot reveal on
// first mount — see art/vfx/specs/rift-reveal.md for why). It is registered as `ui.riftReveal`,
// not a `run.*`/`drop.*` id, because it is not a gameplay/reward event.
//
// DOM contract: `target` is the `icon.ui.rift` element itself. No `opacity` is ever used here —
// the icon has an ink-outlined edge and D-077/R-1 forbid fading ink-outlined edges via opacity.

import { registerEffect, type EffectRun } from '../core/vfx.js';

const DURATION_MS = 300;
const ENTER_SCALE_Y = 0.6;
const NEUTRAL_SCALE = 1;
const RESET_TRANSFORM_ORIGIN = 'bottom';

function ensureOrigin(target: Element): void {
  if (target.hasAttribute('data-vfx-origin-set')) return;
  (target as HTMLElement).style.transformOrigin = RESET_TRANSFORM_ORIGIN;
  target.setAttribute('data-vfx-origin-set', 'true');
}

/** Plays once per mount, then holds fully unfolded — no loop, ever (R-1). */
function runRiftReveal(target: Element): EffectRun {
  ensureOrigin(target);
  const anim = target.animate(
    [
      { transform: `scaleY(${ENTER_SCALE_Y})`, offset: 0 },
      { transform: `scaleY(${NEUTRAL_SCALE})`, offset: 1 },
    ],
    { duration: DURATION_MS, easing: 'ease-out', fill: 'forwards' },
  );
  return { animations: [anim] };
}

/** Reduced motion: full shape immediately, zero transform (motion-direction §8 closing rule). */
function runRiftRevealReduced(target: Element): EffectRun {
  ensureOrigin(target);
  (target as HTMLElement).style.transform = `scaleY(${NEUTRAL_SCALE})`;
  return { animations: [] };
}

registerEffect({
  id: 'ui.riftReveal',
  durationMs: DURATION_MS,
  run: runRiftReveal,
  reducedMotion: runRiftRevealReduced,
});

export { runRiftReveal, runRiftRevealReduced };
