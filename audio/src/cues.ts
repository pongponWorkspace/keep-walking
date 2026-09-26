// Typed loader for `audio/src/cues.json`, the single source of truth for every cue this task
// renders (`audio/src/generate.ts` renders from it; `audio/src/write-manifest.ts` writes
// `audio/manifest.json` from it, so the two can never drift). The data itself lives in JSON, not
// as TypeScript numeric literals, so cue tuning is a content edit and this loader has no magic
// numbers of its own to name (eslint.config.js "All balance values come from config").
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NoteSpec, Wave } from './dsp';

export type Tier = 'soft' | 'normal' | 'warning' | 'critical';

export interface CueDef {
  id: string;
  /** Sent as-is to `navigator.vibrate()` on the client (Android/Chromium only, see direction.md 2). */
  vibrationMs: number[];
  /** One entry per "on" segment of `vibrationMs` (direction.md 7: sound follows the vibration rhythm). */
  notes: NoteSpec[];
  tier: Tier;
  /** Lower cuts higher (direction.md 6.3 / cue-list.md 4). */
  priority: number;
  /** Verified against product/telemetry-events.md; null = no matching event exists yet. */
  telemetry: string | null;
  /** Human-readable pointer to the always-on visual fallback (copy key or screen). */
  silentFallback: string;
  /** 1 (quietest) .. 8 (loudest); maps to a LUFS target in generate.ts (direction.md 5). */
  loudnessRank: number;
}

interface RawNote {
  freq: number;
  freqEnd?: number;
  wave: Wave;
  gain: number;
}

interface RawCue {
  _comment?: string;
  id: string;
  vibrationMs: number[];
  notes: RawNote[];
  tier: Tier;
  priority: number;
  telemetry: string | null;
  silentFallback: string;
  loudnessRank: number;
}

interface RawFile {
  _comment?: string;
  cues: RawCue[];
}

function toNoteSpec(note: RawNote): NoteSpec {
  return { freq: note.freq, freqEnd: note.freqEnd, wave: note.wave, gain: note.gain };
}

function loadCues(): CueDef[] {
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = JSON.parse(readFileSync(join(here, 'cues.json'), 'utf8')) as RawFile;
  return raw.cues.map((cue) => ({
    id: cue.id,
    vibrationMs: cue.vibrationMs,
    notes: cue.notes.map(toNoteSpec),
    tier: cue.tier,
    priority: cue.priority,
    telemetry: cue.telemetry,
    silentFallback: cue.silentFallback,
    loudnessRank: cue.loudnessRank,
  }));
}

export const CUES: CueDef[] = loadCues();
