// Raid partyMult (balance-model section 11, raid.json#partyMult, A-P1-F03-T06-17, caps D-079).
// Pure: every value is a parameter. Phase 6 ports this into packages/shared and must reproduce
// design/systems/test-vectors/raid.json.

export interface RaidPartyMultParams {
  noPartyMult: number;
  weight: number;
  incompletePartyFactor: number;
  fullPartyCap: number;
  incompletePartyCap: number;
}

export interface RaidRoleBuff {
  /** Role buff in % from the dungeon stacking formula (0 = role missing). */
  buff_pct: number;
  cap_pct: number;
}

/**
 * partyMult = min(cap, 1 + weight × mean_role(buff/cap) × (all roles present ? 1 : factor)).
 * cap = fullPartyCap when every role is present, else incompletePartyCap. Not in a party → noPartyMult.
 */
export function raidPartyMult(
  inParty: boolean,
  roles: readonly RaidRoleBuff[],
  p: RaidPartyMultParams,
): number {
  if (!inParty || roles.length === 0) return p.noPartyMult;
  const allPresent = roles.every((r) => r.buff_pct > 0);
  const meanRatio = roles.reduce((sum, r) => sum + r.buff_pct / r.cap_pct, 0) / roles.length;
  const raw = 1 + p.weight * meanRatio * (allPresent ? 1 : p.incompletePartyFactor);
  return Math.min(raw, allPresent ? p.fullPartyCap : p.incompletePartyCap);
}

/** Uncapped value, used by the report to show what the cap removes. */
export function raidPartyMultUncapped(
  inParty: boolean,
  roles: readonly RaidRoleBuff[],
  p: RaidPartyMultParams,
): number {
  return raidPartyMult(inParty, roles, {
    ...p,
    fullPartyCap: Number.POSITIVE_INFINITY,
    incompletePartyCap: Number.POSITIVE_INFINITY,
  });
}
