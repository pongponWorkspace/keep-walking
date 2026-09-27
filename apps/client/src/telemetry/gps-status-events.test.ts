/**
 * P2-X48 (product/telemetry-events.md section 3, P2-H50): `run_gps_status_changed` had a doc
 * spec but no emit point (tech gate F06 round 1, TG-12) — this is that emit point's coverage.
 *
 * `wireGpsStatusTelemetry` is tested against fake `GpsStatusTelemetrySource`/
 * `GpsStatusTelemetryNetworkSource` (never a real `GpsStatusTracker`/`windowNetworkStatus`, both DOM/
 * timer-driven — `gps-status.test.ts` already covers the tracker's own state machine; this file only
 * has to prove the *mapping and wiring* from that tracker's public surface to the telemetry record).
 * The last `describe` block is the "unit-level integration" the task brief allows in place of a real
 * e2e-through-a-download-button test: no telemetry-export UI exists yet to click in a browser
 * (`telemetry/export.ts`'s own doc comment: the Blob/anchor download is a future task, P2-F06-T09),
 * and `window.__kwSpike` (`debug/spike-hook.ts`, "the one thing e2e is allowed to read") does not
 * expose the telemetry sink — adding either is out of this task's "keep changes small, self-contained
 * in telemetry wiring" scope. Instead this exercises the real `createTelemetrySink` +
 * `buildTelemetryExport` pipeline this event actually flows through, end to end, with a Mock-run-shaped
 * GPS-drop sequence (searching -> low_accuracy -> restored -> offline -> restored, all inside a run).
 */
import { describe, expect, it } from 'vitest';
import type { GpsDisplayState, GpsToast } from '../copy/gps-state';
import {
  mapGpsDisplayToStatus,
  mapGpsToastToStatus,
  resolveGpsStatusContext,
  runGpsStatusChangedEvent,
  wireGpsStatusTelemetry,
  RUN_GPS_STATUSES,
  RUN_GPS_CONTEXTS,
  type GpsStatusTelemetryDeps,
  type RunGpsContext,
  type RunGpsStatus,
} from './gps-status-events';
import { createTelemetrySink } from './sink';
import { buildTelemetryExport } from './export';
import { KNOWN_EVENT_NAMES } from './known-events';
import { appTelemetryConfig } from '../config/telemetry';

describe('mapGpsDisplayToStatus (product/telemetry-events.md section 3, six-value enum)', () => {
  it('maps the doc own six canonical gps.* states 1:1', () => {
    expect(mapGpsDisplayToStatus('searching')).toBe('searching');
    expect(mapGpsDisplayToStatus('off')).toBe('off');
    expect(mapGpsDisplayToStatus('denied')).toBe('denied');
    expect(mapGpsDisplayToStatus('lowAccuracy')).toBe('low_accuracy');
  });

  it('none (nothing wrong shown) is not a status at all', () => {
    expect(mapGpsDisplayToStatus('none')).toBeNull();
  });

  it('unsupported (fatal, no seventh enum value in the doc) collapses to denied (assumption, see file doc comment)', () => {
    expect(mapGpsDisplayToStatus('unsupported')).toBe('denied');
  });

  it('every GpsDisplayState has an entry (exhaustive, catches a future new display state)', () => {
    const allDisplays: readonly GpsDisplayState[] = [
      'none',
      'searching',
      'off',
      'denied',
      'unsupported',
      'lowAccuracy',
    ];
    for (const display of allDisplays) {
      expect(() => mapGpsDisplayToStatus(display)).not.toThrow();
    }
  });
});

describe('mapGpsToastToStatus', () => {
  it('restored and suspended both report restored (doc has no separate "recovered from suspended" value)', () => {
    const toasts: readonly GpsToast[] = ['restored', 'suspended'];
    for (const toast of toasts) {
      expect(mapGpsToastToStatus(toast)).toBe('restored');
    }
  });
});

describe('resolveGpsStatusContext', () => {
  it('an active run always wins, even before a class exists (defensive; cannot happen in practice)', () => {
    expect(resolveGpsStatusContext(true, false)).toBe('run');
    expect(resolveGpsStatusContext(true, true)).toBe('run');
  });

  it('no run, no class chosen yet -> onboarding', () => {
    expect(resolveGpsStatusContext(false, false)).toBe('onboarding');
  });

  it('no run, class already chosen -> map (home/settings/between runs)', () => {
    expect(resolveGpsStatusContext(false, true)).toBe('map');
  });
});

