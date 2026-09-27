// Evaluates the P2-F05-T01 vector fns (tick-reward.json, run-loop.json) from the vector input
// alone (no config read). Returns undefined for any other fn so vector-eval.ts can chain.
// Stable fn names (backend ports them into the packages/shared dispatcher): soloTickExp, addExp,
// lootTable, soloDamage, hitAttempt, runLoop (optional pauses, P2-H47), runLoopStats, and
// hp-recovery.json's hpAfterRegen, recoveryTime (P2-H47). rollTickLoot, deriveSeed and
// streamDraws stay in vector-eval-gate.ts (P2-F05-T20).
import type { DropContext } from '@keep-walking/shared/formulas';
import type { Json } from './config';
import type { LootParams } from './loot';
import { lootTable, parseDropTable } from './loot';
import type { LoopInput, LoopParams, OwnClass } from './loop';
import { addExp, hitAttempt, runLoop, soloBuffPct, soloDamage, soloTickExp } from './loop';
import { loopStats } from './loop-scenarios';
import type { Pause, PauseParams } from './loop-pauses';
import { runLoopWithPauses } from './loop-pauses';
import type { RegenParams } from './regen';
import { hpAfterRegen, recoveryTime } from './regen';
import { expMultiplier } from '@keep-walking/shared/formulas';
import { levelsOutsideRange as outside, zoneLevelFor } from './zone';

type In = Record<string, unknown>;

function n(input: In, key: string): number {
  const v = input[key];
  if (typeof v !== 'number') throw new Error(`vector input "${key}" must be a number`);
  return v;
}
function o<T>(input: In, key: string): T {
  const v = input[key];
  if (typeof v !== 'object' || v === null)
    throw new Error(`vector input "${key}" must be an object`);
  return v as T;
}
function cls(input: In): OwnClass {
  const v = input['ownClass'];
  if (v !== 'tanker' && v !== 'ranged' && v !== 'support' && v !== 'magic')
    throw new Error(`vector input "ownClass" must be a class, got ${String(v)}`);
  return v;
}

function tickExp(input: In) {
  const p = o<LoopParams>(input, 'params');
  const level = n(input, 'level');
  const ownClass = cls(input);
  const min = n(input, 'rangeMin');
  const max = n(input, 'rangeMax');
  const magicBuff_pct = ownClass === 'magic' ? soloBuffPct(p.roles.magic, level, p.buff) : null;
  const levelsOutsideRange = outside(level, min, max);
  return {
    zoneLevel: zoneLevelFor(level, min, max),
    levelsOutsideRange,
    magicBuff_pct,
    expMult: expMultiplier(magicBuff_pct, levelsOutsideRange, p.expMult),
    exp: soloTickExp(level, ownClass, min, max, n(input, 'f'), p),
  };
}

export function evaluateLoopVector(input: In): unknown {
  switch (input['fn']) {
    case 'soloTickExp':
      return tickExp(input);
    case 'addExp':
      return addExp(n(input, 'level'), n(input, 'exp'), n(input, 'gained'), o(input, 'params'));
    case 'lootTable': {
      const def = parseDropTable(
        String(input['dropTableId']),
        o<Json>(input, 'dropTable'),
        o<Record<string, string>>(input, 'itemRarity'),
      );
      return lootTable(def, o<DropContext>(input, 'ctx'), o<LootParams>(input, 'lootParams'));
    }
    case 'soloDamage':
      return soloDamage(
        n(input, 'level'),
        cls(input),
        n(input, 'rangeMin'),
        n(input, 'rangeMax'),
        n(input, 'def'),
        o<LoopParams>(input, 'params'),
      );
    case 'hitAttempt':
      return hitAttempt(n(input, 'runSeed'), n(input, 'index'), o<LoopParams>(input, 'params'));
    case 'runLoop': {
      const rest: In = { ...input };
      delete rest['fn'];
      if (rest['pauses'] === undefined) return runLoop(rest as unknown as LoopInput);
      const pauses = rest['pauses'] as Pause[];
      const pp = o<PauseParams>(rest, 'pauseParams');
      delete rest['pauses'];
      delete rest['pauseParams'];
      return runLoopWithPauses(rest as unknown as LoopInput, pauses, pp);
    }
    case 'runLoopStats':
      return loopStats(
        o<Omit<LoopInput, 'runSeed'>>(input, 'loop'),
        n(input, 'firstSeed'),
        n(input, 'runs'),
      );
    case 'hpAfterRegen':
      return hpAfterRegen(
        n(input, 'value'),
        n(input, 'maxHp'),
        n(input, 'vit'),
        n(input, 'elapsed_ms'),
        o<RegenParams>(input, 'params'),
      );
    case 'recoveryTime': {
      const recovering = input['recovering'];
      if (typeof recovering !== 'boolean')
        throw new Error('vector input "recovering" must be a boolean');
      return recoveryTime(
        n(input, 'value'),
        n(input, 'maxHp'),
        n(input, 'vit'),
        recovering,
        o<RegenParams>(input, 'params'),
      );
    }
    default:
      return undefined;
  }
}
