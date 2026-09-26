// Root build audio hook (board TL B-14): every cue id in audio/manifest.json has a file after
// the generator runs; an empty or absent manifest passes.
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readAudioManifest, runAudioHook, verifyAudio } from '../src/audio';
import { REPO_ROOT } from '../src/config';
import { cfg, fixture } from './helpers';

const GENERATOR = `import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out = process.argv[process.argv.indexOf('--out') + 1] ?? 'audio/out';
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'tick.wav'), 'RIFF');
`;

describe('audio hook', () => {
  it('the repo passes: every cue in audio/manifest.json has a generated file (or there are none yet)', () => {
    const manifest = readAudioManifest(REPO_ROOT, cfg);
    const generatorExists = existsSync(join(REPO_ROOT, cfg.paths.audioGenerator));
    if (!generatorExists) {
      expect(manifest?.cues ?? []).toEqual([]);
      return;
    }
    const out = mkdtempSync(join(tmpdir(), 'kw-audio-'));
    const hook = runAudioHook(REPO_ROOT, cfg, out);
    expect(hook.problems).toEqual([]);
  }, 120_000);

  it('passes with no generator and no manifest, fails when cues exist without a generator', () => {
    const fx = fixture();
    expect(runAudioHook(fx.root, cfg)).toEqual({ ran: false, problems: [] });
    fx.write(cfg.paths.audioManifest, JSON.stringify({ cues: [] }));
    expect(runAudioHook(fx.root, cfg).problems).toEqual([]);
    fx.write(cfg.paths.audioManifest, JSON.stringify({ cues: [{ id: 'run.tickGranted', file: 'tick.wav' }] }));
    expect(runAudioHook(fx.root, cfg).problems).toHaveLength(1);
  });

  it('runs the generator, then verifies each cue file (array or keyed manifest)', () => {
    const fx = fixture();
    fx.write(cfg.paths.audioGenerator, GENERATOR);
    fx.write(cfg.paths.audioManifest, JSON.stringify({ cues: { 'run.tickGranted': { file: 'tick.wav' } } }));
    const out = join(fx.root, cfg.paths.audioOut);
    // The fixture has no node_modules: point the hook at the repo's tsx through the same root layout.
    const hook = runAudioHook(REPO_ROOT, { ...cfg, paths: { ...cfg.paths, audioGenerator: join(fx.root, cfg.paths.audioGenerator) } }, out);
    expect(hook.ran).toBe(true);
    expect(verifyAudio(fx.root, cfg, out)).toEqual([]);
    fx.write(cfg.paths.audioManifest, JSON.stringify({ cues: [{ id: 'run.hpLow', file: 'hp-low.wav' }] }));
    expect(verifyAudio(fx.root, cfg, out)).toEqual([expect.stringContaining('run.hpLow')]);
    fx.write(cfg.paths.audioManifest, JSON.stringify({ cues: [{ id: 'run.hpLow', file: '../../etc/passwd' }] }));
    expect(verifyAudio(fx.root, cfg, out)).toHaveLength(1);
  }, 60_000);
});
