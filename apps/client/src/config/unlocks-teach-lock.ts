/**
 * Wires `onboarding/onboarding-step.ts#isSystemTeachLocked` (P2-X28, pure, never edited by this
 * task) to the real config: `config/balance.ts#balanceLockedSystemIds` is the one, already-parsed
 * `unlockId` list built from the whitelisted subset of `config/balance/unlocks.json`
 * (`config/whitelist.ts`'s own doc comment on that file's entry lists the six systems and the two
 * documented exceptions, `npcShop` and `classChange`/U5).
 *
 * No Phase 2 client screen renders market/enhance/raid/statAllocation/partyDetail/lore/anti-cheat-
 * help content yet (`apps/client/src/ui/` has no such module) — this file is forward wiring for
 * whichever later task builds the first of those screens, so that task only has to call
 * `isOnboardingSystemLocked(systemId, view)` rather than re-derive `lockedSystemIds` itself.
 */
import { isSystemTeachLocked } from '../onboarding/onboarding-step';
import type { PlayerView } from '@keep-walking/shared/session';
import { balanceLockedSystemIds } from './balance';

/** `true` while `systemId` (one of `unlocks.<system>.unlockId`, e.g. `'U1'`) must stay invisible
 * because the player has not yet received the onboarding first reward (R39/R40) — a real level/run
 * unlock check (`unlocks.<system>.minLevel`/`minCompletedRuns`, evaluated elsewhere) still applies
 * on top of this, same as `isSystemTeachLocked`'s own doc comment says. */
export function isOnboardingSystemLocked(
  systemId: string,
  view: Pick<PlayerView, 'firstRewardDone'>,
): boolean {
  return isSystemTeachLocked(
    systemId,
    { firstRewardDone: view.firstRewardDone },
    { lockedSystemIds: balanceLockedSystemIds },
  );
}
