/**
 * Lazily loads the committed GPS traces (`data/gps-traces/{synthetic,qa,recorded}/*.trace.json`,
 * README section 1) for the Mock provider. `import.meta.glob` without `eager` keeps every trace
 * body out of the production bundle: `loc=web` (the production default, tech note section 3)
 * never fetches a single byte of trace data, protecting the S5 JS-size budget
 * (docs/tech/F02-map-location-spike.md section 10.1). Only the file names (hence `meta.id`, by the
 * README section 3 naming rule) are known up front.
 */
import { loadTrace } from '@keep-walking/location';
import type { GpsTrace } from '@keep-walking/shared';

// Vite requires a static glob literal; the four levels reach the repo root from
// apps/client/src/location/. `recorded/` does not exist yet (P1-F02-T24) but the pattern is
// forward-compatible: Vite tolerates zero matches in one of the alternatives.
const traceModules = import.meta.glob<unknown>(
  '../../../../data/gps-traces/{synthetic,qa,recorded}/*.trace.json',
  { import: 'default' },
);

const FILE_ID_PATTERN = /([^/]+)\.trace\.json$/;

function idFromPath(path: string): string | undefined {
  return FILE_ID_PATTERN.exec(path)?.[1];
}

/** Every trace id available to the Mock provider, sorted (client.json `traceWhenUnset: firstInList`). */
export function listTraceIds(): string[] {
  const ids: string[] = [];
  for (const path of Object.keys(traceModules)) {
    const id = idFromPath(path);
    if (id !== undefined) {
      ids.push(id);
    }
  }
  return ids.sort();
}

/** Loads and validates one trace by `meta.id`. Throws when the id is unknown or fails validateTrace
 * (tech note F12: callers should still prefer showing `loadTrace`'s error over letting this throw
 * when the trace came from something less trusted than the committed, CI-checked fixtures). */
export async function loadTraceById(id: string): Promise<GpsTrace> {
  for (const [path, load] of Object.entries(traceModules)) {
    if (idFromPath(path) !== id) {
      continue;
    }
    const json = await load();
    const result = loadTrace(json);
    if (!result.ok) {
      throw new Error(`gps trace "${id}" failed validateTrace: ${result.summary}`);
    }
    return result.trace;
  }
  throw new Error(`gps trace not found: "${id}"`);
}
