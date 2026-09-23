/**
 * GPS trace contract (docs/tech/gps-trace-format.md) and the location sample type shared by
 * the client (LocationProvider), the Mock replay, tools, QA, and the server (Phase 3 trace
 * validation). Pure and server-safe: no DOM, no Node, no clock, no I/O.
 *
 * The JSON Schema in ../schemas/gps-trace.schema.json describes the same shape. It is not used at
 * runtime because Ajv compiles validators with `new Function`, which Cloudflare Workers forbid.
 * trace.test.ts runs both against the same fixtures so they cannot drift.
 */

/**
 * One position fix, as the client hands it to game logic and (from Phase 3) to the server.
 * This is the only location data the client ever sends: position + timestamp (+ accuracy).
 */
export interface LocationSample {
  /**
   * Time of the fix in ms since the Unix epoch, taken from the fix itself
   * (GeolocationPosition.timestamp or the native equivalent), NOT the time the app received it.
   */
  readonly timestamp: number;
  /** WGS84 latitude in degrees. */
  readonly lat: number;
  /** WGS84 longitude in degrees. */
  readonly lng: number;
  /** Horizontal accuracy radius in metres as reported by the platform (about 68% confidence). */
  readonly accuracy: number;
  /** Ground speed in m/s when the platform reports it. */
  readonly speed?: number;
  /** Direction of travel in degrees clockwise from true north, 0 <= heading < 360. */
  readonly heading?: number;
}

/** Where a trace came from. `field` files never leave `qa/playtest/results/raw/`. */
export type TraceKind = 'synthetic' | 'qa' | 'field' | 'recorded';

export type TraceEnvironment = 'park' | 'soi' | 'street' | 'table' | 'bench' | 'mixed' | 'other';

/** Coarse platform only. Device model, OS build, or anything identifying is not allowed. */
export type TracePlatform = 'android-chrome' | 'ios-safari' | 'desktop' | 'synthetic';

/** Provider-level events a replay can reproduce (screen lock, permission loss, GPS errors). */
export type TraceEventType =
  | 'visibility-hidden'
  | 'visibility-visible'
  | 'permission-denied'
  | 'position-unavailable'
  | 'timeout';

/** One sample inside a trace file. `t` is ms since the first sample (relative time only). */
export interface TraceSample {
  readonly t: number;
  readonly lat: number;
  readonly lng: number;
  readonly accuracy: number;
  readonly speed?: number;
  readonly heading?: number;
}

export interface TraceEvent {
  readonly t: number;
  readonly type: TraceEventType;
}

export interface TraceGenerator {
  readonly tool: string;
  readonly version: string;
  readonly seed?: number;
  readonly scenario?: string;
}

/** Proof that a real walk was trimmed and rounded before it left the phone (PDPA). */
export interface TraceSanitization {
  readonly trimStart_m: number;
  readonly trimEnd_m: number;
  readonly coordinateDecimals?: number;
}

/** Metadata is anonymous by construction: unknown keys are rejected. */
export interface TraceMeta {
  readonly id: string;
  readonly kind: TraceKind;
  readonly timeBase: 'relative-ms';
  readonly description?: string;
  readonly environment?: TraceEnvironment;
  readonly platform?: TracePlatform;
  readonly generator?: TraceGenerator;
  readonly sanitized?: TraceSanitization;
}

export interface GpsTrace {
  readonly $schema?: string;
  readonly format: typeof TRACE_FORMAT.name;
  readonly formatVersion: typeof TRACE_FORMAT.version;
  readonly meta: TraceMeta;
  readonly samples: readonly TraceSample[];
  readonly events?: readonly TraceEvent[];
}

/** Geographic unit constants (not tunable values). */
const MAX_LATITUDE_DEG = 90;
const MAX_LONGITUDE_DEG = 180;
const FULL_TURN_DEG = 360;

/**
 * Format limits. These define the file contract, not game balance, and must match the JSON Schema
 * (trace.test.ts checks this). Changing one is a format change owned by the tech-lead.
 */
