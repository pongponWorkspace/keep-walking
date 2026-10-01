// P2-F10-T19 (acceptance: "ภาพหน้าจอ 360/390 px ทุกจอ F10 ... ให้ gate copy/visual ใช้"): the F10
// counterpart of `capture-f04-f06-screens.ts` — same convention (a plain script, real client build,
// Mock provider, real public UI only, never a direct DOM/engine poke), but every screen here is one
// of F10's own (login family, create-character, story, shell nav/coming-soon/settings/logout), and
// every screen is captured at *both* 360px and 390px (T06/the copy+visual gates both need the
// narrower width checked, not just the Pixel 7 390 default the F04-F06 set uses) — written to
// `qa/reports/F10/screens/` (not `art/reviews/`, per this task's own instruction: these are QA's
// working captures for the T20/T21 gates to review, not the art-director's own archive).
//
// Prerequisite (same as the sibling script): `pnpm --filter @keep-walking/client build && pnpm
// --filter @keep-walking/client preview` (port 4173) already running.
//
// Run: pnpm exec tsx qa/tests/e2e/visual/capture-f10-screens.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import prettier from 'prettier';
import { screenshotWithBudget } from './image-utils';
import { seedLegacyPlayer } from '../../../../apps/client/e2e/fixtures/f10-seed';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..');
const OUT_DIR = join(REPO_ROOT, 'qa/reports/F10/screens');
const BASE_URL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4173';

const WIDTHS = [360, 390] as const;
// Same device-height convention this workspace already uses per width: 740 is
// `f10-nav-shell.spec.ts`'s own "shell chrome fits the viewport" pair (360/390 both at 740); 844 is
// the Pixel 7 default `capture-f04-f06-screens.ts` uses for its 390 shots. Using each width's own
// usual height (rather than forcing one height for both) keeps every screenshot closest to what an
// existing e2e spec already proved fits.
const HEIGHT_FOR_WIDTH: Readonly<Record<(typeof WIDTHS)[number], number>> = { 360: 740, 390: 844 };

const START = '2026-10-02T12:00'; // Friday noon — inside every candidate dungeon's own daily hours

function url(params: string): string {
  return `${BASE_URL}/?${params}`;
}

const ONBOARDING = `loc=mock&trace=e2e-onboarding-01&loop=0&seed=1&speed=60&start=${encodeURIComponent(START)}`;
const HOME = `loc=mock&trace=e2e-onboarding-01&loop=0&seed=1&speed=60&e2eClassId=tanker&e2eSkipOnboarding=1&start=${encodeURIComponent(START)}`;
const RUN = `loc=mock&trace=e2e-full-run-01&loop=0&seed=1&speed=60&e2eClassId=tanker&e2eSkipOnboarding=1&start=${encodeURIComponent(START)}`;

/** P2-X67: every `reach*` function below is `export`ed so `f10-no-raw-copy-key.spec.ts` (same
 * "every F10 screen" walk, different assertion) can drive the exact same real taps instead of
 * re-typing a second copy of this navigation — a second hand-written copy would silently drift the
 * moment a selector here changes, same reasoning `qa/tests/e2e/f04-f05-no-raw-copy-key.spec.ts`'s
 * own doc comment gives for reading `copy.th.json` back rather than retyping Thai text. */
export async function newCtxPage(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL: BASE_URL, // `seedLegacyPlayer` (apps/client/e2e/fixtures/f10-seed.ts) navigates with a
    // relative `/?...` URL, same as every Playwright-test spec that calls it under
    // playwright.config.ts's own `use.baseURL` — this script is not run through the test runner, so
    // the context needs its own `baseURL` for that relative `page.goto` to resolve the same way.
    viewport: { width, height: HEIGHT_FOR_WIDTH[width] },
    locale: 'th-TH',
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- browser-context patch, no DOM lib type for a prototype delete
    delete (Navigator.prototype as any).wakeLock;
  });
  return { context, page };
}

