import type { CopyVariable } from '@keep-walking/shared';
import { MissingCopyVariableError, fillWithMaxCells } from '@keep-walking/shared';

/**
 * `text` with every `{variable}` replaced by its worst-case `maxCells` filler, for S4.
 * Returns `undefined` when `text` uses a variable that is not registered: S7 already reports
 * that, and S4 has nothing useful to measure without a filler width.
 */
export function fillForLength(
  text: string,
  variables: ReadonlyMap<string, CopyVariable>,
): string | undefined {
  try {
    return fillWithMaxCells(text, variables);
  } catch (error) {
    if (error instanceof MissingCopyVariableError) {
      return undefined;
    }
    throw error;
  }
}
