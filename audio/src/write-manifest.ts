// Dev-time helper: (re)writes the committed `audio/manifest.json` from `audio/src/cues.ts`
// (loaded from cues.json), so the two files can never disagree. NOT part of the root build's audio
// hook (docs/tech/asset-delivery.md 8 forbids the generator from writing anywhere but its `--out`
// dir) — run this by hand whenever `audio/src/cues.json` changes, then commit the resulting
// `audio/manifest.json`:
//
//   pnpm exec tsx audio/src/write-manifest.ts
//
// Deterministic: computes `durationMs` and `loudness_lufs` the same way `generate.ts` renders the
// actual files (same shared `targetLufsForRank`), so the numbers in the committed manifest always
// match what gets rendered at build time.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CUES } from './cues';
import { renderFromVibrationPattern, SAMPLE_RATE } from './dsp';
import { targetLufsForRank } from './loudness-rank';
import { normalizeToTarget, round1 } from './loudness';

const MS_PER_SEC = 1000;

interface ManifestCue {
  id: string;
  file: string;
  vibration_ms: number[];
  priority: number;
  tier: string;
  telemetry: string | null;
  silentFallback: string;
  durationMs: number;
  loudness_lufs: number;
}

export function buildManifest(): { manifestVersion: number; cues: ManifestCue[] } {
  const MANIFEST_VERSION = 1;
  const cues: ManifestCue[] = CUES.map((cue) => {
    const raw = renderFromVibrationPattern(cue.vibrationMs, cue.notes, cue.id, SAMPLE_RATE);
    const target = targetLufsForRank(cue.loudnessRank);
    const normalized = normalizeToTarget(raw, SAMPLE_RATE, target);
    return {
      id: cue.id,
      file: `${cue.id}.wav`,
      vibration_ms: cue.vibrationMs,
      priority: cue.priority,
      tier: cue.tier,
      telemetry: cue.telemetry,
      silentFallback: cue.silentFallback,
      durationMs: Math.round((raw.length / SAMPLE_RATE) * MS_PER_SEC),
      loudness_lufs: round1(normalized.measuredLufsAfter),
    };
  });
  return { manifestVersion: MANIFEST_VERSION, cues };
}

function main(): void {
  const manifest = buildManifest();
  const outPath = resolve(process.cwd(), 'audio/manifest.json');
  const JSON_INDENT = 2;
  writeFileSync(outPath, `${JSON.stringify(manifest, null, JSON_INDENT)}\n`);
  process.stdout.write(`wrote ${outPath} with ${String(manifest.cues.length)} cues\n`);
}

if (process.argv[1] !== undefined && import.meta.url === `file://${process.argv[1]}`) {
  main();
}
