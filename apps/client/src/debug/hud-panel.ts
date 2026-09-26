/**
 * The `hud=1` debug panel (docs/tech/F02-map-location-spike.md section 10.5, gps-trace-format.md
 * 4.1/4.2): renders live FPS/battery/byte/accuracy/gap/latency numbers, and the two export buttons
 * (`summary` CSV, opt-in raw trace). Dynamically imported by `main.ts` only when `hud=1` (never
 * shipped in the production JS bundle otherwise, keeping the S5 budget clean for the common case —
 * P1-F02-T11 acceptance: "ถ้าเกิน ลอง code-splitting / lazy HUD").
 *
 * DOM-only glue (like `ui/gps-ui.ts`, `map/location-layer.ts`): covered directly only where
 * `hud-panel.test.ts` opts into a DOM (`// @vitest-environment happy-dom`, P2-F04-T25/ADR 0003
 * 8.4); its pure math (`debug/stats.ts`, `debug/csv-export.ts`, `debug/fps-sampler.ts`,
 * `debug/raw-trace-export.ts`, `debug/wake-lock.ts`, `debug/vibrate.ts`,
 * `debug/visibility-tracker.ts`, `debug/probe-summary.ts`) is unit-tested on its own. Also covered
 * by e2e (`apps/client/e2e/`).
 */
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { LocationSample } from '@keep-walking/location';
import type { HudMeasurementConfig } from '../config/runtime';
import type { CheckInConfig, MovementGateConfig } from '../config/balance';
import { getByteTotals, computeJsBytes } from './byte-counter';
import {
  computeAccuracyStats,
  computeGapStats,
  computeGateWindows,
  computePathLengthM,
  computeSampleIntervalMedianS,
  computeStationaryAccumM,
  computeTtffS,
  percentile,
} from './stats';
import type { HudSample, HudSegment } from './stats';
import { FpsAccumulator, startFpsSampler } from './fps-sampler';
import type { FpsSamplerHandle } from './fps-sampler';
import { readBatteryLevel, parseManualBatteryPct } from './battery';
import type { BatterySource } from './battery';
import { buildSummaryCsv } from './csv-export';
import type { SummaryRow } from './csv-export';
import { sanitizeRawTrace } from './raw-trace-export';
import { detectPlatform } from './platform';
import { WakeLockProbe } from './wake-lock';
import { triggerVibrate } from './vibrate';
import { VisibilityTracker } from './visibility-tracker';
import { buildProbeSummaryText } from './probe-summary';
import type { WakeLockEventLog } from './probe-summary';

const REDRAW_INTERVAL_MS = 1000;
const MS_PER_SECOND = 1000;
const MEDIAN_PERCENTILE = 50;
const HUD_PANEL_ID = 'hud-panel';
const ENVIRONMENT_OPTIONS: readonly SummaryRow['environment'][] = ['park', 'soi', 'other'];
const SEGMENT_OPTIONS: readonly HudSegment[] = ['all', 'screen_on', 'pocket', 'stationary'];

export interface HudPanelDeps {
  readonly map: MapLibreMap | undefined;
  readonly hudMeasurement: HudMeasurementConfig;
  readonly movementGate: MovementGateConfig;
  readonly checkIn: CheckInConfig;
  readonly sessionId: string;
  readonly appVersion: string;
  readonly tilesetId: string | undefined;
  /** `config/app/privacy.json#rawTraceExport` (`config/runtime.ts`'s `AppPrivacyConfig`): the raw
   * trace export button's trim distance and coordinate rounding. */
  readonly rawTraceTrim_m: number;
  readonly coordinateDecimals: number;
  /** `config/app/client.json#probe.vibrateTestPattern_ms` (P2-F04-T10, F-17): the single vibration
   * length the HUD's "test vibrate" button asks for — never a literal in this file. */
  readonly vibrateTestPattern_ms: number;
  /** Called with every redraw's row (once a second) — `main.ts` uses this to mirror the latest
   * numbers onto `window.__kwSpike.hud` (`debug/spike-hook.ts`) for the tech gate's e2e checks. */
  readonly onUpdate?: (row: SummaryRow) => void;
}

export interface HudPanel {
  recordSample(sample: LocationSample): void;
  recordProviderStart(): void;
  recordMapLoaded(): void;
  dispose(): void;
}

