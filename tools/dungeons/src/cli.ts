// CLI of tools/dungeons (P2-F04-T26). Offline; reads data/dungeons/ and config, writes the artifact.
//   pnpm exec tsx tools/dungeons/src/cli.ts              validate + write the artifact
//   pnpm exec tsx tools/dungeons/src/cli.ts --check      exit 1 if the committed artifact differs
//   pnpm exec tsx tools/dungeons/src/cli.ts --validate   validate only, write nothing
//   add --json for a machine-readable issue list
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { REPO_ROOT } from './context';
import { checkCommitted, runBuild, type BuildOutcome } from './pipeline';

const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const SEVERITY_WIDTH = 'warning'.length;

function report(outcome: BuildOutcome): void {
  if (asJson) {
    console.log(
      JSON.stringify({ ok: outcome.ok, counts: outcome.counts, issues: outcome.issues }, null, 2),
    );
    return;
  }
  for (const i of outcome.issues)
    console.log(`${i.severity.padEnd(SEVERITY_WIDTH)} ${i.id} ${i.code}: ${i.message}`);
  const c = outcome.counts;
  const errors = outcome.issues.filter((i) => i.severity === 'error').length;
  const warnings = outcome.issues.length - errors;
  console.log(
    `records ${c.records} · published ${c.published} · in artifact ${c.written} · errors ${errors} · warnings ${warnings}`,
  );
}

if (args.has('--check')) {
  const result = checkCommitted();
  report(result.build);
  const rel = relative(REPO_ROOT, result.committedPath);
  if (!result.upToDate) {
    console.error(
      result.build.ok ? `${rel} is stale: run pnpm dungeons:build` : 'validation failed',
    );
    process.exit(1);
  }
  console.log(`${rel} is up to date`);
} else {
  const outcome = runBuild();
  report(outcome);
  if (!outcome.ok || outcome.text === null) {
    console.error('validation failed: artifact not written');
    process.exit(1);
  }
  if (!args.has('--validate')) {
    const result = checkCommitted();
    mkdirSync(dirname(result.committedPath), { recursive: true });
    writeFileSync(result.committedPath, outcome.text);
    console.log(`wrote ${relative(REPO_ROOT, result.committedPath)}`);
  }
}
