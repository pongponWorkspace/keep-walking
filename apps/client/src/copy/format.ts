/**
 * `{variable}` substitution for `copy.th.json` entries (copy-schema.md section 5, `_variables`).
 * The narrative-designer's text stays the single source of the sentence; this module only fills
 * in the placeholders the flow docs already name (`{distanceText}`, `{timeLeft}`, `{countdown}`,
 * `{openTime}`, `{directionText}`, ...). A key with no matching variable in `vars` is left as-is
 * (never throws — same "honest, never crash on copy" convention as `getCopyText`'s key fallback).
 */
import { getCopyText } from './load';

export type CopyVars = Readonly<Record<string, string | number>>;

const PLACEHOLDER_PATTERN = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

/** Fills `{name}` placeholders in `text` from `vars`; a placeholder missing from `vars` is left
 * untouched (visible in dev, not a silent wrong number). */
export function formatText(text: string, vars: CopyVars): string {
  return text.replace(PLACEHOLDER_PATTERN, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

/** `getCopyText(key)` with `{variable}` substitution applied. */
export function formatCopyText(key: string, vars: CopyVars = {}): string {
  return formatText(getCopyText(key), vars);
}
