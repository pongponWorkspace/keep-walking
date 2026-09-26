// @vitest-environment happy-dom
/**
 * DOM-level tests for `hud-panel.ts` (P2-F04-T25, ADR 0003 section 8.4: `// @vitest-environment
 * happy-dom` opt-in). Previously this file had no Vitest-level coverage at all (only e2e,
 * `hud-panel.ts`'s own docblock said so) — this covers the two rows the board calls out by name:
 * S15 (latency: "เวลาที่จุดขยับ − timestamp ของ fix") and S3 (battery + the CSV export it feeds).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mountHudPanel } from './hud-panel';
import type { HudPanelDeps } from './hud-panel';

const HUD_MEASUREMENT = {
  accuracyWarmup_s: 60,
  sampleGap_s: 10,
  gateWindowStep_s: 30,
  fpsMaxFrameGap_ms: 1000,
  fpsLowPercentile: 5,
  accuracyHighPercentile: 90,
  latencyHighPercentile: 90,
  batteryNormalizeWindow_s: 1800,
  batteryMinSegment_s: 1200,
  bytesPerMegabyte: 1000000,
};
const MOVEMENT_GATE = {
  minDistancePerWindow_m: 50,
  window_s: 300,
  comparison: 'greaterThan' as const,
  filter: undefined,
};
const CHECK_IN = { maxAccuracy_m: 30 };

function deps(overrides: Partial<HudPanelDeps> = {}): HudPanelDeps {
  return {
    map: undefined,
    hudMeasurement: HUD_MEASUREMENT,
    movementGate: MOVEMENT_GATE,
    checkIn: CHECK_IN,
    sessionId: 'abcd1234',
    appVersion: 'deadbee',
    tilesetId: 'pm4-test',
    rawTraceTrim_m: 200,
    coordinateDecimals: 5,
    vibrateTestPattern_ms: 200,
    ...overrides,
  };
}

/** Reads the CSV Blob the export button builds, by intercepting `URL.createObjectURL` (happy-dom
 * implements `Blob`/its `.text()` but downloading a real file makes no sense in a test). */
async function clickExportAndReadCsv(container: HTMLElement): Promise<string> {
  let capturedText = '';
  const createSpy = vi
    .spyOn(URL, 'createObjectURL')
    .mockImplementation((obj: Blob | MediaSource) => {
      const blob = obj as Blob;
      void blob.text().then((text) => {
        capturedText = text;
      });
      return 'blob:mock';
    });
  const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  const button = container.querySelector<HTMLButtonElement>('#hud-export-summary');
  expect(button).not.toBeNull();
  button?.click();
  // Blob.text() resolves on a microtask; flush it before reading capturedText.
  await Promise.resolve();
  await Promise.resolve();
  createSpy.mockRestore();
  revokeSpy.mockRestore();
  return capturedText;
}

function sample(timestamp: number): {
  timestamp: number;
  lat: number;
  lng: number;
  accuracy: number;
} {
  return { timestamp, lat: 13.7563, lng: 100.4933, accuracy: 10 };
}

