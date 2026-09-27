/**
 * The exact event names `product/telemetry-events.md` defines (D-088: "ชื่อและ property ต้องตรง
 * product/telemetry-events.md ทุกตัว ... ชื่อที่ไม่รู้จัก = ไม่เก็บ + warning ใน dev"). This is the
 * one place `telemetry/sink.ts`'s `record()` calls check a name against; `known-events.test.ts`
 * re-parses the doc's own `### \`event_name\`` headings so an event the product-manager adds or
 * renames there is caught here as a (fixable) failing test rather than silently staying unknown to
 * every future `record()` call.
 *
 * Property-level shape per event (which fields each one carries) is the mapper's job
 * (P2-F04-T17/T21, "อยู่ใน apps/client/src/telemetry/"), once the UI/engine call sites that fire
 * these actually exist; this task only builds the sink they will call into.
 */
export const KNOWN_EVENT_NAMES: ReadonlySet<string> = new Set([
  'onboarding_funnel_step',
  'onboarding_first_reward_granted',
  'onboarding_nearest_dungeon_distance',
  'onboarding_empty_screen_shown',
  'onboarding_empty_screen_abandoned',
  'interest_registered_outside_area',
  'local_data_cleared',
  // P2-X23 (D-116, closes A-P2-X16-1): the withdraw-consent flow (F06 tech note 8.4) is not yet
  // wired to a call site (that lands with the settings/consent screen build) — declared here now
  // so `known-events.test.ts`'s doc-vs-set drift check stays green as the doc adds new events.
  'location_consent_withdrawn',
  'dungeon_confirm_shown',
  'checkin_rejected',
  'dungeon_entered',
  'dungeon_exited',
  'run_state_changed',
  'dungeon_closing_soon_notified',
  'navigation_link_opened',
  'run_tick_granted',
  'run_tick_denied',
  'run_hp_low',
  'run_auto_retreat',
  'run_death',
  'auto_retreat_setting_changed',
  'run_potion_auto_used',
  'anticheat_speed_lock_triggered',
  'session_state_discarded',
  'storage_quota_exceeded',
  'run_gps_status_changed',
  'dungeon_report_submitted',
  'party_formed',
  'economy_gold_earned',
  'economy_gold_spent',
  'economy_potion_price_observed',
  'market_trade_completed',
  'player_level_up',
  'loot_rarity_received',
  'battery_sample',
  'wake_lock_state_changed',
]);
