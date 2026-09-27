/**
 * `displayDistance` (F04-R34, `unlocks.home.distanceDisplaySteps_m`): always rounds a straight-line
 * distance *up* to the step of the band it falls in, never down — "never claim closer than truth"
 * (CLAUDE.md, D-089). Owned by `apps/client` per this task's context ("you own the displayDistance
 * vector fn"); tested against the shared golden vectors in
 * `design/systems/test-vectors/opening-hours.json` (`fn: "displayDistance"`) so it never drifts from
 * the one systems-designer already certified, even though it lives outside `packages/shared`.
 *
 * Every UI distance (nearby panel A2, map label, popup confirm) must go through this function and
 * be shown next to the `nav.straightLineTag`/`nav.distanceApprox` chip (components.md 13.8) — never
 * a raw metre value.
 */
import { formatCopyText } from '../copy/format';

export interface DistanceStep {
  /** Upper (inclusive) bound of this band in metres; `null` = "and beyond" (last band). */
  readonly upTo_m: number | null;
  readonly step_m: number;
}

const METRES_PER_KM = 1000;
const KM_DECIMALS = 1;

/** First band (in array order) whose `upTo_m` is `null` or `>= distance_m`, rounded up to a
 * multiple of that band's `step_m`. `distance_m` itself is never reduced (R34). */
export function displayDistance(distance_m: number, steps: readonly DistanceStep[]): number {
  for (const band of steps) {
    if (band.upTo_m === null || distance_m <= band.upTo_m) {
      return Math.ceil(distance_m / band.step_m) * band.step_m;
    }
  }
  const last = steps[steps.length - 1];
  if (last === undefined) {
    throw new Error('displayDistance: steps must not be empty');
  }
  return Math.ceil(distance_m / last.step_m) * last.step_m;
}

/** Copy gate C-03: `{distanceText}` formatted through `unit.m`/`unit.km`
 * (`copy-rules.json#formats`), never a literal `'m'` appended in code — metres under 1,000 m,
 * kilometres (1 decimal place) from 1,000 m up. `displayDistance` still owns the "never show less
 * than the true distance" rounding (R34); this only chooses the unit and formats the number. */
export function formatDistanceText(distance_m: number, steps: readonly DistanceStep[]): string {
  const rounded_m = displayDistance(distance_m, steps);
  if (rounded_m < METRES_PER_KM) {
    return formatCopyText('unit.m', { value: rounded_m });
  }
  return formatCopyText('unit.km', { value: (rounded_m / METRES_PER_KM).toFixed(KM_DECIMALS) });
}
