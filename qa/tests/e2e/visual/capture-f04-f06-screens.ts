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
// P2-H58 (design gate F06 DG6-01 round 2, §10 re-run criteria): this task's own hand-built
// `kw.p2.session` fixtures (`qa/tests/e2e/fixtures/`, same shape/reasoning as
// `apps/client/e2e/fixtures/e2e-f06-revive-precondition.session.json` — see that file's own doc
// comment and this task's `qa/tests/e2e/f06-confirm-hp-notice.spec.ts` header for the full
// rationale), used to pin the popup's HP state deterministically for `05b-confirm-low-hp`.
const QA_FIXTURES_DIR = join(REPO_ROOT, 'qa/tests/e2e/fixtures');

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
// V-45 (art/reviews/F04-F06-visual-gate.md §7.9, P2-H55 re-shoot): the round-2 capture polled for
// the first non-empty `.home-panel-title` and landed on leg 1's out_of_area title
// ("ช่วยกันปลุกจังหวัดเรา", same copy as 25-home-out-of-area) instead of leg 2's far title,
// because at speed=60 the trace walks through leg 1 before this poll's first tick. Poll for the
// exact `home.farTitle` copy (`config/content/copy.th.json`) instead, same convention as
// `reach25HomeOutOfArea` below.
const HOME_FAR_TITLE = 'รอยแยกใกล้สุดอยู่ไกล'; // copy key home.farTitle
async function reach01MapFar(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await page.goto(
    url(
      `loc=mock&trace=qa-home-states-walk-01&speed=60&loop=0&e2eClassId=tanker&e2eSkipOnboarding=1&start=${encodeURIComponent(START_LEELAWADEE)}`,
    ),
  );
  const found = await pollUntil(
    page,
    async () => {
      const title = await page.evaluate(
        () => document.querySelector('.home-panel-title')?.textContent ?? '',
      );
      return title === HOME_FAR_TITLE ? title : undefined;
    },
    15_000,
    100,
  );
  if (found === undefined)
    return {
      reason: `home-panel never showed the far-state title ("${HOME_FAR_TITLE}"), leg 2 of qa-home-states-walk-01`,
    };
  return {
    context,
    page,
    reachedVia: `qa-home-states-walk-01 speed=60, title="${found}" (leg 2, far)`,
  };
}

// --- 02: nav panel, approaching an open dungeon (state near, popup not open yet) --------------
// V-43 (art/reviews/F04-F06-visual-gate.md §7.9, P2-H55 re-shoot): the round-2 capture screenshotted
// the arrow mid-rotation (`.direction-arrow`'s 150ms CSS transition off `data-direction`,
// `app.css:360`), so the arrow pointed almost due north while the text next to it already said
// "ทิศตะวันออกเฉียงใต้". Poll for `data-direction` being set (not just the distance chip), then wait
// >=300ms (double the transition) before the caller screenshots, so the rotation has always settled.
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
        const direction =
          document.querySelector('.direction-arrow')?.getAttribute('data-direction') ?? '';
        const label = document.querySelector('.direction-label')?.textContent ?? '';
        const ok =
          nav !== null &&
          !(nav as HTMLElement).hidden &&
          chip !== '' &&
          direction !== '' &&
          (popup === null || (popup as HTMLElement).hidden);
        return ok ? `${chip}|${direction}|${label}` : undefined;
      }),
    15_000,
    150,
  );
  if (found === undefined)
    return {
      reason:
        'nav-panel with a distance chip and a set data-direction never appeared before the confirm popup opened',
    };
  await page.waitForTimeout(300); // >= the 300ms floor the gate asks for (2x the 150ms CSS transition)
  return {
    context,
    page,
    reachedVia: `e2e-full-run-01 speed=1, chip|direction|label="${found}", +300ms settle`,
  };
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

