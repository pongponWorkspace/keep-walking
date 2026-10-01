import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkS15 } from '../src/checks/s15';
import { scanClientCopyRefs, type CodeRefScan } from '../src/code-refs';
import { buildContext } from '../src/context';
import type { DynamicKeyEntry } from '../src/dynamic-keys';
import { contextFor, minimalRules, repoRoot, words, type EntryFixture } from './helpers';

const LABEL = (text: string): EntryFixture => ({
  text,
  voice: 'system',
  kind: 'label',
  context: 'x',
});

function scanOf(partial: Partial<CodeRefScan>): CodeRefScan {
  return { refs: [], patterns: [], unresolved: [], callCount: 0, ...partial };
}

function failsOf(issues: ReturnType<typeof checkS15>): string[] {
  return issues.filter((issue) => issue.level === 'FAIL').map((issue) => issue.key);
}

describe('S15 — keys the client code asks for must exist in copy.th.json', () => {
  it('reports nothing when the code was not scanned', () => {
    expect(checkS15(contextFor({}))).toEqual([]);
  });

  it('FAILs a referenced key that copy.th.json lacks, naming every call site', () => {
    const ctx = {
      ...contextFor({ 'story.next': LABEL('ถัดไป') }),
      codeRefs: scanOf({
        refs: [
          { file: 'apps/client/src/ui/story-screen.ts', line: 53, key: 'story.headerLabel' },
          { file: 'apps/client/src/ui/other.ts', line: 9, key: 'story.headerLabel' },
          { file: 'apps/client/src/ui/story-screen.ts', line: 122, key: 'story.next' },
        ],
      }),
    };
    const issues = checkS15(ctx, []);
    expect(failsOf(issues)).toEqual(['story.headerLabel']);
    expect(issues[0]?.message).toContain('apps/client/src/ui/story-screen.ts:53');
    expect(issues[0]?.message).toContain('apps/client/src/ui/other.ts:9');
  });

  it('FAILs a dynamic pattern that is not registered', () => {
    const ctx = {
      ...contextFor({}),
      codeRefs: scanOf({ patterns: [{ file: 'a.ts', line: 3, pattern: 'x.y${}' }] }),
    };
    expect(failsOf(checkS15(ctx, []))).toEqual(['x.y${}']);
  });

  it('checks every listed value of a registered pattern', () => {
    const registry: DynamicKeyEntry[] = [
      { file: 'a.ts', pattern: 'story.slide${}.title', values: ['1', '2'], source: 'test' },
    ];
    const codeRefs = scanOf({
      patterns: [{ file: 'a.ts', line: 3, pattern: 'story.slide${}.title' }],
    });
    const partial = { ...contextFor({ 'story.slide1.title': LABEL('หนึ่ง') }), codeRefs };
    expect(failsOf(checkS15(partial, registry))).toEqual(['story.slide2.title']);
    const full = {
      ...contextFor({ 'story.slide1.title': LABEL('หนึ่ง'), 'story.slide2.title': LABEL('สอง') }),
      codeRefs,
    };
    expect(checkS15(full, registry)).toEqual([]);
  });

  it('needs at least one match for a registered open pattern, and WARNs on a stale entry', () => {
    const registry: DynamicKeyEntry[] = [
      { file: 'a.ts', pattern: 'credits.${}', source: 'test' },
      { file: 'gone.ts', pattern: 'old.${}', source: 'test' },
    ];
    const codeRefs = scanOf({ patterns: [{ file: 'a.ts', line: 1, pattern: 'credits.${}' }] });
    expect(failsOf(checkS15({ ...contextFor({}), codeRefs }, registry))).toEqual(['credits.${}']);
    const issues = checkS15({ ...contextFor({ 'credits.osm': LABEL('osm') }), codeRefs }, registry);
    expect(issues.map((issue) => `${issue.level} ${issue.key}`)).toEqual(['WARN old.${}']);
  });
});

describe('S15 against the real apps/client/src (F10 copy gate F-01b)', () => {
  const scan = scanClientCopyRefs(repoRoot);
  const realCopy = JSON.parse(
    readFileSync(resolve(repoRoot, 'config/content/copy.th.json'), 'utf8'),
  ) as Record<string, unknown>;

  function contextWithCopy(file: Record<string, unknown>) {
    return buildContext({
      repoRoot,
      copyRaw: JSON.stringify(file),
      copyJson: file,
      rules: minimalRules,
      words,
      namesJson: undefined,
      codeRefs: scan,
    });
  }

  it('finds story-screen.ts asking for story.headerLabel', () => {
    expect(scan?.refs).toContainEqual({
      file: 'apps/client/src/ui/story-screen.ts',
      line: 53,
      key: 'story.headerLabel',
    });
  });

  it('FAILs when copy.th.json has no story.headerLabel (the state the copy gate found)', () => {
    const withoutKey = { ...realCopy };
    delete withoutKey['story.headerLabel'];
    expect(failsOf(checkS15(contextWithCopy(withoutKey)))).toContain('story.headerLabel');
  });

  it('passes story.headerLabel once the key exists', () => {
    const withKey = {
      ...realCopy,
      'story.headerLabel': {
        text: 'เรื่องราว',
        voice: 'system',
        kind: 'label',
        context: 'x',
        cells: 7,
      },
    };
    expect(failsOf(checkS15(contextWithCopy(withKey)))).not.toContain('story.headerLabel');
  });
});
