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

export interface DistanceStep {
  /** Upper (inclusive) bound of this band in metres; `null` = "and beyond" (last band). */
  readonly upTo_m: number | null;
  readonly step_m: number;
}

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
