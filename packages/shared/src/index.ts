// Public surface of @keep-walking/shared. Pure, side-effect-free, server-safe code only.
export type { GoldenVector, GoldenVectorFile } from './golden-vector';
export { isWithinTolerance } from './golden-vector';

// GPS trace contract and location sample (docs/tech/gps-trace-format.md, P1-F02-T03).
export type {
  GpsTrace,
  LocationSample,
  TraceErrorCode,
  TraceEnvironment,
  TraceEvent,
  TraceEventType,
  TraceGenerator,
  TraceKind,
  TraceMeta,
  TracePlatform,
  TraceSample,
  TraceSanitization,
  TraceValidationError,
  TraceValidationResult,
  ValidateTraceOptions,
} from './trace';
export {
  TRACE_FORMAT,
  countDecimals,
  toLocationSample,
  traceDurationMs,
  validateTrace,
} from './trace';