// --- 05b: confirm popup, HP <= 25% with auto-retreat on (DG6-01, P2-H58) -----------------------
// Design gate F06 DG6-01 round 2 (`design/reviews/F06-design-gate.md` §10): the popup's low-HP
// note (`dungeon.confirmLowHpNote`) underneath the always-on HP row. Session pre-seeded with this
// task's own `f06-confirm-low-hp-autoretreat-on.session.json` (player HP well under the
// `dungeons.hpSafety.autoRetreatThreshold_pct` line, auto-retreat on) — same fixture/reasoning
// `qa/tests/e2e/f06-confirm-hp-notice.spec.ts` uses for its own black-box assertions, this script
// only reuses it for the screenshot.
async function reach05bConfirmLowHp(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  const sessionJson = readFileSync(
    join(QA_FIXTURES_DIR, 'f06-confirm-low-hp-autoretreat-on.session.json'),
    'utf8',
  );
  await page.addInitScript((value: string) => {
    window.localStorage.setItem('kw.p2.session', value);
  }, sessionJson);
  await page.goto(url(`${FULL_RUN}&speed=60&start=${encodeURIComponent(START_LEELAWADEE)}`));
  const found = await pollUntil(
    page,
    async () => {
      const st = await readConfirm(page);
      const noteShown = await page.evaluate(() => {
        const note = document.querySelector('.confirm-hp-note');
        return note !== null && !(note as HTMLElement).hidden;
      });
      return !st.hidden && st.enterDisabled === false && noteShown ? st.title : undefined;
    },
    20_000,
    200,
  );
  if (found === undefined)
    return {
      reason:
        'confirm popup with an enabled "เข้า" button and a visible .confirm-hp-note never appeared',
    };
  return {
    context,
    page,
    reachedVia: `e2e-full-run-01 speed=60, pre-seeded low-HP fixture, title="${found}"`,
  };
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

// --- 09b: run screen, Suspended -------------------------------------------------------------
// P2-H58: location-engineer's `synthetic-suspended-leelawadee-01` (P2-H57,
// `data/gps-traces/README.md` §7) lands `09b-run-suspended` for the first time — a real run in the
// real, already-open `leelawadee-lawn` dungeon that walks out, loops one reward window, then holds
// outside continuously past `runState.graceMax_s` (Grace -> Suspended) before walking back in
// (Suspended -> Active, "returned"). Mock URL and timing straight from the README's own §7 replay
// table: Suspended real-world at ~8.8s after Enter at speed=60, a ~6.2s real window before it
// advances again — this function only polls for the pill's own Suspended label, so it self-adjusts
// if the exact timing ever drifts with config.
async function reach09bRunSuspended(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockUnsupported(page);
  await page.goto(
    url(
      `loc=mock&trace=synthetic-suspended-leelawadee-01&speed=60&loop=0&e2eClassId=tanker&seed=1&e2eSkipOnboarding=1&start=${encodeURIComponent(START_LEELAWADEE)}`,
    ),
  );
  if (!(await clickEnter(page, 15_000)))
    return { reason: 'confirm popup never became enterable (synthetic-suspended-leelawadee-01)' };
  const found = await pollUntil(
    page,
    async () =>
      page.evaluate(() => {
        const runBar = document.querySelector('.run-bar');
        if (runBar === null || (runBar as HTMLElement).hidden) return undefined;
        const label = document.querySelector('.run-state-pill-label')?.textContent ?? '';
        return label === 'หยุดชั่วคราว' ? label : undefined;
      }),
    20_000,
    100,
  );
  if (found === undefined)
    return {
      reason:
        'run-state pill never reached the Suspended label ("หยุดชั่วคราว") within the trace window',
    };
  return {
    context,
    page,
    reachedVia: `synthetic-suspended-leelawadee-01 speed=60, pill="${found}"`,
  };
}

// --- 10: granted-tick toast (loot) --------------------------------------------------------------
// R2-1 (art/reviews/F04-F06-visual-gate.md §7.9, P2-H55 re-shoot): capture only after the enter
// effect (`run.tickGranted`/`run.tickGrantedFirst`, art/vfx/tick-feedback) has finished playing and
// `.toast`'s own transform has settled (that effect owns 100% of `.toast`'s transform, R2-1's fix),
// so the toast is never caught mid-animation. `FIRST_TOTAL_DURATION_MS` et al top out well under
// 700ms; wait 800ms to clear the gate's own ">= 700ms after the toast appears" floor with margin.
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
  await page.waitForTimeout(800);
  return { context, page, reachedVia: 'e2e-full-run-01, granted-tick toast, +800ms settle' };
}

