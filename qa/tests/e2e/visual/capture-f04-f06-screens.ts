// P2-H41 (visual gate finding V-36, art/reviews/F04-F06-visual-gate.md section 5.1): captures the
// 26 named PNGs of the whole F04-F06 loop at 390x844, Mock provider, real client build (HEAD
// b1dee22 + the in-flight working tree), through the real public UI only (query params / hash
// routes / real taps — the same surface a player or an e2e spec uses, never a direct DOM/engine
// poke). A plain script (like qa/reports/F02/map-style/capture-screenshots.spec.ts), not a
// `*.spec.ts` under playwright.config.ts's testMatch — each screen needs its own bespoke sequence
// of taps/waits, which does not fit `test()`'s one-assertion-per-case shape.
//
// Every trace used is either a committed e2e-only fixture (`apps/client/e2e/fixtures/*.trace.
// json`) or a QA-authored trace already committed under `data/gps-traces/qa/*.trace.json` (owned
// by qa-tester, README section 3) — this task's own `writes` do not include either of those
// directories, so no new trace was added for this pass; two screens could not be reached with the
// committed set and are recorded as such (see `UNREACHABLE` below and the README this script also
// writes).
//
// Prerequisite (same as the map-style capture script): `pnpm --filter @keep-walking/client build
// && pnpm --filter @keep-walking/client preview` (port 4173) already running.
//
// Run: pnpm exec tsx qa/tests/e2e/visual/capture-f04-f06-screens.ts
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, devices } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { screenshotWithBudget, toGrayscalePng } from './image-utils';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..');
const OUT_DIR = join(REPO_ROOT, 'art/reviews/screens/F04-F06');
const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4173';

// Same "guaranteed-missing, local, same-origin" convention as apps/client/e2e/f06-hp.spec.ts's own
// `TILE_OVERRIDE` / map-shell.spec.ts's `spikeUrl` — every screen here is about UI chrome (V-30 to
// V-34), never about basemap fidelity (that is the separate S1-S6 set / this task's own S5
// re-shoot script), and TL-S11 forbids any e2e page from downloading a real tile. The map behind
// every screen below therefore honestly shows the "tiles URL missing" fallback text, same as it
// would on a machine with no VITE_TILES_URL configured.
const MISSING = '/e2e-fixtures/does-not-exist';
const TILE_PARAMS =
  `e2eTilesUrl=${encodeURIComponent(`pmtiles://${BASE_URL}${MISSING}.pmtiles`)}` +
  `&e2eGlyphsUrl=${encodeURIComponent(`${BASE_URL}${MISSING}/glyphs/{fontstack}/{range}.pbf`)}` +
  `&e2eSpriteUrl=${encodeURIComponent(`${BASE_URL}${MISSING}/sprites/v4/light`)}`;

const DEVICE = devices['Pixel 7'];
const VIEWPORT = { width: 390, height: 844 };

const FIXTURES_DIR = join(REPO_ROOT, 'apps/client/e2e/fixtures');

function url(params: string): string {
  return `${BASE_URL}/?${params}&${TILE_PARAMS}`;
}

/** Deletes `Navigator.prototype.wakeLock` (pocket-screen.spec.ts's own "path B" convention) so a
 * capture that is not specifically about the pocket screen never has its run screen covered by the
 * dark overlay. */
async function forceWakeLockUnsupported(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
    delete (Navigator.prototype as any).wakeLock;
  });
}

async function forceWakeLockSupported(page: Page): Promise<void> {
  await page.addInitScript(() => {
    function makeSentinel(): {
      release: () => Promise<void>;
      addEventListener: (type: string, cb: () => void) => void;
    } {
      return { addEventListener: () => undefined, release: async () => undefined };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for this
    (window.navigator as any).wakeLock = { request: async () => makeSentinel() };
  });
}

async function hideDebugHud(page: Page): Promise<void> {
  await page.evaluate(() => {
    const panel = document.getElementById('hud-panel');
    if (panel !== null) panel.style.display = 'none';
  });
}

interface ScreenResult {
  readonly id: string;
  readonly ok: boolean;
  readonly bytes?: number;
  readonly grayBytes?: number;
  readonly reachedVia?: string;
  readonly notReachedReason?: string;
}

interface Reached {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly reachedVia: string;
}
interface NotReached {
  readonly reason: string;
}
type Outcome = Reached | NotReached;
function isReached(o: Outcome): o is Reached {
  return 'page' in o;
}

async function newCtxPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    ...DEVICE,
    viewport: VIEWPORT,
    locale: 'th-TH',
  });
  const page = await context.newPage();
  return { context, page };
}

