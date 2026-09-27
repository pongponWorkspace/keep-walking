// Builds the text of design/systems/test-vectors/*.json from config/balance + gdd-reference.json.
// A GDD vector that the reference implementation cannot meet is a finding: the run stops and
// prints it instead of writing, so a mismatch is never "fixed" silently.
import { REPO_ROOT, loadBalanceConfig, readJsonFile } from './config';
import { dropTableProblems } from './loot';
import { runLoopVectors, tickRewardVectors } from './vectors-loop';
import { hpRecoveryVectors } from './vectors-recovery';
import { loadGddReference } from './gdd';
import { dropParamsFromConfig } from './drops';
import { paramsFromConfig } from './params';
import { economyRefsFromConfig } from './vectors-economy';
import { VECTOR_FILES, buildAllVectors, checkVectors } from './vectors';
import { GATE_VECTOR_FILES, buildGateVectors, serializeGateVectorFile } from './vector-files-gate';
import type { VectorFile } from './vectors';

export const VECTOR_DIR = `${REPO_ROOT}design/systems/test-vectors/`;

/** data/dungeons/presets.json#presetIds.confirmed (level-designer owns the ids). */
export function presetIds(): string[] {
  const doc = readJsonFile(`${REPO_ROOT}data/dungeons/presets.json`);
  const ids =
    typeof doc === 'object' && doc !== null && !Array.isArray(doc) ? doc['presetIds'] : null;
  const confirmed =
    typeof ids === 'object' && ids !== null && !Array.isArray(ids) ? ids['confirmed'] : null;
  if (!Array.isArray(confirmed)) throw new Error('presets.json#presetIds.confirmed missing');
  return confirmed.map(String);
}

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
  // P2-F05-T20: gate / run state / check-in files. Expected values are the reference output, so
  // there is no GDD vector to check here; sim tests re-evaluate every file on disk.
  const gate = buildGateVectors(cfg);
  for (const name of GATE_VECTOR_FILES) out[name] = serializeGateVectorFile(gate[name]);
  // P2-F05-T01: exp per tick, drop tables per preset, whole seeded runs (death vs auto-retreat, R43).
  const problems = dropTableProblems(cfg, presetIds());
  if (problems.length > 0) throw new Error(`drop table rules failed: ${problems.join('; ')}`);
  out['tick-reward'] = serializeGateVectorFile(tickRewardVectors(cfg));
  out['run-loop'] = serializeGateVectorFile(runLoopVectors(cfg));
  // P2-H47: HP recovery outside a run (tech note F06 13.5), incl. the regen/duration config lint.
  out['hp-recovery'] = serializeGateVectorFile(hpRecoveryVectors(cfg));
  return out;
}
