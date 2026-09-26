// art/vfx/rarity-reveal/rarity-reveal.ts
//
// Drop reveal, 5 rarity tiers (art/vfx/specs/motion-direction.md §4, §9; art/direction/
// briefs/P2-assets.md 2.11; art/reviews/F03-visual-gate.md V-21).
//
// DOM contract: `target` is the rarity frame container that already shows the artist-2d SVG
// (`frame.rarity.<tier>-52|72` from art/assets/manifest.json) as a normal <img>/<svg> child —
// this module never draws the frame itself, only motion + a small number of ephemeral
// decoration nodes it creates and (for Rare/Epic/Legendary corners) leaves behind as part of the
// settled, static resting frame. `target` must be freshly mounted per reveal (a new toast /
// summary row per drop) — this module does not clear a previous reveal's leftover corner nodes
// before playing again on the same element (motion-direction §2 rule: no effect resumes/replays
// mid-state, every occurrence is a fresh one-shot on fresh DOM).
//
// Rarity is legible from four *static* channels already (icon-grammar §4: color, pip count,
// border thickness/rings, corner ornament) — everything animated here is the 5th, supplementary
// channel only (motion-direction §1 rule 3). Turning off this module (prefers-reduced-motion, or
// simply not calling play()) must never remove information: the frame SVG already renders every
// static channel regardless of whether this module ever runs.

import { registerEffect, type EffectRun } from '../core/vfx.js';
import { buildPopAndBeats, revealCorner } from '../core/beats.js';

const EASING = 'ease-out';
const REDUCED_DURATION_MS = 100;

type Corner = 'tl' | 'tr' | 'bl' | 'br';

function ensurePositioned(target: Element): void {
  const computed = typeof window === 'undefined' ? null : window.getComputedStyle(target);
  if (computed?.position === 'static') {
    (target as HTMLElement).style.position = 'relative';
  }
}

interface CornerSpec {
  corner: Corner;
  delayMs: number;
}

const CORNER_REVEAL_DURATION_MS = 80;

function createCorners(target: Element, corners: CornerSpec[]): Animation[] {
  ensurePositioned(target);
  const animations: Animation[] = [];
  for (const { corner, delayMs } of corners) {
    const el = document.createElement('span');
    el.className = `vfx-rarity-corner vfx-rarity-corner--${corner}`;
    target.appendChild(el);
    const axis = corner === 'tl' || corner === 'br' ? 'y' : 'x';
    animations.push(
      revealCorner(el, { axis, delayMs, durationMs: CORNER_REVEAL_DURATION_MS, easing: EASING }),
    );
  }
  return animations;
}

const NEUTRAL_SCALE = 1;

// --- Common: 1 beat, no corners (motion-direction §4 row "Common") -------------------------
const COMMON_DURATION_MS = 220;
const COMMON_ENTER_SCALE = 0.92;
const COMMON_PEAK_SCALE = 1.04;
const COMMON_PEAK_OFFSET = 0.6;

function runCommon(target: Element): EffectRun {
  const anim = target.animate(
    [
      { transform: `scale(${COMMON_ENTER_SCALE})`, offset: 0, easing: EASING },
      { transform: `scale(${COMMON_PEAK_SCALE})`, offset: COMMON_PEAK_OFFSET, easing: EASING },
      { transform: `scale(${NEUTRAL_SCALE})`, offset: 1, easing: EASING },
    ],
    { duration: COMMON_DURATION_MS },
  );
  return { animations: [anim] };
}

// --- Uncommon: 2 beats (pop + 1 wiggle), no corners ------------------------------------------
const UNCOMMON_ENTER_SCALE = 0.9;
const UNCOMMON_BEAT_1 = 45;
const UNCOMMON_GAP_1 = 70;
const UNCOMMON_BEAT_2 = 45;
const UNCOMMON_PATTERN_MS = [UNCOMMON_BEAT_1, UNCOMMON_GAP_1, UNCOMMON_BEAT_2];
const UNCOMMON_PEAK_1 = 1.05;
const UNCOMMON_PEAK_2 = 1.03;
const UNCOMMON_PEAKS = [UNCOMMON_PEAK_1, UNCOMMON_PEAK_2];

function runUncommon(target: Element): EffectRun {
  const { keyframes, durationMs } = buildPopAndBeats(UNCOMMON_PATTERN_MS, UNCOMMON_PEAKS, {
    enterScale: UNCOMMON_ENTER_SCALE,
    restScale: NEUTRAL_SCALE,
    easing: EASING,
  });
  const anim = target.animate(keyframes, { duration: durationMs });
  return { animations: [anim] };
}

