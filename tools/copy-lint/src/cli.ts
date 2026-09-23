#!/usr/bin/env node
/**
 * Copy lint CLI (design/narrative/style-guide.md section 7, docs/tech/copy-schema.md 8.1).
 * Usage: `pnpm lint:copy` (from repo root) or `tsx tools/copy-lint/src/cli.ts [--json]`.
 * Reads config/content/copy.th.json, config/content/copy-rules.json, and (optionally)
 * config/content/names.th.json. Missing copy.th.json or copy-rules.json is exit code 2
 * (not a lint failure: there is nothing to check). Any FAIL is exit code 1.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CopyRules } from '@keep-walking/shared';
import { runAllChecks } from './checks/index';
import { buildContext } from './context';
import { MissingFileError, loadJsonFile, loadOptionalJsonFile } from './io';
import type { LintIssue } from './types';
import { validateCopy, validateCopyRules } from './validate';
import { loadWordList } from './words';

const here = dirname(fileURLToPath(import.meta.url));
// Config paths are relative to the *working directory* (the contract is "run from repo
// root": docs/tech/copy-schema.md 8.1). words.json is a fixed asset next to this script,
// resolved from the script's own location so it works no matter where lint:copy is run from.
const repoRoot = process.cwd();
const wordsPath = resolve(here, '../words.json');

function printLine(issue: LintIssue): void {
  process.stdout.write(`${issue.key} · ${issue.check} · ${issue.level} · ${issue.message}\n`);
}

function main(): number {
  const jsonOutput = process.argv.includes('--json');

  let copyFile;
  let rulesFile;
  try {
    copyFile = loadJsonFile(resolve(repoRoot, 'config/content/copy.th.json'));
    rulesFile = loadJsonFile(resolve(repoRoot, 'config/content/copy-rules.json'));
  } catch (error) {
    if (error instanceof MissingFileError) {
      process.stderr.write(`${error.message}\n`);
      return 2;
    }
    throw error;
  }

  const namesFile = loadOptionalJsonFile(resolve(repoRoot, 'config/content/names.th.json'));
  const words = loadWordList(wordsPath);

  const copySchemaErrors = validateCopy(copyFile.json);
  const rulesSchemaErrors = validateCopyRules(rulesFile.json).map((error) => ({
    instancePath: `copy-rules.json${error.instancePath}`,
    message: error.message,
  }));

  let issues: LintIssue[];
  if (rulesSchemaErrors.length > 0) {
    // copy-rules.json itself is structurally broken: every S4/S1(buttonFullWidth) check that
    // reads it would crash. Report the schema errors and stop there rather than throwing.
    issues = rulesSchemaErrors.map((error) => ({
      key: error.instancePath,
      check: 'S1',
      level: 'FAIL',
      message: error.message,
    }));
  } else {
    const ctx = buildContext({
      repoRoot,
      copyRaw: copyFile.raw,
      copyJson: copyFile.json,
      rules: rulesFile.json as CopyRules,
      words,
      namesJson: namesFile?.json,
    });
    issues = runAllChecks(ctx, copySchemaErrors);
  }

  issues = [...issues].sort((a, b) => a.key.localeCompare(b.key) || a.check.localeCompare(b.check));

  if (jsonOutput) {
    process.stdout.write(`${JSON.stringify(issues, null, 2)}\n`);
  } else {
    for (const issue of issues) {
      printLine(issue);
    }
  }

  return issues.some((issue) => issue.level === 'FAIL') ? 1 : 0;
}

process.exitCode = main();
