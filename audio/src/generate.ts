// Entry point for the root build's audio step (docs/tech/asset-delivery.md 8, board TL B-14).
//
// Usage:  tsx audio/src/generate.ts --out <dir>          (or set KW_AUDIO_OUT instead of --out)
// From repo root:  pnpm exec tsx audio/src/generate.ts --out audio/out
//
// Contract this must keep (asset-delivery.md 8):
//   - writes files ONLY inside <dir> (default audio/out/, gitignored) — never a fixed path outside it
//   - deterministic: same source, same bytes, every run (no Math.random without a seed, no dates)
//   - offline: no network calls (the build hook sets KW_OFFLINE=1; we simply never touch the network)
//   - exit 0 on success
//
// Every cue's audio comes from `audio/src/cues.ts` (loaded from cues.json, the shared table also
// used by `audio/src/write-manifest.ts` to keep audio/manifest.json in sync) via
// `renderFromVibrationPattern` in `audio/src/dsp.ts`, which derives the sound's timing directly
// from the vibration pattern (direction.md 7).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { CUES } from './cues';
import { renderFromVibrationPattern, SAMPLE_RATE } from './dsp';
import { targetLufsForRank } from './loudness-rank';
import { normalizeToTarget, round1 } from './loudness';
import { encodeWavPcm16 } from './wav';

const MS_PER_SEC = 1000;

function parseOutDir(argv: string[]): string {
  const OUT_FLAG = '--out';
  const flagIndex = argv.indexOf(OUT_FLAG);
  if (flagIndex !== -1 && argv[flagIndex + 1] !== undefined) return resolve(argv[flagIndex + 1] as string);
  const envOut = process.env['KW_AUDIO_OUT'];
  if (envOut !== undefined && envOut !== '') return resolve(envOut);
  return resolve(process.cwd(), 'audio/out');
}

function fileNameFor(cueId: string): string {
  return `${cueId}.wav`;
}

export interface GeneratedFile {
  id: string;
  file: string;
  bytes: number;
  durationMs: number;
  measuredLufs: number;
}

export function generateAll(outDir: string): GeneratedFile[] {
  mkdirSync(outDir, { recursive: true });
  const results: GeneratedFile[] = [];
  for (const cue of CUES) {
    const raw = renderFromVibrationPattern(cue.vibrationMs, cue.notes, cue.id, SAMPLE_RATE);
    const target = targetLufsForRank(cue.loudnessRank);
    const normalized = normalizeToTarget(raw, SAMPLE_RATE, target);
    const wav = encodeWavPcm16({ samples: normalized.samples, sampleRate: SAMPLE_RATE });
    const file = fileNameFor(cue.id);
    writeFileSync(join(outDir, file), wav);
    results.push({
      id: cue.id,
      file,
      bytes: wav.length,
      durationMs: Math.round((raw.length / SAMPLE_RATE) * MS_PER_SEC),
      measuredLufs: round1(normalized.measuredLufsAfter),
    });
  }
  return results;
}

const ID_COLUMN_WIDTH = 28;
const FILE_COLUMN_WIDTH = 30;
const BYTES_COLUMN_WIDTH = 6;
const MS_COLUMN_WIDTH = 4;

function main(): void {
  const outDir = parseOutDir(process.argv.slice(2));
  const results = generateAll(outDir);
  const totalBytes = results.reduce((sum, r) => sum + r.bytes, 0);
  process.stdout.write(`audio/src/generate.ts: rendered ${String(results.length)} cues, ${String(totalBytes)} bytes, into ${outDir}\n`);
  for (const r of results) {
    process.stdout.write(
      `  ${r.id.padEnd(ID_COLUMN_WIDTH)} ${r.file.padEnd(FILE_COLUMN_WIDTH)} ${String(r.bytes).padStart(BYTES_COLUMN_WIDTH)} B  ${String(r.durationMs).padStart(MS_COLUMN_WIDTH)} ms  ${String(r.measuredLufs)} LUFS(approx)\n`,
    );
  }
}

// Only run when invoked directly (so tests can import `generateAll` without side effects).
if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
