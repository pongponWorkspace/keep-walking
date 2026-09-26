// The list of QA-authored traces (P2-F04-T19, tech-lead N-08). Every trace here fills a gap the
// location-engineer's tools/traces synthetic corpus does not cover for F04/F05: most transitions
// (edge walk, drift spike, table-still, bench-jitter, driving-40kmh, teleport, walk-in, soi gaps,
// screen lock, permission denied, warm-up) already have a committed synthetic-*.trace.json and a
// golden vector in design/systems/test-vectors/ that reruns against it (run-state.json,
// speed-lock.json, check-in.json). See qa/plans/F04-test-plan.md and F05-test-plan.md section
// "traceability" for which case uses which existing file instead of a new one.
import type { QaScenarioDef } from './lib/qa-builder';
import { checkinAccuracy35Scenario } from './scenarios/checkin-accuracy';
import { movementGap400mScenario } from './scenarios/movement-gap';
import { polygonOverlapScenario } from './scenarios/polygon-overlap';

export const QA_SCENARIOS: readonly QaScenarioDef[] = [
  checkinAccuracy35Scenario,
  movementGap400mScenario,
  polygonOverlapScenario,
];
