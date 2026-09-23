// Builds the text of design/systems/test-vectors/*.json from config/balance + gdd-reference.json.
// A GDD vector that the reference implementation cannot meet is a finding: the run stops and
// prints it instead of writing, so a mismatch is never "fixed" silently.
import { REPO_ROOT, loadBalanceConfig } from './config';
import { loadGddReference } from './gdd';
import { dropParamsFromConfig } from './drops';
import { paramsFromConfig } from './params';
import { economyRefsFromConfig } from './vectors-economy';
import { VECTOR_FILES, buildAllVectors, checkVectors } from './vectors';
import type { VectorFile } from './vectors';

export const VECTOR_DIR = `${REPO_ROOT}design/systems/test-vectors/`;

export function serializeVectorFile(vf: VectorFile): string {
  const indent = 2;
  return `${JSON.stringify(vf, null, indent)}\n`;
}

export function generate(): Record<string, string> {
  const cfg = loadBalanceConfig();
  const params = paramsFromConfig(cfg);
  const files = buildAllVectors(params, loadGddReference(), {
    dp: dropParamsFromConfig(cfg),
    refs: economyRefsFromConfig(cfg),
  });
  const failures = VECTOR_FILES.flatMap((name) =>
    checkVectors(name, files[name]).filter((c) => !c.pass),
  );
  if (failures.length > 0) {
    for (const f of failures) {
      console.error(
        `FINDING ${f.file}[${f.index}] expected ${JSON.stringify(f.expected)} got ${JSON.stringify(f.actual)} · ${f.source}`,
      );
    }
    throw new Error(`${failures.length} GDD vector(s) not met by the reference implementation`);
  }
  const out: Record<string, string> = {};
  for (const name of VECTOR_FILES) out[name] = serializeVectorFile(files[name]);
  return out;
}
