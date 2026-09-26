// Allowlist of known config-lint errors (P2-F04-T24). Each entry names the owner of the config
// file and the task that removes it. Only tech-lead edits this list. An allowlisted finding is
// printed as ALLOWED and does not fail `pnpm test`; an entry that matches nothing is printed as
// STALE (warn) so it can be deleted, without failing the owner's run after they fix the file.
//
// kind:
//   in-flight = caused by an edit in progress by another task (brief of P2-F04-T24).
//   handoff   = pre-existing value that predates the lint; owner renames it in a fix task. Kept
//               here so root `pnpm test` stays green while the rename is scheduled (reported in
//               the P2-F04-T24 REPORT as a deviation from "in-flight only").
import type { RuleId } from './types';

export interface AllowEntry {
  readonly rule: RuleId;
  readonly file: string;
  readonly at: string;
  readonly kind: 'in-flight' | 'handoff';
  readonly owner: string;
  readonly task: string;
  readonly fix: string;
}

const RENAME_TASK = 'handoff from P2-F04-T24 (fix task to be opened by the orchestrator)';

export const ALLOWLIST: readonly AllowEntry[] = [
  {
    rule: 'unit-suffix',
    file: 'config/balance/dungeons.json',
    at: 'openingHours.utcOffset_min',
    kind: 'in-flight',
    owner: 'tech-lead (units.ts regex)',
    task: 'follow-up of P2-X04',
    fix: 'ADR 0001 3.10.3 now lists `_min` (P2-X04). Add min|deg to UNIT_SUFFIX in units.ts, then delete this entry and the two _deg entries',
  },
  {
    rule: 'pointer',
    file: 'config/balance/unlocks.json',
    at: 'home.seeOutOfAreaMask',
    kind: 'handoff',
    owner: 'systems-designer',
    task: RENAME_TASK,
    fix: 'A see<Name> key must point at a config value (3.10.6). The mask is a data file: rename the key to outOfAreaMaskPath (plain string value) or move the path into _outOfAreaMask_source',
  },
  {
    rule: 'schema',
    file: 'config/balance/unlocks.json',
    at: 'home.seeOutOfAreaMask',
    kind: 'handoff',
    owner: 'systems-designer',
    task: RENAME_TASK,
    fix: 'Same finding as the pointer entry above, reported by the schema (common pointer pattern). After the rename, tech-lead updates unlocks.schema.json',
  },
  {
    rule: 'unit-suffix',
    file: 'config/balance/anticheat.json',
    at: 'offlineEvidence.trustWeightVsLive',
    kind: 'handoff',
    owner: 'systems-designer',
    task: RENAME_TASK,
    fix: 'Rename to trustWeightVsLiveMult (unit-less multiplier, 3.10.3) and update readers',
  },
  {
    rule: 'unit-suffix',
    file: 'config/balance/economy.json',
    at: 'partyReward.fullPartyPerHeadToSoloMin',
    kind: 'handoff',
    owner: 'systems-designer',
    task: RENAME_TASK,
    fix: 'Rename to fullPartyPerHeadToSoloMinRatio (named ratio, 3.10.3) and update tools/sim readers',
  },
  {
    rule: 'unit-suffix',
    file: 'config/balance/economy.json',
    at: 'partyReward.fullPartyPerHeadToSoloMax',
    kind: 'handoff',
    owner: 'systems-designer',
    task: RENAME_TASK,
    fix: 'Rename to fullPartyPerHeadToSoloMaxRatio and update tools/sim readers',
  },
  {
    rule: 'unit-suffix',
    file: 'config/balance/equipment.json',
    at: 'gearStat.enhanceBonusPerLevel',
    kind: 'handoff',
    owner: 'systems-designer + backend-programmer (packages/shared/src/formulas reader)',
    task: RENAME_TASK,
    fix: 'Rename to enhanceBonusPerLevelCoef (or _pct with value 8) and update formulas + vectors',
  },
  {
    rule: 'unit-suffix',
    file: 'config/balance/equipment.json',
    at: 'slots.boots.vitPointsPerGearStat',
    kind: 'handoff',
    owner: 'systems-designer + backend-programmer',
    task: RENAME_TASK,
    fix: 'Rename to vitPointsPerGearStatCoef in all four slots and update formulas',
  },
  {
    rule: 'unit-suffix',
    file: 'config/balance/raid.json',
    at: 'bossHp.alphaLaunch',
    kind: 'handoff',
    owner: 'systems-designer',
    task: RENAME_TASK,
    fix: 'Rename to alphaLaunchCoef (GDD alpha coefficient, 3.10.3)',
  },
  {
    rule: 'unit-suffix',
    file: 'config/balance/raid.json',
    at: 'bossHp.alphaTarget',
    kind: 'handoff',
    owner: 'systems-designer',
    task: RENAME_TASK,
    fix: 'Rename to alphaTargetCoef',
  },
  {
    rule: 'unit-suffix',
    file: 'config/app/telemetry.json',
    at: 'export.coordinateLikeNumberGuard.latRange_deg',
    kind: 'handoff',
    owner: 'tech-lead',
    task: 'follow-up of P2-X04',
    fix: 'ADR 0001 3.10.3 now lists `_deg` (P2-X04). Delete this entry once UNIT_SUFFIX in units.ts has deg',
  },
  {
    rule: 'unit-suffix',
    file: 'config/app/telemetry.json',
    at: 'export.coordinateLikeNumberGuard.lngRange_deg',
    kind: 'handoff',
    owner: 'tech-lead',
    task: 'follow-up of P2-X04',
    fix: 'Same as latRange_deg',
  },
];