export const TRACE_FORMAT = {
  name: 'keep-walking.gps-trace',
  version: 1,
  timeBase: 'relative-ms',
  minSamples: 2,
  maxSamples: 200_000,
  maxEvents: 10_000,
  idPattern: /^[a-z0-9][a-z0-9-]{2,63}$/,
  maxDescriptionLength: 500,
  maxShortTextLength: 100,
  maxVersionLength: 50,
  /** Upper bound for `meta.sanitized.coordinateDecimals` (7 decimals is about 1 cm). */
  maxCoordinateDecimals: 7,
  /** Real walks (`field`, `recorded`) may carry at most 5 decimals (about 1.1 m). */
  maxRealWalkCoordinateDecimals: 5,
  /** validateTrace stops collecting errors after this many. */
  maxReportedErrors: 50,
} as const;

const TRACE_KINDS: readonly TraceKind[] = ['synthetic', 'qa', 'field', 'recorded'];
const REAL_WALK_KINDS: readonly TraceKind[] = ['field', 'recorded'];
const TRACE_ENVIRONMENTS: readonly TraceEnvironment[] = [
  'park',
  'soi',
  'street',
  'table',
  'bench',
  'mixed',
  'other',
];
const TRACE_PLATFORMS: readonly TracePlatform[] = [
  'android-chrome',
  'ios-safari',
  'desktop',
  'synthetic',
];
const TRACE_EVENT_TYPES: readonly TraceEventType[] = [
  'visibility-hidden',
  'visibility-visible',
  'permission-denied',
  'position-unavailable',
  'timeout',
];

const TOP_LEVEL_KEYS = ['$schema', 'format', 'formatVersion', 'meta', 'samples', 'events'];
const META_KEYS = [
  'id',
  'kind',
  'timeBase',
  'description',
  'environment',
  'platform',
  'generator',
  'sanitized',
];
const GENERATOR_KEYS = ['tool', 'version', 'seed', 'scenario'];
const SANITIZED_KEYS = ['trimStart_m', 'trimEnd_m', 'coordinateDecimals'];
const SAMPLE_KEYS = ['t', 'lat', 'lng', 'accuracy', 'speed', 'heading'];
const EVENT_KEYS = ['t', 'type'];

export type TraceErrorCode =
  | 'type'
  | 'required'
  | 'unknown-key'
  | 'enum'
  | 'range'
  | 'pattern'
  | 'length'
  | 'order'
  | 'first-sample-not-zero'
  | 'precision'
  | 'trim';

export interface TraceValidationError {
  /** JSON-pointer-like path, for example `/samples/12/accuracy`. */
  readonly path: string;
  readonly code: TraceErrorCode;
  readonly message: string;
}

export type TraceValidationResult =
  | { readonly ok: true; readonly trace: GpsTrace }
  | { readonly ok: false; readonly errors: readonly TraceValidationError[] };

export interface ValidateTraceOptions {
  /**
   * Minimum trim in metres that a `field` or `recorded` trace must declare in `meta.sanitized`.
   * Pass the config value (docs/tech/gps-trace-format.md, key `privacy.rawTraceTrim_m`).
   * When omitted, only the presence of `meta.sanitized` is enforced.
   */
  readonly minTrim_m?: number;
}

type JsonObject = Record<string, unknown>;

class ErrorSink {
  readonly errors: TraceValidationError[] = [];

  add(path: string, code: TraceErrorCode, message: string): void {
    if (this.errors.length < TRACE_FORMAT.maxReportedErrors) {
      this.errors.push({ path, code, message });
    }
  }

  get full(): boolean {
    return this.errors.length >= TRACE_FORMAT.maxReportedErrors;
  }
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function checkKeys(obj: JsonObject, allowed: readonly string[], path: string, sink: ErrorSink) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      sink.add(`${path}/${key}`, 'unknown-key', `unknown key "${key}" is not allowed`);
    }
  }
}

function checkEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: string,
  sink: ErrorSink,
): void {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    sink.add(path, 'enum', `must be one of: ${allowed.join(', ')}`);
  }
}

function checkText(value: unknown, maxLength: number, path: string, sink: ErrorSink): void {
  if (typeof value !== 'string') {
    sink.add(path, 'type', 'must be a string');
  } else if (value.length > maxLength) {
    sink.add(path, 'length', `must be at most ${maxLength} characters`);
  }
}

