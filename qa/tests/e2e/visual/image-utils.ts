/**
 * P2-H41 (V-36): shared PNG helpers for the F04-F06 visual-gate screenshot set.
 *
 * Grayscale copies are produced with a plain `<canvas>` in a throwaway Playwright page rather
 * than an image-processing npm dependency — headless Chromium already has 2D canvas support, so
 * this needs nothing beyond `@playwright/test`, which every other e2e/QA script here already
 * depends on (no new package, no lockfile change).
 */
import type { Browser, Page } from '@playwright/test';

/** Desaturates a PNG buffer (ITU-R BT.601 luma weights, the same coefficients most "convert to
 * grayscale for a contrast/legibility check" tooling uses) by drawing it into an offscreen canvas
 * inside a scratch page, so the caller's own capture page/context is never touched. */
export async function toGrayscalePng(browser: Browser, pngBuffer: Buffer): Promise<Buffer> {
  const page = await browser.newPage();
  try {
    const dataUrl = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    const grayDataUrl = await page.evaluate(async (src: string) => {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('grayscale: image failed to load'));
        img.src = src;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx === null) throw new Error('grayscale: 2d context unavailable');
      ctx.drawImage(img, 0, 0);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = frame.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i] ?? 0;
        const g = data[i + 1] ?? 0;
        const b = data[i + 2] ?? 0;
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      ctx.putImageData(frame, 0, 0);
      return canvas.toDataURL('image/png');
    }, dataUrl);
    const commaIndex = grayDataUrl.indexOf(',');
    return Buffer.from(grayDataUrl.slice(commaIndex + 1), 'base64');
  } finally {
    await page.close();
  }
}

const MAX_PNG_BYTES = 300_000;

/** Takes a PNG screenshot, retrying once at `deviceScaleFactor: 1` if the first attempt is over
 * the 300 KB budget (V-36's own instruction: "ถ้าเกิน ลด device scale เป็น 1"). Returns the bytes
 * actually used to report in the index/README. */
export async function screenshotWithBudget(
  page: Page,
): Promise<{
  readonly buffer: Buffer;
  readonly deviceScaleFactorUsed: number;
  readonly bytes: number;
}> {
  let buffer = await page.screenshot({ type: 'png' });
  if (buffer.length <= MAX_PNG_BYTES) {
    const dpr = await page.evaluate(() => window.devicePixelRatio);
    return { buffer, deviceScaleFactorUsed: dpr, bytes: buffer.length };
  }
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: page.viewportSize()?.width ?? 390,
    height: page.viewportSize()?.height ?? 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  buffer = await page.screenshot({ type: 'png' });
  await cdp.detach();
  return { buffer, deviceScaleFactorUsed: 1, bytes: buffer.length };
}
