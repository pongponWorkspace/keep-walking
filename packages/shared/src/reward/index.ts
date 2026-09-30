// @keep-walking/shared/reward — the movement gate, rewardWindow, solo exp and drop-loot roll
// (ADR 0003 section 5-6, docs/tech/F05-movement-gate-reward.md, P2-F05-T08). Consumed only by
// `session` (tech note F04 section 3); apps/client must not import this subpath directly.
export type {
  ClockInterval,
  GateParams,
  GateAccumulatorState,
  GateStepInput,
  GateStepResult,
  ClosedGateWindow,
  GateWindowsResult,
  PartialTickParams,
} from './gate';
export {
  tauAt,
  windowIndexOf,
  passesGate,
  validateGateParams,
  gateAccumulatorInit,
  gateAccumulatorResume,
  gateAccumulatorStep,
  gateAccumulatorCloseThrough,
  partialTick,
  gateWindows,
} from './gate';

export type {
  ItemKind,
  RollDef,
  DropTableDef,
  LootParams,
  LootItem,
  LootRarity,
  Loot,
} from './loot';
export { parseDropTable, lootTable, rollTickLoot } from './loot';

export type {
  PlayerClass,
  RoleBuffParams,
  BuffPParams,
  SoloTickExpParams,
  SoloTickExpResult,
  AddExpResult,
} from './exp';
export { soloTickExp, addExp } from './exp';