async function hideDebugHud(page: Page): Promise<void> {
  await page.evaluate(() => {
    const panel = document.getElementById('hud-panel');
    if (panel !== null) panel.style.display = 'none';
  });
}

const IMAGE_LOAD_TIMEOUT_MS = 10_000;

/** P2-X67 (art gate V-F10-04 condition 3: "ถ่ายรอ img.complete && naturalWidth > 0"). Every screen
 * is checked, not only the story slides/start screen V-F10-04 named — a screen with no `<img>` at
 * all (e.g. the login screen, whose icons are inline `<svg>` via `setIconGlyph`'s tintable path)
 * trivially satisfies this with zero images to wait for, so one call site before every screenshot
 * is simpler and no weaker than special-casing which screens "have a picture". Only *visible*
 * `<img>` elements are waited on (a non-zero `getBoundingClientRect`) — an `<img>` sitting in a
 * `hidden`/`display:none` sibling screen (several F10 screens share one mounted DOM, only one
 * visible at a time, same convention `story-screen.ts`'s own doc comment describes) can legitimately
 * never load in this run and must not hang the capture. */
async function waitForImagesLoaded(page: Page): Promise<void> {
  await page
    .waitForFunction(
      () => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.every((img) => {
          const box = img.getBoundingClientRect();
          const visible = box.width > 0 && box.height > 0;
          if (!visible) return true;
          return img.complete && img.naturalWidth > 0;
        });
      },
      undefined,
      { timeout: IMAGE_LOAD_TIMEOUT_MS },
    )
    .catch(() => undefined); // same "never hang the whole run over one screen" convention as
  // every `reach*` function's own `.catch(() => false)` — a screen whose image never loads inside
  // the budget is still captured (the still-broken image is itself real evidence for the gate that
  // asked for this wait), just not blocked on forever.
}

export interface Reached {
  readonly context: BrowserContext;
  readonly page: Page;
  readonly reachedVia: string;
}
export interface NotReached {
  readonly reason: string;
}
export type Outcome = Reached | NotReached;
export function isReached(o: Outcome): o is Reached {
  return 'page' in o;
}

interface ScreenResult {
  readonly id: string;
  readonly width: number;
  readonly ok: boolean;
  readonly bytes?: number;
  readonly reachedVia?: string;
  readonly notReachedReason?: string;
}

// --- login family + start -----------------------------------------------------------------------

export async function reachStart(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser, width);
  await page.goto(url(ONBOARDING));
  const shown = await page
    .locator('.intro-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.intro-screen never appeared' };
  return { context, page, reachedVia: 'e2e-onboarding-01, fresh load' };
}

export async function reachLogin(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const start = await reachStart(browser, width);
  if (!isReached(start)) return { reason: `start screen not reached: ${start.reason}` };
  const { page } = start;
  await page.click('.intro-start');
  const shown = await page
    .locator('.login-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.login-screen never appeared' };
  return { context: start.context, page, reachedVia: 'tapped เริ่มเกม' };
}

export async function reachLoginEmail(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const login = await reachLogin(browser, width);
  if (!isReached(login)) return { reason: `login screen not reached: ${login.reason}` };
  const { page } = login;
  await page.click('.login-email-link');
  const shown = await page
    .locator('.login-email-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.login-email-screen never appeared' };
  return { context: login.context, page, reachedVia: 'login -> email link' };
}

export async function reachRegister(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const email = await reachLoginEmail(browser, width);
  if (!isReached(email)) return { reason: `login-email screen not reached: ${email.reason}` };
  const { page } = email;
  await page.click('.login-register-link');
  const shown = await page
    .locator('.register-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.register-screen never appeared' };
  return { context: email.context, page, reachedVia: 'login -> email -> register' };
}

export async function reachForgot(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const email = await reachLoginEmail(browser, width);
  if (!isReached(email)) return { reason: `login-email screen not reached: ${email.reason}` };
  const { page } = email;
  await page.click('.login-forgot-link');
  const shown = await page
    .locator('.forgot-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.forgot-screen never appeared' };
  return { context: email.context, page, reachedVia: 'login -> email -> forgot' };
}

