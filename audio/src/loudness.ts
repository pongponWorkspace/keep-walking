// Approximate loudness normalization for short UI stingers.
//
// Accuracy note (read before trusting the numbers): this is NOT a certified ITU-R BS.1770 / EBU
// R128 meter. A correct implementation needs the exact K-weighting pre-filter pair (RLB high-pass +
// high-frequency shelf, with coefficients re-derived per sample rate) and gated block averaging.
// That is out of scope for a procedural placeholder generator built by one role in one task. What
// this file does instead, deterministically and cheaply:
//   1. a steep-ish high-pass (two cascaded one-pole filters at ~100 Hz) to strip sub-bass/DC, in
//      the same spirit as BS.1770's RLB high-pass (direction.md 6.1 also wants low end cut anyway)
//   2. a crude high-frequency emphasis (first-difference blend) standing in for the K-weighting
//      high shelf, since our cues are all short mid/high-frequency transients where a shelf mostly
//      just increases weight above ~2 kHz
//   3. mean-square of the weighted signal, converted with the same offset BS.1770 uses
//      (-0.691 + 10*log10(meanSquare)) so the numbers are in the right ballpark and comparable
//      cue-to-cue, run-to-run (fully deterministic, no timing/gating dependence for clips this short)
//
// Treat `measureApproxLufs` as a consistent, reproducible proxy for relative loudness between our
// own cues (which is what direction.md 5 actually needs: a stable ordering + a rough absolute
// target), not as a spec-accurate loudness measurement. If real music/VO is ever added, use a real
// meter (e.g. ffmpeg loudnorm) — see direction.md 1.2 / 5.

export function onePoleHighpass(samples: Float32Array, sampleRate: number, cutoffHz: number): Float32Array {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / sampleRate;
  const alpha = rc / (rc + dt);
  const out = new Float32Array(samples.length);
  let prevIn = 0;
  let prevOut = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] ?? 0;
    const y = alpha * (prevOut + x - prevIn);
    out[i] = y;
    prevIn = x;
    prevOut = y;
  }
  return out;
}

function highFrequencyEmphasis(samples: Float32Array, amount: number): Float32Array {
  const out = new Float32Array(samples.length);
  let prev = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] ?? 0;
    out[i] = x + amount * (x - prev);
    prev = x;
  }
  return out;
}

const HPF_STAGE_1_HZ = 60;
const HPF_STAGE_2_HZ = 100;
const HIGH_FREQ_EMPHASIS_AMOUNT = 0.5;
const BS1770_OFFSET_DB = -0.691; // ITU-R BS.1770's calibration offset, reused as-is (see file header)
const LOG_SCALE = 10; // 10*log10(...) for a power-ratio-to-dB conversion
const SILENCE_FLOOR = 1e-12; // avoids log10(0) for a fully-silent buffer

export function measureApproxLufs(samples: Float32Array, sampleRate: number): number {
  if (samples.length === 0) return -Infinity;
  let weighted = onePoleHighpass(samples, sampleRate, HPF_STAGE_1_HZ);
  weighted = onePoleHighpass(weighted, sampleRate, HPF_STAGE_2_HZ);
  weighted = highFrequencyEmphasis(weighted, HIGH_FREQ_EMPHASIS_AMOUNT);
  let sumSquares = 0;
  for (let i = 0; i < weighted.length; i++) {
    const s = weighted[i] ?? 0;
    sumSquares += s * s;
  }
  const meanSquare = sumSquares / weighted.length;
  return BS1770_OFFSET_DB + LOG_SCALE * Math.log10(meanSquare + SILENCE_FLOOR);
}

export interface NormalizeResult {
  samples: Float32Array;
  measuredLufsBefore: number;
  measuredLufsAfter: number;
  peakAfter: number;
  peakLimited: boolean;
}

const TRUE_PEAK_CEILING_DB = -1; // direction.md 5: "true peak ไม่เกิน -1 dBTP"
const DB_TO_LINEAR_DIVISOR = 20; // amplitude ratio = 10^(dB/20)
const TRUE_PEAK_CEILING = Math.pow(LOG_SCALE, TRUE_PEAK_CEILING_DB / DB_TO_LINEAR_DIVISOR); // ~= 0.891

/** Scales `samples` to approach `targetLufs`, then hard-caps true peak at -1 dBTP (never exceeds it). */
export function normalizeToTarget(samples: Float32Array, sampleRate: number, targetLufs: number): NormalizeResult {
  const before = measureApproxLufs(samples, sampleRate);
  const gainDb = Number.isFinite(before) ? targetLufs - before : 0;
  let gain = Math.pow(LOG_SCALE, gainDb / DB_TO_LINEAR_DIVISOR);

  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs((samples[i] ?? 0) * gain);
    if (a > peak) peak = a;
  }
  let peakLimited = false;
  if (peak > TRUE_PEAK_CEILING) {
    gain *= TRUE_PEAK_CEILING / peak;
    peakLimited = true;
  }

  const out = new Float32Array(samples.length);
  let peakAfter = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = (samples[i] ?? 0) * gain;
    out[i] = v;
    const a = Math.abs(v);
    if (a > peakAfter) peakAfter = a;
  }
  return { samples: out, measuredLufsBefore: before, measuredLufsAfter: measureApproxLufs(out, sampleRate), peakAfter, peakLimited };
}

const ROUND_TO_1_DECIMAL_MULTIPLIER = 10;

/** Rounds to 1 decimal place, used when reporting LUFS numbers (generate.ts, write-manifest.ts). */
export function round1(x: number): number {
  return Math.round(x * ROUND_TO_1_DECIMAL_MULTIPLIER) / ROUND_TO_1_DECIMAL_MULTIPLIER;
}
