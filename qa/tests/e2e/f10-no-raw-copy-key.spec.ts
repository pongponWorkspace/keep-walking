// P2-X67 (acceptance 1; copy gate finding F-01b, design/reviews/F10-copy-gate.md): "เพิ่มการตรวจ
// key ที่ code อ้างต้องมีใน copy ... และ e2e ตรวจข้อความรูป `area.key` บนจอ". `lint:copy` only
// checks that every key *declared* in `copy.th.json` is well-formed and used somewhere — it never
// notices a `getCopyText('some.keyThatDoesNotExist')` call site, because `copy/load.ts`'s own
// fallback (TL-N06, reused by `f04-f05-no-raw-copy-key.spec.ts`'s own doc comment) is to render the
// key itself rather than throw. That is exactly how `story.headerLabel` reached three screenshots
// in copy gate round 1 (`story-screen.ts:53` reading a key nobody had written yet) while every
// other check in this repo stayed green.
//
// This spec drives every real F10 screen named in the task brief (start, login, email/register/
// forgot, create-character, story 1-5, map+nav, coming soon x3, settings, popup logout x2) through
// the exact same navigation `qa/tests/e2e/visual/capture-f10-screens.ts` uses for its screenshots
// (imported, not re-typed -- the same "one real navigation path, not two copies that can drift"
// reasoning `capture-f10-screens.ts`'s own new doc comment on `newCtxPage` gives), and asserts the
// page's own rendered (visible) text never contains a token shaped like a raw copy key: the exact
// pattern the task brief gives, `^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$` (e.g. `story.headerLabel`,
// `account.loginHeader`) -- never a hand-picked namespace list (unlike
// `f04-f05-no-raw-copy-key.spec.ts`'s own `NAMESPACES`-derived pattern), so this also catches a key
// from a namespace that does not exist in `copy.th.json` at all (the exact shape of the F-01 bug:
// `story.headerLabel` was never declared anywhere, so a namespace-derived pattern would have missed
// it too if `story.` happened not to be a real prefix).
import { chromium, expect, test } from '@playwright/test';
import type { Browser, Page } from '@playwright/test';
import {
  reachComingSoon,
  reachCreateCharacterFresh,
  reachCreateCharacterNameInvalid,
  reachForgot,
  reachLogin,
  reachLoginEmail,
  reachLogoutConfirmInRun,
  reachLogoutConfirmOutsideRun,
  reachMapNav,
  reachRegister,
  reachSettingsMenu,
  reachStart,
  reachStorySlide,
} from './visual/capture-f10-screens';

/** Exactly the pattern the task brief gives -- a raw, un-substituted copy key always looks like
 * this (`copy/load.ts`'s own "unknown key -> render the key itself" fallback): a lowercase-started
 * identifier, one or more `.identifier` segments, nothing else around it once isolated from
 * surrounding Thai text/punctuation/whitespace. */
const RAW_KEY_PATTERN = /^[a-z][A-Za-z0-9]*(\.[A-Za-z0-9]+)+$/;
/** Candidate tokens to test the pattern against: any run of ASCII letters/digits/dots. Splitting on
 * this (rather than on whitespace alone) matters because Thai script carries no spaces between
 * words -- a leaked key sitting directly next to Thai text with no space around it (as
 * `story.headerLabel` did inside this app's own `.consent-header-label` element) must still be
 * isolated as its own token, not swallowed into one giant unmatched line. `\w` in a JS regex
 * without `u`/`\p{}` is ASCII-only, so this already excludes Thai characters without any extra
 * Unicode handling. */
const CANDIDATE_TOKEN_PATTERN = /[A-Za-z0-9.]+/g;

/** Reads `document.body.innerText` (rendered/visible text only -- the same property this repo's
 * sibling `f04-f05-no-raw-copy-key.spec.ts` reads off its own scoped locators, here read off the
 * whole page since a raw key can appear in any F10 screen's header/body/button/banner) and asserts
 * no token on it looks like a raw copy key. */
