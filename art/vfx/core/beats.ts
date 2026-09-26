// art/vfx/core/beats.ts
//
// Shared helper: turn a vibration-style beat pattern (audio/cue-list.md `vibration_ms`,
// alternating on,off,on,off,...,on — always an odd-length array ending on an "on" beat) into a
// `transform: scale()` WAAPI keyframe list. This is the single place that implements
// motion-direction §4's rule "จำนวนจังหวะ visual เท่ากับจำนวนจังหวะใน vibration_ms" so every
// effect module gets a matching visual beat count for free instead of re-deriving offsets by
// hand and drifting from the audio pattern over time.
//
// transform-only (no opacity, no filter): safe to reuse for every rarity tier including Rare,
// which V-21 forbids from using filter/opacity for its "border flicker" (art/reviews/
// F03-visual-gate.md V-21, art/direction/briefs/P2-assets.md 2.11).
//
// Lint note: beat patterns and peak-scale lists below are written as arrays of named constants
// (never bare numeric literals inside an array) so every call site stays clean under
// @typescript-eslint/no-magic-numbers (repo-wide rule, eslint.config.js) without needing a
// per-file override — see art/vfx/specs/core-api.md "lint discipline" for the full pattern.

export interface PopAndBeatsOptions {
  enterScale: number;
  restScale: number;
  easing: string;
}

export interface PopAndBeatsResult {
  keyframes: Keyframe[];
  durationMs: number;
}

/**
 * @param pattern alternating on,off,on,off,...,on in ms, e.g. [45,70,45,70,45].
 * @param peaks one entry per "on" beat (ceil(pattern.length/2) entries). peaks[0] is the
 *   appear-pop peak (animated from `enterScale`); peaks[1..] are the follow-up beats (animated
 *   from `restScale` back to `restScale`).
 */
export function buildPopAndBeats(
  pattern: number[],
  peaks: number[],
  opts: PopAndBeatsOptions,
): PopAndBeatsResult {
  const onBeatCount = Math.ceil(pattern.length / 2);
  if (peaks.length !== onBeatCount) {
    throw new Error(
      `vfx: buildPopAndBeats expected ${onBeatCount} peaks for a ${pattern.length}-beat pattern, got ${peaks.length}`,
    );
  }
  const total = pattern.reduce((sum, ms) => sum + ms, 0);
  const keyframes: Keyframe[] = [
    { transform: `scale(${opts.enterScale})`, offset: 0, easing: opts.easing },
  ];
  let elapsed = 0;
  let onIndex = 0;
  for (const [i, beatMs] of pattern.entries()) {
    elapsed += beatMs;
    const offset = Math.min(elapsed / total, 1);
    const isOnBeat = i % 2 === 0;
    if (isOnBeat) {
      keyframes.push({ transform: `scale(${peaks[onIndex]})`, offset, easing: opts.easing });
      onIndex += 1;
    } else {
      keyframes.push({ transform: `scale(${opts.restScale})`, offset, easing: opts.easing });
    }
  }
  const lastOffset = keyframes.at(-1)?.offset;
  if (lastOffset !== 1) {
    keyframes.push({ transform: `scale(${opts.restScale})`, offset: 1, easing: opts.easing });
  }
  return { keyframes, durationMs: total };
}

export interface RevealCornerOptions {
  axis: 'x' | 'y';
  delayMs: number;
  durationMs: number;
  easing: string;
}

/**
 * One-shot "stroke reveal" for a decorative corner element: scales in from a folded state along
 * one axis (matching the rift-reveal technique in motion-direction §8 — transform only, no
 * opacity, safe next to an ink-outlined element) then holds at rest. Caller supplies the
 * transform-origin via CSS on the element itself (each corner needs a different origin).
 */
export function revealCorner(el: Element, opts: RevealCornerOptions): Animation {
  const prop = opts.axis === 'x' ? 'scaleX' : 'scaleY';
  return el.animate(
    [
      { transform: `${prop}(0)`, offset: 0 },
      { transform: `${prop}(1)`, offset: 1 },
    ],
    { duration: opts.durationMs, delay: opts.delayMs, easing: opts.easing, fill: 'forwards' },
  );
}
