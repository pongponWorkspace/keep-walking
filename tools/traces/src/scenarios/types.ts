import type { TraceEnvironment } from '@keep-walking/shared';
import type { TraceBuilder } from '../builder';
import type { ScenarioContext } from './common';

/** A labelled moment in a trace (for example "step outside"), in ms from the first sample. */
export interface Mark {
  readonly label: string;
  readonly t_ms: number;
}

/** One reproducible synthetic trace: same seed + same config = byte-identical file. */
export interface ScenarioDef {
  /** meta.id and file name (without .trace.json). Starts with "synthetic-". */
  readonly id: string;
  /** meta.generator.scenario */
  readonly scenario: string;
  readonly seed: number;
  readonly environment: TraceEnvironment;
  /** Short Thai description stored in meta.description (the README has the full one). */
  readonly description: string;
  /** Builds the samples. May return labelled times (phase starts) for the README and tests. */
  readonly build: (ctx: ScenarioContext, b: TraceBuilder) => readonly Mark[] | undefined;
}
