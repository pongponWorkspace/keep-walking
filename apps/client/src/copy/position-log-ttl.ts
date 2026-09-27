/**
 * `{ttlText}` (`copy.th.json` `consent.locationBody`/`privacy.positionLogExplain`/
 * `privacy.withdrawConfirmBody`'s own variable, `_variables.ttlText`: "source: config/balance/
 * privacy.json positionLogTtl_s ... format ด้วย unit.hours"): the position_log retention window
 * shown to players.
 *
 * That value's real source of truth, `config/balance/privacy.json#positionLogTtl_s`, is
 * deliberately Group C ("ห้ามเข้า bundle ... ใช้โดย config lint ไม่ใช่ runtime",
 * `docs/tech/F04-dungeon-presence.md` section 15.3, `apps/client/src/config/whitelist.ts#
 * FORBIDDEN_ANYWHERE`) — it is not reachable from `apps/client` at runtime the way every other
 * `{variable}` in this codebase reads its own `config:` value, so this one module cannot follow
 * that same pattern.
 *
 * [ASSUMPTION A-P2-X38-3: falls back to the fixed value CLAUDE.md's own non-negotiable 7 already
 * states ("position_log TTL ของ 24 ชม.") — a GDD-level invariant, not a balance/tuning number an
 * economy pass could silently change, formatted the same way every other duration in this codebase
 * is (`unit.hours`). This is the one display value in this task's build not read from a `config:`
 * file at runtime, because the one file that has it is architecturally forbidden from the client
 * bundle. owner: tech-lead — handoff in this task's REPORT: either promote `positionLogTtl_s` out
 * of Group C (`docs/tech/F04-dungeon-presence.md` 15.3 and `whitelist.ts#FORBIDDEN_ANYWHERE` both
 * updated together, in the same task, per that doc's own "แก้ที่หนึ่งต้องแก้อีกที่" rule), or add a
 * mirrored, config-lint-checked value to `config/app/privacy.json` (tech-lead's own file) this
 * module reads instead. Either fix replaces `POSITION_LOG_TTL_HOURS_FALLBACK` below with no other
 * change to any call site.]
 */
import { formatCopyText } from './format';

const POSITION_LOG_TTL_HOURS_FALLBACK = 24;

export function positionLogTtlText(): string {
  return formatCopyText('unit.hours', { value: POSITION_LOG_TTL_HOURS_FALLBACK });
}
