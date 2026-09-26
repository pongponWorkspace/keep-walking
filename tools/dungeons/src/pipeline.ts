// validate → build → serialize, shared by the CLI and the --check test.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildArtifact, serializeArtifact } from './artifact';
import {
  loadBuildConfig,
  loadContext,
  REPO_ROOT,
  type BuildConfig,
  type RuleContext,
} from './context';
import { compileSchemas, loadSource, schemaIssues } from './source';
import type { ArtifactFile, Issue } from './types';
import { validateRecords } from './validate';

export interface BuildOutcome {
  ok: boolean;
  issues: Issue[];
  /** Present when ok. */
  artifact: ArtifactFile | null;
  text: string | null;
  counts: { records: number; published: number; written: number };
}

export interface BuildOptions {
  root?: string;
  build?: BuildConfig;
  /** Inject a context (tests); default reads the repo. */
  context?: RuleContext;
}

export function runBuild(options: BuildOptions = {}): BuildOutcome {
  const root = options.root ?? REPO_ROOT;
  const build = options.build ?? loadBuildConfig();
  const validators = compileSchemas(resolve(root, build.paths.schema));
  const loaded = loadSource(root, build, validators);
  const records = loaded.file?.dungeons ?? [];
  const failed = (issues: Issue[]): BuildOutcome => ({
    ok: false,
    issues,
    artifact: null,
    text: null,
    counts: {
      records: records.length,
      published: records.filter((r) => r.status === 'published').length,
      written: 0,
    },
  });
  if (loaded.issues.some((i) => i.severity === 'error')) return failed(loaded.issues);
  const ctx = options.context ?? loadContext(root, build, { coverage: records.length > 0 });
  const result = validateRecords(records, ctx);
  const issues = [...loaded.issues, ...result.issues];
  if (!result.ok) return failed(issues);
  const artifact = buildArtifact(result.publishable, build);
  if (!validators.artifact(artifact)) {
    return failed([...issues, ...schemaIssues(validators.artifact.errors, artifact)]);
  }
  return {
    ok: true,
    issues,
    artifact,
    text: serializeArtifact(artifact),
    counts: {
      records: records.length,
      published: records.filter((r) => r.status === 'published').length,
      written: artifact.dungeons.length,
    },
  };
}

export interface CheckOutcome {
  build: BuildOutcome;
  /** true when the committed artifact equals the build output byte for byte. */
  upToDate: boolean;
  committedPath: string;
}

export function checkCommitted(options: BuildOptions = {}): CheckOutcome {
  const root = options.root ?? REPO_ROOT;
  const build = options.build ?? loadBuildConfig();
  const outcome = runBuild({ ...options, root, build });
  const committedPath = resolve(root, build.paths.artifact);
  const committed = existsSync(committedPath) ? readFileSync(committedPath, 'utf8') : null;
  return {
    build: outcome,
    upToDate: outcome.ok && committed !== null && committed === outcome.text,
    committedPath,
  };
}
