// QA helper script (P1-H06, handoff from P1-F03-T13) — icon-grammar.md §6.3's mandated
// content-gate test: render the style tile / contact sheet as PNG, then simulate protanopia,
// deuteranopia, tritanopia, and achromatopsia via Chrome DevTools Protocol's
// `Emulation.setEmulatedVisionDeficiency` (Machado 2009 matrices — the same tool §6.3 names) and
// verify rarity (5 tiers) and class (4 classes) stay distinguishable by shape alone.
//
// CDP vision-deficiency emulation is Chromium-only (no WebKit/Firefox equivalent), so this uses
// `chromium` directly, not the two-engine split style-screenshots.spec.ts uses.
//
// Run: pnpm exec tsx qa/reports/F03/colorblind/capture-colorblind.spec.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import type { CDPSession, Page } from '@playwright/test';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..');
const OUT_DIR = import.meta.dirname;

type Deficiency = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
const DEFICIENCIES: readonly Deficiency[] = [
  'none',
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'achromatopsia',
];

interface Target {
  readonly name: string;
  readonly file: string;
  readonly width: number;
  readonly height: number;
}

const TARGETS: readonly Target[] = [
  {
    name: 'style-tile',
    file: 'art/ref/style-tile/style-tile.svg',
    width: 1440,
    height: 2720,
  },
  {
    name: 'contact-sheet-1x',
    file: 'art/ref/style-tile/contact-sheet-1x.svg',
    width: 620,
    height: 200,
  },
];

async function setDeficiency(cdp: CDPSession, type: Deficiency): Promise<void> {
  await cdp.send('Emulation.setEmulatedVisionDeficiency', { type });
}

async function capture(page: Page, target: Target, deficiency: Deficiency): Promise<string> {
  const fileName = `${target.name}--${deficiency}.png`;
  // No `fullPage: true`: the viewport is already set to the SVG's own intrinsic width/height
  // (both files' root <svg> has no <body> for Playwright's fullPage scroll-and-stitch logic to
  // measure, which hangs indefinitely on a bare SVG document — a plain viewport screenshot is
  // both correct and instant here).
  const buffer = await page.screenshot({ type: 'png' });
  writeFileSync(join(OUT_DIR, fileName), buffer);
  return fileName;
}

async function run(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const captured: string[] = [];

  for (const target of TARGETS) {
    const page = await browser.newPage({
      viewport: { width: target.width, height: target.height },
    });
    const cdp = await page.context().newCDPSession(page);
    await page.goto(pathToFileURL(join(REPO_ROOT, target.file)).href);
    // SVG has no raster/font-loading race (icon-grammar §8: no <image>, no external ref); one
    // frame is enough for layout to settle before the first screenshot.
    await page.waitForTimeout(50);

    for (const deficiency of DEFICIENCIES) {
      await setDeficiency(cdp, deficiency);
      await page.waitForTimeout(50); // let the compositor filter apply before capture
      const fileName = await capture(page, target, deficiency);
      captured.push(fileName);
      console.warn(`captured ${fileName}`);
    }
    await page.close();
  }

  await browser.close();
  console.warn(`done: ${captured.length} images`);
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
