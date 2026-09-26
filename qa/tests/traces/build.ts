// CLI: regenerate every QA trace into data/gps-traces/qa/ (P2-F04-T19, tech-lead N-08).
//   pnpm exec tsx qa/tests/traces/build.ts           write files
//   pnpm exec tsx qa/tests/traces/build.ts --check   exit 1 if any committed file differs
// Mirrors tools/traces/src/generate.ts (same --check contract, same validateTrace gate) but is
// qa-tester's own script over qa-tester's own scenarios, writing only inside data/gps-traces/qa/.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { validateTrace } from '@keep-walking/shared';
import { QA_SCENARIOS } from './catalog';
import { qaOverlapRectGeoJson } from './lib/overlap-polygon';
import {
  QA_DIR,
  QA_POLYGON_DIR,
  generateAllQa,
  loadTraceConfig,
  serializeQaTrace,
} from './lib/qa-builder';

export interface OutputFile {
  readonly path: string;
  readonly content: string;
}

/** All files this script owns, in memory. Throws if any QA trace fails validateTrace, exactly
 * like tools/traces/src/generate.ts does for the synthetic corpus. */
export function buildOutputs(): OutputFile[] {
  const cfg = loadTraceConfig();
  const files: OutputFile[] = [];
  for (const { def, trace } of generateAllQa(QA_SCENARIOS, cfg)) {
    const result = validateTrace(trace);
    if (!result.ok) {
      const first = result.errors[0];
      throw new Error(
        `${def.id} failed validateTrace: ${first?.path} ${first?.code} ${first?.message}`,
      );
    }
    files.push({ path: `${QA_DIR}${def.id}.trace.json`, content: serializeQaTrace(trace) });
  }
  files.push({
    path: `${QA_POLYGON_DIR}qa-rect-overlap-b.geojson`,
    content: qaOverlapRectGeoJson(),
  });
  return files;
}

function main(): void {
  const check = process.argv.includes('--check');
  const files = buildOutputs();
  let stale = 0;
  for (const f of files) {
    const current = existsSync(f.path) ? readFileSync(f.path, 'utf8') : undefined;
    const name = f.path.slice(QA_DIR.length);
    if (check) {
      if (current !== f.content) {
        stale += 1;
        console.warn(`STALE  ${name}`);
      } else {
        console.warn(`ok     ${name}`);
      }
      continue;
    }
    mkdirSync(f.path.slice(0, f.path.lastIndexOf('/')), { recursive: true });
    writeFileSync(f.path, f.content);
    console.warn(
      `${current === f.content ? 'same   ' : 'wrote  '}${name} (${f.content.length} bytes)`,
    );
  }
  if (check && stale > 0) {
    console.error(
      `${stale} file(s) differ from the generator. Run: pnpm exec tsx qa/tests/traces/build.ts`,
    );
    process.exit(1);
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
