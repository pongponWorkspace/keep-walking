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

// P2-X07 emptied the list. P2-F10-T07 adds the in-flight F10 entries below: objects without
// `_source` in the T03 content file (narrative-designer) and in the P2-H64 v2 banned.modes /
// banned.allow blocks of character.json (systems-designer). Both owners fix in the same wave.
const H64_SOURCE = {
  kind: 'in-flight',
  owner: 'systems-designer',
  task: 'P2-H64 follow-up (orchestrator schedules)',
  fix: 'add _source to banned.modes.* and banned.allow.* (ADR 0001 3.10.4)',
} as const;
const T03_SOURCE = {
  kind: 'in-flight',
  owner: 'narrative-designer',
  task: 'P2-F10-T03 fix (orchestrator schedules)',
  fix: 'add _source to every object with values (ADR 0001 3.10.4)',
} as const;

export const ALLOWLIST: readonly AllowEntry[] = [
  {
    rule: 'source-missing',
    file: 'config/balance/character.json',
    at: 'banned.modes.substring',
    ...H64_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/balance/character.json',
    at: 'banned.modes.token',
    ...H64_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/balance/character.json',
    at: 'banned.modes.substringHeavy',
    ...H64_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/balance/character.json',
    at: 'banned.allow.light',
    ...H64_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/balance/character.json',
    at: 'banned.allow.heavy',
    ...H64_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/content/character-names.th.json',
    at: 'randomName',
    ...T03_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/content/character-names.th.json',
    at: 'randomName.fallback',
    ...T03_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/content/character-names.th.json',
    at: 'blockedTerms.normalization',
    ...T03_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/content/character-names.th.json',
    at: 'blockedTerms.normalization.matchModes',
    ...T03_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/content/character-names.th.json',
    at: 'blockedTerms.normalization.allow',
    ...T03_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/content/character-names.th.json',
    at: 'blockedTerms.substring',
    ...T03_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/content/character-names.th.json',
    at: 'blockedTerms.substringHeavy',
    ...T03_SOURCE,
  },
  {
    rule: 'source-missing',
    file: 'config/content/character-names.th.json',
    at: 'blockedTerms.token',
    ...T03_SOURCE,
  },
];
