// Sample shapes shared by the batch entry points of this module (test-vector conformance and,
// later, session). `session` classifies each raw fix once (tech note F04 2.6) and passes the
// same classified shape to every sub-module; these interfaces describe that shape for run/*.
import type { GeoSample } from '@keep-walking/geo';

/** A fix plus its raw point-in-polygon result against one dungeon's run polygon (F04 5.1). */
export interface DungeonSample extends GeoSample {
  readonly inside: boolean;
}

/** `DungeonSample` plus distance to that polygon's boundary, the input of edge hysteresis. */
export interface PresenceSample extends DungeonSample {
  readonly boundaryDistance_m: number;
}
