import { describe, expect, it } from 'vitest';
import { programFromSources, scanProgram, type CodeRefScan } from '../src/code-refs';

const ROOT = '/repo';
const LOOKUPS = `export function getCopyText(key: string): string { return key; }
export function formatCopyText(key: string, vars: object = {}): string { return key; }
`;

function scan(files: Record<string, string>): CodeRefScan {
  const absolute: Record<string, string> = { [`${ROOT}/src/copy.ts`]: LOOKUPS };
  for (const [name, text] of Object.entries(files)) absolute[`${ROOT}/src/${name}`] = text;
  return scanProgram(programFromSources(absolute), {
    rootDir: ROOT,
    include: (fileName) => !fileName.endsWith('.test.ts') && !fileName.endsWith('/copy.ts'),
  });
}

function keys(result: CodeRefScan): string[] {
  return result.refs.map((ref) => ref.key).sort();
}

const IMPORT = `import { getCopyText, formatCopyText } from './copy';\n`;

describe('code-refs — resolving copy-key lookups', () => {
  it('finds string literals with file and 1-based line', () => {
    const result = scan({ 'a.ts': `${IMPORT}getCopyText('story.headerLabel');\n` });
    expect(result.refs).toEqual([{ file: 'src/a.ts', line: 2, key: 'story.headerLabel' }]);
    expect(result.callCount).toBe(1);
  });

  it('covers formatCopyText, ternaries, and no-substitution templates', () => {
    const result = scan({
      'a.ts': `${IMPORT}declare const last: boolean;
formatCopyText('run.timeLeft', { timeLeft: 1 });
getCopyText(last ? 'story.start' : 'story.next');
getCopyText(\`story.skip\`);
`,
    });
    expect(keys(result)).toEqual(['run.timeLeft', 'story.next', 'story.skip', 'story.start']);
  });

  it('follows const identifiers, also across imports', () => {
    const result = scan({
      'keys.ts': `export const FOLLOW_ON_KEY: string = 'gps.followOn';\n`,
      'a.ts': `${IMPORT}import { FOLLOW_ON_KEY } from './keys';
const LOCAL = 'gps.followOff';
getCopyText(FOLLOW_ON_KEY);
getCopyText(LOCAL);
`,
    });
    expect(keys(result)).toEqual(['gps.followOff', 'gps.followOn']);
  });

  it('reads every value of a const map indexed by a variable', () => {
    const result = scan({
      'a.ts': `${IMPORT}type Tab = 'shop' | 'party';
const TAB_TITLE_KEY: Record<Tab, string> = { shop: 'comingSoon.shopTitle', party: 'comingSoon.partyTitle' };
declare const tab: Tab;
getCopyText(TAB_TITLE_KEY[tab]);
getCopyText(TAB_TITLE_KEY.shop);
`,
    });
    expect(keys(result)).toEqual([
      'comingSoon.partyTitle',
      'comingSoon.shopTitle',
      'comingSoon.shopTitle',
    ]);
  });

  it('reads properties of a const bound to a nested map entry', () => {
    const result = scan({
      'a.ts': `${IMPORT}const PILL = { on: { label: 'gps.onLabel', body: 'gps.onBody' } };
declare const state: 'on';
const copy = PILL[state];
getCopyText(copy.label);
`,
    });
    expect(keys(result)).toEqual(['gps.onLabel']);
  });

  it('unions the return expressions of a local function', () => {
    const result = scan({
      'a.ts': `${IMPORT}function headerKey(reason: string): string {
  if (reason === 'x') return 'run.summary.x';
  return 'run.summary.y';
}
getCopyText(headerKey('z'));
`,
    });
    expect(keys(result)).toEqual(['run.summary.x', 'run.summary.y']);
  });

  it('expands a template hole whose type is a string-literal union', () => {
    const result = scan({
      'a.ts': `${IMPORT}type RejectReason = 'badChar' | 'reserved';
function text(reason: RejectReason): string { return getCopyText(\`character.nameError.\${reason}\`); }
`,
    });
    expect(keys(result)).toEqual(['character.nameError.badChar', 'character.nameError.reserved']);
    expect(result.patterns).toEqual([]);
  });

  it('keeps an open template hole as a ${} pattern', () => {
    const result = scan({
      'a.ts': `${IMPORT}function show(slide: number): void { getCopyText(\`story.slide\${slide}.title\`); }\n`,
    });
    expect(result.refs).toEqual([]);
    expect(result.patterns).toEqual([
      { file: 'src/a.ts', line: 2, pattern: 'story.slide${}.title' },
    ]);
  });

  it('counts a string-typed parameter as unresolved, and skips excluded files', () => {
    const result = scan({
      'a.ts': `${IMPORT}function label(labelKey: string): string { return getCopyText(labelKey); }\n`,
      'a.test.ts': `${IMPORT}getCopyText('fixture.only');\n`,
    });
    expect(result.refs).toEqual([]);
    expect(result.unresolved).toEqual([{ file: 'src/a.ts', line: 2 }]);
    expect(result.callCount).toBe(1);
  });
});
