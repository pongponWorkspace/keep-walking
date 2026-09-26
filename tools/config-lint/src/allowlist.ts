// Allowlist of known config-lint errors (P2-F04-T24). Each entry names the owner of the config
// file and the task that removes it. Only tech-lead edits this list. An allowlisted finding is
// printed as ALLOWED and does not fail `pnpm test`; an entry that matches nothing is printed as
// STALE (warn) so it can be deleted, without failing the owner's run after they fix the file.
//
// kind:
//   in-flight = caused by an edit in progress by another task (brief of P2-F04-T24).
//   handoff   = pre-existing value that predates the lint; owner renames it in a fix task. Kept
//               here so root `pnpm test` stays green while the rename is scheduled (reported in
//               the P2-F04-T24 REPORT as a deviation from "in-flight only").
import type { RuleId } from './types';

export interface AllowEntry {
  readonly rule: RuleId;
  readonly file: string;
  readonly at: string;
  readonly kind: 'in-flight' | 'handoff';
  readonly owner: string;
  readonly task: string;
  readonly fix: string;
}

// Empty since P2-X07: the unit-suffix follow-ups of P2-X04 and the P2-X06 renames are all fixed.
export const ALLOWLIST: readonly AllowEntry[] = [];
