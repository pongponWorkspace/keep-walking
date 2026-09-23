import { describe, expect, it } from 'vitest';
import { listTraceIds, loadTraceById } from './traces';

describe('listTraceIds', () => {
  it('lists every committed synthetic trace, sorted', () => {
    const ids = listTraceIds();
    expect(ids).toContain('synthetic-park-loop-01');
    expect(ids).toContain('synthetic-permission-denied-01');
    expect([...ids].sort()).toEqual(ids);
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
});
