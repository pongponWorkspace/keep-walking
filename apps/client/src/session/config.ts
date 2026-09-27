/**
 * Builds `SessionParams` (`@keep-walking/shared/session`) from the client's own whitelisted
 * balance subset (`config/balance.ts`, tech note F04 section 15) and the dungeon artifact
 * (`dungeons/artifact.ts`). This is the one place `apps/client` assembles the engine's config —
 * every field name below is the same key `config/balance/*.json` already uses (verified 1:1
 * against the raw files while building this task; no renaming layer needed).
 *
 * Field-level source: `dropParamsFromConfig` (`@keep-walking/shared/formulas`, not the banned
 * `/reward` or `/run` subpaths) builds `LootParams.dp`; the exp/buff numbers are picked directly
 * because their field names already match `SoloTickExpParams` 1:1 (progression.json#expCurve,
 * #expMultipliers, #level; classes.json#roles.magic, #buffStacking).
 */
import { dropParamsFromConfig } from '@keep-walking/shared/formulas';
import type { ExpMultParams, ExpParams } from '@keep-walking/shared/formulas';
import type { JsonObject } from '@keep-walking/shared/config';
import type {
  SessionConfig,
  SessionDungeonRecord,
  SessionParams,
} from '@keep-walking/shared/session';
import balanceSubsetJson from '../config/generated/balance-subset.generated.json';
import type { ArtifactDungeon } from '../dungeons/artifact';

type BalanceSubset = typeof balanceSubsetJson;
const subset = balanceSubsetJson as BalanceSubset;

function j(value: unknown): JsonObject {
  return value as JsonObject;
}

/** `quantityPerDrop.<rarity>` for every non-common rarity (LootParams.qty, reward/loot.ts). */
function quantityPerDrop(): SessionConfig['drops']['lootParams']['qty'] {
  const q = subset.drops.quantityPerDrop as {
    readonly uncommon: number;
    readonly rare: number;
    readonly epic: number;
    readonly legendary: number;
  };
  return { uncommon: q.uncommon, rare: q.rare, epic: q.epic, legendary: q.legendary };
}