describe('mountHudPanel', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('mounts the readout, manual-battery input, and both export buttons', () => {
    const panel = mountHudPanel(container, deps());
    expect(container.querySelector('#hud-panel')).not.toBeNull();
    expect(container.querySelector('#hud-panel-readout')).not.toBeNull();
    expect(container.querySelector('#hud-manual-battery')).not.toBeNull();
    expect(container.querySelector('#hud-export-summary')).not.toBeNull();
    expect(container.querySelector('#hud-export-raw')).not.toBeNull();
    panel.dispose();
  });

  it('S15: records a non-negative latency (now - fix timestamp) per sample and reports it in the CSV', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    const panel = mountHudPanel(container, deps());
    await vi.advanceTimersByTimeAsync(0); // flush the initial readBatteryLevel() microtask

    panel.recordProviderStart();
    // Fix arrives "late": the point moves at now, 250ms after the fix's own timestamp.
    panel.recordSample(sample(1_700_000_000_000 - 250));
    vi.setSystemTime(1_700_000_000_100);
    panel.recordSample(sample(1_700_000_000_100 - 50));

    const csv = await clickExportAndReadCsv(container);
    const [headerLine, dataLine] = csv.split('\n');
    const header = (headerLine ?? '').split(',');
    const cells = (dataLine ?? '').split(',');
    const latencyMedian = Number(cells[header.indexOf('latency_median_ms')]);
    expect(latencyMedian).toBeGreaterThan(0);
    // debug/stats.ts's percentile() is nearest-rank, not linear interpolation: p50 of the two
    // ascending values [50, 250] is index ceil(0.5*2)-1 = 0, i.e. the smaller one.
    expect(latencyMedian).toBe(50);

    panel.dispose();
  });

  it('S15: a fix reported before "now" (negative latency, clock skew) is dropped, not counted', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    const panel = mountHudPanel(container, deps());
    await vi.advanceTimersByTimeAsync(0);

    panel.recordProviderStart();
    panel.recordSample(sample(1_700_000_000_000 + 1000)); // fix "from the future" -> negative latency

    const csv = await clickExportAndReadCsv(container);
    const [headerLine, dataLine] = csv.split('\n');
    const header = (headerLine ?? '').split(',');
    const cells = (dataLine ?? '').split(',');
    expect(cells[header.indexOf('latency_median_ms')]).toBe('');

    panel.dispose();
  });

  it('S3: a manual battery reading feeds battery_source/battery_drain_per30min_pct into the CSV', async () => {
    vi.useFakeTimers();
    const start = 1_700_000_000_000;
    vi.setSystemTime(start);
    const panel = mountHudPanel(container, deps());
    await vi.advanceTimersByTimeAsync(0); // flush the initial "none" battery read

    panel.recordProviderStart();
    const input = container.querySelector<HTMLInputElement>('#hud-manual-battery');
    expect(input).not.toBeNull();
    if (input === null) throw new Error('unreachable');

    input.value = '90';
    input.dispatchEvent(new Event('change'));

    // batteryMinSegment_s is 1200s: advance past it so battery_drain_per30min_pct is measured,
    // not left empty for "segment too short" (tech note 10.5).
    vi.setSystemTime(start + HUD_MEASUREMENT.batteryMinSegment_s * 1000 + 1000);
    input.value = '85';
    input.dispatchEvent(new Event('change'));

    const csv = await clickExportAndReadCsv(container);
    const [headerLine, dataLine] = csv.split('\n');
    const header = (headerLine ?? '').split(',');
    const cells = (dataLine ?? '').split(',');
    expect(cells[header.indexOf('battery_source')]).toBe('manual');
    expect(cells[header.indexOf('battery_start_pct')]).toBe('90');
    expect(cells[header.indexOf('battery_end_pct')]).toBe('85');
    const drain = Number(cells[header.indexOf('battery_drain_per30min_pct')]);
    expect(drain).toBeGreaterThan(0);

    panel.dispose();
  });

  it('S3/CSV: exports format_version 2 with no coordinate-shaped column, even with real samples recorded', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    const panel = mountHudPanel(container, deps());
    await vi.advanceTimersByTimeAsync(0);

    panel.recordProviderStart();
    panel.recordSample(sample(1_700_000_000_000));

    const csv = await clickExportAndReadCsv(container);
    const [headerLine] = csv.split('\n');
    const header = (headerLine ?? '').split(',');
    expect(header[0]).toBe('format_version');
    for (const forbidden of ['lat', 'lng', 'geohash']) {
      expect(header).not.toContain(forbidden);
    }
    expect(csv.split('\n')[1]?.startsWith('2,')).toBe(true);

    panel.dispose();
  });

  it('dispose() stops the redraw interval and removes the panel from the DOM', () => {
    const panel = mountHudPanel(container, deps());
    expect(container.querySelector('#hud-panel')).not.toBeNull();
    panel.dispose();
    expect(container.querySelector('#hud-panel')).toBeNull();
  });

  it('mounts the environment/segment selects, wake lock, vibrate and probe-export controls', () => {
    const panel = mountHudPanel(container, deps());
    expect(container.querySelector('#hud-environment')).not.toBeNull();
    expect(container.querySelector('#hud-segment')).not.toBeNull();
    expect(container.querySelector('#hud-wake-lock-request')).not.toBeNull();
    expect(container.querySelector('#hud-wake-lock-release')).not.toBeNull();
    expect(container.querySelector('#hud-vibrate-test')).not.toBeNull();
    expect(container.querySelector('#hud-export-probe')).not.toBeNull();
    panel.dispose();
  });

  it('picking environment/segment in the HUD feeds those exact values into the exported CSV row', async () => {
    const panel = mountHudPanel(container, deps());
    const environmentSelect = container.querySelector<HTMLSelectElement>('#hud-environment');
    const segmentSelect = container.querySelector<HTMLSelectElement>('#hud-segment');
    expect(environmentSelect).not.toBeNull();
    expect(segmentSelect).not.toBeNull();
    if (environmentSelect === null || segmentSelect === null) throw new Error('unreachable');

    environmentSelect.value = 'park';
    environmentSelect.dispatchEvent(new Event('change'));
    segmentSelect.value = 'stationary';
    segmentSelect.dispatchEvent(new Event('change'));

    const csv = await clickExportAndReadCsv(container);
    const [headerLine, dataLine] = csv.split('\n');
    const header = (headerLine ?? '').split(',');
    const cells = (dataLine ?? '').split(',');
    expect(cells[header.indexOf('environment')]).toBe('park');
    expect(cells[header.indexOf('segment')]).toBe('stationary');

    panel.dispose();
  });

  it('reports Wake Lock as unsupported when navigator.wakeLock does not exist (happy-dom/iOS Safari)', () => {
    const panel = mountHudPanel(container, deps());
    expect(container.querySelector('#hud-wake-lock-readout')?.textContent).toBe(
      'wake lock: unsupported',
    );
    panel.dispose();
  });

  it('the vibrate test button reports unsupported when navigator.vibrate does not exist', () => {
    const panel = mountHudPanel(container, deps());
    const button = container.querySelector<HTMLButtonElement>('#hud-vibrate-test');
    button?.click();
    expect(container.querySelector('#hud-vibrate-readout')?.textContent).toBe(
      'vibrate: unsupported',
    );
    panel.dispose();
  });

  it('the vibrate test button calls navigator.vibrate with the configured pattern when it exists', () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    const panel = mountHudPanel(container, deps({ vibrateTestPattern_ms: 321 }));

    container.querySelector<HTMLButtonElement>('#hud-vibrate-test')?.click();

    expect(vibrate).toHaveBeenCalledWith(321);
    expect(container.querySelector('#hud-vibrate-readout')?.textContent).toBe(
      'vibrate: triggered=true',
    );
    panel.dispose();
    Reflect.deleteProperty(navigator, 'vibrate');
  });

  it('exports a coordinate-free probe summary on click, including the vibrate result', async () => {
    const vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
    let capturedText = '';
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockImplementation((obj: Blob | MediaSource) => {
        void (obj as Blob).text().then((text) => {
          capturedText = text;
        });
        return 'blob:mock';
      });
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const panel = mountHudPanel(container, deps());
    container.querySelector<HTMLButtonElement>('#hud-vibrate-test')?.click();
    container.querySelector<HTMLButtonElement>('#hud-export-probe')?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(capturedText).toContain('session_id: abcd1234');
    expect(capturedText).toContain('vibrate: supported');
    expect(capturedText).toContain('vibrate_triggered: true');
    expect(capturedText).not.toMatch(/lat|lng|latitude|longitude/i);

    createSpy.mockRestore();
    revokeSpy.mockRestore();
    panel.dispose();
    Reflect.deleteProperty(navigator, 'vibrate');
  });
});
