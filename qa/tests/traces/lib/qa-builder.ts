// QA's own trace generator wrapper (P2-F04-T19, tech-lead N-08). Reuses the location-engineer's
// builder primitives from tools/traces (never forked, never modified: this file only imports
// them) but builds with `meta.kind = 'qa'` instead of `tools/traces`'s default 'synthetic', and
// writes into data/gps-traces/qa/ instead of data/gps-traces/synthetic/.
//
// Naming follows data/gps-traces/README.md section 3: `qa-<situation>-<seq 2-digit>`, same
// rounding rules (5-decimal coordinates), same seeded PRNG (mulberry32) for byte-identical
// regeneration.
import type { GpsTrace, TraceEnvironment } from '@keep-walking/shared';
import { TraceBuilder, serializeTrace } from '../../../../tools/traces/src/builder';
import type { TraceConfig } from '../../../../tools/traces/src/config';
import { REPO_ROOT, loadTraceConfig } from '../../../../tools/traces/src/config';
import type { Rng } from '../../../../tools/traces/src/rng';
import { createRng } from '../../../../tools/traces/src/rng';

export { REPO_ROOT, loadTraceConfig };
export type { TraceConfig, Rng };

/** Where QA-authored traces live (owned by qa-tester, data/gps-traces/qa/ per protocol section 7). */
export const QA_DIR = `${REPO_ROOT}data/gps-traces/qa/`;
export const QA_POLYGON_DIR = `${QA_DIR}polygons/`;

export interface QaScenarioContext {
  readonly rng: Rng;
  readonly cfg: TraceConfig;
}

/** One reproducible QA trace: same seed + same config = byte-identical file (mirrors
 * tools/traces ScenarioDef, deliberately not importing that type so this file has zero
 * dependency on tools/traces/src/scenarios/types, which stays location-engineer's alone). */
export interface QaScenarioDef {
  /** meta.id and file name (without .trace.json). Starts with "qa-". */
  readonly id: string;
  readonly scenario: string;
  readonly seed: number;
  readonly environment: TraceEnvironment;
  readonly description: string;
  readonly build: (ctx: QaScenarioContext, b: TraceBuilder) => void;
}

export interface QaGenerated {
  readonly def: QaScenarioDef;
  readonly trace: GpsTrace;
}

/** `TraceBuilder.build()` defaults to `meta.kind = 'synthetic'` unless the header (or `build()`
 * itself) says otherwise (tools/traces/src/builder.ts, P2-F04-T23 N-06 added `TraceHeader.kind`
 * for exactly this). QA passes `kind: 'qa'` through the header — never a post-build patch, and
 * never a fork of tools/traces/src/builder.ts. */
export function generateQa(
  def: QaScenarioDef,
  cfg: TraceConfig,
  seed: number = def.seed,
): QaGenerated {
  const b = new TraceBuilder({
    id: def.id,
    kind: 'qa',
    scenario: def.scenario,
    seed,
    description: def.description,
    environment: def.environment,
  });
  def.build({ rng: createRng(seed), cfg }, b);
  return { def, trace: b.build() };
}

export function generateAllQa(defs: readonly QaScenarioDef[], cfg: TraceConfig): QaGenerated[] {
  return defs.map((def) => generateQa(def, cfg));
}

/** Same stable serialization tools/traces uses (pretty header, one sample/event per line). */
export { serializeTrace as serializeQaTrace };