function checkNumberRange(
  value: unknown,
  path: string,
  sink: ErrorSink,
  range: { min?: number; max?: number; exclusiveMin?: number; exclusiveMax?: number },
): void {
  if (!isFiniteNumber(value)) {
    sink.add(path, 'type', 'must be a finite number');
    return;
  }
  const { min, max, exclusiveMin, exclusiveMax } = range;
  const tooLow =
    (min !== undefined && value < min) || (exclusiveMin !== undefined && value <= exclusiveMin);
  const tooHigh =
    (max !== undefined && value > max) || (exclusiveMax !== undefined && value >= exclusiveMax);
  if (tooLow || tooHigh) {
    sink.add(path, 'range', `value ${value} is out of range`);
  }
}

function checkRelativeTime(value: unknown, path: string, sink: ErrorSink): value is number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    sink.add(path, 'type', 'must be a non-negative integer (ms since the first sample)');
    return false;
  }
  return true;
}

/** Number of digits after the decimal point in the shortest round-trip form of `value`. */
export function countDecimals(value: number): number {
  const [mantissa = '', exponentText] = String(value).toLowerCase().split('e');
  const fraction = mantissa.split('.')[1] ?? '';
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  return Math.max(0, fraction.length - exponent);
}

function validateMeta(meta: unknown, options: ValidateTraceOptions, sink: ErrorSink): void {
  const path = '/meta';
  if (!isObject(meta)) {
    sink.add(path, 'type', 'must be an object');
    return;
  }
  checkKeys(meta, META_KEYS, path, sink);
  const id = meta['id'];
  if (typeof id !== 'string') {
    sink.add(`${path}/id`, 'required', 'id is required and must be a string');
  } else if (!TRACE_FORMAT.idPattern.test(id)) {
    sink.add(`${path}/id`, 'pattern', 'id must match ^[a-z0-9][a-z0-9-]{2,63}$');
  }
  checkEnum(meta['kind'], TRACE_KINDS, `${path}/kind`, sink);
  if (meta['timeBase'] !== TRACE_FORMAT.timeBase) {
    sink.add(`${path}/timeBase`, 'enum', `must be "${TRACE_FORMAT.timeBase}"`);
  }
  if (meta['description'] !== undefined) {
    checkText(meta['description'], TRACE_FORMAT.maxDescriptionLength, `${path}/description`, sink);
  }
  if (meta['environment'] !== undefined) {
    checkEnum(meta['environment'], TRACE_ENVIRONMENTS, `${path}/environment`, sink);
  }
  if (meta['platform'] !== undefined) {
    checkEnum(meta['platform'], TRACE_PLATFORMS, `${path}/platform`, sink);
  }
  if (meta['generator'] !== undefined) {
    validateGenerator(meta['generator'], `${path}/generator`, sink);
  }
  const isRealWalk = (REAL_WALK_KINDS as readonly unknown[]).includes(meta['kind']);
  if (meta['sanitized'] !== undefined) {
    validateSanitized(meta['sanitized'], `${path}/sanitized`, isRealWalk, options, sink);
  } else if (isRealWalk) {
    sink.add(`${path}/sanitized`, 'required', 'field and recorded traces must declare sanitized');
  }
}

function validateGenerator(generator: unknown, path: string, sink: ErrorSink): void {
  if (!isObject(generator)) {
    sink.add(path, 'type', 'must be an object');
    return;
  }
  checkKeys(generator, GENERATOR_KEYS, path, sink);
  checkText(generator['tool'], TRACE_FORMAT.maxShortTextLength, `${path}/tool`, sink);
  checkText(generator['version'], TRACE_FORMAT.maxVersionLength, `${path}/version`, sink);
  const seed = generator['seed'];
  if (seed !== undefined && !Number.isSafeInteger(seed)) {
    sink.add(`${path}/seed`, 'type', 'must be an integer');
  }
  if (generator['scenario'] !== undefined) {
    checkText(generator['scenario'], TRACE_FORMAT.maxShortTextLength, `${path}/scenario`, sink);
  }
}

