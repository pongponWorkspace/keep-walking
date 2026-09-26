// Procedural synthesis building blocks. No samples, no library: everything here is oscillators
// (Math.sin), a hand-rolled envelope, and the one-pole high-pass filter from loudness.ts, matching
// direction.md 2 ("สร้างเสียงแบบ procedural") and 6.1 ("ตัด/ลดพลังงานต่ำกว่า 300 Hz").
import { mulberry32, seedFromString } from './rng';
import { onePoleHighpass } from './loudness';

export type Wave = 'bell' | 'click' | 'lowTone';

export interface NoteSpec {
  /** Fundamental frequency in Hz (glide start frequency when `freqEnd` is set). */
  freq: number;
  /** Optional glide target: the note's pitch moves linearly from `freq` to `freqEnd` across its
   * duration (phase-accumulated, not a naive `sin(2*pi*f(t)*t)`, so there is no click at the seam).
   * This is how the "ascending" bell cues (tickGranted, drop rarities, checkpoint, ...) get their
   * up-chirp inside a single short note instead of needing several separate notes. */
  freqEnd?: number;
  wave: Wave;
  /** Relative peak amplitude within the cue, 0..1. Final loudness is normalized afterwards. */
  gain: number;
  /**
   * Optional high-pass override. When absent, `synthNote` picks it from `wave`: 300 Hz for
   * bell/click (direction.md 6.1), 150 Hz for the two "flatline" low tones (run.autoRetreat,
   * run.death closing notes) — the concept in cue-list.md calls for a deliberately low (~300-400
   * Hz) closing tone, and the general 300 Hz rule would gut that fundamental. Documented
   * exception, same spirit as the legendary-drop duration exception (direction.md 8).
   */
  highpassHz?: number;
}

const SAMPLE_RATE = 11025;
const MS_PER_SEC = 1000;
const MIN_NOTE_DURATION_MS = 10;
const DEFAULT_HIGHPASS_HZ = 300;
const LOW_TONE_HIGHPASS_HZ = 150;
const MIN_RELEASE_SPAN_SEC = 0.001;

function attackReleaseEnvelope(t: number, durationSec: number, attackSec: number, tailFloor: number): number {
  if (t < attackSec) return t / attackSec;
  const releaseT = t - attackSec;
  const releaseSpan = Math.max(durationSec - attackSec, MIN_RELEASE_SPAN_SEC);
  // Exponential decay reaching `tailFloor` (e.g. 0.02 ~ -34 dB, effectively silent) exactly at the
  // note's own duration end, so there is never an audible tail beyond the declared length.
  const decayRate = -Math.log(tailFloor) / releaseSpan;
  return Math.exp(-decayRate * releaseT);
}

const BELL_MAX_ATTACK_SEC = 0.004;
const BELL_ATTACK_FRACTION = 0.15;
const BELL_TAIL_FLOOR = 0.02;
const BELL_PARTIAL_2_RATIO = 2;
const BELL_PARTIAL_3_RATIO = 3;
const BELL_PARTIAL_2_GAIN = 0.35;
const BELL_PARTIAL_3_GAIN = 0.15;
const BELL_MASTER_GAIN = 0.62;
const FULL_TURN_RADIANS = 2 * Math.PI;

function synthBell(durationSec: number, freq: number, freqEnd: number, sampleRate: number): Float32Array {
  const n = Math.round(durationSec * sampleRate);
  const out = new Float32Array(n);
  const attackSec = Math.min(BELL_MAX_ATTACK_SEC, durationSec * BELL_ATTACK_FRACTION);
  let phase = 0;
  const dt = 1 / sampleRate;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = attackReleaseEnvelope(t, durationSec, attackSec, BELL_TAIL_FLOOR);
    const f = freq + (freqEnd - freq) * (durationSec > 0 ? t / durationSec : 0);
    phase += FULL_TURN_RADIANS * f * dt;
    const fundamental = Math.sin(phase);
    const partial2 = BELL_PARTIAL_2_GAIN * Math.sin(phase * BELL_PARTIAL_2_RATIO);
    const partial3 = BELL_PARTIAL_3_GAIN * Math.sin(phase * BELL_PARTIAL_3_RATIO);
    out[i] = env * (fundamental + partial2 + partial3) * BELL_MASTER_GAIN;
  }
  return out;
}

const CLICK_MAX_ATTACK_SEC = 0.002;
const CLICK_ATTACK_FRACTION = 0.2;
const CLICK_TAIL_FLOOR = 0.01;
const CLICK_TONE_GAIN = 0.5;
const CLICK_NOISE_GAIN = 0.18;
const NOISE_BIPOLAR_SCALE = 2; // rand() in [0,1) -> [-1,1)
const NOISE_BIPOLAR_OFFSET = 1;

