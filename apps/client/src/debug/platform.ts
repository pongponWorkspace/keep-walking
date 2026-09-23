/**
 * Coarse platform detection for the summary CSV's `platform` column (gps-trace-format.md 4.1:
 * `android-chrome` · `ios-safari` · `other` — "จาก UA แบบกว้าง"). Never anything more specific: no
 * device model, no full user agent string (config/app/privacy.json summaryExport guard rail).
 */
export type SummaryPlatform = 'android-chrome' | 'ios-safari' | 'other';

export function detectPlatform(userAgent: string): SummaryPlatform {
  if (/Android/.test(userAgent) && /Chrome/.test(userAgent)) {
    return 'android-chrome';
  }
  const isIos = /iPhone|iPad|iPod/.test(userAgent);
  const isOtherIosBrowser = /CriOS|FxiOS/.test(userAgent);
  if (isIos && /Safari/.test(userAgent) && !isOtherIosBrowser) {
    return 'ios-safari';
  }
  return 'other';
}