function validateSanitized(
  sanitized: unknown,
  path: string,
  isRealWalk: boolean,
  options: ValidateTraceOptions,
  sink: ErrorSink,
): void {
  if (!isObject(sanitized)) {
    sink.add(path, 'type', 'must be an object');
    return;
  }
  checkKeys(sanitized, SANITIZED_KEYS, path, sink);
  for (const key of ['trimStart_m', 'trimEnd_m'] as const) {
    const value = sanitized[key];
    checkNumberRange(value, `${path}/${key}`, sink, { min: 0 });
    const minTrim = options.minTrim_m;
    if (isRealWalk && minTrim !== undefined && isFiniteNumber(value) && value < minTrim) {
      sink.add(`${path}/${key}`, 'trim', `must be at least ${minTrim} m (config)`);
    }
  }
  const decimals = sanitized['coordinateDecimals'];
  if (decimals !== undefined) {
    const max = isRealWalk
      ? TRACE_FORMAT.maxRealWalkCoordinateDecimals
      : TRACE_FORMAT.maxCoordinateDecimals;
    if (!Number.isSafeInteger(decimals) || (decimals as number) < 0) {
      sink.add(`${path}/coordinateDecimals`, 'type', 'must be a non-negative integer');
    } else if ((decimals as number) > max) {
      sink.add(`${path}/coordinateDecimals`, 'range', `must be at most ${max}`);
    }
  }
}

function validateSample(
  sample: unknown,
  path: string,
  maxDecimals: number | undefined,
  sink: ErrorSink,
): void {
  if (!isObject(sample)) {
    sink.add(path, 'type', 'must be an object');
    return;
  }
  checkKeys(sample, SAMPLE_KEYS, path, sink);
  checkRelativeTime(sample['t'], `${path}/t`, sink);
  const { lat, lng } = sample;
  checkNumberRange(lat, `${path}/lat`, sink, { min: -MAX_LATITUDE_DEG, max: MAX_LATITUDE_DEG });
  checkNumberRange(lng, `${path}/lng`, sink, { min: -MAX_LONGITUDE_DEG, max: MAX_LONGITUDE_DEG });
  checkNumberRange(sample['accuracy'], `${path}/accuracy`, sink, { exclusiveMin: 0 });
  if (sample['speed'] !== undefined) {
    checkNumberRange(sample['speed'], `${path}/speed`, sink, { min: 0 });
  }
  if (sample['heading'] !== undefined) {
    checkNumberRange(sample['heading'], `${path}/heading`, sink, {
      min: 0,
      exclusiveMax: FULL_TURN_DEG,
    });
  }
  if (maxDecimals !== undefined) {
    for (const [key, value] of [
      ['lat', lat],
      ['lng', lng],
    ] as const) {
      if (isFiniteNumber(value) && countDecimals(value) > maxDecimals) {
        sink.add(`${path}/${key}`, 'precision', `must have at most ${maxDecimals} decimals`);
      }
    }
  }
}

function coordinateDecimalLimit(meta: unknown): number | undefined {
  if (!isObject(meta)) {
    return undefined;
  }
  const sanitized = meta['sanitized'];
  const declared =
    isObject(sanitized) && Number.isSafeInteger(sanitized['coordinateDecimals'])
      ? (sanitized['coordinateDecimals'] as number)
      : undefined;
  if ((REAL_WALK_KINDS as readonly unknown[]).includes(meta['kind'])) {
    return Math.min(
      declared ?? TRACE_FORMAT.maxRealWalkCoordinateDecimals,
      TRACE_FORMAT.maxRealWalkCoordinateDecimals,
    );
  }
  return declared;
}

function validateSamples(samples: unknown, meta: unknown, sink: ErrorSink): number | undefined {
  const path = '/samples';
  if (!Array.isArray(samples)) {
    sink.add(path, 'required', 'samples is required and must be an array');
    return undefined;
  }
  if (samples.length < TRACE_FORMAT.minSamples || samples.length > TRACE_FORMAT.maxSamples) {
    sink.add(
      path,
      'length',
      `must contain ${TRACE_FORMAT.minSamples} to ${TRACE_FORMAT.maxSamples} samples`,
    );
  }
  const maxDecimals = coordinateDecimalLimit(meta);
  let previousT: number | undefined;
  for (const [index, sample] of samples.entries()) {
    if (sink.full) {
      break;
    }
    const samplePath = `${path}/${index}`;
    validateSample(sample, samplePath, maxDecimals, sink);
    const t = isObject(sample) ? sample['t'] : undefined;
    if (typeof t !== 'number' || !Number.isSafeInteger(t)) {
      continue;
    }
    if (index === 0 && t !== 0) {
      sink.add(`${samplePath}/t`, 'first-sample-not-zero', 'the first sample must have t = 0');
    }
    if (previousT !== undefined && t <= previousT) {
      sink.add(`${samplePath}/t`, 'order', 't must be strictly greater than the previous sample');
    }
    previousT = t;
  }
  return previousT;
}

