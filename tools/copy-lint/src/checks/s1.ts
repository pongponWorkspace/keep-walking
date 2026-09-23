/**
 * S1 — structure (copy-schema sections 2, 2.1-2.4, 3.1). JSON Schema (copy.schema.json) covers
 * required fields, enums, and "no field outside the allowed set"; this file covers the parts a
 * JSON Schema cannot express: duplicate raw keys, altOf chains, cross-key existence, and the
 * D-050 buttonFullWidth key list.
 */
import type { SchemaError } from '../validate';
import type { LintContext } from '../context';
import { areaOf } from '../text-utils';
import { fail, warn, type LintIssue } from '../types';
import { ALLOWED_VOICES_BY_KIND } from '@keep-walking/shared';

export function checkS1(ctx: LintContext, schemaErrors: readonly SchemaError[]): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const error of schemaErrors) {
    issues.push(fail(error.instancePath || '<root>', 'S1', error.message));
  }
  for (const key of ctx.duplicateTopLevelKeys) {
    issues.push(fail(key, 'S1', 'key ซ้ำในไฟล์ดิบ (JSON.parse เก็บตัวหลังเงียบๆ)'));
  }

  checkMeta(ctx, issues);
  checkExtraUnderscoreKeys(ctx, issues);

  for (const [key, entry] of ctx.entries) {
    if (!ctx.rules.areas.includes(areaOf(key))) {
      issues.push(warn(key, 'S1', `area "${areaOf(key)}" ไม่อยู่ใน copy-rules.json#areas`));
    }
    if (!ALLOWED_VOICES_BY_KIND[entry.kind].includes(entry.voice)) {
      issues.push(fail(key, 'S1', `voice "${entry.voice}" ใช้กับ kind "${entry.kind}" ไม่ได้`));
    }
    if (
      entry.cellsFirstLine !== undefined &&
      !(entry.voice === 'legal' && entry.kind === 'message')
    ) {
      issues.push(fail(key, 'S1', 'cellsFirstLine ใช้ได้เฉพาะ voice legal + kind message'));
    }
    if (entry.beat !== undefined && entry.altOf !== undefined) {
      issues.push(fail(key, 'S1', 'มี beat และ altOf พร้อมกันไม่ได้ (altOf รับ beat จากต้นทาง)'));
    }
    checkAltOf(ctx, key, entry, issues);
  }

  checkExceptionKeysExist(ctx, issues);
  checkButtonFullWidthKeys(ctx, issues);

  return issues;
}

function checkMeta(ctx: LintContext, issues: LintIssue[]): void {
  if (!ctx.meta) {
    return; // schema already reports the missing/invalid _meta
  }
  if (ctx.meta.version === undefined) {
    issues.push(warn('_meta', 'S1', 'ขาด _meta.version (ADR 0001 3.10.2)'));
  }
  if (ctx.meta.doc === undefined) {
    issues.push(warn('_meta', 'S1', 'ขาด _meta.doc (ADR 0001 3.10.2)'));
  }
}

function checkExtraUnderscoreKeys(ctx: LintContext, issues: LintIssue[]): void {
  if (typeof ctx.copyJson !== 'object' || ctx.copyJson === null) {
    return;
  }
  for (const key of Object.keys(ctx.copyJson)) {
    if (key.startsWith('_') && key !== '_meta' && key !== '_variables') {
      issues.push(warn(key, 'S1', 'key ขึ้นต้นด้วย _ ที่ไม่ใช่ _meta หรือ _variables'));
    }
  }
}

function checkAltOf(
  ctx: LintContext,
  key: string,
  entry: { readonly altOf?: string; readonly voice: string; readonly kind: string },
  issues: LintIssue[],
): void {
  if (entry.altOf === undefined) {
    return;
  }
  const source = ctx.entries.get(entry.altOf);
  if (!source) {
    issues.push(fail(key, 'S1', `altOf ชี้ key "${entry.altOf}" ที่ไม่มีอยู่จริง`));
    return;
  }
  if (source.altOf !== undefined) {
    issues.push(
      fail(key, 'S1', `altOf ชี้ต่อไปยัง key "${entry.altOf}" ที่มี altOf เอง (ห้ามต่อเป็นทอด)`),
    );
  }
  if (source.voice !== entry.voice || source.kind !== entry.kind) {
    issues.push(fail(key, 'S1', `voice/kind ต้องเท่ากับต้นทาง altOf "${entry.altOf}"`));
  }
}

function checkExceptionKeysExist(ctx: LintContext, issues: LintIssue[]): void {
  const dayKeys = ctx.meta?.dayNameExceptions?.keys ?? [];
  for (const key of dayKeys) {
    if (!ctx.entries.has(key)) {
      issues.push(fail(key, 'S1', 'key ใน _meta.dayNameExceptions ไม่มีอยู่จริงในไฟล์'));
    }
  }
  for (const list of ctx.meta?.numericExceptions ?? []) {
    for (const key of list.keys) {
      if (!ctx.entries.has(key)) {
        issues.push(fail(key, 'S1', 'key ใน _meta.numericExceptions ไม่มีอยู่จริงในไฟล์'));
      }
    }
  }
}

function checkButtonFullWidthKeys(ctx: LintContext, issues: LintIssue[]): void {
  const buttonFullWidth = ctx.rules.limits.buttonFullWidth;
  if (!buttonFullWidth) {
    return;
  }
  for (const key of buttonFullWidth.keys) {
    const entry = ctx.entries.get(key);
    if (!entry) {
      issues.push(
        fail(key, 'S1', 'key ใน copy-rules.json#limits.buttonFullWidth.keys ไม่มีอยู่จริง'),
      );
    } else if (entry.kind !== 'button') {
      issues.push(
        fail(
          key,
          'S1',
          `key ใน limits.buttonFullWidth.keys ต้องเป็น kind button (เป็น "${entry.kind}")`,
        ),
      );
    }
  }
}
