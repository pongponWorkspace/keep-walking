// The list of synthetic traces and the pure generation step (no file I/O here).
import type { GpsTrace } from '@keep-walking/shared';
import { TraceBuilder } from './builder';
import type { TraceConfig } from './config';
import { createRng } from './rng';
import { edgeWalkScenario, teleportScenario, walkInScenario } from './scenarios/edge';
import { permissionDeniedScenario, screenLockScenario, warmupScenario } from './scenarios/events';
import { driftSpikeScenario, parkLoopScenario } from './scenarios/park';
import { benchJitterScenario, boundaryScenario, tableStillScenario } from './scenarios/still';
import { drivingScenario, soiOccludedScenario } from './scenarios/street';
import type { Mark, ScenarioDef } from './scenarios/types';

export const SCENARIOS: readonly ScenarioDef[] = [
  parkLoopScenario,
  benchJitterScenario,
  tableStillScenario,
  edgeWalkScenario,
  driftSpikeScenario,
  soiOccludedScenario,
  boundaryScenario,
  drivingScenario,
  walkInScenario,
  teleportScenario,
  screenLockScenario,
  permissionDeniedScenario,
  warmupScenario,
];

export interface Generated {
  readonly def: ScenarioDef;
  readonly trace: GpsTrace;
  readonly marks: readonly Mark[];
}

/**
 * Builds one trace. `seed` defaults to the scenario's own seed; passing another seed gives a
 * different but equally valid variant (used by the determinism test).
 */
export function generate(def: ScenarioDef, cfg: TraceConfig, seed: number = def.seed): Generated {
  const b = new TraceBuilder({
    id: def.id,
    scenario: def.scenario,
    seed,
    description: def.description,
    environment: def.environment,
  });
  const marks = def.build({ rng: createRng(seed), cfg }, b) ?? [];
  return { def, trace: b.build(), marks };
}

export function generateAll(cfg: TraceConfig): Generated[] {
  return SCENARIOS.map((def) => generate(def, cfg));
}
