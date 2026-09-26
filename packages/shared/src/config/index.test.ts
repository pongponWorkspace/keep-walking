import { describe, expect, it } from 'vitest';
import {
  ConfigPathError,
  configBool,
  configNum,
  configPath,
  configStr,
  configValueKeys,
  loadConfig,
} from './index';

describe('loadConfig', () => {
  it('loads the real config and passes the H03 raid schedule check', () => {
    expect(() => loadConfig()).not.toThrow();
  });

  it('namespaces balance.privacy and app.privacy to different files (P2-F05-T02 acceptance)', () => {
    const cfg = loadConfig();
    // config/balance/privacy.json: server-side PDPA value (CLAUDE.md non-negotiable 7).
    expect(configNum(cfg, 'balance.privacy.positionLogTtl_s')).toBe(86400);
    // config/app/privacy.json: on-device export trim, a different file with the same short name.
    expect(configNum(cfg, 'app.privacy.rawTraceExport.rawTraceTrim_m')).toBe(200);
  });

  it('reads config/balance/location.json (a file name only balance.* has)', () => {
    const cfg = loadConfig();
    expect(configNum(cfg, 'balance.location.homeState.maxAccuracy_m')).toBe(100);
  });

  it('reads booleans and lists non-metadata keys', () => {
    const cfg = loadConfig();
    expect(configBool(cfg, 'balance.drops.multipliers.lowTrustBlocksEpicAndAbove')).toBe(true);
    expect(configValueKeys(cfg, 'balance.drops.baseChancePerRewardTick_pct')).toEqual([
      'common',
      'uncommon',
      'rare',
      'epic',
      'legendary',
    ]);
  });

  it('rejects a path without a recognised namespace or file', () => {
    const cfg = loadConfig();
    expect(() => configPath(cfg, 'drops.baseChancePerRewardTick_pct.common')).toThrow(
      ConfigPathError,
    );
    expect(() => configPath(cfg, 'balance.notAFile.x')).toThrow(ConfigPathError);
    expect(() => configPath(cfg, 'appx.privacy.x')).toThrow(ConfigPathError);
  });

  it('reflects the raid schedule that H03 just checked', () => {
    const cfg = loadConfig();
    expect(configStr(cfg, 'balance.raid.schedule.startLocalTime')).toBe('16:00');
    expect(configStr(cfg, 'balance.raid.schedule.endLocalTime')).toBe('18:00');
  });
});