describe('runGpsStatusChangedEvent', () => {
  it('carries exactly {status, context}, no coordinate-shaped or extra property', () => {
    const event = runGpsStatusChangedEvent('low_accuracy', 'run');
    expect(event.name).toBe('run_gps_status_changed');
    expect(Object.keys(event.properties).sort()).toEqual(['context', 'status']);
    expect(event.properties.status).toBe('low_accuracy');
    expect(event.properties.context).toBe('run');
  });

  it('every enum combination stays a plain string pair (RUN_GPS_STATUSES x RUN_GPS_CONTEXTS)', () => {
    for (const status of RUN_GPS_STATUSES) {
      for (const context of RUN_GPS_CONTEXTS) {
        const event = runGpsStatusChangedEvent(status, context);
        expect(typeof event.properties.status).toBe('string');
        expect(typeof event.properties.context).toBe('string');
      }
    }
  });
});

/** Fake `GpsStatusTelemetrySource` — a real `GpsStatusTracker`'s state machine is covered by
 * `gps-status.test.ts`; this only needs to look like its public surface. */
function fakeGps(initial: GpsDisplayState = 'none'): {
  readonly source: {
    readonly current: GpsDisplayState;
    onDisplayChange(listener: (display: GpsDisplayState) => void): () => void;
    onToast(listener: (toast: GpsToast) => void): () => void;
  };
  setDisplay(display: GpsDisplayState): void;
  fireToast(toast: GpsToast): void;
} {
  let current = initial;
  const displayListeners = new Set<(display: GpsDisplayState) => void>();
  const toastListeners = new Set<(toast: GpsToast) => void>();
  return {
    source: {
      get current() {
        return current;
      },
      onDisplayChange: (listener) => {
        displayListeners.add(listener);
        return () => displayListeners.delete(listener);
      },
      onToast: (listener) => {
        toastListeners.add(listener);
        return () => toastListeners.delete(listener);
      },
    },
    setDisplay(display) {
      current = display;
      displayListeners.forEach((listener) => listener(display));
    },
    fireToast(toast) {
      toastListeners.forEach((listener) => listener(toast));
    },
  };
}

function fakeNetwork(initiallyOnline: boolean): {
  readonly source: {
    isOnline(): boolean;
    subscribe(listener: (online: boolean) => void): () => void;
  };
  setOnline(online: boolean): void;
} {
  let online = initiallyOnline;
  const listeners = new Set<(online: boolean) => void>();
  return {
    source: {
      isOnline: () => online,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    },
    setOnline(next) {
      online = next;
      listeners.forEach((listener) => listener(next));
    },
  };
}

interface RecordedCall {
  readonly status: RunGpsStatus;
  readonly context: RunGpsContext;
}

function wire(
  gps: ReturnType<typeof fakeGps>['source'],
  network: ReturnType<typeof fakeNetwork>['source'],
  resolveContext: GpsStatusTelemetryDeps['resolveContext'],
): { readonly calls: RecordedCall[]; readonly dispose: () => void } {
  const calls: RecordedCall[] = [];
  const dispose = wireGpsStatusTelemetry({
    gps,
    network,
    resolveContext,
    record: (status, context) => calls.push({ status, context }),
  });
  return { calls, dispose };
}

