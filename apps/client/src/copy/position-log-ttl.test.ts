import { describe, expect, it } from 'vitest';
import { positionLogTtlText } from './position-log-ttl';
import { formatCopyText } from './format';

describe('positionLogTtlText', () => {
  it('formats through unit.hours (matching CLAUDE.md non-negotiable 7: 24h TTL)', () => {
    expect(positionLogTtlText()).toBe(formatCopyText('unit.hours', { value: 24 }));
  });
});
