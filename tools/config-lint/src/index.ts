// tools/config-lint (P2-F04-T24). Owner: tech-lead.
// JSON Schema per config file + convention lint (ADR 0001 3.10, D-062, H01), wired into
// `pnpm test` by test/repo.test.ts. Ajv is allowed here because this never runs in a Worker
// (ADR 0003 C1-4); the runtime accessor is packages/shared/src/config (no Ajv).
export { ALLOWLIST, type AllowEntry } from './allowlist';
export { checkConventions, isFlatKeyMap } from './convention';
export { CROSS_RULES, CROSS_RULES_EXTRA, checkCrossFile, type CrossRule } from './cross';
export { loadConfigFiles, schemaPathFor } from './files';
export { applyAllowlist, checkFiles, formatFinding, lintRepo, type LintResult } from './lint';
export { checkPointers, collectPointers, resolvePointer } from './pointer';
export { checkSchemas, listConfigSchemas } from './schema';
export type { ConfigFile, Finding, Json, JsonObject, Level, Namespace, RuleId } from './types';
