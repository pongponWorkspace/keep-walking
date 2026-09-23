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

// Copy content contract (docs/tech/copy-schema.md, P1-H02): types and pure readers shared by
// the copy lint (tools/copy-lint) and the client copy loader (apps/client/src/copy).
export type {
  CopyBeat,
  CopyEntry,
  CopyExceptionList,
  CopyKind,
  CopyMeta,
  CopyVariable,
  CopyVoice,
} from './content/copy';
export {
  ALLOWED_VOICES_BY_KIND,
  COPY_BEATS,
  COPY_KEY_PATTERN,
  COPY_KINDS,
  COPY_VOICES,
  copyEntries,
  copyMeta,
  copyVariables,
} from './content/copy';
export type {
  CopyButtonFullWidthLimit,
  CopyDialogueLimit,
  CopyFormats,
  CopyLegalLimit,
  CopyLimits,
  CopyMessageLimit,
  CopyPushLimit,
  CopyRules,
  CopySimpleLimit,
} from './content/rules';
export { countCells, countCellsPerLine } from './content/cells';
export {
  MissingCopyVariableError,
  extractVariables,
  fillTemplate,
  fillWithMaxCells,
  hasUnbalancedBraces,
} from './content/template';
