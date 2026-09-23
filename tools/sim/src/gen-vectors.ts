// CLI: regenerate design/systems/test-vectors/*.json from config/balance + gdd-reference.json.
// Run from the repo root: pnpm exec tsx tools/sim/src/gen-vectors.ts [--check]
//   --check  compare with the files on disk and exit 1 on any difference (no writes).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { VECTOR_DIR, generate } from './vector-files';
import type { VectorFile } from './vectors';

function main(): void {
  const check = process.argv.includes('--check');
  const files = generate();
  let stale = 0;
  if (!check) mkdirSync(VECTOR_DIR, { recursive: true });
  for (const [name, text] of Object.entries(files)) {
    const path = `${VECTOR_DIR}${name}.json`;
    const count = (JSON.parse(text) as VectorFile).vectors.length;
    if (check) {
      const same = existsSync(path) && readFileSync(path, 'utf8') === text;
      if (!same) stale += 1;
      console.log(`${same ? 'up-to-date' : 'STALE     '} ${name}.json (${count} vectors)`);
    } else {
      writeFileSync(path, text);
      console.log(`wrote ${name}.json (${count} vectors)`);
    }
  }
  if (stale > 0) process.exitCode = 1;
}

main();
