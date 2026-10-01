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

// P2-X07 emptied the list. P2-F10-T07 added in-flight F10 entries; their owners added `_source`
// and P2-X60 removed all 13 (STALE). Keep this list empty unless a scheduled in-flight edit needs it.
export const ALLOWLIST: readonly AllowEntry[] = [];
