/**
 * S15 — every copy key the client code asks for must exist in copy.th.json (F10 copy gate F-01b).
 *
 * `getCopyText` falls back to the raw key (TL-N06), so a missing key never crashes: it shows
 * `story.headerLabel` on screen instead. This check turns that into a lint FAIL. Input is the
 * static scan in `ctx.codeRefs` (code-refs.ts); when the CLI did not scan code (unit tests of
 * other checks) S15 reports nothing.
 *
 * Limits (also in docs of code-refs.ts): a lookup whose key is a `string`-typed parameter
 * (e.g. `cls.nameKey` from config, `view.labelKey`) is counted as unresolved and not checked
 * here; the e2e raw-key check covers it at runtime.
 */
import type { CodeSite } from '../code-refs';
import type { LintContext } from '../context';
import { DYNAMIC_KEYS, expandPattern, patternRegex, type DynamicKeyEntry } from '../dynamic-keys';
import { fail, warn, type LintIssue } from '../types';

function sites(list: readonly CodeSite[]): string {
  return list.map((site) => `${site.file}:${site.line}`).join(', ');
}

export function checkS15(
  ctx: LintContext,
  registry: readonly DynamicKeyEntry[] = DYNAMIC_KEYS,
): LintIssue[] {
  const scan = ctx.codeRefs;
  if (scan === undefined) return [];
  const issues: LintIssue[] = [];

  const missing = new Map<string, CodeSite[]>();
  const need = (key: string, site: CodeSite): void => {
    if (ctx.entries.has(key)) return;
    const list = missing.get(key) ?? [];
    list.push(site);
    missing.set(key, list);
  };
  for (const ref of scan.refs) need(ref.key, ref);

  const used = new Set<DynamicKeyEntry>();
  for (const found of scan.patterns) {
    const entry = registry.find(
      (candidate) => candidate.file === found.file && candidate.pattern === found.pattern,
    );
    if (entry === undefined) {
      issues.push(
        fail(
          found.pattern,
          'S15',
          `${found.file}:${found.line} ประกอบ key แบบ dynamic ที่ lint หาค่าไม่ได้ · ให้ทำ type เป็น union ของค่าที่เป็นไปได้ หรือลงทะเบียนใน tools/copy-lint/src/dynamic-keys.ts`,
        ),
      );
      continue;
    }
    used.add(entry);
    if (entry.values === undefined) {
      const regex = patternRegex(entry.pattern);
      if (![...ctx.entries.keys()].some((key) => regex.test(key))) {
        issues.push(
          fail(
            entry.pattern,
            'S15',
            `${found.file}:${found.line} ไม่มี key ใดใน copy.th.json ตรงรูปนี้`,
          ),
        );
      }
      continue;
    }
    for (const value of entry.values) {
      const key = expandPattern(entry.pattern, value);
      if (key === undefined) {
        issues.push(
          fail(
            entry.pattern,
            'S15',
            'รายการใน dynamic-keys.ts ที่มี values ต้องมีช่อง ${} พอดี 1 ช่อง',
          ),
        );
        break;
      }
      need(key, found);
    }
  }

  for (const [key, list] of missing) {
    issues.push(
      fail(
        key,
        'S15',
        `โค้ดเรียก key นี้ (${sites(list)}) แต่ไม่มีใน copy.th.json · จอจะแสดง key ดิบ`,
      ),
    );
  }
  for (const entry of registry) {
    if (!used.has(entry)) {
      issues.push(
        warn(
          entry.pattern,
          'S15',
          `รายการใน dynamic-keys.ts ไม่พบในโค้ด ${entry.file} แล้ว · ลบออกได้`,
        ),
      );
    }
  }
  return issues;
}
