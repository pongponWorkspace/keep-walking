// design/systems/test-vectors/raid.json: raid partyMult with the D-079 caps (P2-F06-T01, B-04).
// Role buffs come from the dungeon stacking formula (roleBuff) so the vectors move with
// classes.json; caps and weights come from raid.json through SimParams. Party shapes in CASE
// are example inputs, not balance values.
import type { GddReference } from './gdd';
import type { Role, SimParams } from './params';
import { ROLES } from './params';
import type { VectorInput, VectorOutput } from './vector-eval';
import { evaluateVector } from './vector-eval';
import type { Vector, VectorFile } from './vectors';

const SIM_TOLERANCE = 1e-6;
const SIM_DECIMALS = 6;
const DECIMAL_BASE = 10;
const SIM = 'sim run P2-F06-T01 (reference implementation tools/sim/src/raid.ts)';
const GDD = 'GDD > Raid Boss > partyMult (ครบ role ราว 1.4-1.6 ไม่ครบ 1.0-1.2 ไม่มี party 1.0)';

/** Example party shapes (member levels per role). */
const CASE = {
  midLevel: 25,
  asymptoteMembersPerRole: 200,
} as const;

function sim(input: VectorInput, note: string): Vector {
  const out = evaluateVector(input) as number;
  const f = DECIMAL_BASE ** SIM_DECIMALS;
  return {
    input,
    expected: (Math.round(out * f) / f) as VectorOutput,
    tolerance: SIM_TOLERANCE,
    source: `${SIM} · ${note}`,
  };
}

export function raidVectors(p: SimParams, g: GddReference): VectorFile {
  void g;
  const L = CASE.midLevel;
  const max = p.exp.maxLevel;
  const buffOf = (role: Role, levels: number[]) =>
    evaluateVector({
      fn: 'roleBuff',
      role,
      base_pct: p.roles[role].base_pct,
      cap_pct: p.roles[role].cap_pct,
      memberLevels: levels,
      pPerMemberBase: p.buff.pPerMemberBase,
      pLevelDivisor: p.buff.pLevelDivisor,
    }) as number;
  const rolesIn = (levelsByRole: Partial<Record<Role, number[]>>) =>
    ROLES.map((role) => ({
      role,
      buff_pct: buffOf(role, levelsByRole[role] ?? []),
      cap_pct: p.roles[role].cap_pct,
    }));
  const each = (levels: number[], without: Role[] = []) =>
    Object.fromEntries(ROLES.filter((r) => !without.includes(r)).map((r) => [r, levels]));
  const input = (inParty: boolean, levelsByRole: Partial<Record<Role, number[]>>) => ({
    fn: 'raidPartyMult',
    inParty,
    roles: rolesIn(levelsByRole),
    ...p.raidParty,
  });
  const rp = p.raidParty;
  const t = p.raidPartyTargets;
  const v: Vector[] = [];
  // Band [lo, hi] as midpoint ± half-width; SIM_TOLERANCE keeps an exact edge (capped 1.6) inside
  // despite float noise, and rounding keeps the JSON readable.
  const band = (lo: number, hi: number) => ({
    expected:
      Math.round(((lo + hi) / 2) * DECIMAL_BASE ** SIM_DECIMALS) / DECIMAL_BASE ** SIM_DECIMALS,
    tolerance:
      Math.round(((hi - lo) / 2 + SIM_TOLERANCE) * DECIMAL_BASE ** SIM_DECIMALS) /
      DECIMAL_BASE ** SIM_DECIMALS,
  });
  const full = band(t.fullMin, t.fullMax);
  const part = band(t.incompleteMin, t.incompleteMax);
  v.push({
    input: input(false, {}),
    expected: rp.noPartyMult,
    tolerance: 0,
    source: `${GDD} · no party → 1.0`,
  });
  v.push({
    input: input(true, each([L])),
    ...full,
    source: `${GDD} · full party, one per role L${L}`,
  });
  v.push({
    input: input(true, each([L, L])),
    ...full,
    source: `${GDD} · full party, two per role L${L} (capped)`,
  });
  v.push({
    input: input(true, each([L], ['support'])),
    ...part,
    source: `${GDD} · three roles L${L}`,
  });
  v.push({
    input: input(true, each([L, L], ['support'])),
    ...part,
    source: `${GDD} · three roles, two each (capped)`,
  });
  v.push(sim(input(false, each([L])), 'boundary: not in a party ignores buffs → noPartyMult'));
  v.push(sim(input(true, {}), 'boundary: in a party but no role inside → 1 + 0 = 1.0'));
  v.push(sim(input(true, each([L])), `full party one per role L${L} → about 1.41 (under cap)`));
  v.push(
    sim(
      input(true, each([L, L])),
      `full party two per role L${L}: raw about 1.61 → capped ${rp.fullPartyCap}`,
    ),
  );
  v.push(sim(input(true, each([max])), `full party one per role L${max} → about 1.52`));
  v.push(
    sim(
      input(true, each(Array.from({ length: CASE.asymptoteMembersPerRole }, () => max))),
      `boundary: every buff at cap (raw 1 + weight = ${1 + rp.weight}) → capped ${rp.fullPartyCap}`,
    ),
  );
  v.push(sim(input(true, each([L], ['support'])), `three roles L${L} (no Support) → about 1.17`));
  v.push(
    sim(
      input(true, each([L, L], ['support'])),
      `three roles two each: raw about 1.26 → capped ${rp.incompletePartyCap}`,
    ),
  );
  v.push(
    sim(input(true, { tanker: [L] }), `one role only (Tanker L${L}) → incomplete factor applies`),
  );
  v.push(
    sim(
      input(
        true,
        each(
          Array.from({ length: CASE.asymptoteMembersPerRole }, () => max),
          ['magic'],
        ),
      ),
      `boundary: three roles at cap → capped ${rp.incompletePartyCap}`,
    ),
  );
  return { formula: 'raid', vectors: v };
}
