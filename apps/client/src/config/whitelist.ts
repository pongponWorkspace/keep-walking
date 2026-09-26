/**
 * The F-04 whitelist (docs/tech/F04-dungeon-presence.md section 15, ADR 0003 section 9.3): the
 * exact top-level subtrees of `config/balance/*.json` the client is allowed to see. Everything
 * else in those files (group C: `coverageFilter`, `safety`, `trustScore`, `raid.*`, ...) must never
 * reach `apps/client`'s source, let alone its bundle.
 *
 * This module is pure (no `fs`, no Vite, no Node-only API) so both the generator script
 * (`apps/client/scripts/generate-config.ts`, a plain Node/tsx CLI) and the Vitest drift guard
 * (`config/generated.test.ts`, which re-reads the committed `config/balance/*.json` files itself)
 * import the identical extraction logic: there is exactly one place that decides what crosses the
 * boundary, not two copies that could drift apart.
 *
 * `config/app/*.json` and `config/content/*.json` are group B/pass-through (tech note 15.2): the
 * client already imports those whole files elsewhere (`config/runtime.ts`, `copy/load.ts`) and
 * this module does not touch them.
 */

export interface Json {
  readonly [key: string]: unknown;
}

/** One `config/balance/<file>` entry: only these top-level keys may leave the file. */
export interface WhitelistEntry {
  readonly file: string;
  readonly namespace: string;
  readonly topLevelKeys: readonly string[];
}

/**
 * Group A (ADR 0003 9.3 / tech note F04 15.1): engine params, gone from the client again once
 * Phase 3 starts (C1-1). Group B balance subtrees the client reads for display only (15.2) are
 * folded in here too, since they are also single named subtrees of a `config/balance/*.json` file
 * (as opposed to `config/app/*.json`, which the client already imports whole).
 *
 * `openingHours` is listed for `dungeons.json` even though the key does not exist yet: P2-F05-T20
 * (systems-designer) adds it later (ADR 0003 5.5, F04 section 8). `pickTopLevelKeys` below silently
 * omits a listed key that is not present in the source file, so nothing here needs to change again
 * when that task lands.
 */
export const BALANCE_WHITELIST: readonly WhitelistEntry[] = [
  {
    file: 'dungeons.json',
    namespace: 'dungeons',
    topLevelKeys: [
      'entry',
      'runState',
      'rewardTick',
      'movementGate',
      'hpSafety',
      'death',
      'exit',
      'emergencyClose',
      'verification',
      'openingHours',
      'levelRange',
    ],
  },
  { file: 'anticheat.json', namespace: 'anticheat', topLevelKeys: ['checkIn', 'speedLock'] },
  {
    file: 'drops.json',
    namespace: 'drops',
    topLevelKeys: [
      'baseChancePerRewardTick_pct',
      'quantityPerDrop',
      'rewardTypeByRarity',
      'multipliers',
      'smallDungeon',
    ],
  },
  {
    file: 'progression.json',
    namespace: 'progression',
    topLevelKeys: [
      'level',
      'expCurve',
      'expMultipliers',
      'baseStats',
      'statPerPoint',
      'hpRecovery',
      'rewardTick',
      'statPoints',
    ],
  },
  {
    file: 'combat.json',
    namespace: 'combat',
    topLevelKeys: ['monsterAttack', 'defense', 'attackCheck', 'levelGapDamage', 'deathProtection'],
  },
  {
    file: 'classes.json',
    namespace: 'classes',
    topLevelKeys: ['roles', 'buffStacking', 'baseCapRule', 'party'],
  },
  { file: 'economy.json', namespace: 'economy', topLevelKeys: ['potions', 'autoPotion'] },
  { file: 'location.json', namespace: 'location', topLevelKeys: ['homeState'] },
  {
    file: 'unlocks.json',
    namespace: 'unlocks',
    topLevelKeys: ['home', 'antiCheatHelp', 'parentalConsent'],
  },
  { file: 'privacy.json', namespace: 'privacy', topLevelKeys: ['minAge_yr', 'minAgeComparison'] },
];

/** Group C names (ADR 0003 9.3 / F04 15.3) that must never appear anywhere in the generated
 * output, spelled out so `generated.test.ts` can grep for them as a second, independent check on
 * top of the allow-list extraction (belt and suspenders: a typo in `BALANCE_WHITELIST` above that
 * accidentally included a group-C key would still be caught here). */
export const FORBIDDEN_ANYWHERE: readonly string[] = [
  'coverageFilter',
  'safety',
  'temporaryDungeon',
  'offlineEvidence',
  'trustScore',
  'outputAudit',
  'raidFailPenalty',
  'classChange',
  'levelGapContribution',
  'positionLogTtl_s',
];

function isPlainObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Keeps only `keys` that exist as own properties of `input`, in `keys` order. Pure, no mutation. */
export function pickTopLevelKeys(input: Json, keys: readonly string[]): Json {
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      out[key] = input[key];
    }
  }
  return out;
}

/**
 * Applies every whitelist entry against `sourcesByFile` (file name -> already-`JSON.parse`d
 * content) and returns one object keyed by `namespace`. Throws if a whitelisted file is missing
 * from `sourcesByFile` (a generator/test wiring bug, not a data problem: every file in
 * `BALANCE_WHITELIST` is expected to exist in `config/balance/`).
 */
export function buildBalanceSubset(sourcesByFile: Readonly<Record<string, unknown>>): Json {
  const out: Record<string, unknown> = {};
  for (const entry of BALANCE_WHITELIST) {
    const source = sourcesByFile[entry.file];
    if (!isPlainObject(source)) {
      throw new Error(`config/whitelist: missing or non-object source for ${entry.file}`);
    }
    out[entry.namespace] = pickTopLevelKeys(source, entry.topLevelKeys);
  }
  return out;
}

/** Recursively sorts object keys so the generated JSON is byte-stable across runs and machines
 * (same reasoning as `tools/dungeons`' deterministic artifact). Arrays keep their order. */
export function stableStringify(value: unknown, indent = 2): string {
  return JSON.stringify(sortKeysDeep(value), null, indent);
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (isPlainObject(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}
