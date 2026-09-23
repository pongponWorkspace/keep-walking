/**
 * S4 — length limits (style-guide 4.3, copy-schema 3-4). Limits are numbers read from
 * `config/content/copy-rules.json#limits`; nothing here is a hardcoded cell count.
 */
import type { CopyEntry, CopyRules } from '@keep-walking/shared';
import { countCells, countCellsPerLine } from '@keep-walking/shared';
import type { LintContext } from '../context';
import { countNewlines, firstLine } from '../text-utils';
import { fail, warn, type LintIssue } from '../types';
import { fillForLength } from './fill-for-length';

export function checkS4(ctx: LintContext): LintIssue[] {
  const issues: LintIssue[] = [];
  for (const [key, entry] of ctx.entries) {
    const filled = fillForLength(entry.text, ctx.variables);
    if (filled === undefined) {
      continue; // S7 already reports the missing variable
    }
    checkDeclaredCells(key, entry, filled, issues);
    if (entry.voice === 'legal' && entry.kind === 'message' && ctx.rules.limits.legal) {
      checkLegal(key, filled, ctx.rules.limits.legal.summaryMaxCells, entry.cellsFirstLine, issues);
      continue;
    }
    checkByKind(key, entry, filled, ctx.rules, issues);
  }
  return issues;
}

function checkDeclaredCells(
  key: string,
  entry: CopyEntry,
  filled: string,
  issues: LintIssue[],
): void {
  if (entry.cells === undefined) {
    return;
  }
  const actual = countCells(filled);
  if (actual !== entry.cells) {
    issues.push(warn(key, 'S4', `field cells = ${entry.cells} แต่นับได้ ${actual}`));
  }
}

function checkLegal(
  key: string,
  filled: string,
  summaryMaxCells: number,
  cellsFirstLine: number | undefined,
  issues: LintIssue[],
): void {
  const actualFirstLine = countCells(firstLine(filled));
  if (actualFirstLine > summaryMaxCells) {
    issues.push(
      fail(
        key,
        'S4',
        `บรรทัดแรกของ legal ยาว ${actualFirstLine} ช่อง เกินเพดาน ${summaryMaxCells}`,
      ),
    );
  }
  if (cellsFirstLine !== undefined && cellsFirstLine !== actualFirstLine) {
    issues.push(
      warn(key, 'S4', `field cellsFirstLine = ${cellsFirstLine} แต่นับได้ ${actualFirstLine}`),
    );
  }
}

function checkByKind(
  key: string,
  entry: CopyEntry,
  filled: string,
  rules: CopyRules,
  issues: LintIssue[],
): void {
  switch (entry.kind) {
    case 'message':
      checkCappedMultiline(key, filled, rules.limits.message, issues);
      return;
    case 'button': {
      const fullWidth = rules.limits.buttonFullWidth;
      const limit = fullWidth?.keys.includes(key) ? fullWidth : rules.limits.button;
      const label = limit === fullWidth ? 'buttonFullWidth' : 'button';
      checkSingleLine(key, filled, limit.maxCells, limit.maxNewlines, label, issues);
      return;
    }
    case 'label':
      checkSingleLine(
        key,
        filled,
        rules.limits.label.maxCells,
        rules.limits.label.maxNewlines,
        'label',
        issues,
      );
      return;
    case 'command':
      checkSingleLine(
        key,
        filled,
        rules.limits.command.maxCells,
        rules.limits.command.maxNewlines,
        'command',
        issues,
      );
      return;
    case 'push':
      checkSingleLine(
        key,
        filled,
        rules.limits.push.titleMaxCells,
        rules.limits.push.maxNewlines,
        'push',
        issues,
      );
      return;
    case 'dialogue':
      checkDialogue(key, filled, rules, issues);
      return;
  }
}

function checkCappedMultiline(
  key: string,
  filled: string,
  limit: CopyRules['limits']['message'],
  issues: LintIssue[],
): void {
  const total = countCells(filled);
  if (total > limit.maxCells) {
    issues.push(fail(key, 'S4', `ยาว ${total} ช่อง เกินเพดาน message (${limit.maxCells})`));
  }
  const newlines = countNewlines(filled);
  if (newlines > limit.maxNewlines) {
    issues.push(fail(key, 'S4', `มี \\n ${newlines} ตัว เกินเพดาน (${limit.maxNewlines})`));
  }
  // "ถ้ามี \n แต่ละบรรทัดไม่เกิน maxCellsPerLine" (style-guide 4.3): a single-line message is
  // only bound by maxCells above, not by maxCellsPerLine.
  if (newlines > 0) {
    for (const [index, lineCells] of countCellsPerLine(filled).entries()) {
      if (lineCells > limit.maxCellsPerLine) {
        issues.push(
          fail(
            key,
            'S4',
            `บรรทัดที่ ${index + 1} ยาว ${lineCells} ช่อง เกินเพดาน (${limit.maxCellsPerLine})`,
          ),
        );
      }
    }
  }
}

function checkSingleLine(
  key: string,
  filled: string,
  maxCells: number,
  maxNewlines: number,
  limitLabel: string,
  issues: LintIssue[],
): void {
  const total = countCells(filled);
  if (total > maxCells) {
    issues.push(fail(key, 'S4', `ยาว ${total} ช่อง เกินเพดาน ${limitLabel} (${maxCells})`));
  }
  const newlines = countNewlines(filled);
  if (newlines > maxNewlines) {
    issues.push(
      fail(
        key,
        'S4',
        `มี \\n ${newlines} ตัว แต่เพดาน ${limitLabel} ไม่ให้ขึ้นบรรทัดใหม่ (${maxNewlines})`,
      ),
    );
  }
}

function checkDialogue(key: string, filled: string, rules: CopyRules, issues: LintIssue[]): void {
  const limit = rules.limits.dialogue;
  const lines = filled.split('\n');
  if (lines.length > limit.maxLines) {
    issues.push(fail(key, 'S4', `บทพูดมี ${lines.length} บรรทัด เกินเพดาน ${limit.maxLines}`));
  }
  const speakerPattern = new RegExp(`^([^:\\n]{1,${limit.speakerMaxChars}}): (.*)$`, 'u');
  lines.forEach((line, index) => {
    const match = speakerPattern.exec(line);
    if (!match) {
      return; // malformed line, already reported by S3
    }
    const [, , content] = match;
    const cells = countCells(content ?? '');
    if (cells > limit.maxCellsPerLine) {
      issues.push(
        fail(
          key,
          'S4',
          `บรรทัดบทพูดที่ ${index + 1} ยาว ${cells} ช่อง เกินเพดาน ${limit.maxCellsPerLine}`,
        ),
      );
    }
  });
}
