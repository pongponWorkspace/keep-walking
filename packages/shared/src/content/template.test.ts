import { describe, expect, it } from 'vitest';
import type { CopyVariable } from '../index';
import {
  MissingCopyVariableError,
  extractVariables,
  fillTemplate,
  fillWithMaxCells,
  hasUnbalancedBraces,
} from '../index';

describe('extractVariables', () => {
  it('returns every distinct {name} in order of first appearance', () => {
    expect(extractVariables('{count} คน มี {roleList} ({count})')).toEqual(['count', 'roleList']);
  });

  it('returns an empty array when there are no variables', () => {
    expect(extractVariables('คุณตาย')).toEqual([]);
  });
});

describe('hasUnbalancedBraces', () => {
  it('is false for well-formed variables', () => {
    expect(hasUnbalancedBraces('ห่างจากคุณ {distanceText}')).toBe(false);
  });

  it('is true for a brace that is not part of a {variable}', () => {
    expect(hasUnbalancedBraces('อุปกรณ์ +{fromLevel} { สำเร็จ')).toBe(true);
    expect(hasUnbalancedBraces('ปิด }แล้ว')).toBe(true);
  });
});

describe('fillTemplate', () => {
  it('replaces every {name} with the given value', () => {
    expect(fillTemplate('เจอ {count} คน', { count: '3' })).toBe('เจอ 3 คน');
  });

  it('throws MissingCopyVariableError when a value is missing', () => {
    expect(() => fillTemplate('เจอ {count} คน', {})).toThrow(MissingCopyVariableError);
  });
});

describe('fillWithMaxCells', () => {
  const variables = new Map<string, CopyVariable>([
    ['autoRetreatPct', { maxCells: 2, example: '25', source: 'test' }],
  ]);

  it('fills each variable with maxCells filler characters', () => {
    const filled = fillWithMaxCells('HP เหลือต่ำกว่า {autoRetreatPct}%', variables);
    expect(filled).toBe('HP เหลือต่ำกว่า กก%');
  });

  it('throws MissingCopyVariableError for an unregistered variable', () => {
    expect(() => fillWithMaxCells('{unknownVar}', variables)).toThrow(MissingCopyVariableError);
  });
});
