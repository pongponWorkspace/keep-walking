/**
 * Registered dynamic copy keys for S15 (code-referenced keys must exist in copy.th.json).
 *
 * code-refs.ts expands a template key such as `character.nameError.${reason}` on its own when
 * `reason` has a finite string-literal union type. When a hole has an open type (`number`,
 * `string`), the scan yields a pattern like `story.slide${}.title`. Every such pattern must be
 * listed here, for the file it occurs in, or S15 fails: a new dynamic key cannot slip through
 * silently.
 *
 * `values` (one string per expansion of the single `${}` hole) makes S15 check every expanded key.
 * Keep `values` in step with the code's own constant (named in `source`). Leave `values` out only
 * when the set is truly open; S15 then requires at least one copy key to match the pattern.
 */
import { PATTERN_HOLE } from './code-refs';

export interface DynamicKeyEntry {
  /** Repo-relative path of the file that builds the key. */
  readonly file: string;
  /** The pattern exactly as code-refs.ts reports it, `${}` marking the hole. */
  readonly pattern: string;
  /** The values the single hole takes. Omit only for an open set (then: at least one match). */
  readonly values?: readonly string[];
  /** Where the values come from in the code, for the reviewer who updates this list. */
  readonly source: string;
}

export const DYNAMIC_KEYS: readonly DynamicKeyEntry[] = [
  {
    file: 'apps/client/src/ui/story-screen.ts',
    pattern: 'story.slide${}.title',
    values: ['1', '2', '3', '4', '5'],
    source: 'story-screen.ts STORY_SLIDE_COUNT = 5 (slides 1-5, F10 R25)',
  },
  {
    file: 'apps/client/src/ui/story-screen.ts',
    pattern: 'story.slide${}.body',
    values: ['1', '2', '3', '5'],
    source:
      'story-screen.ts bodyKeyForSlide: slide 4 (SYSTEM_NARRATION_SLIDE) reads story.slide4.bodySystem instead (D-156)',
  },
];

/** `pattern` with its single hole replaced by `value`; `undefined` if the hole count is not 1. */
export function expandPattern(pattern: string, value: string): string | undefined {
  const parts = pattern.split(PATTERN_HOLE);
  return parts.length === 2 ? `${parts[0] ?? ''}${value}${parts[1] ?? ''}` : undefined;
}

/** Regex that matches any key the pattern can produce (holes match one or more key chars). */
export function patternRegex(pattern: string): RegExp {
  const escaped = pattern
    .split(PATTERN_HOLE)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('[A-Za-z0-9_]+');
  return new RegExp(`^${escaped}$`);
}