function validateEvents(events: unknown, lastT: number | undefined, sink: ErrorSink): void {
  const path = '/events';
  if (events === undefined) {
    return;
  }
  if (!Array.isArray(events)) {
    sink.add(path, 'type', 'must be an array');
    return;
  }
  if (events.length > TRACE_FORMAT.maxEvents) {
    sink.add(path, 'length', `must contain at most ${TRACE_FORMAT.maxEvents} events`);
  }
  let previousT: number | undefined;
  for (const [index, event] of events.entries()) {
    if (sink.full) {
      break;
    }
    const eventPath = `${path}/${index}`;
    if (!isObject(event)) {
      sink.add(eventPath, 'type', 'must be an object');
      continue;
    }
    checkKeys(event, EVENT_KEYS, eventPath, sink);
    checkEnum(event['type'], TRACE_EVENT_TYPES, `${eventPath}/type`, sink);
    const t = event['t'];
    if (!checkRelativeTime(t, `${eventPath}/t`, sink)) {
      continue;
    }
    if (previousT !== undefined && t < previousT) {
      sink.add(`${eventPath}/t`, 'order', 'events must be sorted by t');
    }
    if (lastT !== undefined && t > lastT) {
      sink.add(`${eventPath}/t`, 'range', 'event t must not be after the last sample');
    }
    previousT = t;
  }
}

/**
 * Validates an unknown JSON value against the trace contract, including the rules the JSON Schema
 * cannot express (first t = 0, strictly increasing t, sorted events, coordinate precision and trim
 * for real walks). Pure: safe on the client, in tools, in tests, and on Workers.
 */
export function validateTrace(
  input: unknown,
  options: ValidateTraceOptions = {},
): TraceValidationResult {
  const sink = new ErrorSink();
  if (!isObject(input)) {
    return { ok: false, errors: [{ path: '', code: 'type', message: 'trace must be an object' }] };
  }
  checkKeys(input, TOP_LEVEL_KEYS, '', sink);
  if (input['$schema'] !== undefined && typeof input['$schema'] !== 'string') {
    sink.add('/$schema', 'type', 'must be a string');
  }
  if (input['format'] !== TRACE_FORMAT.name) {
    sink.add('/format', 'enum', `must be "${TRACE_FORMAT.name}"`);
  }
  if (input['formatVersion'] !== TRACE_FORMAT.version) {
    sink.add('/formatVersion', 'enum', `must be ${TRACE_FORMAT.version}`);
  }
  validateMeta(input['meta'], options, sink);
  const lastT = validateSamples(input['samples'], input['meta'], sink);
  validateEvents(input['events'], lastT, sink);
  if (sink.errors.length > 0) {
    return { ok: false, errors: sink.errors };
  }
  return { ok: true, trace: input as unknown as GpsTrace };
}

/** Duration of a valid trace in ms (t of the last sample). */
export function traceDurationMs(trace: GpsTrace): number {
  return trace.samples.at(-1)?.t ?? 0;
}

/**
 * Converts relative trace samples to LocationSamples anchored at `startEpochMs`
 * (the replay start time from the injected clock). Optional fields are copied only when present.
 */
export function toLocationSample(sample: TraceSample, startEpochMs: number): LocationSample {
  return {
    timestamp: startEpochMs + sample.t,
    lat: sample.lat,
    lng: sample.lng,
    accuracy: sample.accuracy,
    ...(sample.speed === undefined ? {} : { speed: sample.speed }),
    ...(sample.heading === undefined ? {} : { heading: sample.heading }),
  };
}
