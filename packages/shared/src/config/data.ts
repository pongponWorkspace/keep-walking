// Static config data (ADR 0003 section 9.3: the server/engine reads full files; only apps/client
// whitelists keys through its own build step). `resolveJsonModule` (tsconfig.base.json) turns
// these into plain imports, so `src/config` never touches `node:fs` and stays runnable in a
// Worker (packages/shared/tsconfig.json has no Node types on purpose).
import anticheat from '../../../../config/balance/anticheat.json';
import classes from '../../../../config/balance/classes.json';
import combat from '../../../../config/balance/combat.json';
import drops from '../../../../config/balance/drops.json';
import dungeons from '../../../../config/balance/dungeons.json';
import economy from '../../../../config/balance/economy.json';
import enhance from '../../../../config/balance/enhance.json';
import equipment from '../../../../config/balance/equipment.json';
import location from '../../../../config/balance/location.json';
import balancePrivacy from '../../../../config/balance/privacy.json';
import progression from '../../../../config/balance/progression.json';
import raid from '../../../../config/balance/raid.json';
import unlocks from '../../../../config/balance/unlocks.json';
import appClient from '../../../../config/app/client.json';
import appPrivacy from '../../../../config/app/privacy.json';
import telemetry from '../../../../config/app/telemetry.json';
import type { JsonObject } from './json';

/** One entry per file in config/balance/ (namespace "balance", ADR 0003 P2-F05-T02 TL B-06). */
export const BALANCE_FILES = [
  'anticheat',
  'classes',
  'combat',
  'drops',
  'dungeons',
  'economy',
  'enhance',
  'equipment',
  'location',
  'privacy',
  'progression',
  'raid',
  'unlocks',
] as const;
export type BalanceFileName = (typeof BALANCE_FILES)[number];

/** One entry per file in config/app/ (namespace "app": on-device rules, not PDPA server values). */
export const APP_FILES = ['client', 'privacy', 'telemetry'] as const;
export type AppFileName = (typeof APP_FILES)[number];

/**
 * balance.privacy (config/balance/privacy.json, positionLogTtl_s/minAge_yr, server PDPA values)
 * and app.privacy (config/app/privacy.json, on-device export/logging rules) are different files
 * with the same short name: the namespace prefix is what keeps a path unambiguous, never the
 * file name alone (config/balance/privacy.json _note; config/app/privacy.json _note).
 */
export const BALANCE_CONFIG_DATA: Readonly<Record<BalanceFileName, JsonObject>> = {
  anticheat: anticheat as JsonObject,
  classes: classes as JsonObject,
  combat: combat as JsonObject,
  drops: drops as JsonObject,
  dungeons: dungeons as JsonObject,
  economy: economy as JsonObject,
  enhance: enhance as JsonObject,
  equipment: equipment as JsonObject,
  location: location as JsonObject,
  privacy: balancePrivacy as JsonObject,
  progression: progression as JsonObject,
  raid: raid as JsonObject,
  unlocks: unlocks as JsonObject,
};

export const APP_CONFIG_DATA: Readonly<Record<AppFileName, JsonObject>> = {
  client: appClient as JsonObject,
  privacy: appPrivacy as JsonObject,
  telemetry: telemetry as JsonObject,
};