// --- Rare: 3 beats, escalating peak scale + 2 corners ----------------------------------------
// "ขอบกะพริบ 3 ครั้งไล่สว่างขึ้น" reinterpreted as `transform: scale()` steps per V-21 (art/
// reviews/F03-visual-gate.md) — no filter/opacity anywhere in this tier.
const RARE_ENTER_SCALE = 0.9;
const RARE_BEAT_1 = 45;
const RARE_GAP_1 = 70;
const RARE_BEAT_2 = 45;
const RARE_GAP_2 = 70;
const RARE_BEAT_3 = 45;
const RARE_PATTERN_MS = [RARE_BEAT_1, RARE_GAP_1, RARE_BEAT_2, RARE_GAP_2, RARE_BEAT_3];
const RARE_PEAK_1 = 1.03;
const RARE_PEAK_2 = 1.06;
const RARE_PEAK_3 = 1.1;
const RARE_PEAKS = [RARE_PEAK_1, RARE_PEAK_2, RARE_PEAK_3];
const RARE_CORNER_1_DELAY_MS = 120;
const RARE_CORNER_2_DELAY_MS = 200;

function runRare(target: Element): EffectRun {
  const { keyframes, durationMs } = buildPopAndBeats(RARE_PATTERN_MS, RARE_PEAKS, {
    enterScale: RARE_ENTER_SCALE,
    restScale: NEUTRAL_SCALE,
    easing: EASING,
  });
  const mainAnim = target.animate(keyframes, { duration: durationMs });
  const cornerAnims = createCorners(target, [
    { corner: 'tl', delayMs: RARE_CORNER_1_DELAY_MS },
    { corner: 'br', delayMs: RARE_CORNER_2_DELAY_MS },
  ]);
  return { animations: [mainAnim, ...cornerAnims] };
}

// --- Epic: 4 beats (last one longer) + 4 corners clockwise ------------------------------------
const EPIC_ENTER_SCALE = 0.88;
const EPIC_BEAT_1 = 45;
const EPIC_GAP_1 = 60;
const EPIC_BEAT_2 = 45;
const EPIC_GAP_2 = 60;
const EPIC_BEAT_3 = 45;
const EPIC_GAP_3 = 60;
const EPIC_BEAT_4 = 90;
const EPIC_PATTERN_MS = [
  EPIC_BEAT_1,
  EPIC_GAP_1,
  EPIC_BEAT_2,
  EPIC_GAP_2,
  EPIC_BEAT_3,
  EPIC_GAP_3,
  EPIC_BEAT_4,
];
const EPIC_PEAK_1 = 1.03;
const EPIC_PEAK_2 = 1.05;
const EPIC_PEAK_3 = 1.08;
const EPIC_PEAK_4 = 1.12;
const EPIC_PEAKS = [EPIC_PEAK_1, EPIC_PEAK_2, EPIC_PEAK_3, EPIC_PEAK_4];
const EPIC_CORNER_1_DELAY_MS = 100;
const EPIC_CORNER_2_DELAY_MS = 180;
const EPIC_CORNER_3_DELAY_MS = 260;
const EPIC_CORNER_4_DELAY_MS = 340;

function runEpic(target: Element): EffectRun {
  const { keyframes, durationMs } = buildPopAndBeats(EPIC_PATTERN_MS, EPIC_PEAKS, {
    enterScale: EPIC_ENTER_SCALE,
    restScale: NEUTRAL_SCALE,
    easing: EASING,
  });
  const mainAnim = target.animate(keyframes, { duration: durationMs });
  const cornerAnims = createCorners(target, [
    { corner: 'tl', delayMs: EPIC_CORNER_1_DELAY_MS },
    { corner: 'tr', delayMs: EPIC_CORNER_2_DELAY_MS },
    { corner: 'br', delayMs: EPIC_CORNER_3_DELAY_MS },
    { corner: 'bl', delayMs: EPIC_CORNER_4_DELAY_MS },
  ]);
  return { animations: [mainAnim, ...cornerAnims] };
}

// --- Legendary: 5 beats + 4 corners + shard burst + one-shot brightness() ---------------------
// The one `filter` exception at this tier (motion-direction §2 table) — applied only on the
// final beat, never mid-sequence, so it never risks reading as a continuous glow/loop.
const LEGENDARY_ENTER_SCALE = 0.85;
const LEGENDARY_BEAT_1 = 45;
const LEGENDARY_GAP_1 = 60;
const LEGENDARY_BEAT_2 = 45;
const LEGENDARY_GAP_2 = 60;
const LEGENDARY_BEAT_3 = 45;
const LEGENDARY_GAP_3 = 60;
const LEGENDARY_BEAT_4 = 45;
const LEGENDARY_GAP_4 = 60;
const LEGENDARY_BEAT_5 = 180;
const LEGENDARY_PATTERN_MS = [
  LEGENDARY_BEAT_1,
  LEGENDARY_GAP_1,
  LEGENDARY_BEAT_2,
  LEGENDARY_GAP_2,
  LEGENDARY_BEAT_3,
  LEGENDARY_GAP_3,
  LEGENDARY_BEAT_4,
  LEGENDARY_GAP_4,
  LEGENDARY_BEAT_5,
];
const LEGENDARY_PEAK_1 = 1.03;
const LEGENDARY_PEAK_2 = 1.06;
const LEGENDARY_PEAK_3 = 1.1;
const LEGENDARY_PEAK_4 = 1.14;
const LEGENDARY_PEAK_5 = 1.18;
const LEGENDARY_PEAKS = [
  LEGENDARY_PEAK_1,
  LEGENDARY_PEAK_2,
  LEGENDARY_PEAK_3,
  LEGENDARY_PEAK_4,
  LEGENDARY_PEAK_5,
];
const LEGENDARY_CORNER_1_DELAY_MS = 90;
const LEGENDARY_CORNER_2_DELAY_MS = 170;
const LEGENDARY_CORNER_3_DELAY_MS = 250;
const LEGENDARY_CORNER_4_DELAY_MS = 330;

