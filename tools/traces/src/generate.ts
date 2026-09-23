// CLI: regenerate every synthetic trace into data/gps-traces/synthetic/.
//   pnpm exec tsx tools/traces/src/generate.ts           write files
//   pnpm exec tsx tools/traces/src/generate.ts --check   exit 1 if any committed file differs
// Every trace is validated with validateTrace from @keep-walking/shared before it is written.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { validateTrace } from '@keep-walking/shared';
import { serializeTrace } from './builder';
import { generateAll } from './catalog';
import { SYNTHETIC_DIR, loadTraceConfig } from './config';
import { TEST_RECT, testRectGeoJson } from './places';

export const POLYGON_DIR = `${SYNTHETIC_DIR}polygons/`;

export interface OutputFile {
  readonly path: string;
  readonly content: string;
}

/** All files the generator owns, in memory. Throws if any trace fails validateTrace. */
export function buildOutputs(): OutputFile[] {
  const cfg = loadTraceConfig();
  const files: OutputFile[] = [];
  for (const { def, trace } of generateAll(cfg)) {
    const result = validateTrace(trace);
    if (!result.ok) {
      const first = result.errors[0];
      throw new Error(
        `${def.id} failed validateTrace: ${first?.path} ${first?.code} ${first?.message}`,
      );
    }
    files.push({ path: `${SYNTHETIC_DIR}${def.id}.trace.json`, content: serializeTrace(trace) });
  }
  files.push({ path: `${POLYGON_DIR}${TEST_RECT.id}.geojson`, content: testRectGeoJson() });
  return files;
}

function main(): void {
  const check = process.argv.includes('--check');
  const files = buildOutputs();
  let stale = 0;
  for (const f of files) {
    const current = existsSync(f.path) ? readFileSync(f.path, 'utf8') : undefined;
    const name = f.path.slice(SYNTHETIC_DIR.length);
    if (check) {
      if (current !== f.content) {
        stale += 1;
        console.log(`STALE  ${name}`);
      } else {
        console.log(`ok     ${name}`);
      }
      continue;
    }
    mkdirSync(f.path.slice(0, f.path.lastIndexOf('/')), { recursive: true });
    writeFileSync(f.path, f.content);
    console.log(
      `${current === f.content ? 'same   ' : 'wrote  '}${name} (${f.content.length} bytes)`,
    );
  }
  if (check && stale > 0) {
    console.error(
      `${stale} file(s) differ from the generator. Run: pnpm exec tsx tools/traces/src/generate.ts`,
    );
    process.exit(1);
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
