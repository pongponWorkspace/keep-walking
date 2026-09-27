/**
 * Reads `config/content/names.th.json` as a flat key map (same convention as `copy/load.ts`'s
 * `copy.th.json`, docs/tech/copy-schema.md 2.1), but for the *displayed name* field the
 * narrative-designer's own groups doc uses: `name` for most groups (`material.*`, `potion.*`,
 * `equipment.*`, `monster.*`, `boss.*`), and `nameReal` for `dungeon.*` (already read directly by
 * `dungeons/artifact.ts` through `dungeon.<id>` -> `copy/load.ts`'s `name_key`, unaffected by this
 * module). This file only serves the item-name lookup the run summary needs (`drops.json#items.
 * <id>.nameKey` -> `names.th.json`), never a Thai literal in code (CLAUDE.md).
 */
import namesThJson from '../../../../config/content/names.th.json';

interface NameEntry {
  readonly name?: string;
  readonly nameReal?: string;
}

function isNameEntry(value: unknown): value is NameEntry {
  return typeof value === 'object' && value !== null;
}

/** Skips every `_`-prefixed key at the top level (metadata), same rule `copyEntries` uses. */
function buildNameIndex(file: unknown): ReadonlyMap<string, NameEntry> {
  const index = new Map<string, NameEntry>();
  if (typeof file !== 'object' || file === null) return index;
  for (const [key, value] of Object.entries(file as Record<string, unknown>)) {
    if (key.startsWith('_')) continue;
    if (isNameEntry(value)) index.set(key, value);
  }
  return index;
}

const nameIndex = buildNameIndex(namesThJson);

/** `entry.name` (or `entry.nameReal` for a `dungeon.*`-shaped entry), or the key itself as an
 * honest fallback (same "never crash on missing content" convention as `getCopyText`, TL-N06). */
export function getItemName(nameKey: string): string {
  const entry = nameIndex.get(nameKey);
  if (entry === undefined) return nameKey;
  return entry.name ?? entry.nameReal ?? nameKey;
}
