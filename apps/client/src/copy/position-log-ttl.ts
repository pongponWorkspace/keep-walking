/**
 * `{ttlText}` (`copy.th.json` `consent.locationBody`/`privacy.positionLogExplain`/
 * `privacy.withdrawConfirmBody`'s own variable, `_variables.ttlText`: "source: config/balance/
 * privacy.json positionLogTtl_s ... format ด้วย unit.hours"): the position_log retention window
 * shown to players.
 *
 * D-135 (P2-F06-T20 6.2, F06-TG-03): `positionLogTtl_s` moved from group C to group B of
 * `apps/client/src/config/whitelist.ts` — a display-only value, never used to compute a reward or
 * gate, so it now reaches the client bundle through the normal whitelisted-subset path every other
 * `config:`-sourced copy variable in this codebase already uses. This module no longer carries a
 * fallback constant of its own; `config/balance/privacy.json#positionLogTtl_s` (currently 86400 s =
 * 24 h) is the only source of truth, so a future PDPA-approved change to that value updates this
 * text automatically with no code change.
 */
import { formatCopyText } from './format';
import { balancePrivacyConfig } from '../config/balance';

const SECONDS_PER_HOUR = 3600;

export function positionLogTtlText(): string {
  return formatCopyText('unit.hours', {
    value: balancePrivacyConfig.positionLogTtl_s / SECONDS_PER_HOUR,
  });
}
