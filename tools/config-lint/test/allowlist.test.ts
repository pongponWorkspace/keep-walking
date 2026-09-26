import { describe, expect, it } from 'vitest';
import type { AllowEntry } from '../src/allowlist';
import { applyAllowlist } from '../src/lint';
import type { Finding } from '../src/types';

const finding = (at: string, level: Finding['level'] = 'error'): Finding => ({
  level,
  rule: 'unit-suffix',
  file: 'config/balance/x.json',
  at,
  message: 'm',
});
const entry = (at: string): AllowEntry => ({
  rule: 'unit-suffix',
  file: 'config/balance/x.json',
  at,
  kind: 'in-flight',
  owner: 'systems-designer',
  task: 'P2-F05-T20',
  fix: 'rename',
});

describe('allowlist', () => {
  it('moves exact matches to allowed, keeps other errors, reports unused entries as stale', () => {
    const result = applyAllowlist(
      [finding('a'), finding('b'), finding('c', 'warn')],
      [entry('a'), entry('z')],
    );
    expect(result.errors.map((f) => f.at)).toEqual(['b']);
    expect(result.allowed.map((a) => a.finding.at)).toEqual(['a']);
    expect(result.warnings.map((f) => f.at)).toEqual(['c']);
    expect(result.stale.map((e) => e.at)).toEqual(['z']);
  });

  it('never matches on a different rule or file', () => {
    const other: Finding = { ...finding('a'), rule: 'schema' };
    expect(applyAllowlist([other], [entry('a')]).errors).toHaveLength(1);
  });
});
