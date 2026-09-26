// Tests for the P2-F05-T01 reference: drop tables per preset (items, potions, multipliers),
// exp per tick, seeded run loop (death vs auto-retreat, source order, shield, R43).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NEUTRAL_CONTEXT, dropRates } from '@keep-walking/shared/formulas';
import { REPO_ROOT, loadBalanceConfig, num } from './config';
import {
  dropTableDef,
  dropTableIds,
  dropTableProblems,
  expectedPerTick,
  itemCatalog,
  lootParamsFromConfig,
  lootTable,
} from './loot';
import { runLoop } from './loop';
import type { Scenario } from './loop-scenarios';
import { CLASSES, loopInput, loopStats } from './loop-scenarios';
import { rollTickLoot } from './rng-contract';
import { presetIds } from './vector-files';

const cfg = loadBalanceConfig();
const lp = lootParamsFromConfig(cfg);
const SECONDS_PER_MINUTE = 60;

const starter = (ownClass: Scenario['ownClass'], extra: Partial<Scenario> = {}): Scenario => ({
  tableId: 'pocketParkDefault',
  smallDungeon: true,
  ownClass,
  level: 1,
  rangeMin: 1,
  rangeMax: 5,
  withPotionDrops: true,
  autoRetreatEnabled: true,
  limit_s: 21600,
  ...extra,
});

describe('drops.json items and dropTables', () => {
  it('pass every consistency rule and cover every preset', () => {
    expect(dropTableProblems(cfg, presetIds())).toEqual([]);
    expect(
      dropTableIds(cfg)
        .map((id) => dropTableDef(cfg, id).preset)
        .sort(),
    ).toEqual([...presetIds()].sort());
  });
  it('icons are the art brief ids (A-P2-F05-T03-3, -5)', () => {
    const items = itemCatalog(cfg);
    expect(items['elementCore']?.icon).toBe('icon.item.mat-essence');
    expect(
      new Set(['equipWeapon', 'equipArmor', 'equipCharm', 'equipBoots'].map((i) => items[i]?.icon))
        .size,
    ).toBe(4);
  });
  it('every nameKey exists in names.th.json except the generic equipment names (handoff)', () => {
    const names = JSON.parse(
      readFileSync(`${REPO_ROOT}config/content/names.th.json`, 'utf8'),
    ) as Record<string, unknown>;
    const missing = Object.values(itemCatalog(cfg))
      .map((it) => it.nameKey)
      .filter((k) => !(k in names));
    expect(missing.every((k) => k.startsWith('equipment.'))).toBe(true);
  });
  it('rarity rolls of a resolved table give exactly dropRates (shared formula)', () => {
    for (const ctx of [
      { ...NEUTRAL_CONTEXT, rangedBuff_pct: null, smallDungeon: true },
      { ...NEUTRAL_CONTEXT, rangedBuff_pct: 17.3, smallDungeon: false },
    ]) {
      const e = expectedPerTick(lootTable(dropTableDef(cfg, 'largeParkDefault'), ctx, lp));
      const r = dropRates(ctx, lp.dp);
      expect(e['elementDust']).toBeCloseTo(r.commonQty, 9);
      expect(e['elementCore']).toBeCloseTo(r.uncommon / 100, 9);
      expect(e['riftStone']).toBeCloseTo(r.rare / 100, 9);
      const equip = ['equipWeapon', 'equipArmor', 'equipCharm', 'equipBoots'];
      expect(equip.reduce((s, id) => s + (e[id] ?? 0), 0)).toBeCloseTo(
        (r.epic + r.legendary) / 100,
        9,
      );
      expect(e['hpSmall']).toBeCloseTo(0.17, 9);
      expect(e['revive']).toBeCloseTo(0.01, 9);
    }
  });
  it('Monte Carlo over the ADR 0003 streams: hpSmall about 1 per 6 ticks, revive about 1 per 100', () => {
    const table = lootTable(dropTableDef(cfg, 'pocketParkDefault'), NEUTRAL_CONTEXT, lp);
    const n = 100000;
    let small = 0;
    let revive = 0;
    for (let i = 0; i < n; i += 1) {
      for (const it of rollTickLoot(7, i, table, 1).items) {
        if (it.id === 'hpSmall') small += it.qty;
        if (it.id === 'revive') revive += it.qty;
      }
    }
    expect(small / n).toBeGreaterThan(0.165);
    expect(small / n).toBeLessThan(0.175);
    expect(revive / n).toBeGreaterThan(0.009);
    expect(revive / n).toBeLessThan(0.011);
  });
});

describe('run loop (spec F05 R10-R21, F06 R06-R31, ADR 0003 6)', () => {
  it('same seed: auto-retreat ON keeps the run bag, OFF dies later and loses it, exp kept', () => {
    const inventory = { hpSmall: 1, revive: 1 };
    const on = runLoop(loopInput(cfg, starter('ranged', { inventory }), 3, true));
    const off = runLoop(
      loopInput(cfg, starter('ranged', { inventory, autoRetreatEnabled: false }), 3, true),
    );
    expect(on.exitReason).toBe('auto_retreat');
    expect(off.exitReason).toBe('death');
    expect(on.kept).toEqual(on.runBag);
    expect(off.kept).toEqual({});
    expect(off.lost).toEqual(off.runBag);
    expect(off.expGained).toBeGreaterThan(0);
    expect(off.inventoryEnd['revive']).toBe(1);
    const onEvents = on.events ?? [];
    expect((off.events ?? []).slice(0, onEvents.length - 1)).toEqual(onEvents.slice(0, -1));
    expect(on.potionsFromRunBag).toBeGreaterThanOrEqual(1);
  });
  it('never dies with auto-retreat on (R-B1), over 2,000 seeds and every class', () => {
    for (const c of CLASSES)
      for (let seed = 1; seed <= 500; seed += 1)
        expect(runLoop(loopInput(cfg, starter(c), seed, false)).exitReason).not.toBe('death');
  });
  it('Magic shield only on granted ticks, replaced not stacked', () => {
    const r = runLoop(loopInput(cfg, starter('magic', { failedTicks: [1, 2] }), 11, true));
    let last = 0;
    for (const e of r.events ?? []) {
      if (e.type === 'tick') {
        if (e.granted) expect(e.shield).toBeGreaterThan(0);
        else expect(e.shield).toBe(last);
        last = e.shield;
      } else last = e.shieldAfter;
    }
  });
  it('R43: level 1, every class, 1-5 dungeon, no potions: median >= 2 x window_s', () => {
    const window_min = (2 * num(cfg.dungeons, 'movementGate.window_s')) / SECONDS_PER_MINUTE;
    for (const c of CLASSES) {
      const input = loopInput(cfg, starter(c, { withPotionDrops: false }), 0, false);
      expect(loopStats(input, 1, 1000).median_min).toBeGreaterThanOrEqual(window_min);
    }
  });
});
