// HpParams (tech note F06 section 3.7): the one params object every pure fn in this module reads
// instead of a raw config tree. `hpParamsFromConfig` is the single fail-closed gate (FH-07): a
// config shape or value this module does not implement throws here, before any engine code runs,
// never a silent guess (ADR 0003 3.1 point 6 style, matching `assertSupportedConfig` in `session`).
//
// Import direction (ADR 0003 3.1): only `../formulas` and (type-only) `../reward`'s `PlayerClass`.
// `HpConfigInput` below is intentionally a plain structural type, not an import of `session`'s
// `SessionConfig`: `session` passes its own config object in and TypeScript's structural typing
// accepts it as long as the fields line up, with no import cycle either way.
import type { BuffParams, MonsterParams } from '../formulas';
import { assertZoneLevelRule } from '../formulas';
import type { PotionSource } from './types';

const SECONDS_PER_MINUTE = 60;
const HP_RATE_CONSISTENCY_TOLERANCE_S = 1;
const POTION_SOURCES: readonly PotionSource[] = ['runBag', 'inventory'];
const STAT_POINTS_FORMULA = 'pointsPerLevel x level';

export interface HpConfigInput {
  readonly combat: {
    readonly monsterAttack: {
      readonly monsterAtkCoef: number;
      readonly monsterAtkExponent: number;
      readonly zoneLevelFrom: string;
    };
    readonly defense: { readonly defSoftcap: number };
    readonly attackCheck: {
      readonly intervalMin_s: number;
      readonly intervalMax_s: number;
      readonly intervalDistribution: string;
      readonly hitChancePerCheck_pct: number;
    };
    readonly levelGapDamage: {
      readonly damageMultPerLevelBelowRange: number;
      readonly mode: string;
      readonly maxMult: number | null;
    };
    readonly raidFailPenalty: { readonly monsterAtkMultAfterFailedRaid: number };
  };
  readonly classes: {
    readonly buffStacking: { readonly pPerMemberBase: number; readonly pLevelDivisor: number };
    readonly roles: {
      readonly tanker: {
        readonly base_pct: number;
        readonly cap_pct: number;
        readonly missingDebuffMult: number;
      };
      readonly support: {
        readonly base_pct: number;
        readonly cap_pct: number;
        readonly inDungeonHealBase_pctMaxHpPerMin: number;
      };
      readonly magic: {
        readonly base_pct: number;
        readonly cap_pct: number;
        readonly shieldPerRewardTick_pctMaxHpPerBuffPct: number;
      };
    };
  };
  readonly economy: {
    readonly potions: Readonly<
      Record<string, { readonly heal_pctMaxHp?: number; readonly reviveToHp_pct?: number }>
    >;
    readonly autoPotion: {
      readonly enabledByDefault: boolean;
      readonly defaultThreshold_pct: number;
      readonly defaultPotionOrder: readonly string[];
      readonly sourceOrder: readonly string[];
    };
  };
  readonly progression: {
    readonly baseStats: { readonly hp: number; readonly def: number; readonly vit: number };
    readonly statPerPoint: {
      readonly hp: number;
      readonly def: number;
      readonly vitHpRegenSpeed_pct: number;
      readonly vitPotionEfficiency_pct: number;
    };
    readonly statPoints: { readonly pointsFormula: string };
    readonly hpRecovery: {
      readonly deathRecoveryTo_pct: number;
      readonly deathRecoveryDuration_s: number;
      readonly outsideDungeonRegen_pctMaxHpPerMin: number;
    };
  };
  readonly dungeons: {
    readonly hpSafety: {
      readonly autoRetreatEnabledByDefault: boolean;
      readonly autoRetreatThreshold_pct: number;
      readonly lowHpWarningThreshold_pct: number;
    };
    readonly exit: { readonly regenStartsOnExit: boolean };
  };
}

export interface HpRoleParams {
  readonly base_pct: number;
  readonly cap_pct: number;
}