describe('wireGpsStatusTelemetry', () => {
  it('emits the mapped status + current context on every display change, no debounce', () => {
    const gps = fakeGps('none');
    const network = fakeNetwork(true);
    const { calls } = wire(gps.source, network.source, () => 'run');
    gps.setDisplay('searching');
    gps.setDisplay('lowAccuracy');
    gps.setDisplay('off');
    gps.setDisplay('denied');
    expect(calls).toEqual([
      { status: 'searching', context: 'run' },
      { status: 'low_accuracy', context: 'run' },
      { status: 'off', context: 'run' },
      { status: 'denied', context: 'run' },
    ]);
  });

  it('never emits for a transition into none (nothing to report; restored comes from the toast)', () => {
    const gps = fakeGps('searching');
    const network = fakeNetwork(true);
    const { calls } = wire(gps.source, network.source, () => 'map');
    calls.length = 0; // drop the catch-up emit for the initial 'searching', not under test here
    gps.setDisplay('none');
    expect(calls).toEqual([]);
  });

  it('reads context fresh on every single emit, not once at wiring time', () => {
    const gps = fakeGps('none');
    const network = fakeNetwork(true);
    let context: RunGpsContext = 'onboarding';
    const { calls } = wire(gps.source, network.source, () => context);
    gps.setDisplay('searching');
    context = 'run';
    gps.setDisplay('off');
    expect(calls).toEqual([
      { status: 'searching', context: 'onboarding' },
      { status: 'off', context: 'run' },
    ]);
  });

  it('both toasts emit restored', () => {
    const gps = fakeGps('none');
    const network = fakeNetwork(true);
    const { calls } = wire(gps.source, network.source, () => 'run');
    gps.fireToast('restored');
    gps.fireToast('suspended');
    expect(calls).toEqual([
      { status: 'restored', context: 'run' },
      { status: 'restored', context: 'run' },
    ]);
  });

  it('network offline/online transitions emit offline/restored, deduped on a repeated same value', () => {
    const gps = fakeGps('none');
    const network = fakeNetwork(true);
    const { calls } = wire(gps.source, network.source, () => 'map');
    network.setOnline(true); // no real change: must not emit
    network.setOnline(false);
    network.setOnline(false); // repeated offline: must not double-emit
    network.setOnline(true);
    expect(calls).toEqual([
      { status: 'offline', context: 'map' },
      { status: 'restored', context: 'map' },
    ]);
  });

  it('catch-up: an already-bad GPS display and an already-offline network at wiring time both fire once immediately', () => {
    const gps = fakeGps('lowAccuracy');
    const network = fakeNetwork(false);
    const { calls } = wire(gps.source, network.source, () => 'run');
    expect(calls).toEqual([
      { status: 'low_accuracy', context: 'run' },
      { status: 'offline', context: 'run' },
    ]);
  });

  it('a healthy state at wiring time (none, online) never fires a catch-up event', () => {
    const gps = fakeGps('none');
    const network = fakeNetwork(true);
    const { calls } = wire(gps.source, network.source, () => 'map');
    expect(calls).toEqual([]);
  });

  it('dispose() stops every future emission', () => {
    const gps = fakeGps('none');
    const network = fakeNetwork(true);
    const { calls, dispose } = wire(gps.source, network.source, () => 'run');
    dispose();
    gps.setDisplay('off');
    gps.fireToast('restored');
    network.setOnline(false);
    expect(calls).toEqual([]);
  });
});

describe('run_gps_status_changed through the real sink + export pipeline (unit-level integration; see file doc comment for why not a browser e2e)', () => {
  it('a Mock-run-shaped GPS-drop sequence appears in the JSONL export with no coordinate/accuracy property', () => {
    let clock = 0;
    const sink = createTelemetrySink({
      config: appTelemetryConfig.localSink,
      forbiddenPropertyNames: appTelemetryConfig.export.forbiddenPropertyNames,
      coordinateGuard: appTelemetryConfig.export.coordinateLikeNumberGuard,
      knownEventNames: KNOWN_EVENT_NAMES,
      sessionId: 'a1b2c3d4',
      platform: 'web_android',
      appVersion: 'test',
      now: () => (clock += 1000),
    });

    const gps = fakeGps('none');
    const network = fakeNetwork(true);
    wireGpsStatusTelemetry({
      gps: gps.source,
      network: network.source,
      // Mid-run the whole time, matching the pocket-screen field-test scenario P2-H50 is about.
      resolveContext: () => 'run',
      record: (status, context) => {
        sink.record(runGpsStatusChangedEvent(status, context).name, { status, context });
      },
    });

    // searching -> low_accuracy (GPS occluded, e.g. in a pocket) -> restored -> offline (network
    // drop mid-run, movement still queued locally per CLAUDE.md) -> restored.
    gps.setDisplay('searching');
    gps.setDisplay('lowAccuracy');
    gps.fireToast('restored');
    network.setOnline(false);
    network.setOnline(true);

    const exported = buildTelemetryExport(
      sink.snapshot(),
      appTelemetryConfig.export.forbiddenPropertyNames,
      appTelemetryConfig.export.coordinateLikeNumberGuard,
    );
    const lines = exported.jsonl
      .split('\n')
      .filter((line) => line.length > 0)
      .map(
        (line) => JSON.parse(line) as { event_name: string; properties: Record<string, unknown> },
      );
    const gpsLines = lines.filter((line) => line.event_name === 'run_gps_status_changed');

    expect(gpsLines.map((line) => line.properties)).toEqual([
      { status: 'searching', context: 'run' },
      { status: 'low_accuracy', context: 'run' },
      { status: 'restored', context: 'run' },
      { status: 'offline', context: 'run' },
      { status: 'restored', context: 'run' },
    ]);
    // Every property key across every line is one of the two declared ones — no lat/lng/accuracy/
    // client_ts ever reached the sink or survived the export pass (redactedCount stays 0: nothing
    // needed redacting because this mapper never produced a forbidden key in the first place).
    for (const line of gpsLines) {
      expect(Object.keys(line.properties).sort()).toEqual(['context', 'status']);
    }
    expect(exported.redactedCount).toBe(0);
    expect(sink.redactedCount).toBe(0);
  });
});
