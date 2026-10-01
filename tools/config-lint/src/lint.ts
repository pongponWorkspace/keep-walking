// Runs every config-lint check and applies the allowlist (P2-F04-T24).
import { ALLOWLIST, type AllowEntry } from './allowlist';
import { checkCharacter } from './character';
import { checkConventions } from './convention';
import { checkCrossFile } from './cross';
import { loadConfigFiles } from './files';
import { checkPointers } from './pointer';
import { checkSchemas } from './schema';
import type { ConfigFile, Finding } from './types';

export interface LintResult {
  readonly files: readonly ConfigFile[];
  /** Errors not covered by the allowlist: any entry here fails `pnpm test`. */
  readonly errors: readonly Finding[];
  readonly warnings: readonly Finding[];
  readonly allowed: ReadonlyArray<{ readonly finding: Finding; readonly entry: AllowEntry }>;
  /** Allowlist entries that matched no finding (warn: delete them). */
  readonly stale: readonly AllowEntry[];
}

/** Checks that only need the parsed files (no schema directory): used by fixture tests. */
export function checkFiles(files: readonly ConfigFile[]): Finding[] {
  return [
    ...files.flatMap(checkConventions),
    ...checkPointers(files),
    ...checkCrossFile(files),
    ...checkCharacter(files),
  ];
}

function matches(entry: AllowEntry, finding: Finding): boolean {
  return entry.rule === finding.rule && entry.file === finding.file && entry.at === finding.at;
}

export function applyAllowlist(
  findings: readonly Finding[],
  allowlist: readonly AllowEntry[],
): Omit<LintResult, 'files'> {
  const errors: Finding[] = [];
  const warnings: Finding[] = [];
  const allowed: Array<{ finding: Finding; entry: AllowEntry }> = [];
  const used = new Set<AllowEntry>();
  for (const finding of findings) {
    if (finding.level === 'warn') {
      warnings.push(finding);
      continue;
    }
    const entry = allowlist.find((candidate) => matches(candidate, finding));
    if (entry === undefined) {
      errors.push(finding);
    } else {
      used.add(entry);
      allowed.push({ finding, entry });
    }
  }
  return { errors, warnings, allowed, stale: allowlist.filter((entry) => !used.has(entry)) };
}

export function lintRepo(
  repoRoot: string,
  allowlist: readonly AllowEntry[] = ALLOWLIST,
): LintResult {
  const loaded = loadConfigFiles(repoRoot);
  const findings = [
    ...loaded.findings,
    ...checkSchemas(repoRoot, loaded.files),
    ...checkFiles(loaded.files),
  ];
  return { files: loaded.files, ...applyAllowlist(findings, allowlist) };
}

export function formatFinding(finding: Finding): string {
  const at = finding.at === '' ? '' : ` ${finding.at}`;
  return `${finding.level.toUpperCase()} [${finding.rule}] ${finding.file}${at}: ${finding.message}`;
}
