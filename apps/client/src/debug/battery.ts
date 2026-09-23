/**
 * Battery percent for the HUD (docs/tech/F02-map-location-spike.md section 10.5, row "แบต"):
 * `navigator.getBattery()` (Battery Status API) where it exists — Android Chrome — and an "จดจาก
 * เครื่อง" ("read from the device") manual-entry path everywhere else, chiefly iOS Safari, which
 * never implemented the API (D-003).
 */

interface BatteryManagerLike {
  readonly level: number;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManagerLike>;
}

export type BatterySource = 'api' | 'manual' | 'none';

export interface BatteryReading {
  readonly pct: number | undefined;
  readonly source: BatterySource;
}

const PERCENT = 100;

/** Reads the Battery Status API when available. Returns `source: 'none'` (not `'manual'`) when it
 * is not — the caller decides whether/how to prompt for a manual reading. */
export async function readBatteryLevel(): Promise<BatteryReading> {
  const nav = navigator as NavigatorWithBattery;
  if (typeof nav.getBattery !== 'function') {
    return { pct: undefined, source: 'none' };
  }
  try {
    const battery = await nav.getBattery();
    return { pct: Math.round(battery.level * PERCENT), source: 'api' };
  } catch {
    return { pct: undefined, source: 'none' };
  }
}

/** Parses a manual entry (e.g. from an `<input type="number">`) into a 0–100 integer, or
 * `undefined` when it is not a valid percent — never throws on bad user input. */
export function parseManualBatteryPct(raw: string): number | undefined {
  if (raw.trim().length === 0) {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > PERCENT) {
    return undefined;
  }
  return Math.round(value);
}
