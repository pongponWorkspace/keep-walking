import { describe, expect, it } from 'vitest';
import { buildProbeSummaryText } from './probe-summary';
import type { ProbeSummaryInput } from './probe-summary';

function input(overrides: Partial<ProbeSummaryInput> = {}): ProbeSummaryInput {
  return {
    sessionId: 'abcd1234',
    wakeLockSupported: true,
    wakeLockEvents: [],
    vibrateSupported: true,
    vibrateTriggered: true,
    hiddenTotalS: 0,
    samplesWhileHidden: 0,
    samplesWhileVisible: 10,
    batteryStartPct: 90,
    batteryEndPct: 85,
    batterySource: 'manual',
    elapsedS: 600,
    ...overrides,
  };
}

describe('buildProbeSummaryText', () => {
  it('never contains a coordinate-shaped field (D-088)', () => {
    const text = buildProbeSummaryText(input());
    expect(text).not.toMatch(/lat|lng|latitude|longitude/i);
  });

  it('includes the session id and every top-level probe result', () => {
    const text = buildProbeSummaryText(input());
    expect(text).toContain('session_id: abcd1234');
    expect(text).toContain('wake_lock_supported: true');
    expect(text).toContain('vibrate: supported');
    expect(text).toContain('vibrate_triggered: true');
    expect(text).toContain('battery_start_pct: 90');
    expect(text).toContain('battery_end_pct: 85');
    expect(text).toContain('battery_source: manual');
  });

  it('reports vibrate as unsupported without a triggered line when the API is absent', () => {
    const text = buildProbeSummaryText(
      input({ vibrateSupported: false, vibrateTriggered: undefined }),
    );
    expect(text).toContain('vibrate: unsupported');
    expect(text).not.toContain('vibrate_triggered');
  });

  it('lists every wake lock event with a relative timestamp, never an absolute epoch', () => {
    const text = buildProbeSummaryText(
      input({
        wakeLockEvents: [
          { atRelativeMs: 120, state: 'active', detail: undefined },
          { atRelativeMs: 4500, state: 'released', detail: 'os-or-browser' },
        ],
      }),
    );
    expect(text).toContain('wake_lock_event_at_120ms: active');
    expect(text).toContain('wake_lock_event_at_4500ms: released (os-or-browser)');
  });

  it('reports page-hidden totals and per-visibility sample counts', () => {
    const text = buildProbeSummaryText(
      input({ hiddenTotalS: 42, samplesWhileHidden: 3, samplesWhileVisible: 7 }),
    );
    expect(text).toContain('hidden_total_s: 42');
    expect(text).toContain('samples_while_hidden: 3');
    expect(text).toContain('samples_while_visible: 7');
  });

  it('is LF-only, never CRLF', () => {
    const text = buildProbeSummaryText(input());
    expect(text).not.toContain('\r');
  });
});