function downloadTextFile(fileName: string, contents: string, mimeType: string): void {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** How long a "just recentred" flag stays true after a sample, for follow-mode FPS sampling: the
 * project's own camera never animates (`fadeDuration: 0`, `easeTo({duration: 0})` — design/ux/
 * tokens.json "ห้าม animation ต่อเนื่องบนแผนที่"), so there is no multi-frame ease to sample the way
 * the tech note's ideal describes; this instead samples the handful of frames MapLibre still needs
 * to redraw the moved viewport right after each snap. An internal implementation constant, not a
 * config value (same category as `ui/gps-ui.ts`'s `TOAST_AUTO_HIDE_MS`): open to a tech-lead/
 * UX-driven number once a real device profile exists.
 */
const FOLLOW_ACTIVE_WINDOW_MS = 500;

export function mountHudPanel(container: HTMLElement, deps: HudPanelDeps): HudPanel {
  const samples: HudSample[] = [];
  /** `Date.now() - sample.timestamp` recorded at the moment `recordSample` is called, i.e. right
   * after `map/location-layer.ts`'s `setData` for that sample (tech note 10.5 row "ความหน่วง":
   * "เวลาที่จุดขยับ − เวลา fix"). An approximation of "first render frame after the point moved",
   * not an exact one (no DOM render-callback hook here) — negative values (clock skew) are dropped,
   * matching the tech note's own "ค่าติดลบ ... ตัดทิ้ง". */
  const latenciesMs: number[] = [];
  let providerStartedAtMs: number | undefined;
  let mapLoadedAtMs: number | undefined;
  let followActiveUntil = 0;
  let batteryStartPct: number | undefined;
  let batteryStartSource: BatterySource = 'none';
  let batteryEndPct: number | undefined;
  let batteryEndSource: BatterySource = 'none';
  /** Set by the HUD's own `<select>`s (P2-F04-T10): a human tester picks these before/while
   * walking a segment (gps-trace-format.md 4.1 rows `environment`/`segment`) — never inferred by
   * the code, since only the tester on the ground knows which park/soi they are in. */
  let environment: SummaryRow['environment'] = 'other';
  let segment: HudSegment = 'all';
  const startedAtWallMs = Date.now();
  const visibility = new VisibilityTracker(document.visibilityState === 'hidden', startedAtWallMs);
  const wakeLockEvents: WakeLockEventLog[] = [];
  const wakeLockProbe = new WakeLockProbe(navigator, {
    onStateChange: (state, detail) => {
      wakeLockEvents.push({ atRelativeMs: Date.now() - startedAtWallMs, state, detail });
      redrawWakeLockReadout();
    },
  });
  let vibrateSupported: boolean | undefined;
  let vibrateTriggered: boolean | undefined;

  const panFps = new FpsAccumulator(
    deps.hudMeasurement.fpsMaxFrameGap_ms,
    deps.hudMeasurement.fpsLowPercentile,
  );
  const followFps = new FpsAccumulator(
    deps.hudMeasurement.fpsMaxFrameGap_ms,
    deps.hudMeasurement.fpsLowPercentile,
  );
  const panHandle: FpsSamplerHandle = startFpsSampler(panFps, () => deps.map?.isMoving() ?? false);
  const followHandle: FpsSamplerHandle = startFpsSampler(
    followFps,
    () => performance.now() < followActiveUntil,
  );

  void readBatteryLevel().then((reading) => {
    batteryStartPct = reading.pct;
    batteryStartSource = reading.source;
    batteryEndPct = reading.pct;
    batteryEndSource = reading.source;
  });

  const panel = document.createElement('div');
  panel.id = HUD_PANEL_ID;
  const readout = document.createElement('pre');
  readout.id = 'hud-panel-readout';

  function selectFor(id: string, options: readonly string[]): HTMLSelectElement {
    const select = document.createElement('select');
    select.id = id;
    for (const option of options) {
      const optionEl = document.createElement('option');
      optionEl.value = option;
      optionEl.textContent = option;
      select.append(optionEl);
    }
    return select;
  }

  const environmentSelect = selectFor('hud-environment', ENVIRONMENT_OPTIONS);
  environmentSelect.value = environment;
  const segmentSelect = selectFor('hud-segment', SEGMENT_OPTIONS);
  segmentSelect.value = segment;

  const exportSummaryButton = document.createElement('button');
  exportSummaryButton.id = 'hud-export-summary';
  exportSummaryButton.textContent = 'Export summary CSV';
  const exportRawButton = document.createElement('button');
  exportRawButton.id = 'hud-export-raw';
  exportRawButton.textContent = 'Export raw trace (opt-in)';
  const manualBatteryInput = document.createElement('input');
  manualBatteryInput.id = 'hud-manual-battery';
  manualBatteryInput.type = 'number';
  manualBatteryInput.placeholder = 'battery %';

  const wakeLockRequestButton = document.createElement('button');
  wakeLockRequestButton.id = 'hud-wake-lock-request';
  wakeLockRequestButton.textContent = 'Request Wake Lock';
  const wakeLockReleaseButton = document.createElement('button');
  wakeLockReleaseButton.id = 'hud-wake-lock-release';
  wakeLockReleaseButton.textContent = 'Release Wake Lock';
  const wakeLockReadout = document.createElement('span');
  wakeLockReadout.id = 'hud-wake-lock-readout';

  const vibrateButton = document.createElement('button');
  vibrateButton.id = 'hud-vibrate-test';
  vibrateButton.textContent = 'Test vibrate';
  const vibrateReadout = document.createElement('span');
  vibrateReadout.id = 'hud-vibrate-readout';

  const exportProbeButton = document.createElement('button');
  exportProbeButton.id = 'hud-export-probe';
  exportProbeButton.textContent = 'Export probe summary';

  panel.append(
    readout,
    environmentSelect,
    segmentSelect,
    manualBatteryInput,
    wakeLockRequestButton,
    wakeLockReleaseButton,
    wakeLockReadout,
    vibrateButton,
    vibrateReadout,
    exportSummaryButton,
    exportRawButton,
    exportProbeButton,
  );
  container.appendChild(panel);

  function redrawWakeLockReadout(): void {
    wakeLockReadout.textContent = `wake lock: ${wakeLockProbe.getState()}`;
  }
  redrawWakeLockReadout();

  environmentSelect.addEventListener('change', () => {
    environment = environmentSelect.value as SummaryRow['environment'];
  });
  segmentSelect.addEventListener('change', () => {
    segment = segmentSelect.value as HudSegment;
  });

  manualBatteryInput.addEventListener('change', () => {
    const pct = parseManualBatteryPct(manualBatteryInput.value);
    if (pct === undefined) {
      return;
    }
    if (batteryStartSource !== 'api' && batteryStartPct === undefined) {
      batteryStartPct = pct;
      batteryStartSource = 'manual';
    }
    batteryEndPct = pct;
    batteryEndSource = 'manual';
  });

  wakeLockRequestButton.addEventListener('click', () => {
    void wakeLockProbe.request();
  });
  wakeLockReleaseButton.addEventListener('click', () => {
    void wakeLockProbe.release();
  });

  vibrateButton.addEventListener('click', () => {
    const result = triggerVibrate(navigator, deps.vibrateTestPattern_ms);
    vibrateSupported = result.supported;
    vibrateTriggered = result.triggered;
    vibrateReadout.textContent = result.supported
      ? `vibrate: triggered=${String(result.triggered)}`
      : 'vibrate: unsupported';
  });

  function handleVisibilityChange(): void {
    visibility.setHidden(document.visibilityState === 'hidden', Date.now());
  }
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('pagehide', handleVisibilityChange);

  exportProbeButton.addEventListener('click', () => {
    const now = Date.now();
    const snapshot = visibility.snapshot(now);
    const text = buildProbeSummaryText({
      sessionId: deps.sessionId,
      wakeLockSupported: wakeLockProbe.getState() !== 'unsupported',
      wakeLockEvents,
      vibrateSupported,
      vibrateTriggered,
      hiddenTotalS: snapshot.hiddenTotalMs / MS_PER_SECOND,
      samplesWhileHidden: snapshot.samplesWhileHidden,
      samplesWhileVisible: snapshot.samplesWhileVisible,
      batteryStartPct,
      batteryEndPct,
      batterySource: batteryEndSource,
      elapsedS: (now - startedAtWallMs) / MS_PER_SECOND,
    });
    downloadTextFile(`probe-${deps.sessionId}.txt`, text, 'text/plain');
  });

  function buildSummaryRow(): SummaryRow {
    const now = Date.now();
    const startedAt = providerStartedAtMs ?? samples[0]?.timestamp ?? now;
    const duration_s = (now - startedAt) / MS_PER_SECOND;
    const accuracy = computeAccuracyStats(
      samples,
      startedAt,
      deps.hudMeasurement.accuracyWarmup_s,
      deps.hudMeasurement.accuracyHighPercentile,
    );
    const gaps = computeGapStats(samples, deps.hudMeasurement.sampleGap_s, duration_s);
    const gate = computeGateWindows(
      samples,
      deps.movementGate,
      deps.hudMeasurement.gateWindowStep_s,
    );
    const stationary = computeStationaryAccumM(samples, deps.movementGate);
    const pan = panFps.stats();
    const follow = followFps.stats();
    const jsBytes = computeJsBytes();
    const byteTotals = getByteTotals();
    const bytesPerMb = deps.hudMeasurement.bytesPerMegabyte;
    const mbJs = jsBytes.bytes / bytesPerMb;
    const mbStyle = byteTotals.style / bytesPerMb;
    const mbTiles = byteTotals.tiles / bytesPerMb;
    const batteryDrain =
      batteryStartPct !== undefined &&
      batteryEndPct !== undefined &&
      duration_s >= deps.hudMeasurement.batteryMinSegment_s
        ? ((batteryStartPct - batteryEndPct) * deps.hudMeasurement.batteryNormalizeWindow_s) /
          duration_s
        : undefined;

    return {
      sessionId: deps.sessionId,
      appVersion: deps.appVersion,
      tilesetId: deps.tilesetId,
      platform: detectPlatform(navigator.userAgent),
      environment,
      segment,
      localHour: new Date(startedAt).getHours(),
      durationS: duration_s,
      fpsPanAvg: pan.avg,
      fpsPanP5: pan.lowPercentile,
      fpsFollowAvg: follow.avg,
      fpsFollowP5: follow.lowPercentile,
      movingTimePanS: pan.movingTimeS,
      movingTimeFollowS: follow.movingTimeS,
      batteryStartPct,
      batteryEndPct,
      batteryDrainPer30MinPct: batteryDrain,
      batterySource: batteryEndSource,
      mbJs,
      mbStyle,
      mbTiles,
      mbTotal: mbJs + mbStyle + mbTiles,
      bytesMethod: jsBytes.method,
      timeToFirstMapMs: mapLoadedAtMs,
      sampleCount: samples.length,
      sampleIntervalMedianS: computeSampleIntervalMedianS(samples),
      ttff30mS:
        providerStartedAtMs !== undefined
          ? computeTtffS(samples, providerStartedAtMs, deps.checkIn.maxAccuracy_m)
          : undefined,
      accuracyMedianM: accuracy.median_m,
      accuracyP90M: accuracy.highPercentile_m,
      accuracyMaxM: accuracy.max_m,
      gapCount10s: gaps.count,
      gapTotalS: gaps.total_s,
      gapPct: gaps.pct,
      pathLengthM: computePathLengthM(samples),
      gateWindowsTotal: gate.windowsTotal,
      gateWindowsPass: gate.windowsPass,
      gateWindowsPassPct: gate.windowsPassPct,
      stationary5MinAccumM: stationary.accumM,
      gateWindowsPassFiltered: gate.windowsPassFiltered,
      gateWindowsPassFilteredPct: gate.windowsPassFilteredPct,
      stationary5MinAccumFilteredM: stationary.accumFilteredM,
      latencyMedianMs: percentile(
        [...latenciesMs].sort((a, b) => a - b),
        MEDIAN_PERCENTILE,
      ),
      latencyP90Ms: percentile(
        [...latenciesMs].sort((a, b) => a - b),
        deps.hudMeasurement.latencyHighPercentile,
      ),
    };
  }

  function redraw(): void {
    void readBatteryLevel().then((reading) => {
      if (reading.source === 'api') {
        batteryEndPct = reading.pct;
        batteryEndSource = 'api';
        batteryStartPct ??= reading.pct;
        if (batteryStartSource === 'none') {
          batteryStartSource = 'api';
        }
      }
    });
    const row = buildSummaryRow();
    readout.textContent = Object.entries(row)
      .map(([key, value]) => `${key}: ${value ?? ''}`)
      .join('\n');
    deps.onUpdate?.(row);
  }

  const intervalHandle = setInterval(redraw, REDRAW_INTERVAL_MS);
  redraw();

  exportSummaryButton.addEventListener('click', () => {
    const csv = buildSummaryCsv([buildSummaryRow()]);
    downloadTextFile(`summary-${deps.sessionId}.csv`, csv, 'text/csv');
  });

  exportRawButton.addEventListener('click', () => {
    const result = sanitizeRawTrace(samples, {
      rawTraceTrim_m: deps.rawTraceTrim_m,
      coordinateDecimals: deps.coordinateDecimals,
      sessionId: deps.sessionId,
    });
    if (!result.ok) {
      console.warn('hud: raw trace export refused:', result.reason);
      return;
    }
    downloadTextFile(
      `field-${deps.sessionId}.trace.json`,
      JSON.stringify(result.trace),
      'application/json',
    );
  });

  return {
    recordSample(sample: LocationSample): void {
      samples.push({
        timestamp: sample.timestamp,
        lat: sample.lat,
        lng: sample.lng,
        accuracy: sample.accuracy,
        // Tagged with whatever the tester's segment picker reads *now* (P2-F04-T10): a sample
        // recorded while `segment === 'stationary'` is what `computeStationaryAccumM` looks at.
        segment,
      });
      const latency = Date.now() - sample.timestamp;
      if (latency >= 0) {
        latenciesMs.push(latency);
      }
      followActiveUntil = performance.now() + FOLLOW_ACTIVE_WINDOW_MS;
      visibility.recordSample(Date.now());
    },
    recordProviderStart(): void {
      providerStartedAtMs = Date.now();
    },
    recordMapLoaded(): void {
      mapLoadedAtMs = performance.now();
    },
    dispose(): void {
      clearInterval(intervalHandle);
      panHandle.stop();
      followHandle.stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('pagehide', handleVisibilityChange);
      panel.remove();
    },
  };
}
