/** S7 — the `_variables` registry (style-guide 4.1, copy-schema section 5). */
import { countCells, extractVariables, hasUnbalancedBraces } from '@keep-walking/shared';
import type { LintContext } from '../context';
import { configKeyResolves } from '../io';
import { entryTexts } from '../text-utils';
import { fail, warn, type LintIssue } from '../types';

function sameVariableSet(a: readonly string[], b: readonly string[]): boolean {
  const setA = new Set(a);
  const setB = new Set(b);
  return setA.size === setB.size && [...setA].every((name) => setB.has(name));
}

export function checkS7(ctx: LintContext): LintIssue[] {
  const issues: LintIssue[] = [];
  const referenced = new Set<string>();

  for (const [key, entry] of ctx.entries) {
    for (const { label, text } of entryTexts(key, entry)) {
      if (hasUnbalancedBraces(text)) {
        issues.push(fail(label, 'S7', 'มี { หรือ } ที่ไม่ใช่ตัวแปร'));
      }
      for (const name of extractVariables(text)) {
        referenced.add(name);
        if (!ctx.variables.has(name)) {
          issues.push(fail(label, 'S7', `ตัวแปร {${name}} ไม่มีใน _variables`));
        }
      }
    }

    if (entry.alts) {
      const textVariables = extractVariables(entry.text);
      entry.alts.forEach((alt, index) => {
        if (!sameVariableSet(extractVariables(alt), textVariables)) {
          issues.push(fail(`${key} alts[${index}]`, 'S7', 'ชุดตัวแปรของ alt ไม่ตรงกับ text'));
        }
      });
    }

    if (entry.altOf !== undefined) {
      const source = ctx.entries.get(entry.altOf);
      if (source && !sameVariableSet(extractVariables(entry.text), extractVariables(source.text))) {
        issues.push(fail(key, 'S7', `ชุดตัวแปรไม่ตรงกับต้นทาง altOf "${entry.altOf}"`));
      }
    }
  }

  for (const [name, variable] of ctx.variables) {
    if (!referenced.has(name)) {
      issues.push(warn(name, 'S7', `ตัวแปร {${name}} ไม่ถูกใช้ใน copy.th.json คีย์ใด`));
    }
    const exampleCells = countCells(variable.example);
    if (exampleCells > variable.maxCells) {
      issues.push(
        fail(
          name,
          'S7',
          `example "${variable.example}" ยาว ${exampleCells} ช่อง เกิน maxCells (${variable.maxCells})`,
        ),
      );
    }
    if (variable.configKey !== undefined && !configKeyResolves(variable.configKey, ctx.repoRoot)) {
      issues.push(warn(name, 'S7', `configKey "${variable.configKey}" หาไม่พบ`));
    }
  }

  return issues;
}