const START_LEELAWADEE = '2026-10-02T12:00'; // Friday, inside leelawadee-lawn's daily 05:00-21:00
const START_KOA_OPEN = '2026-10-02T17:00'; // Friday 17:00, inside khlong-ong-ang's Fri-Su 16-22
const START_MONDAY_CLOSED = '2026-09-28T12:00'; // Monday, khlong-ong-ang closed Mon-Thu

const FULL_RUN =
  'loc=mock&trace=e2e-full-run-01&loop=0&e2eClassId=tanker&seed=1&e2eSkipOnboarding=1';
const ONBOARDING = 'loc=mock&trace=e2e-onboarding-01&loop=0&seed=1';

/** Small poll helper: retries `check()` (a DOM read via `page.evaluate`) until it returns a
 * truthy value or `timeoutMs` elapses, sleeping `stepMs` between tries — used instead of
 * Playwright's own `locator.waitFor` throughout this script because several screens are
 * identified by *combinations* of several elements' state (e.g. "confirm popup visible AND its
 * status text is the poor-accuracy line"), not by one selector becoming visible. */
async function pollUntil<T>(
  page: Page,
  check: () => Promise<T | undefined>,
  timeoutMs: number,
  stepMs = 300,
): Promise<T | undefined> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value !== undefined) return value;
    if (Date.now() > deadline) return undefined;
    await page.waitForTimeout(stepMs);
  }
}

// --- 01: home panel, far state ---------------------------------------------------------------
async function reach01MapFar(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await page.goto(
    url(
      `loc=mock&trace=qa-home-states-walk-01&speed=60&loop=0&e2eClassId=tanker&e2eSkipOnboarding=1&start=${encodeURIComponent(START_LEELAWADEE)}`,
    ),
  );
  const found = await pollUntil(
    page,
    async () =>
      page.evaluate(() => {
        const title = document.querySelector('.home-panel-title')?.textContent ?? '';
        return title === '' ? undefined : title;
      }),
    15_000,
  );
  if (found === undefined) return { reason: 'home-panel never showed a title' };
  return { context, page, reachedVia: `qa-home-states-walk-01 speed=60, title="${found}"` };
}

// --- 02: nav panel, approaching an open dungeon (state near, popup not open yet) --------------
async function reach02MapNearNav(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await page.goto(url(`${FULL_RUN}&speed=1&start=${encodeURIComponent(START_LEELAWADEE)}`));
  const found = await pollUntil(
    page,
    async () =>
      page.evaluate(() => {
        const nav = document.querySelector('.nav-panel');
        const popup = document.querySelector('.popup-overlay:has(.confirm-title)');
        const chip = document.querySelector('.chip-distance')?.textContent ?? '';
        const ok =
          nav !== null &&
          !(nav as HTMLElement).hidden &&
          chip !== '' &&
          (popup === null || (popup as HTMLElement).hidden);
        return ok ? chip : undefined;
      }),
    15_000,
    150,
  );
  if (found === undefined)
    return {
      reason: 'nav-panel with a distance chip never appeared before the confirm popup opened',
    };
  return { context, page, reachedVia: `e2e-full-run-01 speed=1, chip="${found}"` };
}

// --- 03: nav panel fallback popup (tap "เปิดแอปแผนที่" / fallback link) ------------------------
async function reach03NavFallback(browser: Browser): Promise<Outcome> {
  const near = await reach02MapNearNav(browser);
  if (!isReached(near)) return { reason: `nav-panel (prerequisite) not reached: ${near.reason}` };
  const { page } = near;
  const link = page.locator('.nav-fallback-open-link');
  const visible = await link.isVisible().catch(() => false);
  if (!visible) return { reason: '.nav-fallback-open-link not visible on the nav panel' };
  await link.click();
  const shown = await pollUntil(
    page,
    async () =>
      page.evaluate(() => {
        const overlays = [...document.querySelectorAll('.popup-overlay')].filter(
          (el) => el.querySelector('.nav-return-before-arrive') !== null,
        );
        const el = overlays[0];
        return el !== undefined && !(el as HTMLElement).hidden ? true : undefined;
      }),
    5_000,
    100,
  );
  if (shown === undefined)
    return { reason: 'fallback popup never opened after clicking nav-fallback-open-link' };
  return {
    context: near.context,
    page,
    reachedVia: 'e2e-full-run-01, clicked .nav-fallback-open-link',
  };
}

