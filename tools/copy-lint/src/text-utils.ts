/** Small text helpers used by several checks. Not part of the shared contract (tools-only). */

const VARIABLE_SOURCE = '\\{[a-z][a-zA-Z0-9]*\\}';

/**
 * `text` with every `{variable}` replaced by an empty string (docs/tech/copy-schema.md 4.2:
 * "ตรวจคำ ... สตริงว่าง"). Used before every word/number check so a variable name never
 * looks like an English token, a digit, or a banned word.
 */
export function stripVariables(text: string): string {
  return text.replace(new RegExp(VARIABLE_SOURCE, 'gu'), '');
}

/** First line of `text` (before the first `\n`, or the whole string when there is none). */
export function firstLine(text: string): string {
  const index = text.indexOf('\n');
  return index === -1 ? text : text.slice(0, index);
}

/** Number of `\n` characters in `text`. */
export function countNewlines(text: string): number {
  let count = 0;
  for (const ch of text) {
    if (ch === '\n') {
      count += 1;
    }
  }
  return count;
}

/** The `area` part of a flat copy key (`"run.death"` -> `"run"`). */
export function areaOf(key: string): string {
  const dot = key.indexOf('.');
  return dot === -1 ? key : key.slice(0, dot);
}

export interface EntryText {
  /** Reporting label: the key itself for `text`, `"<key> alts[i]"` for an alt. */
  readonly label: string;
  readonly text: string;
}

/** `text`, plus every item of `alts` labelled for reporting (used by S2, S3, S5, S6, S8...). */
export function entryTexts(
  key: string,
  entry: { text: string; alts?: readonly string[] },
): readonly EntryText[] {
  const texts: EntryText[] = [{ label: key, text: entry.text }];
  entry.alts?.forEach((alt, index) => {
    texts.push({ label: `${key} alts[${index}]`, text: alt });
  });
  return texts;
}
