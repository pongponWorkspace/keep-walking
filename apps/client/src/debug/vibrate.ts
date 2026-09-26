/**
 * `navigator.vibrate` probe button (P2-F04-T10, F-17: "vibrate/web push matrix"). iOS Safari never
 * implements `navigator.vibrate` (D-003, same reasoning as `debug/battery.ts`'s Battery Status API
 * note): this reports "ไม่รองรับ" (via the HUD's `unsupported` result) instead of throwing.
 *
 * `pattern_ms` always arrives from config (CLAUDE.md "no literals"): `client.json#probe`, read
 * once by `config/runtime.ts` and passed in by the caller — this module never hardcodes a
 * vibration length itself.
 */

export interface NavigatorWithVibrate {
  readonly vibrate?: (pattern: number | number[]) => boolean;
}

export interface VibrateResult {
  readonly supported: boolean;
  /** `navigator.vibrate`'s own return value (false = the pattern was rejected, e.g. too long) —
   * only meaningful when `supported` is true. */
  readonly triggered: boolean;
}

export function triggerVibrate(nav: NavigatorWithVibrate, pattern_ms: number): VibrateResult {
  if (typeof nav.vibrate !== 'function') {
    return { supported: false, triggered: false };
  }
  return { supported: true, triggered: nav.vibrate(pattern_ms) };
}
