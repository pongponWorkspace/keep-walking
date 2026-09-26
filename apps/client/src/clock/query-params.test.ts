import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseReplayStartParam, parseRunSeedParam, resolveReplayStartMs } from './query-params';

const BANGKOK_UTC_OFFSET_MIN = 420;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseReplayStartParam', () => {
  it('returns undefined when the param is absent', () => {
    expect(parseReplayStartParam('', 'start', BANGKOK_UTC_OFFSET_MIN)).toBeUndefined();
  });

  it('parses an integer epoch-ms string as-is', () => {
    expect(parseReplayStartParam('?start=1700000000000', 'start', BANGKOK_UTC_OFFSET_MIN)).toBe(
      1_700_000_000_000,
    );
  });

  it('parses a local YYYY-MM-DDTHH:mm string against the Bangkok offset (UTC+7)', () => {
    const ms = parseReplayStartParam('?start=2026-09-26T10:00', 'start', BANGKOK_UTC_OFFSET_MIN);
    expect(ms).toBe(Date.UTC(2026, 8, 26, 3, 0)); // 10:00 Bangkok = 03:00 UTC
  });

  it('warns and returns undefined for an unrecognized value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(
      parseReplayStartParam('?start=not-a-time', 'start', BANGKOK_UTC_OFFSET_MIN),
    ).toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('not-a-time'));
  });

  it('uses the configured param name, not a literal "start"', () => {
    expect(parseReplayStartParam('?begin=1700000000000', 'begin', BANGKOK_UTC_OFFSET_MIN)).toBe(
      1_700_000_000_000,
    );
  });
});

describe('resolveReplayStartMs', () => {
  it('falls back to now() when the param is absent', () => {
    expect(resolveReplayStartMs('', 'start', BANGKOK_UTC_OFFSET_MIN, () => 42)).toBe(42);
  });

  it('prefers the parsed param over now()', () => {
    expect(resolveReplayStartMs('?start=100', 'start', BANGKOK_UTC_OFFSET_MIN, () => 42)).toBe(100);
  });
});

describe('parseRunSeedParam', () => {
  it('returns undefined when absent', () => {
    expect(parseRunSeedParam('', 'seed')).toBeUndefined();
  });

  it('parses a plain non-negative integer', () => {
    expect(parseRunSeedParam('?seed=12345', 'seed')).toBe(12345);
  });

  it('accepts the maximum uint32 value', () => {
    expect(parseRunSeedParam('?seed=4294967295', 'seed')).toBe(4_294_967_295);
  });

  it('rejects a value above uint32 range', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parseRunSeedParam('?seed=4294967296', 'seed')).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('rejects a negative or non-integer value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(parseRunSeedParam('?seed=-1', 'seed')).toBeUndefined();
    expect(parseRunSeedParam('?seed=1.5', 'seed')).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
