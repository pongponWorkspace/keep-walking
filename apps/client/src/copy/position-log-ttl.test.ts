import { describe, expect, it } from 'vitest';
import { positionLogTtlText } from './position-log-ttl';
import { formatCopyText } from './format';
import { balancePrivacyConfig } from '../config/balance';

const SECONDS_PER_HOUR = 3600;

describe('positionLogTtlText (F06-TG-03: reads config/balance/privacy.json, never a hardcoded 24)', () => {
  it('formats through unit.hours from config/balance/privacy.json#positionLogTtl_s', () => {
    expect(positionLogTtlText()).toBe(
      formatCopyText('unit.hours', {
        value: balancePrivacyConfig.positionLogTtl_s / SECONDS_PER_HOUR,
      }),
    );
    // Matches CLAUDE.md non-negotiable 7 (24h TTL) at today's config value, without this test
    // hardcoding a second copy of that number.
    expect(balancePrivacyConfig.positionLogTtl_s / SECONDS_PER_HOUR).toBe(24);
  });
});