async function expectNoRawCopyKeyOnScreen(page: Page, label: string): Promise<void> {
  const text = await page.locator('body').innerText();
  const tokens = text.match(CANDIDATE_TOKEN_PATTERN) ?? [];
  const leaks = [...new Set(tokens)].filter((t) => RAW_KEY_PATTERN.test(t));
  expect(leaks, `${label}: text on screen looks like a raw copy key: ${leaks.join(', ')}`).toEqual(
    [],
  );
}

interface Reached {
  readonly context: { close(): Promise<void> };
  readonly page: Page;
}
function assertReached<T extends Reached | { readonly reason: string }>(
  outcome: T,
  label: string,
): asserts outcome is Extract<T, Reached> {
  if (!('page' in outcome)) {
    throw new Error(`${label}: screen not reached (${outcome.reason})`);
  }
}

const WIDTH = 390;

test.describe('F10: no raw copy key visible on any screen (copy gate F-01b)', () => {
  let browser: Browser;
  test.beforeAll(async () => {
    browser = await chromium.launch();
  });
  test.afterAll(async () => {
    await browser.close();
  });

  const cases: readonly {
    readonly label: string;
    readonly reach: (b: Browser) => ReturnType<typeof reachStart>;
  }[] = [
    { label: 'start', reach: (b) => reachStart(b, WIDTH) },
    { label: 'login', reach: (b) => reachLogin(b, WIDTH) },
    { label: 'login-email', reach: (b) => reachLoginEmail(b, WIDTH) },
    { label: 'register', reach: (b) => reachRegister(b, WIDTH) },
    { label: 'forgot', reach: (b) => reachForgot(b, WIDTH) },
    { label: 'create-character-fresh', reach: (b) => reachCreateCharacterFresh(b, WIDTH) },
    {
      label: 'create-character-name-invalid',
      reach: (b) => reachCreateCharacterNameInvalid(b, WIDTH),
    },
    { label: 'story-slide-1', reach: (b) => reachStorySlide(b, WIDTH, 1) },
    { label: 'story-slide-2', reach: (b) => reachStorySlide(b, WIDTH, 2) },
    { label: 'story-slide-3', reach: (b) => reachStorySlide(b, WIDTH, 3) },
    { label: 'story-slide-4', reach: (b) => reachStorySlide(b, WIDTH, 4) },
    { label: 'story-slide-5', reach: (b) => reachStorySlide(b, WIDTH, 5) },
    { label: 'map-nav', reach: (b) => reachMapNav(b, WIDTH) },
    { label: 'coming-soon-upgrade', reach: (b) => reachComingSoon(b, WIDTH, 'upgrade') },
    { label: 'coming-soon-shop', reach: (b) => reachComingSoon(b, WIDTH, 'shop') },
    { label: 'coming-soon-party', reach: (b) => reachComingSoon(b, WIDTH, 'party') },
    { label: 'settings-menu', reach: (b) => reachSettingsMenu(b, WIDTH) },
    { label: 'logout-confirm-outside-run', reach: (b) => reachLogoutConfirmOutsideRun(b, WIDTH) },
    { label: 'logout-confirm-in-run', reach: (b) => reachLogoutConfirmInRun(b, WIDTH) },
  ];

  for (const { label, reach } of cases) {
    test(label, async () => {
      // `reachLogoutConfirmInRun` alone waits up to 30s for the confirm popup to become enterable
      // (its own comment: real engine ticks, not a fixed sleep) plus several more real-screen
      // transitions after that -- comfortably over the 30s default on a loaded machine (same
      // reasoning `f10-render-persistence.spec.ts` already documents for this sandbox).
      test.setTimeout(60_000);
      const outcome = await reach(browser);
      assertReached(outcome, label);
      try {
        await expectNoRawCopyKeyOnScreen(outcome.page, label);
      } finally {
        await outcome.context.close();
      }
    });
  }
});