export function buildSessionConfig(): SessionConfig {
  const mg = subset.dungeons.movementGate as {
    readonly minDistancePerWindow_m: number;
    readonly window_s: number;
    readonly comparison: string;
    readonly sampleCadence_s: number;
    readonly maxSamplePairGap_s: number;
    readonly maxSampleAccuracy_m: number;
    readonly outlierSpeed_kmh: number;
    readonly outlierReanchorSamples: number;
  };
  const runState = subset.dungeons.runState as {
    readonly edgeHysteresisSamples: number;
    readonly edgeHysteresis_m: number;
    readonly clockSkewTolerance_s: number;
    readonly graceMax_s: number;
    readonly suspendedMax_s: number;
    readonly suspendedTimeCounts: boolean;
    readonly rewardTickDuringGrace: boolean;
    readonly rewardTickDuringSuspended: boolean;
  };
  const rewardTick = subset.dungeons.rewardTick as { readonly rewardTickInterval_s: number };
  const emergencyClose = subset.dungeons.emergencyClose as {
    readonly partialTickMinElapsed_s: number;
  };
  const checkIn = subset.anticheat.checkIn as {
    readonly minContinuousApproach_s: number;
    readonly maxAccuracy_m: number;
    readonly teleportIntoPolygonAllowed: boolean;
  };
  const speedLock = subset.anticheat.speedLock as {
    readonly speedLock_kmh: number;
    readonly lockSustained_s: number;
    readonly unlockSustained_s: number;
  };
  const hpSafety = subset.dungeons.hpSafety as {
    readonly autoRetreatKeepsRunLoot: boolean;
    readonly autoRetreatEnabledByDefault: boolean;
    readonly autoRetreatThreshold_pct: number;
    readonly lowHpWarningThreshold_pct: number;
  };
  const death = subset.dungeons.death as { readonly loseAllRunLoot: boolean };
  const exit = subset.dungeons.exit as { readonly regenStartsOnExit: boolean };
  const expCurve = subset.progression.expCurve as JsonObject;
  const level = subset.progression.level as {
    readonly maxLevel: number;
    readonly startLevel: number;
  };
  const expMultipliers = subset.progression.expMultipliers as JsonObject;
  const magic = (subset.classes.roles as { readonly magic: { base_pct: number; cap_pct: number } })
    .magic;
  const buffStacking = subset.classes.buffStacking as {
    readonly pPerMemberBase: number;
    readonly pLevelDivisor: number;
  };
  const roles = subset.classes.roles as {
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
  const monsterAttack = subset.combat.monsterAttack as {
    readonly zoneLevelFrom: string;
    readonly monsterAtkCoef: number;
    readonly monsterAtkExponent: number;
  };
  const defense = subset.combat.defense as { readonly defSoftcap: number };
  const attackCheck = subset.combat.attackCheck as {
    readonly intervalMin_s: number;
    readonly intervalMax_s: number;
    readonly intervalDistribution: string;
    readonly hitChancePerCheck_pct: number;
  };
  const levelGapDamage = subset.combat.levelGapDamage as {
    readonly damageMultPerLevelBelowRange: number;
    readonly mode: string;
    readonly maxMult: number | null;
  };
  const autoPotion = subset.economy.autoPotion as {
    readonly enabledByDefault: boolean;
    readonly defaultThreshold_pct: number;
    readonly defaultPotionOrder: readonly string[];
    readonly sourceOrder: readonly string[];
  };
  const baseStats = subset.progression.baseStats as {
    readonly hp: number;
    readonly def: number;
    readonly vit: number;
  };
  const statPerPoint = subset.progression.statPerPoint as {
    readonly hp: number;
    readonly def: number;
    readonly vitHpRegenSpeed_pct: number;
    readonly vitPotionEfficiency_pct: number;
  };
  const statPoints = subset.progression.statPoints as {
    readonly pointsPerLevel: number;
    readonly pointsFormula: string;
  };
  const hpRecovery = subset.progression.hpRecovery as {
    readonly deathRecoveryTo_pct: number;
    readonly deathRecoveryDuration_s: number;
    readonly outsideDungeonRegen_pctMaxHpPerMin: number;
  };

  return {
    movementGate: {
      window_s: mg.window_s,
      minDistancePerWindow_m: mg.minDistancePerWindow_m,
      comparison: mg.comparison,
      sampleCadence_s: mg.sampleCadence_s,
      maxSamplePairGap_s: mg.maxSamplePairGap_s,
      maxSampleAccuracy_m: mg.maxSampleAccuracy_m,
      outlierSpeed_kmh: mg.outlierSpeed_kmh,
      outlierReanchorSamples: mg.outlierReanchorSamples,
    },
    rewardTick: {
      rewardTickInterval_s: rewardTick.rewardTickInterval_s,
      partialTickMinElapsed_s: emergencyClose.partialTickMinElapsed_s,
    },
    runState: {
      edgeHysteresisSamples: runState.edgeHysteresisSamples,
      edgeHysteresis_m: runState.edgeHysteresis_m,
      clockSkewTolerance_s: runState.clockSkewTolerance_s,
      graceMax_s: runState.graceMax_s,
      suspendedMax_s: runState.suspendedMax_s,
      suspendedTimeCounts: runState.suspendedTimeCounts,
      rewardTickDuringGrace: runState.rewardTickDuringGrace,
      rewardTickDuringSuspended: runState.rewardTickDuringSuspended,
    },
    checkIn: {
      minContinuousApproach_s: checkIn.minContinuousApproach_s,
      maxAccuracy_m: checkIn.maxAccuracy_m,
      teleportIntoPolygonAllowed: checkIn.teleportIntoPolygonAllowed,
    },
    speedLock: {
      speedLock_kmh: speedLock.speedLock_kmh,
      lockSustained_s: speedLock.lockSustained_s,
      unlockSustained_s: speedLock.unlockSustained_s,
    },
    drops: {
      smallDungeonMaxArea_m2: (subset.drops.smallDungeon as { smallDungeonMaxArea_m2: number })
        .smallDungeonMaxArea_m2,
      dropTables: subset.drops.dropTables as Readonly<Record<string, unknown>>,
      items: subset.drops.items as Readonly<Record<string, unknown>>,
      lootParams: {
        dp: dropParamsFromConfig({
          drops: j(subset.drops),
          dungeons: j(subset.dungeons),
          economy: j(subset.economy),
        }),
        qty: quantityPerDrop(),
      },
    },
    exp: {
      // `ExpParams` (`@keep-walking/shared/formulas`) is `expCurve`'s 4 fields plus `maxLevel`/
      // `startLevel`, which live in `progression.json#level` instead — fixed (found while
      // verifying this task's own round-trip test): the old cast skipped both, so a fresh
      // `createPlayer` silently got `level: undefined` and every persisted-session load rejected
      // as `corrupt` the instant P2-F06-T06's `isCorruptPlayer` guard started checking `level`.
      exp: {
        ...(expCurve as unknown as ExpParams),
        maxLevel: level.maxLevel,
        startLevel: level.startLevel,
      },
      expMult: expMultipliers as unknown as ExpMultParams,
      roles: { magic: { base_pct: magic.base_pct, cap_pct: magic.cap_pct } },
      buff: buffStacking,
    },
    hpSafety: {
      autoRetreatKeepsRunLoot: hpSafety.autoRetreatKeepsRunLoot,
      autoRetreatEnabledByDefault: hpSafety.autoRetreatEnabledByDefault,
      autoRetreatThreshold_pct: hpSafety.autoRetreatThreshold_pct,
      lowHpWarningThreshold_pct: hpSafety.lowHpWarningThreshold_pct,
    },
    death: { loseAllRunLoot: death.loseAllRunLoot },
    exit: { regenStartsOnExit: exit.regenStartsOnExit },
    openingHours: {
      utcOffset_min: (subset.dungeons.openingHours as { utcOffset_min: number }).utcOffset_min,
      closingSoonNotice_s: (subset.dungeons.openingHours as { closingSoonNotice_s: number })
        .closingSoonNotice_s,
    },
    combat: {
      monsterAttack: {
        zoneLevelFrom: monsterAttack.zoneLevelFrom,
        monsterAtkCoef: monsterAttack.monsterAtkCoef,
        monsterAtkExponent: monsterAttack.monsterAtkExponent,
      },
      defense: { defSoftcap: defense.defSoftcap },
      attackCheck: {
        intervalMin_s: attackCheck.intervalMin_s,
        intervalMax_s: attackCheck.intervalMax_s,
        intervalDistribution: attackCheck.intervalDistribution,
        hitChancePerCheck_pct: attackCheck.hitChancePerCheck_pct,
      },
      levelGapDamage: {
        damageMultPerLevelBelowRange: levelGapDamage.damageMultPerLevelBelowRange,
        mode: levelGapDamage.mode,
        maxMult: levelGapDamage.maxMult,
      },
      // `combat.json#raidFailPenalty` is a group-C name (`config/whitelist.ts`'s
      // `FORBIDDEN_ANYWHERE`, checked by `generated.test.ts`) — never whitelisted, so its real
      // value never leaves `config/balance/`. Phase 2 has no raid feature in the client at all (no
      // raid state is ever tracked here), so `1` (neutral: "as if no raid has ever failed") is the
      // only value this client can honestly compute; raids are server-side, Phase 3+ work.
      raidFailPenalty: { monsterAtkMultAfterFailedRaid: 1 },
    },
    classes: {
      buffStacking,
      roles: {
        tanker: {
          base_pct: roles.tanker.base_pct,
          cap_pct: roles.tanker.cap_pct,
          missingDebuffMult: roles.tanker.missingDebuffMult,
        },
        support: {
          base_pct: roles.support.base_pct,
          cap_pct: roles.support.cap_pct,
          inDungeonHealBase_pctMaxHpPerMin: roles.support.inDungeonHealBase_pctMaxHpPerMin,
        },
        magic: {
          base_pct: roles.magic.base_pct,
          cap_pct: roles.magic.cap_pct,
          shieldPerRewardTick_pctMaxHpPerBuffPct:
            roles.magic.shieldPerRewardTick_pctMaxHpPerBuffPct,
        },
      },
    },
    economy: {
      potions: subset.economy.potions as SessionConfig['economy']['potions'],
      autoPotion: {
        enabledByDefault: autoPotion.enabledByDefault,
        defaultThreshold_pct: autoPotion.defaultThreshold_pct,
        defaultPotionOrder: autoPotion.defaultPotionOrder,
        sourceOrder: autoPotion.sourceOrder,
      },
    },
    progression: {
      baseStats,
      statPerPoint,
      statPoints,
      hpRecovery,
    },
  } satisfies SessionConfig;
}

/** progression.level.maxLevel / startLevel — used by `session/engine.ts`'s `createPlayer` call
 * site and by the new-player bootstrap, never hardcoded. */
export function progressionLevelConfig(): {
  readonly maxLevel: number;
  readonly startLevel: number;
} {
  return subset.progression.level as { readonly maxLevel: number; readonly startLevel: number };
}

/** One `SessionDungeonRecord` per artifact dungeon (tech note F04 section 2.2): the exact fields
 * `sessionStep` needs to resolve movement-gate area, drop table and level range for that dungeon. */
export function buildDungeonRecord(dungeon: ArtifactDungeon): SessionDungeonRecord {
  return {
    id: dungeon.id,
    verification_mode: dungeon.verification_mode,
    floor_level: dungeon.floor_level,
    level_range: dungeon.level_range,
    drop_table_id: dungeon.drop_table_id,
    geometry: dungeon.geometry as unknown as SessionDungeonRecord['geometry'],
    area_m2: dungeon.area_m2,
    opening_hours: dungeon.opening_hours,
  };
}

export function buildDungeonRecords(
  dungeons: readonly ArtifactDungeon[],
): Readonly<Record<string, SessionDungeonRecord>> {
  const out: Record<string, SessionDungeonRecord> = {};
  for (const dungeon of dungeons) {
    out[dungeon.id] = buildDungeonRecord(dungeon);
  }
  return out;
}

export function buildSessionParams(dungeons: readonly ArtifactDungeon[]): SessionParams {
  return { config: buildSessionConfig(), dungeons: buildDungeonRecords(dungeons) };
}