async function readConfirm(page: Page): Promise<{
  hidden: boolean;
  title: string;
  status: string;
  enterDisabled: boolean | null;
}> {
  return page.evaluate(() => {
    const overlay = document.querySelector('.popup-overlay:has(.confirm-title)');
    const enterBtn = overlay?.querySelector('.btn.btn-primary') as HTMLButtonElement | null;
    return {
      hidden: overlay === null ? true : Boolean((overlay as HTMLElement).hidden),
      title: document.querySelector('.confirm-title')?.textContent ?? '',
      status: document.querySelector('.checkin-status-text')?.textContent ?? '',
      enterDisabled:
        enterBtn === null || enterBtn === undefined ? null : (enterBtn.disabled ?? null),
    };
  });
}

// --- 04: confirm popup, B1 waiting (poor GPS accuracy blocks check-in) ------------------------
async function reach04ConfirmB1Wait(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await page.goto(
    url(
      `loc=mock&trace=qa-e2e-leelawadee-poor-accuracy-01&speed=5&loop=0&e2eClassId=tanker&e2eSkipOnboarding=1&start=${encodeURIComponent(START_LEELAWADEE)}`,
    ),
  );
  const found = await pollUntil(
    page,
    async () => {
      const st = await readConfirm(page);
      return !st.hidden && st.status !== '' ? st.status : undefined;
    },
    45_000,
  );
  if (found === undefined)
    return { reason: 'confirm popup with a blocking check-in status line never appeared' };
  return {
    context,
    page,
    reachedVia: `qa-e2e-leelawadee-poor-accuracy-01 speed=5, status="${found}"`,
  };
}

// --- 05: confirm popup, B1 ready ("เข้า" enabled, not yet tapped) ------------------------------
async function reach05ConfirmB1Ready(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await page.goto(url(`${FULL_RUN}&speed=60&start=${encodeURIComponent(START_LEELAWADEE)}`));
  const found = await pollUntil(
    page,
    async () => {
      const st = await readConfirm(page);
      return !st.hidden && st.enterDisabled === false ? st.title : undefined;
    },
    20_000,
    200,
  );
  if (found === undefined)
    return { reason: 'confirm popup with an enabled "เข้า" button never appeared' };
  return { context, page, reachedVia: `e2e-full-run-01 speed=60, title="${found}"` };
}

// --- 06: confirm popup, B2 overlap, a card selected --------------------------------------------
// UNREACHABLE with the committed data set — see README "screens not reached".
function reach06ConfirmB2Overlap(): Outcome {
  return {
    reason:
      'no two published dungeons in data/dungeons/dungeons.json actually overlap geometrically ' +
      '(pahurat-market and khlong-ong-ang share a bounding box, but a point-in-polygon grid check ' +
      'over their bbox intersection found zero shared points — checked by this task, see README); ' +
      "this task's own `writes` do not include data/dungeons or data/gps-traces, and there is no " +
      'client-side test hook to inject a second synthetic candidate into a real confirm popup for ' +
      'a black-box (real app) capture the way the map-style script injects sample GeoJSON into the ' +
      'map layer.',
  };
}

// --- 07: confirm popup, closed (khlong-ong-ang on a Monday) ------------------------------------
async function reach07ConfirmClosed(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await page.goto(
    url(
      `loc=mock&trace=qa-e2e-khlong-ong-ang-closed-01&speed=10&loop=0&e2eClassId=tanker&e2eSkipOnboarding=1&start=${encodeURIComponent(START_MONDAY_CLOSED)}`,
    ),
  );
  const found = await pollUntil(
    page,
    async () => {
      const st = await readConfirm(page);
      return !st.hidden && st.title !== '' ? st.title : undefined;
    },
    15_000,
  );
  if (found === undefined) return { reason: 'confirm popup with the closed title never appeared' };
  return {
    context,
    page,
    reachedVia: `qa-e2e-khlong-ong-ang-closed-01, start=Monday, title="${found}"`,
  };
}

