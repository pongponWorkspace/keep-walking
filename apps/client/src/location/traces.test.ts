import { describe, expect, it } from 'vitest';
import { listTraceIds, loadTraceById } from './traces';

describe('listTraceIds', () => {
  it('lists every committed synthetic trace, sorted', () => {
    const ids = listTraceIds();
    expect(ids).toContain('synthetic-park-loop-01');
    expect(ids).toContain('synthetic-permission-denied-01');
    expect([...ids].sort()).toEqual(ids);
  });

  // P2-F05-T10: the e2e-only fixture must never change `traceWhenUnset: firstInList`'s default —
  // it is not part of the committed list at all, on purpose (traces.ts's own doc comment).
  it('never includes an apps/client/e2e/fixtures trace', () => {
    expect(listTraceIds()).not.toContain('e2e-full-run-01');
  });
});

describe('loadTraceById', () => {
  it('loads and validates a real committed trace', async () => {
    const trace = await loadTraceById('synthetic-park-loop-01');
    expect(trace.meta.id).toBe('synthetic-park-loop-01');
    expect(trace.samples.length).toBeGreaterThan(0);
  });

  it('throws a clear error for an unknown id', async () => {
    await expect(loadTraceById('does-not-exist')).rejects.toThrow(/not found/);
  });

  // P2-F05-T10: resolves through the e2e-fixtures fallback even though the id is absent from
  // `listTraceIds()` (an e2e spec always passes `?trace=` explicitly, never relies on the default).
  it('loads an apps/client/e2e/fixtures trace by id', async () => {
    const trace = await loadTraceById('e2e-full-run-01');
    expect(trace.meta.id).toBe('e2e-full-run-01');
    expect(trace.samples.length).toBeGreaterThan(0);
  });
});
