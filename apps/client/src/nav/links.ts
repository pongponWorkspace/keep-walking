/**
 * External navigation deep links (tech note F04 section 14, F04-R37/R38/R39, D-089 condition A-3):
 * destination only, walking mode, no API key, no player position anywhere in the URL. The only
 * two link shapes this workspace is allowed to build — never add a third parameter to either.
 */

export type NavTarget = 'google_maps' | 'apple_maps';

const DECIMALS = 5;

function round(value: number): number {
  return Number(value.toFixed(DECIMALS));
}

/** Android/most browsers: Google Maps URL, walking mode, no origin (uses the device's own
 * current-location prompt), no key. */
export function googleMapsWalkingUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${round(lat)},${round(lng)}`,
    travelmode: 'walking',
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** iOS Safari: Apple Maps URL scheme, `dirflg=w` = walking, no `saddr`. */
export function appleMapsWalkingUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({ daddr: `${round(lat)},${round(lng)}`, dirflg: 'w' });
  return `https://maps.apple.com/?${params.toString()}`;
}

/** tech note 14.1: iOS = UA contains iPhone/iPad/iPod, or (Macintosh AND multi-touch — iPadOS 13+
 * reports as Mac). Everything else defaults to Google (Android, desktop, unknown). */
export function isIosLike(userAgent: string, maxTouchPoints: number): boolean {
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    return true;
  }
  const MIN_TOUCH_POINTS_FOR_IPADOS = 1;
  return /Macintosh/.test(userAgent) && maxTouchPoints > MIN_TOUCH_POINTS_FOR_IPADOS;
}

export function primaryNavTarget(userAgent: string, maxTouchPoints: number): NavTarget {
  return isIosLike(userAgent, maxTouchPoints) ? 'apple_maps' : 'google_maps';
}

export function navUrlFor(target: NavTarget, lat: number, lng: number): string {
  return target === 'apple_maps' ? appleMapsWalkingUrl(lat, lng) : googleMapsWalkingUrl(lat, lng);
}

/** Every allowed query key for each link shape (test hook + tech note 14.1's own acceptance:
 * "URL มีเฉพาะ key api, destination, travelmode หรือ daddr, dirflg"). */
export const ALLOWED_QUERY_KEYS: Readonly<Record<NavTarget, readonly string[]>> = {
  google_maps: ['api', 'destination', 'travelmode'],
  apple_maps: ['daddr', 'dirflg'],
};

/** True when `url` carries only the allowed keys for `target` and the coordinate matches
 * `nav_destination` (never the player's own position, R37). Used by this module's own tests and
 * by e2e (handoff to qa-tester, P2-F04-T22). */
export function isSafeNavUrl(url: string, target: NavTarget, lat: number, lng: number): boolean {
  const parsed = new URL(url);
  const keys = [...parsed.searchParams.keys()];
  const allowed = ALLOWED_QUERY_KEYS[target];
  if (keys.length !== allowed.length || !keys.every((k) => allowed.includes(k))) {
    return false;
  }
  const coordKey = target === 'apple_maps' ? 'daddr' : 'destination';
  return parsed.searchParams.get(coordKey) === `${round(lat)},${round(lng)}`;
}