async function clickEnter(page: Page, timeoutMs = 20_000): Promise<boolean> {
  const found = await pollUntil(
    page,
    async () => {
      const st = await readConfirm(page);
      return !st.hidden && st.enterDisabled === false ? true : undefined;
    },
    timeoutMs,
    200,
  );
  if (found === undefined) return false;
  await page.click('.popup-overlay:has(.confirm-title) .btn.btn-primary');
  return true;
}

// --- 08: run screen, Active -------------------------------------------------------------------
async function reach08RunActive(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockUnsupported(page); // pocket screen must not cover the run bar (P2-F06-T14 convention)
  await page.goto(url(`${FULL_RUN}&speed=60&start=${encodeURIComponent(START_LEELAWADEE)}`));
  if (!(await clickEnter(page))) return { reason: 'confirm popup never became enterable' };
  const visible = await page
    .locator('.run-bar')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) return { reason: '.run-bar never appeared after entering' };
  const pill = await page
    .locator('.run-state-pill-label')
    .textContent()
    .catch(() => null);
  return { context, page, reachedVia: `e2e-full-run-01, entered, pill="${pill ?? ''}"` };
}

// --- 09: run screen, Grace (walked outside the polygon while active) ---------------------------
async function reach09RunGrace(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockUnsupported(page);
  await page.goto(
    url(
      `loc=mock&trace=qa-e2e-leelawadee-checkin-01&speed=10&loop=0&e2eClassId=tanker&e2eSkipOnboarding=1&start=${encodeURIComponent(START_LEELAWADEE)}`,
    ),
  );
  if (!(await clickEnter(page, 15_000)))
    return { reason: 'confirm popup never became enterable (qa-e2e-leelawadee-checkin-01)' };
  const found = await pollUntil(
    page,
    async () =>
      page.evaluate(() => {
        const runBar = document.querySelector('.run-bar');
        if (runBar === null || (runBar as HTMLElement).hidden) return undefined;
        const label = document.querySelector('.run-state-pill-label')?.textContent ?? '';
        return label !== 'อยู่ในเขต' && label !== '' ? label : undefined;
      }),
    45_000,
    250,
  );
  if (found === undefined)
    return {
      reason:
        'run-state pill never left the Active label (never entered Grace) within the trace window',
    };
  return { context, page, reachedVia: `qa-e2e-leelawadee-checkin-01, pill="${found}"` };
}

