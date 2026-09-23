/**
 * Loads a trace for the Mock provider. The only accepted path is validateTrace from
 * @keep-walking/shared (D-033: no Ajv at runtime). An invalid file never crashes the client:
 * loadTrace returns the errors and a one-line summary of the first one (tech note F12).
 */
import { validateTrace } from '@keep-walking/shared';
import type { GpsTrace, TraceValidationError, ValidateTraceOptions } from '@keep-walking/shared';

export type TraceLoadResult =
  | { readonly ok: true; readonly trace: GpsTrace }
  | {
      readonly ok: false;
      readonly errors: readonly TraceValidationError[];
      /** `<path> <code>: <message>` of the first error, for a dev-facing status line. */
      readonly summary: string;
    };

function summarize(errors: readonly TraceValidationError[]): string {
  const first = errors[0];
  if (first === undefined) {
    return 'invalid trace';
  }
  return `${first.path || '/'} ${first.code}: ${first.message}`;
}

/** Validates unknown JSON (for example a parsed `*.trace.json`) as a GPS trace. */
export function loadTrace(input: unknown, options: ValidateTraceOptions = {}): TraceLoadResult {
  const result = validateTrace(input, options);
  if (result.ok) {
    return { ok: true, trace: result.trace };
  }
  return { ok: false, errors: result.errors, summary: summarize(result.errors) };
}

/** Thrown by createMockLocationProvider when handed a trace that fails validateTrace. */
export class InvalidTraceError extends Error {
  readonly errors: readonly TraceValidationError[];

  constructor(errors: readonly TraceValidationError[]) {
    super(`Trace failed validateTrace: ${summarize(errors)}`);
    this.name = 'InvalidTraceError';
    this.errors = errors;
  }
}