const SHARD_COUNT = 10;
const SHARD_DURATION_MS = 260;
const SHARD_BURST_LEAD_MS = 260; // shards start this far before the effect ends
const SHARD_MID_OFFSET = 0.5;
const SHARD_MID_DISTANCE_PX = 14;
const SHARD_END_DISTANCE_PX = 22;
const DEGREES_FULL_CIRCLE = 360;

const GLOW_START_OFFSET = 0.85;
const GLOW_BASE_BRIGHTNESS = 1;
const GLOW_PEAK_BRIGHTNESS = 1.18;

function runLegendary(target: Element): EffectRun {
  const { keyframes, durationMs } = buildPopAndBeats(LEGENDARY_PATTERN_MS, LEGENDARY_PEAKS, {
    enterScale: LEGENDARY_ENTER_SCALE,
    restScale: NEUTRAL_SCALE,
    easing: EASING,
  });
  const mainAnim = target.animate(keyframes, { duration: durationMs });
  const cornerAnims = createCorners(target, [
    { corner: 'tl', delayMs: LEGENDARY_CORNER_1_DELAY_MS },
    { corner: 'tr', delayMs: LEGENDARY_CORNER_2_DELAY_MS },
    { corner: 'br', delayMs: LEGENDARY_CORNER_3_DELAY_MS },
    { corner: 'bl', delayMs: LEGENDARY_CORNER_4_DELAY_MS },
  ]);

  ensurePositioned(target);
  const shardNodes: HTMLElement[] = [];
  const shardAnims: Animation[] = [];
  const burstStart = durationMs - SHARD_BURST_LEAD_MS;
  for (let i = 0; i < SHARD_COUNT; i += 1) {
    const angle = (DEGREES_FULL_CIRCLE / SHARD_COUNT) * i;
    const shard = document.createElement('span');
    shard.className = 'vfx-rarity-shard';
    target.appendChild(shard);
    shardNodes.push(shard);
    shardAnims.push(
      shard.animate(
        [
          { transform: `rotate(${angle}deg) translateY(0) scale(0)`, offset: 0 },
          {
            transform: `rotate(${angle}deg) translateY(-${SHARD_MID_DISTANCE_PX}px) scale(${NEUTRAL_SCALE})`,
            offset: SHARD_MID_OFFSET,
          },
          { transform: `rotate(${angle}deg) translateY(-${SHARD_END_DISTANCE_PX}px) scale(0)`, offset: 1 },
        ],
        { duration: SHARD_DURATION_MS, delay: burstStart, easing: EASING, fill: 'forwards' },
      ),
    );
  }

  const glowAnim = target.animate(
    [
      { filter: `brightness(${GLOW_BASE_BRIGHTNESS})`, offset: 0 },
      { filter: `brightness(${GLOW_BASE_BRIGHTNESS})`, offset: GLOW_START_OFFSET },
      { filter: `brightness(${GLOW_PEAK_BRIGHTNESS})`, offset: 1 },
    ],
    { duration: durationMs, fill: 'forwards' },
  );

  return {
    animations: [mainAnim, ...cornerAnims, ...shardAnims, glowAnim],
    cleanup: () => {
      for (const node of shardNodes) node.remove();
    },
  };
}

/** Reduced-motion variant shared by every tier (motion-direction §4 closing rule). */
function runReduced(target: Element): EffectRun {
  const anim = target.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: REDUCED_DURATION_MS,
    easing: 'linear',
    fill: 'forwards',
  });
  return { animations: [anim] };
}

registerEffect({
  id: 'drop.rarity.common',
  durationMs: COMMON_DURATION_MS,
  run: runCommon,
  reducedMotion: runReduced,
});
registerEffect({
  id: 'drop.rarity.uncommon',
  durationMs: UNCOMMON_PATTERN_MS.reduce((a, b) => a + b, 0),
  run: runUncommon,
  reducedMotion: runReduced,
});
registerEffect({
  id: 'drop.rarity.rare',
  durationMs: RARE_PATTERN_MS.reduce((a, b) => a + b, 0),
  run: runRare,
  reducedMotion: runReduced,
});
registerEffect({
  id: 'drop.rarity.epic',
  durationMs: EPIC_PATTERN_MS.reduce((a, b) => a + b, 0),
  run: runEpic,
  reducedMotion: runReduced,
});
registerEffect({
  id: 'drop.rarity.legendary',
  durationMs: LEGENDARY_PATTERN_MS.reduce((a, b) => a + b, 0),
  run: runLegendary,
  reducedMotion: runReduced,
});

export {
  runCommon,
  runUncommon,
  runRare,
  runEpic,
  runLegendary,
  ensurePositioned,
  createCorners,
};