export interface HpParams {
  readonly attack: {
    readonly intervalMin_s: number;
    readonly intervalMax_s: number;
    readonly hitChancePerCheck_pct: number;
  };
  readonly monster: MonsterParams;
  readonly buff: BuffParams;
  readonly roles: {
    readonly tanker: HpRoleParams;
    readonly support: HpRoleParams & { readonly inDungeonHealBase_pctMaxHpPerMin: number };
    readonly magic: HpRoleParams & { readonly shieldPerRewardTick_pctMaxHpPerBuffPct: number };
  };
  readonly safety: {
    readonly autoRetreatEnabledByDefault: boolean;
    readonly autoRetreatThreshold_pct: number;
    readonly lowHpWarningThreshold_pct: number;
    readonly autoPotionEnabled: boolean;
    readonly autoPotionThreshold_pct: number;
    readonly potionOrder: readonly string[];
    readonly sourceOrder: readonly PotionSource[];
  };
  /** Every `economy.potions.*` entry verbatim (auto-order lookups and manual `usePotion` both read
   * this; `defaultPotionOrder`/`sourceOrder` above decide auto-drink order only). */
  readonly potions: Readonly<
    Record<string, { readonly heal_pctMaxHp?: number; readonly reviveToHp_pct?: number }>
  >;
  readonly player: {
    readonly baseStats: { readonly hp: number; readonly def: number; readonly vit: number };
    readonly statPerPoint: {
      readonly hp: number;
      readonly def: number;
      readonly vitHpRegenSpeed_pct: number;
      readonly vitPotionEfficiency_pct: number;
    };
    readonly hpRecovery: {
      readonly deathRecoveryTo_pct: number;
      readonly outsideDungeonRegen_pctMaxHpPerMin: number;
    };
  };
}

function isPotionSource(v: string): v is PotionSource {
  return (POTION_SOURCES as readonly string[]).includes(v);
}

/** Builds `HpParams` from a raw config tree, or throws (FH-07, table 3.7). Every check here is a
 * rule this module's own logic already assumes; a config value outside it would make the engine
 * guess, which R-B1/D-078 and the ordered threshold rule never allow. */
