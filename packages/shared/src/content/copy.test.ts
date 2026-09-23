import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import copyRulesSchema from '../../schemas/copy-rules.schema.json';
import copySchema from '../../schemas/copy.schema.json';
// Real files this contract governs (copy-schema section 7 test hooks): the schema must
// accept them as-is, with no code change needed when they get new keys or variables.
import realCopyFile from '../../../../config/content/copy.th.json';
import realCopyRules from '../../../../config/content/copy-rules.json';
import type { CopyEntry, CopyVariable } from '../index';
import {
  ALLOWED_VOICES_BY_KIND,
  COPY_KEY_PATTERN,
  copyEntries,
  copyMeta,
  copyVariables,
} from '../index';

// Compile-time check (copy-schema section 7): a well-formed fixture must satisfy the
// CopyEntry / CopyVariable types, not just the runtime schema.
const typedEntry = {
  text: 'ทดสอบ',
  voice: 'system',
  kind: 'label',
  context: 'test',
  cells: 5,
} satisfies CopyEntry;
const typedVariable = {
  maxCells: 2,
  example: '25',
  source: 'test',
  configKey: 'config/balance/dungeons.json#hpSafety.autoRetreatThreshold_pct',
} satisfies CopyVariable;

// allowMatchingProperties: "_meta" and "_variables" are declared in both `properties` (for
// their specific shape) and the `^_` patternProperties catch-all (for free-form `_note` keys).
const ajv = new Ajv2020({ allErrors: true, strict: true, allowMatchingProperties: true });
const validateCopy = ajv.compile(copySchema);
const validateCopyRules = ajv.compile(copyRulesSchema);

function minimalFile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    _meta: { file: 'copy.th.json', owner: 'narrative-designer', task: 'TEST' },
    _variables: {
      autoRetreatPct: { maxCells: 2, example: '25', source: 'config/balance/dungeons.json' },
    },
    'run.death': {
      text: 'คุณตาย ของใน run นี้หายทั้งหมด ครั้งหน้าลองกลับบ้านก่อนตาย',
      voice: 'system',
      kind: 'message',
      context: 'S-03-run',
      cells: 47,
    },
    ...overrides,
  };
}

describe('CopyEntry and CopyVariable types', () => {
  it('accept a well-formed fixture (compile-time `satisfies` above, checked at runtime too)', () => {
    expect(typedEntry.kind).toBe('label');
    expect(typedVariable.configKey).toContain('dungeons.json');
  });
});

describe('copy.schema.json', () => {
  it('accepts a minimal well-formed file', () => {
    expect(validateCopy(minimalFile())).toBe(true);
  });

  it('rejects a missing _meta or _variables', () => {
    const rest = minimalFile();
    delete rest['_meta'];
    expect(validateCopy(rest)).toBe(false);
  });

  it('rejects an entry with a misspelled field name', () => {
    const file = minimalFile({
      'run.x': {
        text: 'x',
        voice: 'system',
        kind: 'label',
        contex: 'typo of context',
      },
    });
    expect(validateCopy(file)).toBe(false);
  });

  it('rejects an entry field outside the allowed set', () => {
    const file = minimalFile({
      'run.x': {
        text: 'x',
        voice: 'system',
        kind: 'label',
        context: 'ok',
        notAField: true,
      },
    });
    expect(validateCopy(file)).toBe(false);
  });

  it('rejects a key that is not `_`-prefixed and does not match the area.name pattern', () => {
    const file = minimalFile({
      NotAValidKey: { text: 'x', voice: 'system', kind: 'label', context: 'x' },
    });
    expect(validateCopy(file)).toBe(false);
  });

  it('accepts run.death and run.death.alt1 as two independent flat entries', () => {
    const file = minimalFile({
      'run.death.alt1': {
        text: 'ทางเลือก',
        voice: 'system',
        kind: 'message',
        context: 'alt',
        altOf: 'run.death',
      },
    });
    expect(validateCopy(file)).toBe(true);
  });

  it('rejects a _variables entry missing a required field', () => {
    const file = minimalFile({
      _variables: { count: { maxCells: 4, example: '3' } },
    });
    expect(validateCopy(file)).toBe(false);
  });

  it('accepts the real config/content/copy.th.json with no structural error', () => {
    const result = validateCopy(realCopyFile);
    expect(validateCopy.errors ?? []).toEqual([]);
    expect(result).toBe(true);
  });
});

describe('copy-rules.schema.json', () => {
  it('accepts the real config/content/copy-rules.json', () => {
    const result = validateCopyRules(realCopyRules);
    expect(validateCopyRules.errors ?? []).toEqual([]);
    expect(result).toBe(true);
  });

  it('rejects a limits object missing a required kind', () => {
    const limits = { ...(realCopyRules as { limits: Record<string, unknown> }).limits };
    delete limits['push'];
    expect(validateCopyRules({ ...realCopyRules, limits })).toBe(false);
  });
});

describe('copyEntries', () => {
  it('reads run.death and run.death.alt1 as two independent entries, flat, without splitting on "."', () => {
    const entries = copyEntries(
      minimalFile({
        'run.death.alt1': {
          text: 'ทางเลือก',
          voice: 'system',
          kind: 'message',
          context: 'alt',
          altOf: 'run.death',
        },
      }),
    );
    expect(entries.size).toBe(2);
    expect(entries.get('run.death')?.text).toContain('คุณตาย');
    expect(entries.get('run.death.alt1')?.altOf).toBe('run.death');
  });

  it('skips every `_`-prefixed key', () => {
    const entries = copyEntries(minimalFile());
    expect(entries.has('_meta')).toBe(false);
    expect(entries.has('_variables')).toBe(false);
  });

  it('returns an empty map for non-object input', () => {
    expect(copyEntries(null).size).toBe(0);
    expect(copyEntries('x').size).toBe(0);
  });

  it('reads the real copy.th.json as a flat map with more than one entry', () => {
    const entries = copyEntries(realCopyFile);
    expect(entries.size).toBeGreaterThan(100);
    expect(entries.get('run.death')?.cells).toBe(47);
  });
});

describe('copyVariables', () => {
  it('reads the _variables registry', () => {
    const variables = copyVariables(minimalFile());
    expect(variables.get('autoRetreatPct')?.maxCells).toBe(2);
  });

  it('returns an empty map when _variables is absent', () => {
    expect(copyVariables({}).size).toBe(0);
  });
});

describe('copyMeta', () => {
  it('reads _meta', () => {
    expect(copyMeta(minimalFile())?.owner).toBe('narrative-designer');
  });

  it('is undefined when _meta is absent', () => {
    expect(copyMeta({})).toBeUndefined();
  });
});

describe('COPY_KEY_PATTERN and ALLOWED_VOICES_BY_KIND', () => {
  it('matches area.name keys and rejects everything else', () => {
    expect(COPY_KEY_PATTERN.test('run.death')).toBe(true);
    expect(COPY_KEY_PATTERN.test('run.death.alt1')).toBe(true);
    expect(COPY_KEY_PATTERN.test('_meta')).toBe(false);
    expect(COPY_KEY_PATTERN.test('Run.death')).toBe(false);
    expect(COPY_KEY_PATTERN.test('run')).toBe(false);
  });

  it('pairs dialogue only with character, and command only with command', () => {
    expect(ALLOWED_VOICES_BY_KIND.dialogue).toEqual(['character']);
    expect(ALLOWED_VOICES_BY_KIND.command).toEqual(['command']);
  });
});
