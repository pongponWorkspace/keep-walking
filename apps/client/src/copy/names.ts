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
  readonly nameSuffix?: string;
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
 * honest fallback (same "never crash on missing content" convention as `getCopyText`, TL-N06). Also
 * resolves `dungeon.<id>.search` (`search_name_key`, field `name`) — the same lookup, one path. */
export function getItemName(nameKey: string): string {
  const entry = nameIndex.get(nameKey);
  if (entry === undefined) return nameKey;
  return entry.name ?? entry.nameReal ?? nameKey;
}

/** Copy gate C-01: `name_key` (`dungeon.<id>`) resolved through `names.th.json`, never
 * `copy.th.json` (`getCopyText` does not have these keys at all — a dungeon name is content, owned
 * by narrative-designer/back office, not UI copy). `{nameReal} — {nameSuffix}`
 * (`names.th.json#_meta.displayFormat`, "ช่องว่าง + U+2014 + ช่องว่าง"): the full zone name shown
 * where `copy.th.json#_variables.zoneName` (34 cells) fits, e.g. `dungeon.confirmTitle`. */
export function getDungeonFullName(nameKey: string): string {
  const entry = nameIndex.get(nameKey);
  if (entry?.nameReal === undefined) return nameKey;
  return entry.nameSuffix === undefined
    ? entry.nameReal
    : `${entry.nameReal} — ${entry.nameSuffix}`;
}

/** The short form (`nameReal` alone, `copy.th.json#_variables.zoneRealName`, 17 cells): map labels,
 * overlap-chooser cards, and anywhere else too narrow for the full `{zoneName}` (copy gate C-01). */
export function getDungeonShortName(nameKey: string): string {
  return nameIndex.get(nameKey)?.nameReal ?? nameKey;
}

/** True when `resolvedName` is an actual resolved name, not `getDungeonShortName`/
 * `getDungeonFullName`'s own "key not found" fallback (A2, copy gate P2-X37) — callers hide the
 * whole name line rather than show a raw key. */
export function isResolvedDungeonName(nameKey: string, resolvedName: string): boolean {
  return resolvedName !== nameKey;
}
