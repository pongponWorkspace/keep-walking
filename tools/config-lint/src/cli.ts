// CLI: pnpm --filter @keep-walking/tools-config-lint run lint   (exit 1 on any unallowed error)
// The same check runs inside `pnpm test` through test/repo.test.ts.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatFinding, lintRepo } from './lint';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const result = lintRepo(repoRoot);
for (const finding of result.errors) console.log(formatFinding(finding));
for (const finding of result.warnings) console.log(formatFinding(finding));
for (const { finding, entry } of result.allowed) {
  console.log(`ALLOWED (${entry.kind}, ${entry.owner}, ${entry.task}) ${formatFinding(finding)}`);
}
for (const entry of result.stale) {
  console.log(
    `STALE allowlist entry [${entry.rule}] ${entry.file} ${entry.at}: delete it from src/allowlist.ts`,
  );
}
console.log(
  `config-lint: ${result.files.length} files, ${result.errors.length} errors, ` +
    `${result.warnings.length} warnings, ${result.allowed.length} allowed, ${result.stale.length} stale`,
);
process.exitCode = result.errors.length > 0 ? 1 : 0;
