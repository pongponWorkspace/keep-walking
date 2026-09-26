// Direct unit tests of PresenceStrategy selection (ADR 0003 section 7). The decision logic
// itself (checkInDecision / checkInBatch) is exercised exhaustively by
// design/systems/test-vectors/check-in.json through packages/shared/src/formulas/vectors.test.ts;
// this file covers the strategy dispatch and fail-closed behaviour those vectors do not touch.
import { describe, expect, it } from 'vitest';
import {
  NotImplementedError,
  UnknownVerificationModeError,
  selectPresenceStrategy,
} from './check-in';

const PARAMS = {
  minContinuousApproach_s: 60,
  maxAccuracy_m: 30,
  teleportIntoPolygonAllowed: false,
};
const CTX = {
  approach: { chainStartAt_ms: null, lastAt_ms: null, outsideSeenAt_ms: {} },
  latest: null,
  locked: false,
  dungeonId: 'pn-1',
};

describe('selectPresenceStrategy', () => {
  it('continuous_gps is implemented', () => {
    const strategy = selectPresenceStrategy('continuous_gps');
    expect(strategy.mode).toBe('continuous_gps');
    expect(strategy.checkIn(CTX, PARAMS)).toStrictEqual({
      ok: false,
      reason: 'poor_accuracy',
      readyIn_s: null,
    });
  });

  it('entry_exit fails closed with NotImplementedError (v1 is outdoor-only)', () => {
    const strategy = selectPresenceStrategy('entry_exit');
    expect(strategy.mode).toBe('entry_exit');
    expect(() => strategy.checkIn(CTX, PARAMS)).toThrow(NotImplementedError);
    expect(() => strategy.presence(null)).toThrow(NotImplementedError);
  });

  it('an unknown mode fails closed with UnknownVerificationModeError', () => {
    expect(() => selectPresenceStrategy('floor_plan_beacon')).toThrow(UnknownVerificationModeError);
  });

  it('presence() is an instant, stateless classification for display only', () => {
    const strategy = selectPresenceStrategy('continuous_gps');
    expect(strategy.presence(null)).toBe('unknown');
    expect(strategy.presence({ inside: true })).toBe('inside');
    expect(strategy.presence({ inside: false })).toBe('outside');
  });
});