// --- 11: denied-tick toast (movement gate not met on an evaluated window) ----------------------
// Was UNREACHABLE with the e2e-only fixture set (see the old reason kept in git history / the
// README's round-2 section) until location-engineer landed `synthetic-tick-denied-leelawadee-01`
// (P2-H52, `data/gps-traces/README.md` §7): a real run in the real, already-open `leelawadee-lawn`
// dungeon that sits on a bench through one whole `rewardTick.rewardTickInterval_s` window before
// walking again. Client loads `data/gps-traces/synthetic/*.trace.json` directly
// (`apps/client/src/location/traces.ts`), same as any other `trace=` id — no fixture copy needed.
async function reach11ToastTickDenied(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockUnsupported(page);
  await page.goto(
    url(
      `loc=mock&trace=synthetic-tick-denied-leelawadee-01&speed=60&loop=0&e2eClassId=tanker&seed=1&e2eSkipOnboarding=1&start=${encodeURIComponent(START_LEELAWADEE)}`,
    ),
  );
  // README §7: "toast ไม่ผ่านคือ `.toast:has(.toast-line).faded` ที่ราว 5 วินาทีจริงหลังกด 'เข้า' ที่
  // speed=60" — enter within a few real seconds of the popup opening.
  if (!(await clickEnter(page, 15_000)))
    return { reason: 'confirm popup never became enterable (synthetic-tick-denied-leelawadee-01)' };
  const shown = await page
    .locator('.toast:has(.toast-line).faded')
    .waitFor({ state: 'visible', timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: 'denied-tick toast (.toast.faded) never appeared' };
  await page.waitForTimeout(800); // same >=700ms settle floor as the other toast screens
  return {
    context,
    page,
    reachedVia: 'synthetic-tick-denied-leelawadee-01 speed=60, denied-tick toast, +800ms settle',
  };
}

// --- 12: HP low (danger zone, right before auto-retreat ends the run) --------------------------
// P2-H58: location-engineer's `synthetic-hp-low-leelawadee-01` (P2-H57, `data/gps-traces/README.md`
// §7) replaces the old `e2e-f06-koa-run-01` (level-gap) fixture, which always landed `run_hp_low`
// and `run_auto_retreat` on the exact same hit (see git history of this file for that
// investigation) — never leaving a real "still going" window to satisfy the gate's own ">=700ms
// settle" ask. This trace's own README-documented `tanker&seed=15` pairing keeps HP genuinely in
// the (0%,30%] warning band, run still Active, for 370 trace-seconds = **6.17s real at speed=60**,
// starting about 63s real after Enter — long enough to wait the full >=700ms this function asks
// for and still capture before auto-retreat ends the run.
async function reach12HpLow(browser: Browser): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser);
  await forceWakeLockUnsupported(page);
  await page.goto(
    url(
      `loc=mock&trace=synthetic-hp-low-leelawadee-01&speed=60&loop=0&e2eClassId=tanker&seed=15&e2eSkipOnboarding=1&start=${encodeURIComponent(START_LEELAWADEE)}`,
    ),
  );
  if (!(await clickEnter(page, 30_000)))
    return { reason: 'confirm popup never became enterable (synthetic-hp-low-leelawadee-01)' };
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
    90_000, // ~63s real to reach the warning band at speed=60, plus margin
    5,
  );
  if (found === undefined)
    return {
      reason:
        'hp-percent never rendered a value in (0%, 30%] before the run ended (tanker/seed=15 chosen for this, README §7)',
    };
  await page.waitForTimeout(700); // gate's own ">=700ms settle" ask, well inside the ~6.17s window
  const stillRunningAfterWait = await page.evaluate(() => {
    const summary = document.querySelector('.run-summary');
    return summary === null || (summary as HTMLElement).hidden;
  });
  if (!stillRunningAfterWait)
    return { reason: 'run ended (summary shown) during the 700ms HP-low settle wait' };
  return {
    context,
    page,
    reachedVia: `synthetic-hp-low-leelawadee-01 seed=15 tanker, hp="${found}", +700ms settle, run still active`,
  };
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

// D-149 inserted a login screen (S-00-login) between the single start button and the age gate
// (`apps/client/e2e/onboarding.spec.ts`'s own flow, tech note F10 section 3.1 table row 2) — every
// function below that used to go straight from `.intro-start` to `.age-gate-screen` now waits for
// `.login-screen` first and bypasses it with `.login-google-button` (R10: every login button is an
// unconditional bypass, Google is this script's arbitrary pick, same as the real spec's first test).
async function clickThroughLogin(page: Page): Promise<boolean> {
  const login = page.locator('.login-screen:not([hidden])');
  const shown = await login
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return false;
  await page.click('.login-google-button');
  return true;
}

async function reach19AgeGate(browser: Browser): Promise<Outcome> {
  const { context, page } = await gotoOnboarding(browser);
  await page.locator('.intro-screen:not([hidden])').waitFor({ state: 'visible', timeout: 10_000 });
  await page.click('.intro-screen .intro-start');
  if (!(await clickThroughLogin(page))) return { reason: '.login-screen never appeared' };
  const shown = await page
    .locator('.age-gate-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.age-gate-screen never appeared' };
  return { context, page, reachedVia: 'e2e-onboarding-01, tapped intro, bypassed login (Google)' };
}

