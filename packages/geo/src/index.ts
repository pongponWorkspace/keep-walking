// Public surface of @keep-walking/geo. Contract: docs/adr/0003-client-first-game-core.md section 4.
// Leaf package: never import @keep-walking/*; every tunable value arrives as a parameter.
export type { GateComparison, GeoSample, LatLng } from './types';
export { DEG_TO_RAD, EARTH_MEAN_RADIUS_M, KMH_PER_MPS, MS_PER_S } from './units';
export { haversine_m, pairSpeed_kmh, passesGate } from './haversine';
export type {
  DropReason,
  DroppedSample,
  FilterVerdict,
  GateFilterParams,
  GateFilterState,
  KeptSample,
} from './filter';
export {
  filterGateSamples,
  gateFilterInit,
  gateFilterStep,
  validateGateFilterParams,
} from './filter';
export type { GridParams, GridPoint, GridState, GridStepResult, TimedSample } from './grid';
export {
  gridCloseThrough,
  gridDistance_m,
  gridInit,
  gridPairCounts,
  gridStep,
  resampleOnGrid,
  timeFromOrigin,
  validateGridParams,
} from './grid';
export type { DiagnosticParams, DiagnosticWindow } from './diagnostic';
export { gateDiagnosticWindows } from './diagnostic';
export type {
  ClosedWindow,
  RewardWindowInput,
  RewardWindowParams,
  RewardWindowState,
  RewardWindowStepResult,
} from './reward-window';
export {
  rewardWindowCloseThrough,
  rewardWindowInit,
  rewardWindowStep,
  validateRewardWindowParams,
  windowIndexOf,
} from './reward-window';
export type { PolygonGeometry } from './polygon';
export {
  boundaryDistance_m,
  edgeObservation,
  inPlayArea,
  pointInPolygon,
  rewindPolygon,
} from './polygon';
export type {
  EdgeHysteresisGapParams,
  EdgeHysteresisInput,
  EdgeHysteresisParams,
  EdgeHysteresisState,
  EdgeHysteresisStepResult,
  EdgeSide,
  EdgeTransition,
} from './hysteresis';
export {
  edgeHysteresisDropStale,
  edgeHysteresisFeed,
  edgeHysteresisGapExceeded,
  edgeHysteresisInit,
  edgeHysteresisStep,
  edgeHysteresisTransitions,
  validateEdgeHysteresisGapParams,
  validateEdgeHysteresisParams,
} from './hysteresis';
