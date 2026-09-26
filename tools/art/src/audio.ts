// Audio hook of the root `pnpm build` (board TL B-14). Runs the sound-designer's generator
// (audio/src/generate.ts, P2-F05-T06) before the client build, then checks that every cue id in
// audio/manifest.json has its file in audio/out/. audio/out/ is gitignored, so the files only
// exist after this step. No generator and no cues = pass (Phase 2 before P2-F05-T06).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { PipelineConfig } from './config';

export interface AudioCue {
  id: string;
  /** Path relative to audio/out/. */
  file: string;
  [extra: string]: unknown;
}

export interface AudioManifest {
  manifestVersion?: number;
  cues: AudioCue[];
}

const CUE_ID = /^[a-z][A-Za-z0-9]*(\.[a-z][A-Za-z0-9]*)+$/;
const SAFE_FILE = /^[A-Za-z0-9._/-]+$/;

/** Reads audio/manifest.json; `cues` may be an array or an object keyed by cue id. */
export function readAudioManifest(root: string, cfg: PipelineConfig): AudioManifest | null {
  const abs = join(root, cfg.paths.audioManifest);
  if (!existsSync(abs)) return null;
  const raw = JSON.parse(readFileSync(abs, 'utf8')) as { manifestVersion?: number; cues?: unknown };
  const cues: AudioCue[] = [];
  if (Array.isArray(raw.cues)) {
    for (const c of raw.cues as AudioCue[]) cues.push(c);
  } else if (raw.cues !== null && typeof raw.cues === 'object') {
    for (const [id, c] of Object.entries(raw.cues as Record<string, { file: string }>)) cues.push({ ...c, id });
  }
  return raw.manifestVersion === undefined ? { cues } : { manifestVersion: raw.manifestVersion, cues };
}

/** Problems with the manifest or the rendered files. Empty list = pass. */
export function verifyAudio(root: string, cfg: PipelineConfig, outDir: string = join(root, cfg.paths.audioOut)): string[] {
  const manifest = readAudioManifest(root, cfg);
  if (manifest === null) return [];
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const cue of manifest.cues) {
    if (typeof cue.id !== 'string' || !CUE_ID.test(cue.id)) problems.push(`cue id "${String(cue.id)}" is not a dotted copy-style id`);
    if (seen.has(cue.id)) problems.push(`cue ${cue.id} listed twice`);
    seen.add(cue.id);
    if (typeof cue.file !== 'string' || !SAFE_FILE.test(cue.file) || cue.file.includes('..')) {
      problems.push(`cue ${cue.id}: "file" must be a relative path inside ${cfg.paths.audioOut}/`);
      continue;
    }
    if (!existsSync(join(outDir, cue.file))) problems.push(`cue ${cue.id}: ${cfg.paths.audioOut}/${cue.file} was not generated`);
  }
  return problems;
}

export interface HookResult {
  ran: boolean;
  problems: string[];
}

/** Generate audio (deterministic, no network) then verify. */
export function runAudioHook(root: string, cfg: PipelineConfig, outDir: string = join(root, cfg.paths.audioOut)): HookResult {
  const generator = resolve(root, cfg.paths.audioGenerator);
  if (!existsSync(generator)) {
    const manifest = readAudioManifest(root, cfg);
    const problems =
      manifest !== null && manifest.cues.length > 0
        ? [`${cfg.paths.audioManifest} lists ${manifest.cues.length} cues but ${cfg.paths.audioGenerator} does not exist`]
        : [];
    return { ran: false, problems };
  }
  const tsx = join(root, 'node_modules', '.bin', 'tsx');
  const res = spawnSync(tsx, [generator, '--out', outDir], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, KW_AUDIO_OUT: outDir, KW_OFFLINE: '1' },
  });
  if (res.status !== 0) return { ran: true, problems: [`${cfg.paths.audioGenerator} exited with ${String(res.status)}`] };
  return { ran: true, problems: verifyAudio(root, cfg, outDir) };
}
