// tools/art CLI (no package.json, ADR 0003 8.1): pnpm exec tsx tools/art/src/cli.ts <command>
//   validate            V1–V13 on both manifests + fonts (the same check runs in `pnpm test`)
//   build [--write] [--id <id>]...
//                       rasterize avatar masters; --write puts PNGs in art/assets and updates
//                       art/assets/manifest.build.json (never manifest.json)
//   audio               run the audio generator (audio/src/generate.ts) and verify cue files
//   stage [--out <dir>] copy shipped art, fonts and audio + asset-manifest.json for the client
//   prebuild            audio + validate + stage: the first step of the root `pnpm build`
import { join } from 'node:path';
import { runAudioHook } from './audio';
import { buildAll } from './build';
import { loadConfig, readJson, REPO_ROOT } from './config';
import type { Manifest } from './manifest';
import { stage } from './stage';
import { formatFinding, loadInput, validate } from './validate';

const SHA_SHORT = 8;
const cfg = loadConfig(REPO_ROOT);
const [command = 'validate', ...args] = process.argv.slice(2);

function flag(name: string): string[] {
  return args.flatMap((a, i) => (a === name && args[i + 1] !== undefined ? [args[i + 1] as string] : []));
}

function runValidate(): boolean {
  const result = validate(loadInput(REPO_ROOT, cfg));
  for (const f of [...result.errors, ...result.warnings]) console.log(formatFinding(f));
  const s = result.stats;
  console.log(
    `art-validate: ${s.assets} assets, ${s.files} files, ${s.buildFiles} build files, ${s.fonts} fonts, ` +
      `first screen ~${s.firstScreenBytes} B, ${result.errors.length} errors, ${result.warnings.length} warnings`,
  );
  return result.errors.length === 0;
}

function runAudio(): boolean {
  const hook = runAudioHook(REPO_ROOT, cfg);
  for (const p of hook.problems) console.log(`ERROR [audio] ${p}`);
  console.log(hook.ran ? `audio: generated, ${hook.problems.length} problems` : 'audio: no generator yet (audio/src/generate.ts), skipped');
  return hook.problems.length === 0;
}

function runStage(): boolean {
  const input = loadInput(REPO_ROOT, cfg);
  const out = flag('--out')[0];
  const runtime = stage(REPO_ROOT, cfg, input.manifest, input.build, input.fonts, out === undefined ? undefined : join(process.cwd(), out));
  console.log(
    `stage: ${Object.keys(runtime.assets).length} assets, ${runtime.fonts.length} fonts, ` +
      `${Object.keys(runtime.audio).length} audio cues → ${out ?? cfg.paths.stageOut}`,
  );
  return true;
}

function run(): boolean {
  switch (command) {
    case 'validate':
      return runValidate();
    case 'build': {
      const manifest = readJson<Manifest>(REPO_ROOT, cfg.paths.manifest);
      const ids = flag('--id');
      const built = buildAll(REPO_ROOT, manifest, cfg, {
        write: args.includes('--write'),
        ...(ids.length > 0 ? { ids } : {}),
      });
      for (const e of built) for (const f of e.files) console.log(`${f.path} ${f.bytes} B ${f.colors ?? 0} colours ${f.sha256.slice(0, SHA_SHORT)}`);
      console.log(`build: ${built.length} assets${args.includes('--write') ? ' written' : ' (dry run, add --write)'}`);
      return true;
    }
    case 'audio':
      return runAudio();
    case 'stage':
      return runStage();
    case 'prebuild':
      return runAudio() && runValidate() && runStage();
    default:
      console.log(`unknown command "${command}"`);
      return false;
  }
}

process.exitCode = run() ? 0 : 1;
