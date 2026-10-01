import { describe, expect, it } from 'vitest';
import { createTelemetrySink, isTelemetryRecordArray } from './sink';
import type { TelemetrySinkDeps } from './sink';

const GUARD = { minDecimals: 4, latRange_deg: [5, 21] as const, lngRange_deg: [97, 106] as const };

function makeDeps(overrides: Partial<TelemetrySinkDeps> = {}): TelemetrySinkDeps {
  let t = 1000;
  return {
    config: { ringBufferMaxEvents: 3000, ringBufferMaxChars: 600000 },
    forbiddenPropertyNames: ['lat', 'lng', 'accuracy'],
    coordinateGuard: GUARD,
    knownEventNames: new Set(['dungeon_entered', 'dungeon_exited', 'local_data_cleared']),
    sessionId: 'abcd1234',
    platform: 'android-chrome',
    appVersion: 'deadbee',
    now: () => {
      t += 1;
      return t;
    },
    ...overrides,
  };
}

describe('createTelemetrySink', () => {
  it('records a known event with its properties and stamps client_ts_ms/session/platform/version', () => {
    const sink = createTelemetrySink(makeDeps());
    sink.record('dungeon_entered', { dungeon_id: 'pn-1' });
    expect(sink.snapshot()).toEqual([
      {
        event_name: 'dungeon_entered',
        client_ts_ms: 1001,
        session_id: 'abcd1234',
        platform: 'android-chrome',
        app_version: 'deadbee',
        properties: { dungeon_id: 'pn-1' },
      },
    ]);
  });

  it('drops an unknown event name without recording it', () => {
    const sink = createTelemetrySink(makeDeps());
    sink.record('made_up_event', {});
    expect(sink.snapshot()).toEqual([]);
  });

  it('still runs the C2-3 guard on a known event, so a bad caller cannot leak a coordinate', () => {
    const sink = createTelemetrySink(makeDeps());
    sink.record('dungeon_entered', { dungeon_id: 'pn-1', lat: 13.7563 });
    expect(sink.snapshot()[0]?.properties).toEqual({ dungeon_id: 'pn-1' });
    expect(sink.redactedCount).toBe(1);
  });

  it('evicts the oldest event once ringBufferMaxEvents is exceeded', () => {
    const sink = createTelemetrySink(
      makeDeps({ config: { ringBufferMaxEvents: 2, ringBufferMaxChars: 1_000_000 } }),
    );
    sink.record('dungeon_entered', { n: 1 });
    sink.record('dungeon_entered', { n: 2 });
    sink.record('dungeon_entered', { n: 3 });
    const snapshot = sink.snapshot();
    expect(snapshot).toHaveLength(2);
    expect(snapshot[0]?.properties).toEqual({ n: 2 });
    expect(snapshot[1]?.properties).toEqual({ n: 3 });
  });

  it('evicts the oldest events once ringBufferMaxChars is exceeded', () => {
    const sink = createTelemetrySink(
      makeDeps({ config: { ringBufferMaxEvents: 1000, ringBufferMaxChars: 1 } }),
    );
    sink.record('dungeon_entered', { n: 1 });
    sink.record('dungeon_exited', { n: 2 });
    // Every record is well over 1 char; only the newest can possibly fit under a 1-char budget,
    // and even that overflows — the point is that eviction stops the buffer from growing forever.
    expect(sink.snapshot().length).toBeLessThanOrEqual(1);
  });

  it('serialize()/restore() round-trip, and isTelemetryRecordArray validates the shape', () => {
    const sink = createTelemetrySink(makeDeps());
    sink.record('dungeon_entered', { dungeon_id: 'pn-1' });
    const json = sink.serialize();
    const parsed: unknown = JSON.parse(json);
    expect(isTelemetryRecordArray(parsed)).toBe(true);
    const restored = createTelemetrySink(makeDeps());
    if (isTelemetryRecordArray(parsed)) {
      restored.restore(parsed);
    }
    expect(restored.snapshot()).toEqual(sink.snapshot());
  });

  it('isTelemetryRecordArray rejects a non-array and a malformed record', () => {
    expect(isTelemetryRecordArray('not-an-array')).toBe(false);
    expect(isTelemetryRecordArray([{ event_name: 'x' }])).toBe(false);
  });

  it(
    'BUG-P2-006: an atMsOverride wins over now(), so a clock advancing on every call still ' +
      'stamps two paired record() calls with the identical client_ts_ms',
    () => {
      // `makeDeps()`'s own `now` advances by 1 on every call (the exact shape that produced the
      // flake: two independent `deps.now()` reads straddling a millisecond-clock tick) -- passing the
      // same captured timestamp to both calls must still land both records on one instant.
      const sink = createTelemetrySink(makeDeps());
      const pairedAtMs = 5_000;
      sink.record('dungeon_entered', { dungeon_id: 'pn-1' }, pairedAtMs);
      sink.record('dungeon_exited', { dungeon_id: 'pn-1' }, pairedAtMs);
      const [first, second] = sink.snapshot();
      expect(first?.client_ts_ms).toBe(pairedAtMs);
      expect(second?.client_ts_ms).toBe(pairedAtMs);
    },
  );

  it('with no atMsOverride, falls back to now() as before (unchanged default behaviour)', () => {
    const sink = createTelemetrySink(makeDeps());
    sink.record('dungeon_entered', { dungeon_id: 'pn-1' });
    expect(sink.snapshot()[0]?.client_ts_ms).toBe(1001);
  });

  it('clear() empties the buffer', () => {
    const sink = createTelemetrySink(makeDeps());
    sink.record('dungeon_entered', {});
    sink.clear();
    expect(sink.snapshot()).toEqual([]);
  });

  it('trimHalf() drops roughly the oldest half, keeping the newest', () => {
    const sink = createTelemetrySink(makeDeps());
    sink.record('dungeon_entered', { n: 1 });
    sink.record('dungeon_entered', { n: 2 });
    sink.record('dungeon_entered', { n: 3 });
    sink.record('dungeon_entered', { n: 4 });
    sink.trimHalf();
    expect(sink.snapshot().map((r) => r.properties)).toEqual([{ n: 3 }, { n: 4 }]);
  });
});
