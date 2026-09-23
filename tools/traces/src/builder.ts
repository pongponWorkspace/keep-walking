// Builds and serializes synthetic traces in the shared format (docs/tech/gps-trace-format.md).
// Rounding rules live here and are documented in data/gps-traces/README.md.
import type {
  GpsTrace,
  TraceEnvironment,
  TraceEvent,
  TraceEventType,
  TraceSample,
} from '@keep-walking/shared';
import { TRACE_FORMAT } from '@keep-walking/shared';
import type { LatLng } from './geo';
import { roundTo } from './geo';

/** Synthetic and qa traces carry at most 5 decimals (about 1.1 m), the same as real walks. */
export const COORDINATE_DECIMALS = 5;
export const ACCURACY_DECIMALS = 1;
export const SPEED_DECIMALS = 2;
export const HEADING_DECIMALS = 1;
/** Platforms never report a zero radius; keep synthetic accuracy at or above this. */
export const MIN_ACCURACY_M = 1;
const FULL_TURN_DEG = 360;

export const GENERATOR_TOOL = 'tools/traces';
/** Bump when the output of any scenario changes for the same seed. */
export const GENERATOR_VERSION = '1.0.0';
export const SCHEMA_REF = '../../../packages/shared/schemas/gps-trace.schema.json';

export interface TraceHeader {
  readonly id: string;
  readonly scenario: string;
  readonly seed: number;
  readonly description: string;
  readonly environment: TraceEnvironment;
}

export interface SampleInput {
  readonly t_ms: number;
  readonly point: LatLng;
  readonly accuracy: number;
  readonly speed?: number;
  readonly heading?: number;
}

/** Maps any angle to 0 <= x < 360, rounded to HEADING_DECIMALS, never -0 or 360. */
export function roundHeading(deg: number): number {
  const h = roundTo(((deg % FULL_TURN_DEG) + FULL_TURN_DEG) % FULL_TURN_DEG, HEADING_DECIMALS);
  return h >= FULL_TURN_DEG || h === 0 ? 0 : h;
}

export class TraceBuilder {
  private readonly samples: TraceSample[] = [];
  private readonly events: TraceEvent[] = [];

  constructor(private readonly header: TraceHeader) {}

  get lastT(): number {
    return this.samples.at(-1)?.t ?? -1;
  }

  add(input: SampleInput): void {
    const t = Math.round(input.t_ms);
    if (this.samples.length === 0 && t !== 0) {
      throw new Error(`${this.header.id}: the first sample must have t = 0`);
    }
    if (t <= this.lastT) {
      throw new Error(`${this.header.id}: t must increase (got ${t} after ${this.lastT})`);
    }
    const sample: TraceSample = {
      t,
      lat: roundTo(input.point.lat, COORDINATE_DECIMALS),
      lng: roundTo(input.point.lng, COORDINATE_DECIMALS),
      accuracy: Math.max(MIN_ACCURACY_M, roundTo(input.accuracy, ACCURACY_DECIMALS)),
      ...(input.speed === undefined
        ? {}
        : { speed: Math.max(0, roundTo(input.speed, SPEED_DECIMALS)) }),
      ...(input.heading === undefined ? {} : { heading: roundHeading(input.heading) }),
    };
    this.samples.push(sample);
  }

  event(t_ms: number, type: TraceEventType): void {
    this.events.push({ t: Math.round(t_ms), type });
  }

  build(): GpsTrace {
    const { id, scenario, seed, description, environment } = this.header;
    const events = [...this.events].sort((a, b) => a.t - b.t);
    return {
      $schema: SCHEMA_REF,
      format: TRACE_FORMAT.name,
      formatVersion: TRACE_FORMAT.version,
      meta: {
        id,
        kind: 'synthetic',
        timeBase: TRACE_FORMAT.timeBase,
        description,
        environment,
        platform: 'synthetic',
        generator: { tool: GENERATOR_TOOL, version: GENERATOR_VERSION, seed, scenario },
      },
      samples: this.samples,
      ...(events.length > 0 ? { events } : {}),
    };
  }
}

/**
 * Stable text form: pretty header, one compact sample or event per line (diff-friendly, small).
 * data/ is excluded from Prettier, so this format is the canonical one.
 */
export function serializeTrace(trace: GpsTrace): string {
  const indent = '  ';
  const { samples, events, ...head } = trace;
  const headJson = JSON.stringify(head, null, indent.length);
  const lines = [headJson.slice(0, headJson.lastIndexOf('}')).trimEnd() + ','];
  lines.push(`${indent}"samples": [`);
  samples.forEach((s, i) => {
    lines.push(`${indent}${indent}${JSON.stringify(s)}${i < samples.length - 1 ? ',' : ''}`);
  });
  if (events === undefined) {
    lines.push(`${indent}]`);
  } else {
    lines.push(`${indent}],`, `${indent}"events": [`);
    events.forEach((e, i) => {
      lines.push(`${indent}${indent}${JSON.stringify(e)}${i < events.length - 1 ? ',' : ''}`);
    });
    lines.push(`${indent}]`);
  }
  lines.push('}');
  return `${lines.join('\n')}\n`;
}