function synthClick(durationSec: number, freq: number, sampleRate: number, seed: number): Float32Array {
  const n = Math.round(durationSec * sampleRate);
  const out = new Float32Array(n);
  const rand = mulberry32(seed);
  const attackSec = Math.min(CLICK_MAX_ATTACK_SEC, durationSec * CLICK_ATTACK_FRACTION);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    // Fast decay reaching silence well before the segment ends: a "dry" tap, not a ringing tone.
    const env = attackReleaseEnvelope(t, durationSec, attackSec, CLICK_TAIL_FLOOR);
    const tone = Math.sign(Math.sin(FULL_TURN_RADIANS * freq * t)) * CLICK_TONE_GAIN; // square-ish: drier, more "digital"
    const noise = (rand() * NOISE_BIPOLAR_SCALE - NOISE_BIPOLAR_OFFSET) * CLICK_NOISE_GAIN;
    out[i] = env * (tone + noise);
  }
  return out;
}

const LOW_TONE_MAX_ATTACK_SEC = 0.006;
const LOW_TONE_ATTACK_FRACTION = 0.1;
const LOW_TONE_TAIL_FLOOR = 0.015;
const LOW_TONE_SUB_RATIO = 0.5; // one octave below the fundamental, for body
const LOW_TONE_SUB_GAIN = 0.3;
const LOW_TONE_MASTER_GAIN = 0.7;

function synthLowTone(durationSec: number, freq: number, sampleRate: number): Float32Array {
  const n = Math.round(durationSec * sampleRate);
  const out = new Float32Array(n);
  const attackSec = Math.min(LOW_TONE_MAX_ATTACK_SEC, durationSec * LOW_TONE_ATTACK_FRACTION);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = attackReleaseEnvelope(t, durationSec, attackSec, LOW_TONE_TAIL_FLOOR);
    const fundamental = Math.sin(FULL_TURN_RADIANS * freq * t);
    const sub = LOW_TONE_SUB_GAIN * Math.sin(FULL_TURN_RADIANS * freq * LOW_TONE_SUB_RATIO * t); // a little body underneath
    out[i] = env * (fundamental + sub) * LOW_TONE_MASTER_GAIN;
  }
  return out;
}

function defaultHighpassFor(wave: Wave): number {
  return wave === 'lowTone' ? LOW_TONE_HIGHPASS_HZ : DEFAULT_HIGHPASS_HZ;
}

/** Renders one note (one "on" segment of a vibration pattern) as filtered, gain-staged samples. */
export function synthNote(durationMs: number, spec: NoteSpec, cueId: string, noteIndex: number, sampleRate = SAMPLE_RATE): Float32Array {
  const durationSec = Math.max(durationMs, MIN_NOTE_DURATION_MS) / MS_PER_SEC;
  let raw: Float32Array;
  if (spec.wave === 'bell') raw = synthBell(durationSec, spec.freq, spec.freqEnd ?? spec.freq, sampleRate);
  else if (spec.wave === 'lowTone') raw = synthLowTone(durationSec, spec.freq, sampleRate);
  else raw = synthClick(durationSec, spec.freq, sampleRate, seedFromString(`${cueId}#${String(noteIndex)}`));

  const filtered = onePoleHighpass(raw, sampleRate, spec.highpassHz ?? defaultHighpassFor(spec.wave));
  const out = new Float32Array(filtered.length);
  for (let i = 0; i < filtered.length; i++) out[i] = (filtered[i] ?? 0) * spec.gain;
  return out;
}

function silence(durationMs: number, sampleRate = SAMPLE_RATE): Float32Array {
  return new Float32Array(Math.round((Math.max(durationMs, 0) / MS_PER_SEC) * sampleRate));
}

const ON_SEGMENT_STRIDE = 2; // vibration_ms alternates on,off,on,off,... — even indices are "on"

/**
 * Builds one cue's full waveform straight from its `vibration_ms` pattern: even indices ("on")
 * become a synthesized note (in order, one entry per `notes[]`), odd indices ("off") become
 * silence of that exact duration. This is what direction.md 7 asks for literally: the sound's
 * rhythm is derived from the vibration pattern, not authored separately from it.
 */
export function renderFromVibrationPattern(vibrationMs: number[], notes: NoteSpec[], cueId: string, sampleRate = SAMPLE_RATE): Float32Array {
  const onCount = vibrationMs.filter((_, i) => i % ON_SEGMENT_STRIDE === 0).length;
  if (onCount !== notes.length) {
    throw new Error(`cue ${cueId}: vibration_ms has ${String(onCount)} "on" segments but ${String(notes.length)} notes were given`);
  }
  const chunks: Float32Array[] = [];
  let noteIndex = 0;
  for (let i = 0; i < vibrationMs.length; i++) {
    const ms = vibrationMs[i] ?? 0;
    if (i % ON_SEGMENT_STRIDE === 0) {
      const spec = notes[noteIndex];
      if (spec === undefined) throw new Error(`cue ${cueId}: missing note ${String(noteIndex)}`);
      chunks.push(synthNote(ms, spec, cueId, noteIndex, sampleRate));
      noteIndex++;
    } else {
      chunks.push(silence(ms, sampleRate));
    }
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export { SAMPLE_RATE };