export function hpParamsFromConfig(cfg: HpConfigInput): HpParams {
  assertZoneLevelRule(cfg.combat.monsterAttack.zoneLevelFrom);
  const attack = cfg.combat.attackCheck;
  if (attack.intervalDistribution !== 'uniform') {
    throw new RangeError(
      `combat.attackCheck.intervalDistribution "${attack.intervalDistribution}" is not implemented (expected "uniform")`,
    );
  }
  if (!(attack.intervalMin_s > 0) || attack.intervalMin_s > attack.intervalMax_s) {
    throw new RangeError('combat.attackCheck: 0 < intervalMin_s <= intervalMax_s');
  }
  if (attack.hitChancePerCheck_pct < 0 || attack.hitChancePerCheck_pct > 100) {
    throw new RangeError('combat.attackCheck.hitChancePerCheck_pct must be 0..100');
  }
  const gap = cfg.combat.levelGapDamage;
  if (gap.mode !== 'compound') {
    throw new RangeError(
      `combat.levelGapDamage.mode "${gap.mode}" is not implemented (expected "compound")`,
    );
  }
  if (gap.maxMult !== null && gap.maxMult < 1) {
    throw new RangeError('combat.levelGapDamage.maxMult must be null (uncapped) or >= 1');
  }
  const safety = cfg.dungeons.hpSafety;
  const autoPotion = cfg.economy.autoPotion;
  if (
    !(safety.autoRetreatThreshold_pct < safety.lowHpWarningThreshold_pct) ||
    !(safety.lowHpWarningThreshold_pct < autoPotion.defaultThreshold_pct)
  ) {
    throw new RangeError(
      'R-B1 requires autoRetreatThreshold_pct < lowHpWarningThreshold_pct < autoPotion.defaultThreshold_pct',
    );
  }
  if (!cfg.dungeons.exit.regenStartsOnExit) {
    throw new RangeError(
      'dungeons.exit.regenStartsOnExit must be true (no spec for false in Phase 2)',
    );
  }
  const sourceOrderRaw = autoPotion.sourceOrder;
  if (
    sourceOrderRaw.length !== POTION_SOURCES.length ||
    !sourceOrderRaw.every(isPotionSource) ||
    !POTION_SOURCES.every((s) => sourceOrderRaw.includes(s))
  ) {
    throw new RangeError(
      'economy.autoPotion.sourceOrder must be a permutation of ["runBag", "inventory"]',
    );
  }
  if (autoPotion.defaultPotionOrder.includes('revive')) {
    throw new RangeError(
      'economy.autoPotion.defaultPotionOrder must not include "revive" (F06 R13)',
    );
  }
  for (const id of autoPotion.defaultPotionOrder) {
    const def = cfg.economy.potions[id];
    if (def === undefined || typeof def.heal_pctMaxHp !== 'number') {
      throw new RangeError(
        `economy.potions.${id}.heal_pctMaxHp must be a number (named in defaultPotionOrder)`,
      );
    }
  }
  const hpRecovery = cfg.progression.hpRecovery;
  const impliedDuration_s =
    (hpRecovery.deathRecoveryTo_pct / hpRecovery.outsideDungeonRegen_pctMaxHpPerMin) *
    SECONDS_PER_MINUTE;
  if (
    Math.abs(impliedDuration_s - hpRecovery.deathRecoveryDuration_s) >
    HP_RATE_CONSISTENCY_TOLERANCE_S
  ) {
    throw new RangeError(
      'progression.hpRecovery.deathRecoveryDuration_s must match deathRecoveryTo_pct / outsideDungeonRegen_pctMaxHpPerMin x 60 within 1 s (tech note F06 6.2)',
    );
  }
  if (cfg.progression.statPoints.pointsFormula !== STAT_POINTS_FORMULA) {
    throw new RangeError(
      `progression.statPoints.pointsFormula "${cfg.progression.statPoints.pointsFormula}" is not implemented`,
    );
  }

  return {
    attack: {
      intervalMin_s: attack.intervalMin_s,
      intervalMax_s: attack.intervalMax_s,
      hitChancePerCheck_pct: attack.hitChancePerCheck_pct,
    },
    monster: {
      monsterAtkCoef: cfg.combat.monsterAttack.monsterAtkCoef,
      monsterAtkExponent: cfg.combat.monsterAttack.monsterAtkExponent,
      defSoftcap: cfg.combat.defense.defSoftcap,
      damageMultPerLevelBelowRange: gap.damageMultPerLevelBelowRange,
      monsterAtkMultAfterFailedRaid: cfg.combat.raidFailPenalty.monsterAtkMultAfterFailedRaid,
      tankerMissingDebuffMult: cfg.classes.roles.tanker.missingDebuffMult,
    },
    buff: { ...cfg.classes.buffStacking },
    roles: {
      tanker: {
        base_pct: cfg.classes.roles.tanker.base_pct,
        cap_pct: cfg.classes.roles.tanker.cap_pct,
      },
      support: {
        base_pct: cfg.classes.roles.support.base_pct,
        cap_pct: cfg.classes.roles.support.cap_pct,
        inDungeonHealBase_pctMaxHpPerMin:
          cfg.classes.roles.support.inDungeonHealBase_pctMaxHpPerMin,
      },
      magic: {
        base_pct: cfg.classes.roles.magic.base_pct,
        cap_pct: cfg.classes.roles.magic.cap_pct,
        shieldPerRewardTick_pctMaxHpPerBuffPct:
          cfg.classes.roles.magic.shieldPerRewardTick_pctMaxHpPerBuffPct,
      },
    },
    safety: {
      autoRetreatEnabledByDefault: safety.autoRetreatEnabledByDefault,
      autoRetreatThreshold_pct: safety.autoRetreatThreshold_pct,
      lowHpWarningThreshold_pct: safety.lowHpWarningThreshold_pct,
      autoPotionEnabled: autoPotion.enabledByDefault,
      autoPotionThreshold_pct: autoPotion.defaultThreshold_pct,
      potionOrder: autoPotion.defaultPotionOrder,
      sourceOrder: sourceOrderRaw as readonly PotionSource[],
    },
    potions: cfg.economy.potions,
    player: {
      baseStats: { ...cfg.progression.baseStats },
      statPerPoint: { ...cfg.progression.statPerPoint },
      hpRecovery: {
        deathRecoveryTo_pct: hpRecovery.deathRecoveryTo_pct,
        outsideDungeonRegen_pctMaxHpPerMin: hpRecovery.outsideDungeonRegen_pctMaxHpPerMin,
      },
    },
  };
}