// --- create-character (fresh / name-invalid / migration-locked) ---------------------------------

export async function reachCreateCharacterFresh(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const login = await reachLogin(browser, width);
  if (!isReached(login)) return { reason: `login screen not reached: ${login.reason}` };
  const { page } = login;
  await page.click('.login-google-button');
  await page
    .locator('.age-gate-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 });
  await page.locator('.age-gate-birth-year-select').selectOption('1990');
  await page.click('.age-gate-confirm');
  await page
    .locator('.consent-location-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 });
  await page.click('.consent-location-decline'); // R03: skips the permission-priming screen too
  const shown = await page
    .locator('.create-character-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.create-character-screen never appeared' };
  return { context: login.context, page, reachedVia: 'google -> age 1990 -> consent decline' };
}

export async function reachCreateCharacterNameInvalid(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const fresh = await reachCreateCharacterFresh(browser, width);
  if (!isReached(fresh)) return { reason: `create-character (fresh) not reached: ${fresh.reason}` };
  const { page } = fresh;
  await page.click('.class-select-card[data-class-id="tanker"]');
  await page.fill('.name-field-input', 'a'); // tooShort (minGraphemes 2) — R18 item 1
  const shown = await page
    .locator('.name-field-error:not(:empty)')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.name-field-error never showed a reason for "a"' };
  return { context: fresh.context, page, reachedVia: 'typed "a" (tooShort)' };
}

export async function reachCreateCharacterMigrationLocked(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser, width);
  await seedLegacyPlayer(page, { withClass: true });
  await page.goto(url(ONBOARDING));
  await page.locator('.login-screen:not([hidden])').waitFor({ state: 'visible', timeout: 10_000 });
  await page.click('.login-google-button');
  const permission = page.locator('.consent-permission-screen:not([hidden])');
  const createScreen = page.locator('.create-character-screen:not([hidden])');
  await permission.or(createScreen).waitFor({ state: 'visible', timeout: 10_000 });
  if (await permission.isVisible()) await page.click('.consent-permission-continue');
  const shown = await createScreen
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.create-character-screen never appeared (migration)' };
  return { context, page, reachedVia: 'seedLegacyPlayer(withClass:true), google login' };
}

// --- story (slides 1-5) -------------------------------------------------------------------------

export async function reachStorySlide(
  browser: Browser,
  width: (typeof WIDTHS)[number],
  slide: 1 | 2 | 3 | 4 | 5,
): Promise<Outcome> {
  const fresh = await reachCreateCharacterFresh(browser, width);
  if (!isReached(fresh)) return { reason: `create-character (fresh) not reached: ${fresh.reason}` };
  const { page } = fresh;
  await page.click('.class-select-card[data-class-id="ranged"]');
  await page.fill('.name-field-input', 'testplayer');
  await page.click('.create-character-button');
  const shown = await page
    .locator('.story-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.story-screen never appeared' };
  for (let i = 1; i < slide; i += 1) {
    await page.click('.story-next-button');
  }
  // `.story-dot`/`.story-dot-active` carry no CSS size yet (no rule for either class exists —
  // `uiux-designer`'s own styling is still pending, tracked separately, not this task's job to add)
  // — Playwright's default `state: 'visible'` wait requires a non-empty bounding box, which these
  // dots never have, so this waits for `'attached'` (the class toggle landing in the DOM, which is
  // what this function actually needs to know) instead.
  await page
    .locator(`.story-dot-active:nth-child(${slide})`)
    .waitFor({ state: 'attached', timeout: 5_000 });
  return {
    context: fresh.context,
    page,
    reachedVia: `created a character, advanced to slide ${slide}`,
  };
}

// --- shell: map+nav, coming-soon x3, settings, logout (outside/in run) ---------------------------

export async function reachMapNav(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser, width);
  await page.goto(url(HOME));
  const shown = await page
    .locator('.bottombar-f10')
    .waitFor({ state: 'visible', timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.bottombar-f10 never appeared' };
  return { context, page, reachedVia: 'e2eSkipOnboarding=1, map home' };
}

export async function reachComingSoon(
  browser: Browser,
  width: (typeof WIDTHS)[number],
  tab: 'upgrade' | 'shop' | 'party',
): Promise<Outcome> {
  const home = await reachMapNav(browser, width);
  if (!isReached(home)) return { reason: `map/nav not reached: ${home.reason}` };
  const { page } = home;
  await page.click(`.nav-tab[data-tab="${tab}"]`);
  const shown = await page
    .locator('.coming-soon-screen:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: `.coming-soon-screen never appeared for tab=${tab}` };
  return { context: home.context, page, reachedVia: `tapped the ${tab} nav tab` };
}

export async function reachSettingsMenu(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const home = await reachMapNav(browser, width);
  if (!isReached(home)) return { reason: `map/nav not reached: ${home.reason}` };
  const { page } = home;
  await page.click('.setting-button-float');
  const shown = await page
    .locator('.settings-menu:not([hidden])')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.settings-menu never appeared' };
  return { context: home.context, page, reachedVia: 'tapped the floating Setting button' };
}

export async function reachLogoutConfirmOutsideRun(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const settings = await reachSettingsMenu(browser, width);
  if (!isReached(settings)) return { reason: `settings menu not reached: ${settings.reason}` };
  const { page } = settings;
  await page.click('.settings-menu-logout');
  const shown = await page
    .locator('.settings-menu-logout-confirm-button:visible')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.settings-menu-logout-confirm-button never appeared' };
  return { context: settings.context, page, reachedVia: 'settings -> logout (no run in progress)' };
}

export async function reachLogoutConfirmInRun(
  browser: Browser,
  width: (typeof WIDTHS)[number],
): Promise<Outcome> {
  const { context, page } = await newCtxPage(browser, width);
  await page.goto(url(RUN));
  const enterButton = page.locator('.popup-overlay:not([hidden]) .btn.btn-primary');
  const entered = await enterButton
    .waitFor({ state: 'visible', timeout: 30_000 })
    .then(() => true)
    .catch(() => false);
  if (!entered) return { reason: 'confirm popup never became enterable' };
  await enterButton.click();
  await page.locator('.run-bar:not([hidden])').waitFor({ state: 'visible', timeout: 10_000 });
  await page.evaluate(() => {
    window.location.hash = '#/settings';
  });
  await page.locator('.settings-menu:not([hidden])').waitFor({ state: 'visible', timeout: 5_000 });
  await page.click('.settings-menu-logout');
  const shown = await page
    .locator('.settings-menu-logout-confirm-run-note:visible')
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!shown) return { reason: '.settings-menu-logout-confirm-run-note never appeared' };
  return { context, page, reachedVia: 'entered a run, #/settings, tapped logout' };
}

interface ScreenDef {
  readonly id: string;
  readonly run: (browser: Browser, width: (typeof WIDTHS)[number]) => Promise<Outcome>;
}

const SCREENS: readonly ScreenDef[] = [
  { id: '01-start', run: reachStart },
  { id: '02-login', run: reachLogin },
  { id: '03-login-email', run: reachLoginEmail },
  { id: '04-register', run: reachRegister },
  { id: '05-forgot', run: reachForgot },
  { id: '06-create-character-fresh', run: reachCreateCharacterFresh },
  { id: '07-create-character-name-invalid', run: reachCreateCharacterNameInvalid },
  { id: '08-create-character-migration-locked', run: reachCreateCharacterMigrationLocked },
  { id: '09-story-slide-1', run: (b, w) => reachStorySlide(b, w, 1) },
  // P2-X67 (art gate V-F10-04 re-run condition, copy gate N-04): slides 2 and 3 had no screenshot
  // at all before this task (art-director read slide 2's SVG source instead, and did not re-check
  // slide 3). `09b`/`09c` (not `10`/`11`) so every pre-existing id/number already cited by
  // `design/reviews/F10-copy-gate.md` and `art/reviews/F10-visual-gate.md` (e.g. "ภาพ 10",
  // "10-story-slide-4-360.png") keeps pointing at the same file it always did.
  { id: '09b-story-slide-2', run: (b, w) => reachStorySlide(b, w, 2) },
  { id: '09c-story-slide-3', run: (b, w) => reachStorySlide(b, w, 3) },
  { id: '10-story-slide-4', run: (b, w) => reachStorySlide(b, w, 4) },
  { id: '11-story-slide-5', run: (b, w) => reachStorySlide(b, w, 5) },
  { id: '12-map-nav', run: reachMapNav },
  { id: '13-coming-soon-upgrade', run: (b, w) => reachComingSoon(b, w, 'upgrade') },
  { id: '14-coming-soon-shop', run: (b, w) => reachComingSoon(b, w, 'shop') },
  { id: '15-coming-soon-party', run: (b, w) => reachComingSoon(b, w, 'party') },
  { id: '16-settings-menu', run: reachSettingsMenu },
  { id: '17-logout-confirm-outside-run', run: reachLogoutConfirmOutsideRun },
  { id: '18-logout-confirm-in-run', run: reachLogoutConfirmInRun },
];

const RESULTS_PATH = join(OUT_DIR, 'capture-results.json');
const REQUESTED_IDS = new Set(process.argv.slice(2));
const SCREENS_TO_RUN =
  REQUESTED_IDS.size > 0 ? SCREENS.filter((s) => REQUESTED_IDS.has(s.id)) : SCREENS;

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
  const results: ScreenResult[] = [];
  for (const screen of SCREENS_TO_RUN) {
    for (const width of WIDTHS) {
      process.stdout.write(`capturing ${screen.id} @ ${width}px... `);
      const outcome = await screen.run(browser, width).catch((error: unknown) => ({
        reason: `threw: ${error instanceof Error ? error.message : String(error)}`,
      }));
      if (!isReached(outcome)) {
        console.warn(`NOT REACHED: ${outcome.reason}`);
        results.push({ id: screen.id, width, ok: false, notReachedReason: outcome.reason });
        continue;
      }
      await hideDebugHud(outcome.page).catch(() => undefined);
      await waitForImagesLoaded(outcome.page);
      const { buffer } = await screenshotWithBudget(outcome.page);
      writeFileSync(join(OUT_DIR, `${screen.id}-${width}.png`), buffer);
      await outcome.context.close();
      console.warn(`ok (${buffer.length} B) via ${outcome.reachedVia}`);
      results.push({
        id: screen.id,
        width,
        ok: true,
        bytes: buffer.length,
        reachedVia: outcome.reachedVia,
      });
    }
  }
  await browser.close();
  // P2-X67: the repo's own `pnpm lint` runs `prettier --check .` over everything, this generated
  // file included — formatting it here (rather than leaving a plain `JSON.stringify(..., null, 2)`
  // and hoping it happens to match prettier's own JSON style) means a bare re-run of this script
  // never needs a follow-up `prettier --write` step, and `pnpm lint` never fails on a file nobody
  // hand-edits. `resolveConfig` picks up the repo's own `.prettierrc.json` (same config every other
  // file in this repo is checked against) instead of prettier's built-in defaults.
  const prettierConfig = await prettier.resolveConfig(RESULTS_PATH);
  const formatted = await prettier.format(JSON.stringify(results), {
    ...prettierConfig,
    filepath: RESULTS_PATH,
  });
  writeFileSync(RESULTS_PATH, formatted);
  const okCount = results.filter((r) => r.ok).length;
  console.warn(`\n${okCount}/${results.length} screen x width captures ok.`);
}

// P2-X67: this file is now also imported (not just run as a script) by
// `qa/tests/e2e/f10-no-raw-copy-key.spec.ts`, which only wants its exported `reach*` helpers, never
// a second full screenshot-and-write-results pass racing its own browser/test run. `run()` must
// only fire when this file itself is the process entry point (`pnpm exec tsx
// qa/tests/e2e/visual/capture-f10-screens.ts`), not on every `import`.
const isMainModule =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMainModule) {
  run().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