async function reach20Consent(browser: Browser): Promise<Outcome> {
  const { context, page } = await gotoOnboarding(browser);
  await page.locator('.intro-screen:not([hidden])').waitFor({ state: 'visible', timeout: 10_000 });
  await page.click('.intro-screen .intro-start');
  if (!(await clickThroughLogin(page))) return { reason: '.login-screen never appeared' };
  await page
    .locator('.age-gate-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 });
  await page.locator('.age-gate-birth-year-select').selectOption('1990');
  await page.click('.age-gate-confirm');
  const shown = await page
    .locator('.consent-location-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.consent-location-screen never appeared' };
  return {
    context,
    page,
    reachedVia: 'e2e-onboarding-01, bypassed login (Google), passed age gate with 1990',
  };
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
  await page.click('.intro-screen .intro-start');
  if (!(await clickThroughLogin(page))) return { reason: '.login-screen never appeared' };
  await page
    .locator('.age-gate-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 });
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
  { id: '05b-confirm-low-hp', run: reach05bConfirmLowHp },
  { id: '06-confirm-b2-overlap-selected', run: async () => reach06ConfirmB2Overlap() },
  { id: '07-confirm-closed', run: reach07ConfirmClosed },
  { id: '08-run-active', run: reach08RunActive },
  { id: '09-run-grace', run: reach09RunGrace },
  { id: '09b-run-suspended', run: reach09bRunSuspended },
  { id: '10-toast-tick-loot', run: reach10ToastTickLoot },
  { id: '11-toast-tick-denied', run: reach11ToastTickDenied },
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

// P2-H55 (re-shoot round 3, art/reviews/F04-F06-visual-gate.md §7.9): pass one or more screen ids
// on the CLI to capture only those screens (e.g. `tsx capture-f04-f06-screens.ts 01-map-far
// 02-map-near-nav`). With no ids, every screen in SCREENS runs (unchanged default, same as the
// P2-H41 round). Results for ids that were not selected this run are kept as-is by merging into
// whatever `capture-results.json` already has, instead of being dropped, so a narrow re-shoot never
// erases the bookkeeping for the other screens' last-known result.
const RESULTS_PATH = join(OUT_DIR, 'capture-results.json');
const REQUESTED_IDS = new Set(process.argv.slice(2));
const SCREENS_TO_RUN =
  REQUESTED_IDS.size > 0 ? SCREENS.filter((s) => REQUESTED_IDS.has(s.id)) : SCREENS;

function loadExistingResults(): ScreenResult[] {
  try {
    return JSON.parse(readFileSync(RESULTS_PATH, 'utf8')) as ScreenResult[];
  } catch {
    return [];
  }
}

async function run(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  if (REQUESTED_IDS.size > 0) {
    const knownIds = new Set(SCREENS.map((s) => s.id));
    const unknown = [...REQUESTED_IDS].filter((id) => !knownIds.has(id));
    if (unknown.length > 0)
      throw new Error(`unknown screen id(s) requested: ${unknown.join(', ')}`);
    console.warn(`re-shoot mode: capturing only ${SCREENS_TO_RUN.map((s) => s.id).join(', ')}`);
  }
  const browser = await chromium.launch();
  const newResults = new Map<string, ScreenResult>();
  for (const screen of SCREENS_TO_RUN) {
    process.stdout.write(`capturing ${screen.id}... `);
    const outcome = await screen.run(browser).catch((error: unknown) => ({
      reason: `threw: ${error instanceof Error ? error.message : String(error)}`,
    }));
    if (!isReached(outcome)) {
      console.warn(`NOT REACHED: ${outcome.reason}`);
      newResults.set(screen.id, { id: screen.id, ok: false, notReachedReason: outcome.reason });
      continue;
    }
    await hideDebugHud(outcome.page).catch(() => undefined);
    const { buffer } = await screenshotWithBudget(outcome.page);
    const grayBuffer = await toGrayscalePng(browser, buffer);
    writeFileSync(join(OUT_DIR, `${screen.id}.png`), buffer);
    writeFileSync(join(OUT_DIR, `${screen.id}-gray.png`), grayBuffer);
    await outcome.context.close();
    console.warn(`ok (${buffer.length} B, gray ${grayBuffer.length} B) via ${outcome.reachedVia}`);
    newResults.set(screen.id, {
      id: screen.id,
      ok: true,
      bytes: buffer.length,
      grayBytes: grayBuffer.length,
      reachedVia: outcome.reachedVia,
    });
  }
  await browser.close();

  const merged = new Map<string, ScreenResult>();
  for (const r of loadExistingResults()) merged.set(r.id, r);
  for (const r of newResults.values()) merged.set(r.id, r);
  // Keep merged order stable: SCREENS' declared order first (covers ids known today, including
  // any new ones like 09b), then any leftover ids from an older results file that SCREENS no
  // longer declares (defensive; should not happen in practice).
  const orderedIds = [
    ...SCREENS.map((s) => s.id),
    ...[...merged.keys()].filter((id) => !SCREENS.some((s) => s.id === id)),
  ];
  const results = orderedIds
    .map((id) => merged.get(id))
    .filter((r): r is ScreenResult => r !== undefined);
  writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
  const okCount = results.filter((r) => r.ok).length;
  console.warn(
    `\n${okCount}/${results.length} screens captured. (${newResults.size} captured/updated this run)`,
  );
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
