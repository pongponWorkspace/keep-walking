// Focused unit coverage for the F06 HP-engine event mappings added in P2-F06-T08 (the F04-era
// mappings above them already have e2e coverage through the running app; these are new enough,
// and carry enough bucketing logic, to be worth a direct unit test).
import { describe, expect, it } from 'vitest';
import { mapSessionEvent, minutesSinceRunStartBucket } from './f04-events';
import type { SessionEvent } from '@keep-walking/shared/session';

describe('minutesSinceRunStartBucket', () => {
  it('buckets at the documented edges (product/telemetry-events.md section 3)', () => {
    const MS_PER_MIN = 60_000;
    expect(minutesSinceRunStartBucket(0)).toBe('0-15');
    expect(minutesSinceRunStartBucket(14 * MS_PER_MIN)).toBe('0-15');
    expect(minutesSinceRunStartBucket(15 * MS_PER_MIN)).toBe('15-30');
    expect(minutesSinceRunStartBucket(29 * MS_PER_MIN)).toBe('15-30');
    expect(minutesSinceRunStartBucket(30 * MS_PER_MIN)).toBe('30-45');
    expect(minutesSinceRunStartBucket(45 * MS_PER_MIN)).toBe('45-60');
    expect(minutesSinceRunStartBucket(60 * MS_PER_MIN)).toBe('60+');
    expect(minutesSinceRunStartBucket(120 * MS_PER_MIN)).toBe('60+');
  });
});

describe('mapSessionEvent — F06 HP engine events', () => {
  it('run_hp_low: dungeon_id + class, no HP value, no coordinate', () => {
    const event: SessionEvent = {
      type: 'run_hp_low',
      dungeonId: 'baan-phra-athit',
      classId: 'tanker',
      at_ms: 0,
    };
    expect(mapSessionEvent(event, 'tanker')).toEqual({
      name: 'run_hp_low',
      properties: { dungeon_id: 'baan-phra-athit', class: 'tanker' },
    });
  });

  it('run_auto_retreat: dungeon_id + class + minutes_since_run_start_bucket', () => {
    const event: SessionEvent = {
      type: 'run_auto_retreat',
      dungeonId: 'baan-phra-athit',
      classId: 'ranged',
      sinceStart_ms: 20 * 60_000,
      activeTau_ms: 20 * 60_000,
      at_ms: 0,
    };
    expect(mapSessionEvent(event, 'ranged')).toEqual({
      name: 'run_auto_retreat',
      properties: {
        dungeon_id: 'baan-phra-athit',
        class: 'ranged',
        minutes_since_run_start_bucket: '15-30',
      },
    });
  });

  it('run_death: dungeon_id + class, no lost-item detail (that lives on the run summary)', () => {
    const event: SessionEvent = {
      type: 'run_death',
      dungeonId: 'baan-phra-athit',
      classId: 'magic',
      lost: [{ id: 'hpSmall', qty: 2 }],
      at_ms: 0,
    };
    expect(mapSessionEvent(event, 'magic')).toEqual({
      name: 'run_death',
      properties: { dungeon_id: 'baan-phra-athit', class: 'magic' },
    });
  });

  it('run_potion_auto_used: dungeon_id + item_id straight from the event (already an enum id)', () => {
    const event: SessionEvent = {
      type: 'run_potion_auto_used',
      dungeonId: 'baan-phra-athit',
      itemId: 'hpSmall',
      source: 'runBag',
      healed: 30,
      at_ms: 0,
    };
    expect(mapSessionEvent(event, 'support')).toEqual({
      name: 'run_potion_auto_used',
      properties: { dungeon_id: 'baan-phra-athit', item_id: 'hpSmall' },
    });
  });

  it('auto_retreat_setting_changed: enabled only, no dungeon_id (it is a settings-screen action)', () => {
    const event: SessionEvent = { type: 'auto_retreat_setting_changed', enabled: false, at_ms: 0 };
    expect(mapSessionEvent(event, null)).toEqual({
      name: 'auto_retreat_setting_changed',
      properties: { enabled: false },
    });
  });

  it('potion_used maps to inventory_potion_used: item_id + revived, never a dungeon_id', () => {
    const event: SessionEvent = {
      type: 'potion_used',
      itemId: 'revive',
      healed: 0,
      revived: true,
      at_ms: 0,
    };
    expect(mapSessionEvent(event, 'tanker')).toEqual({
      name: 'inventory_potion_used',
      properties: { item_id: 'revive', revived: true },
    });
  });

  it('class_chosen, class_choice_rejected, potion_use_rejected, player_recovered, run_hit: no telemetry event', () => {
    const events: readonly SessionEvent[] = [
      { type: 'class_chosen', classId: 'tanker', at_ms: 0 },
      { type: 'class_choice_rejected', reason: 'already_chosen', at_ms: 0 },
      { type: 'potion_use_rejected', itemId: 'hpSmall', reason: 'run_active', at_ms: 0 },
      { type: 'player_recovered', at_ms: 0 },
      {
        type: 'run_hit',
        dungeonId: 'baan-phra-athit',
        attemptIndex: 1,
        damage: 5,
        shieldAbsorbed: 0,
        hpAfterHit: 95,
        hpAfter: 95,
        maxHp: 100,
        outcome: 'continue',
        at_ms: 0,
      },
    ];
    for (const event of events) {
      expect(mapSessionEvent(event, 'tanker')).toBeUndefined();
    }
  });
});
