/**
 * Reads `config/content/copy.th.json` as the flat key map it is (docs/tech/copy-schema.md 2.1;
 * `@keep-walking/shared` `copyEntries()` — never split a key on `.`). The narrative-designer owns
 * every value here; UI code never embeds a Thai string (CLAUDE.md).
 *
 * Fallback (TL-N06, same convention as `client.mapSpike.tilesUrlMissing` in src/main.ts): when a
 * key does not exist yet in copy.th.json, `getCopyText` returns the key itself instead of
 * throwing or showing nothing, so a screen stays honestly labelled while narrative catches up.
 */
import { copyEntries } from '@keep-walking/shared';
import type { CopyEntry } from '@keep-walking/shared';
import copyThJson from '../../../../config/content/copy.th.json';

/** Pure so tests can pass a fixture file shape without touching the real JSON import. */
export function buildCopyIndex(file: unknown): ReadonlyMap<string, CopyEntry> {
  return copyEntries(file);
}

const copyIndex: ReadonlyMap<string, CopyEntry> = buildCopyIndex(copyThJson);

/** The parsed entry for `key`, or `undefined` when copy.th.json does not have it yet. */
export function getCopyEntry(key: string): CopyEntry | undefined {
  return copyIndex.get(key);
}

/** `entry.text`, or the key itself as an honest fallback (TL-N06). Never throws. */
export function getCopyText(key: string): string {
  return copyIndex.get(key)?.text ?? key;
}
