/**
 * The one place every `#/...` hash this app recognises is named and parsed (tech note
 * docs/tech/F10-account-shell.md section 4, A-P2-F10-T12-1: "แทน `routeFromHash` ใน `f04-app.ts`").
 * Pure: no `window`, no DOM — `f04-app.ts` reads `window.location.hash` once per call and passes
 * the string in here.
 *
 * `Route` is a code identifier, not copy (tech note 4.1: "ชื่อ route เป็น identifier ของโค้ด ไม่ใช่
 * ถือคำ"); the Thai text for each screen comes from `copy.th.json` the same way every other screen
 * in this app already does.
 */
import type { OnboardingStep } from '../onboarding/onboarding-step';

export type Route =
  | 'main'
  | 'login'
  | 'loginEmail'
  | 'register'
  | 'forgot'
  | 'createCharacter'
  | 'story'
  | 'upgrade'
  | 'shop'
  | 'party'
  | 'inventory'
  | 'settingsMenu'
  | 'settingsWalkingSafety'
  | 'settingsPrivacy'
  | 'settingsCredits';

/** Table 4.1's hash column, in parse-order (first match wins — `#/login/email` must be checked
 * before the plainer `#/login` prefix it starts with). */
const ROUTE_PREFIXES: readonly (readonly [string, Route])[] = [
  ['#/settings/walking-safety', 'settingsWalkingSafety'],
  ['#/settings/privacy', 'settingsPrivacy'],
  ['#/settings/credits', 'settingsCredits'],
  ['#/settings', 'settingsMenu'],
  ['#/inventory', 'inventory'],
  ['#/login/email', 'loginEmail'],
  ['#/login', 'login'],
  ['#/register', 'register'],
  ['#/forgot', 'forgot'],
  ['#/create-character', 'createCharacter'],
  ['#/story', 'story'],
  ['#/upgrade', 'upgrade'],
  ['#/shop', 'shop'],
  ['#/party', 'party'],
];

/** `true` when `hash` is exactly `prefix`, or `prefix` followed by `/...` (`#/story/1`) — never a
 * bare string-prefix match, so `#/shopx` does not accidentally parse as `#/shop` (table 4.1's own
 * "`#/shopx`" test case). */
function matchesRoutePrefix(hash: string, prefix: string): boolean {
  return hash === prefix || hash.startsWith(`${prefix}/`);
}

/** `#/story/9`, `#/story/abc`, `#/shopx`, an empty hash, or anything else unrecognised all parse as
 * `'main'` (table 4.1's own test list) — `resolveRoute` below is what actually redirects a *valid*
 * route that the current step/run state does not allow yet; this function only ever names what the
 * URL literally says. */
export function parseRoute(hash: string): Route {
  for (const [prefix, route] of ROUTE_PREFIXES) {
    if (matchesRoutePrefix(hash, prefix)) return route;
  }
  return 'main';
}

/** Section 4.1's own hash for each route (`parseRoute`'s inverse) — used to normalise the address
 * bar with `history.replaceState`/`pushState` without hand-typing a literal hash string at each
 * call site. `main` has no hash of its own (section 4.1: "ตั้งเป็น `#/` ด้วย `history.replaceState`"). */
export const ROUTE_HASH: Readonly<Record<Route, string>> = {
  main: '',
  login: '#/login',
  loginEmail: '#/login/email',
  register: '#/register',
  forgot: '#/forgot',
  createCharacter: '#/create-character',
  story: '#/story/1',
  upgrade: '#/upgrade',
  shop: '#/shop',
  party: '#/party',
  inventory: '#/inventory',
  settingsMenu: '#/settings',
  settingsWalkingSafety: '#/settings/walking-safety',
  settingsPrivacy: '#/settings/privacy',
  settingsCredits: '#/settings/credits',
};

/** Table 4.1's "ใช้ได้เมื่อ shell พร้อม" column, split from the login family (which also needs its
 * own sub-routes) — every route reachable only once onboarding is fully done. */
const SHELL_ONLY_ROUTES: ReadonlySet<Route> = new Set([
  'upgrade',
  'shop',
  'party',
  'inventory',
  'settingsMenu',
  'settingsWalkingSafety',
  'settingsPrivacy',
  'settingsCredits',
]);

/** Every onboarding-only route (section 4.2 item 3: "shell พร้อม -> route ของ onboarding ที่ผ่านแล้ว
 * ... -> `#/`"). */
const ONBOARDING_ROUTES: ReadonlySet<Route> = new Set([
  'login',
  'loginEmail',
  'register',
  'forgot',
  'createCharacter',
  'story',
]);

const LOGIN_FAMILY: ReadonlySet<Route> = new Set(['login', 'loginEmail', 'register', 'forgot']);

/** Table 4.1/4.2: which route a not-yet-done onboarding step forces. Steps with no route of their
 * own (`intro`/`age`/`underage`/`consent`/`permission`) are absent — `resolveRoute` falls back to
 * `'main'` for all of them (section 4.1: "URL ขณะอยู่ขั้นเหล่านี้ถูกตั้งเป็น `#/`"). */
const ROUTE_FOR_STEP: Readonly<Partial<Record<OnboardingStep, Route>>> = {
  login: 'login',
  character: 'createCharacter',
  story: 'story',
};

export interface ResolveRouteInput {
  readonly step: OnboardingStep;
  /** `isShellReady(input)` from `onboarding/onboarding-step.ts` — passed in rather than
   * recomputed here so this module never needs the full `OnboardingStepInput` shape. */
  readonly shellReady: boolean;
  /** A run in progress (or its summary still open) — section 4.2 item 1: every route except the
   * settings family and inventory bounces back to whatever the run screen itself is showing
   * (outside this module's own `Route` union; the caller renders that screen, not a route). */
  readonly runActive: boolean;
}

/**
 * The single guard every deep link, reload, and in-app nav tap goes through (section 4.2,
 * replacing `f04-app.ts`'s previous ad hoc `routeFromHash`-only check) — pure, so every row of the
 * table is a direct unit test, no DOM/hash parsing involved.
 */
export function resolveRoute(requested: Route, input: ResolveRouteInput): Route {
  if (input.runActive) {
    return SHELL_ONLY_ROUTES.has(requested) ? requested : 'main';
  }
  if (!input.shellReady) {
    const forced = ROUTE_FOR_STEP[input.step];
    if (forced === undefined) return 'main';
    if (forced === 'login') {
      return LOGIN_FAMILY.has(requested) ? requested : 'login';
    }
    return requested === forced ? requested : forced;
  }
  return ONBOARDING_ROUTES.has(requested) ? 'main' : requested;
}