// --- 10: granted-tick toast (loot) --------------------------------------------------------------
async function reach10ToastTickLoot(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockUnsupported(page);
  await page.goto(url(`${FULL_RUN}&speed=60&start=${encodeURIComponent(START_LEELAWADEE)}`));
  if (!(await clickEnter(page))) return { reason: 'confirm popup never became enterable' };
  const shown = await page
    .locator('.toast:has(.toast-line):not(.faded)')
    .waitFor({ state: 'visible', timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: 'granted-tick toast never appeared' };
  return { context, page, reachedVia: 'e2e-full-run-01, granted-tick toast' };
}

// --- 11: denied-tick toast (movement gate not met on an evaluated window) ----------------------
// UNREACHABLE with the committed data set — see README "screens not reached".
function reach11ToastTickDenied(): Outcome {
  return {
    reason:
      'every committed real-dungeon e2e fixture either grants exactly one tick and ends before a ' +
      'second reward window matures (e2e-full-run-01, e2e-onboarding-01: ~340s active, one 300s ' +
      'window) or ends in death/auto-retreat within the first ~200s, before any 300s reward window ' +
      'evaluates at all (e2e-f06-koa-run-01) — checked by running both through the real client and ' +
      'watching for `.toast.faded` (this task, see README). Traces that do sit still/underwalk long ' +
      'enough to fail a reward window (qa-gate-still-01, qa-gate-boundary-01, etc.) all walk a ' +
      'synthetic engine-level test rectangle with no matching committed dungeon polygon, so they ' +
      'never reach a real confirm popup/run screen. Requesting a dedicated fixture (an active run in ' +
      'a real, already-open dungeon that stays put/underwalks through one whole ' +
      'rewardTick.rewardTickInterval_s window) is a trace request to location-engineer, not ' +
      "something this task's own writes (art/reviews/screens, qa/tests/e2e/visual) can add.",
  };
}

// --- 12: HP low (danger zone, right before auto-retreat ends the run) --------------------------
async function reach12HpLow(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockUnsupported(page);
  await page.goto(
    url(
      `loc=mock&trace=e2e-f06-koa-run-01&speed=60&loop=0&e2eClassId=tanker&seed=5&e2eSkipOnboarding=1&start=${encodeURIComponent(START_KOA_OPEN)}`,
    ),
  );
  if (!(await clickEnter(page, 30_000)))
    return { reason: 'confirm popup never became enterable (koa-run)' };
  const found = await pollUntil(
    page,
    async () =>
      page.evaluate(() => {
        const summary = document.querySelector('.run-summary');
        const summaryUp = summary !== null && !(summary as HTMLElement).hidden;
        const text = document.querySelector('.hp-percent')?.textContent ?? '';
        const pct = Number(text.replace('%', ''));
        return !summaryUp && Number.isFinite(pct) && pct > 0 && pct <= 30 ? text : undefined;
      }),
    30_000,
    15,
  );
  if (found === undefined)
    return {
      reason:
        'hp-percent never rendered a value in (0%, 30%] before the run ended (single-hit damage model, seed=5/tanker chosen for this)',
    };
  return { context, page, reachedVia: `e2e-f06-koa-run-01 seed=5 tanker, hp="${found}"` };
}

// --- 13: pocket screen overlay -------------------------------------------------------------------
async function reach13Pocket(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockSupported(page);
  await page.goto(url(`${FULL_RUN}&speed=60&start=${encodeURIComponent(START_LEELAWADEE)}`));
  if (!(await clickEnter(page))) return { reason: 'confirm popup never became enterable' };
  const shown = await page
    .locator('.pocket-screen')
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.pocket-screen overlay never appeared' };
  return { context, page, reachedVia: 'e2e-full-run-01, Wake Lock forced supported' };
}

// --- 14: speed-lock overlay ----------------------------------------------------------------------
async function reach14SpeedLock(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await page.goto(
    url(
      `loc=mock&trace=synthetic-driving-40kmh-01&speed=10&loop=0&e2eClassId=tanker&e2eSkipOnboarding=1&start=${encodeURIComponent(START_LEELAWADEE)}`,
    ),
  );
  const shown = await page
    .locator('.overlay-speedlock')
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.overlay-speedlock never appeared' };
  return {
    context,
    page,
    reachedVia:
      'synthetic-driving-40kmh-01 speed=10 (global anti-cheat overlay, no dungeon needed)',
  };
}

async function waitRunSummary(page: Page, timeoutMs = 45_000): Promise<boolean> {
  return page
    .locator('.run-summary')
    .waitFor({ state: 'visible', timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);
}

// --- 15: run summary, manual exit (normal) -------------------------------------------------------
async function reach15SummaryNormal(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockUnsupported(page);
  await page.goto(url(`${FULL_RUN}&speed=60&start=${encodeURIComponent(START_LEELAWADEE)}`));
  if (!(await clickEnter(page))) return { reason: 'confirm popup never became enterable' };
  const toastShown = await page
    .locator('.toast:has(.toast-line):not(.faded)')
    .waitFor({ state: 'visible', timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  if (!toastShown) return { reason: 'granted-tick toast never appeared before exiting' };
  await page.click('.run-exit-button');
  await page.click('.run-bar .btn-danger-confirm');
  if (!(await waitRunSummary(page, 10_000)))
    return { reason: '.run-summary never appeared after manual exit' };
  const header = await page
    .locator('.run-summary-header')
    .textContent()
    .catch(() => null);
  return { context, page, reachedVia: `e2e-full-run-01, manual exit, header="${header ?? ''}"` };
}

// --- 16: run summary, death (auto-retreat turned off through S-22) --------------------------------
async function reach16SummaryDeath(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockUnsupported(page);
  const base = `loc=mock&trace=e2e-f06-koa-run-01&speed=60&loop=0&e2eClassId=ranged&seed=7&e2eSkipOnboarding=1&start=${encodeURIComponent(START_KOA_OPEN)}`;
  await page.goto(`${url(base)}#/settings/walking-safety`);
  const settingsScreen = page.locator('.settings-walking-safety');
  const settingsUp = await settingsScreen
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!settingsUp) return { reason: '.settings-walking-safety never appeared' };
  await page.click('.settings-autoretreat-toggle');
  await page.click('.settings-walking-safety .popup-overlay .btn-danger-confirm');
  await page.click('.settings-close-button');
  await page.click('.settings-menu-close');
  if (!(await clickEnter(page, 30_000)))
    return { reason: 'confirm popup never became enterable (koa-run, auto-retreat off)' };
  if (!(await waitRunSummary(page)))
    return { reason: '.run-summary never appeared (expected death)' };
  const canon = await page
    .locator('.run-summary-canon')
    .textContent()
    .catch(() => null);
  return {
    context,
    page,
    reachedVia: `e2e-f06-koa-run-01 seed=7 ranged, auto-retreat off, canon="${canon ?? ''}"`,
  };
}

// --- 17: run summary, auto-retreat (default on) ----------------------------------------------------
async function reach17SummaryAutoRetreat(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockUnsupported(page);
  await page.goto(
    url(
      `loc=mock&trace=e2e-f06-koa-run-01&speed=60&loop=0&e2eClassId=ranged&seed=7&e2eSkipOnboarding=1&start=${encodeURIComponent(START_KOA_OPEN)}`,
    ),
  );
  if (!(await clickEnter(page, 30_000)))
    return { reason: 'confirm popup never became enterable (koa-run)' };
  if (!(await waitRunSummary(page)))
    return { reason: '.run-summary never appeared (expected auto-retreat)' };
  const canon = await page
    .locator('.run-summary-canon')
    .textContent()
    .catch(() => null);
  return {
    context,
    page,
    reachedVia: `e2e-f06-koa-run-01 seed=7 ranged, default auto-retreat, canon="${canon ?? ''}"`,
  };
}

// --- 18-21, 26: the real onboarding sequence, no `e2eSkipOnboarding` (task instruction) -----------
async function gotoOnboarding(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockUnsupported(page);
  await page.goto(url(`${ONBOARDING}&speed=60&start=${encodeURIComponent(START_LEELAWADEE)}`));
  return { context, page };
}

async function reach18Intro(browser: Browser): Promise<Outcome> {
  const { context, page } = await gotoOnboarding(browser);
  const shown = await page
    .locator('.intro-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.intro-screen never appeared' };
  return { context, page, reachedVia: 'e2e-onboarding-01, real flow, no skip hook' };
}

async function reach19AgeGate(browser: Browser): Promise<Outcome> {
  const { context, page } = await gotoOnboarding(browser);
  await page.locator('.intro-screen:not([hidden])').waitFor({ state: 'visible', timeout: 10_000 });
  await page.click('.intro-screen');
  const shown = await page
    .locator('.age-gate-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.age-gate-screen never appeared' };
  return { context, page, reachedVia: 'e2e-onboarding-01, tapped intro' };
}

async function reach20Consent(browser: Browser): Promise<Outcome> {
  const { context, page } = await gotoOnboarding(browser);
  await page.locator('.intro-screen:not([hidden])').waitFor({ state: 'visible', timeout: 10_000 });
  await page.click('.intro-screen');
  await page.locator('.age-gate-birth-year-select').selectOption('1990');
  await page.click('.age-gate-confirm');
  const shown = await page
    .locator('.consent-location-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.consent-location-screen never appeared' };
  return { context, page, reachedVia: 'e2e-onboarding-01, passed age gate with 1990' };
}

async function reach21ClassSelect(browser: Browser): Promise<Outcome> {
  const consent = await reach20Consent(browser);
  if (!isReached(consent))
    return { reason: `consent screen (prerequisite) not reached: ${consent.reason}` };
  const { context, page } = consent;
  await page.click('.consent-location-accept');
  const permissionShown = await page
    .locator('.consent-permission-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!permissionShown)
    return { reason: '.consent-permission-screen never appeared after accepting consent' };
  await page.click('.consent-permission-continue');
  const shown = await page
    .locator('.class-select-overlay:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.class-select-overlay never appeared' };
  return {
    context,
    page,
    reachedVia: 'e2e-onboarding-01, accepted consent, continued past the permission-priming screen',
  };
}

// --- 26: home panel, unknown (consent declined through the real flow) -----------------------------
async function reach26HomeUnknown(browser: Browser): Promise<Outcome> {
  const { context, page } = await gotoOnboarding(browser);
  await page.locator('.intro-screen:not([hidden])').waitFor({ state: 'visible', timeout: 10_000 });
  await page.click('.intro-screen');
  await page.locator('.age-gate-birth-year-select').selectOption('1990');
  await page.click('.age-gate-confirm');
  const consentShown = await page
    .locator('.consent-location-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!consentShown) return { reason: '.consent-location-screen never appeared' };
  await page.click('.consent-location-decline');
  const classShown = await page
    .locator('.class-select-overlay:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!classShown)
    return { reason: '.class-select-overlay never appeared after declining consent' };
  await page.click('.class-select-card');
  const found = await pollUntil(
    page,
    async () =>
      page.evaluate(() => {
        const title = document.querySelector('.home-panel-title')?.textContent ?? '';
        return title === 'ไม่รู้ว่าคุณอยู่ไหน' ? title : undefined;
      }),
    5_000,
  );
  if (found === undefined)
    return { reason: 'home-panel never showed the unknown-state title after declining consent' };
  return { context, page, reachedVia: 'e2e-onboarding-01, declined consent (real flow, R48)' };
}

// --- 22: settings > walking & safety ---------------------------------------------------------------
async function reach22SettingsWalkingSafety(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await page.goto(
    url(
      `${FULL_RUN}&speed=60&start=${encodeURIComponent(START_LEELAWADEE)}#/settings/walking-safety`,
    ),
  );
  const shown = await page
    .locator('.settings-walking-safety')
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.settings-walking-safety never appeared' };
  return { context, page, reachedVia: 'hash #/settings/walking-safety' };
}

/** Bonus, requested mid-task by the orchestrator (not one of the 26 named files): the settings
 * menu itself, which now carries a new `.settings-menu-export` row (X50, label key pending from
 * narrative-designer — see README). */
async function reachSettingsMenu(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await page.goto(
    url(`${FULL_RUN}&speed=60&start=${encodeURIComponent(START_LEELAWADEE)}#/settings`),
  );
  const shown = await page
    .locator('.settings-menu')
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.settings-menu never appeared' };
  return { context, page, reachedVia: 'hash #/settings' };
}

// --- 23: privacy screen -------------------------------------------------------------------------
async function reach23Privacy(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'kw.p2.consent',
      JSON.stringify({ schemaVersion: 1, savedAt_ms: 0, state: { location: 'granted' } }),
    );
  });
  await page.goto(
    url(`${FULL_RUN}&speed=60&start=${encodeURIComponent(START_LEELAWADEE)}#/settings/privacy`),
  );
  const shown = await page
    .locator('.privacy-screen')
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.privacy-screen never appeared' };
  return { context, page, reachedVia: 'hash #/settings/privacy, consent pre-seeded granted' };
}

// --- 24: inventory (with a revive potion, real e2e-authored session fixture) ---------------------
async function reach24Inventory(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  const sessionJson = readFileSync(
    join(FIXTURES_DIR, 'e2e-f06-revive-precondition.session.json'),
    'utf8',
  );
  await page.addInitScript((value: string) => {
    window.localStorage.setItem('kw.p2.session', value);
  }, sessionJson);
  await page.goto(
    url(
      `loc=mock&trace=e2e-f06-koa-run-01&speed=1&loop=0&e2eSkipOnboarding=1&start=${encodeURIComponent(START_KOA_OPEN)}#/inventory`,
    ),
  );
  const shown = await page
    .locator('.inventory-screen')
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.inventory-screen never appeared' };
  return {
    context,
    page,
    reachedVia: 'hash #/inventory, pre-seeded session fixture with a revive potion',
  };
}

// --- 25: home panel, out of area -----------------------------------------------------------------
async function reach25HomeOutOfArea(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await page.goto(
    url(
      `loc=mock&trace=qa-home-states-walk-01&speed=1&loop=0&e2eClassId=tanker&e2eSkipOnboarding=1&start=${encodeURIComponent(START_LEELAWADEE)}`,
    ),
  );
  const found = await pollUntil(
    page,
    async () =>
      page.evaluate(() => {
        const title = document.querySelector('.home-panel-title')?.textContent ?? '';
        return title === 'ช่วยกันปลุกจังหวัดเรา' ? title : undefined;
      }),
    6_000,
    200,
  );
  if (found === undefined)
    return { reason: "home-panel never showed the out-of-area title in leg 1's time window" };
  return {
    context,
    page,
    reachedVia: 'qa-home-states-walk-01 speed=1, leg 1 (outside the real playarea-mask)',
  };
}

interface ScreenDef {
  readonly id: string;
  readonly run: (browser: Browser) => Promise<Outcome>;
}

const SCREENS: readonly ScreenDef[] = [
  { id: '01-map-far', run: reach01MapFar },
  { id: '02-map-near-nav', run: reach02MapNearNav },
  { id: '03-nav-fallback', run: reach03NavFallback },
  { id: '04-confirm-b1-wait', run: reach04ConfirmB1Wait },
  { id: '05-confirm-b1-ready', run: reach05ConfirmB1Ready },
  { id: '06-confirm-b2-overlap-selected', run: async () => reach06ConfirmB2Overlap() },
  { id: '07-confirm-closed', run: reach07ConfirmClosed },
  { id: '08-run-active', run: reach08RunActive },
  { id: '09-run-grace', run: reach09RunGrace },
  { id: '10-toast-tick-loot', run: reach10ToastTickLoot },
  { id: '11-toast-tick-denied', run: async () => reach11ToastTickDenied() },
  { id: '12-hp-low', run: reach12HpLow },
  { id: '13-pocket', run: reach13Pocket },
  { id: '14-speedlock', run: reach14SpeedLock },
  { id: '15-summary-normal', run: reach15SummaryNormal },
  { id: '16-summary-death', run: reach16SummaryDeath },
  { id: '17-summary-autoretreat', run: reach17SummaryAutoRetreat },
  { id: '18-intro', run: reach18Intro },
  { id: '19-age-gate', run: reach19AgeGate },
  { id: '20-consent', run: reach20Consent },
  { id: '21-class-select', run: reach21ClassSelect },
  { id: '22-settings-walking-safety', run: reach22SettingsWalkingSafety },
  { id: '23-privacy', run: reach23Privacy },
  { id: '24-inventory', run: reach24Inventory },
  { id: '25-home-out-of-area', run: reach25HomeOutOfArea },
  { id: '26-home-unknown', run: reach26HomeUnknown },
  // Bonus, requested mid-task (see the doc comment on reachSettingsMenu above).
  { id: 'bonus-settings-menu', run: reachSettingsMenu },
];

async function run(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const results: ScreenResult[] = [];
  for (const screen of SCREENS) {
    process.stdout.write(`capturing ${screen.id}... `);
    const outcome = await screen.run(browser).catch((error: unknown) => ({
      reason: `threw: ${error instanceof Error ? error.message : String(error)}`,
    }));
    if (!isReached(outcome)) {
      console.warn(`NOT REACHED: ${outcome.reason}`);
      results.push({ id: screen.id, ok: false, notReachedReason: outcome.reason });
      continue;
    }
    await hideDebugHud(outcome.page).catch(() => undefined);
    const { buffer } = await screenshotWithBudget(outcome.page);
    const grayBuffer = await toGrayscalePng(browser, buffer);
    writeFileSync(join(OUT_DIR, `${screen.id}.png`), buffer);
    writeFileSync(join(OUT_DIR, `${screen.id}-gray.png`), grayBuffer);
    await outcome.context.close();
    console.warn(`ok (${buffer.length} B, gray ${grayBuffer.length} B) via ${outcome.reachedVia}`);
    results.push({
      id: screen.id,
      ok: true,
      bytes: buffer.length,
      grayBytes: grayBuffer.length,
      reachedVia: outcome.reachedVia,
    });
  }
  await browser.close();
  writeFileSync(join(OUT_DIR, 'capture-results.json'), JSON.stringify(results, null, 2));
  const okCount = results.filter((r) => r.ok).length;
  console.warn(`\n${okCount}/${results.length} screens captured.`);
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
