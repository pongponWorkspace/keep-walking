// Per-file convention rules of ADR 0001 3.10.2-3.10.6 (D-062). Pointer targets are resolved in
// pointer.ts because they need every file; cross-file invariants live in cross.ts.
import { checkNumericKeyName, checkRatioRange, checkSuffixKnown, namesUnitOrKind } from './units';
import {
  isMetaKey,
  isObject,
  isPointerKey,
  joinPath,
  type ConfigFile,
  type Finding,
  type Json,
  type JsonObject,
  type RuleId,
} from './types';

const META_REQUIRED_FIELDS = ['file', 'version', 'owner', 'task', 'doc'] as const;
/** camelCase, optionally one unit suffix after `_` (ADR 0001 3.10.3). */
const KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(_[a-z][a-zA-Z0-9]*)?$/;
/** Map keys of level-indexed tables (`successRateByTargetLevel_pct.12`). */
const INDEX_KEY_PATTERN = /^[1-9][0-9]*$/;
/** Flat key maps (copy-schema 2.1): `<group>.<stableId>`, never split on dots. */
const FLAT_KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;
const SOURCE_KEY_PATTERN = /^_(.+_)?source$/;
const LOCAL_TIME_SUFFIX = 'LocalTime';
const LOCAL_TIME_PATTERN = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const TIMEZONE_KEY = 'timezone';
const TIMEZONE_SUFFIX = 'Timezone';
const IANA_ZONE_PATTERN = /^[A-Z][A-Za-z_]+\/[A-Za-z_]+$/;
const NULL_MEANS_VALUES = new Set(['unbounded', 'none']);
const ARRAY_FIELD_MARK = '[].';

/**
 * Flat key map files: `copy.<locale>.json` (ADR 0001 3.10.4 exempts entries and `_variables`
 * from `_source`) and `names.<locale>.json`, which uses the same flat structure and takes its
 * provenance from `_meta.doc` (names.th.json `_meta.structure`). Same exemption, same reason.
 */
export function isFlatKeyMap(file: Pick<ConfigFile, 'namespace' | 'name'>): boolean {
  return file.namespace === 'content' && /^(copy|names)\.[a-z]{2}$/.test(file.name);
}

interface Ctx {
  readonly file: string;
  readonly out: Finding[];
}

function add(ctx: Ctx, level: Finding['level'], rule: RuleId, at: string, message: string): void {
  ctx.out.push({ level, rule, file: ctx.file, at, message });
}

export function checkConventions(file: ConfigFile): Finding[] {
  const ctx: Ctx = { file: file.path, out: [] };
  if (!isObject(file.data)) {
    add(ctx, 'error', 'top-level-object', '', 'top level must be a JSON object (3.10.2)');
    return ctx.out;
  }
  checkMeta(ctx, file, file.data);
  if (isFlatKeyMap(file)) {
    for (const [key, value] of Object.entries(file.data)) {
      if (isMetaKey(key)) continue;
      if (!FLAT_KEY_PATTERN.test(key)) {
        add(
          ctx,
          'error',
          'key-case',
          key,
          'flat key must match <group>.<stableId> (copy-schema 2.1)',
        );
      }
      if (isObject(value))
        walkObject(ctx, value, key, {
          sourceExempt: true,
          keyCaseExempt: false,
          unitInherited: false,
        });
    }
    return ctx.out;
  }
  walkObject(ctx, file.data, '', {
    sourceExempt: false,
    keyCaseExempt: false,
    unitInherited: false,
  });
  return ctx.out;
}

function checkMeta(ctx: Ctx, file: ConfigFile, root: JsonObject): void {
  const meta = root['_meta'];
  if (!isObject(meta)) {
    add(
      ctx,
      'error',
      'meta-missing',
      '_meta',
      'every config file needs a top-level _meta object (3.10.2)',
    );
    return;
  }
  for (const field of META_REQUIRED_FIELDS) {
    const value = meta[field];
    if (field === 'version') {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
        add(ctx, 'error', 'meta-field', '_meta.version', '_meta.version must be an integer >= 1');
      }
    } else if (typeof value !== 'string' || value.trim() === '') {
      add(
        ctx,
        'error',
        'meta-field',
        `_meta.${field}`,
        `_meta.${field} must be a non-empty string`,
      );
    }
  }
  const declared = meta['file'];
  const fileName = `${file.name}.json`;
  if (typeof declared === 'string' && declared !== fileName && declared !== file.path) {
    add(
      ctx,
      'error',
      'meta-field',
      '_meta.file',
      `_meta.file is "${declared}", expected "${fileName}" or "${file.path}"`,
    );
  }
}

interface WalkOpts {
  /**
   * Provenance comes from the container for the whole subtree: objects inside an array and
   * flat-map entries. (A record whose direct parent has `_source` as a string, or as a map that
   * names it, is covered one level only: `coveredByParent`, e.g. `potions.hpSmall`.)
   */
  readonly sourceExempt: boolean;
  readonly keyCaseExempt: boolean;
  /** The object's own key names a unit or unit-less kind; numeric children inherit it. */
  readonly unitInherited: boolean;
}

function coversChild(parent: JsonObject, childKey: string): boolean {
  const source = parent['_source'];
  if (typeof source === 'string') return true;
  return isObject(source) && childKey in source;
}

function hasLeafValue(obj: JsonObject): boolean {
  return Object.entries(obj).some(
    ([key, value]) => !isMetaKey(key) && !isPointerKey(key) && !isObject(value),
  );
}

function nullMeansOf(obj: JsonObject): JsonObject {
  const declared = obj['_nullMeans'];
  return isObject(declared) ? declared : {};
}

function walkObject(
  ctx: Ctx,
  obj: JsonObject,
  at: string,
  opts: WalkOpts,
  /** `_nullMeans` of the object that holds the array this element sits in, keyed `arr[].field`. */
  arrayNullMeans?: { readonly declared: JsonObject; readonly arrayKey: string },
  /** This object alone is covered by its parent's `_source` (does not propagate). */
  coveredByParent = false,
): void {
  if (at !== '' && '_meta' in obj) {
    add(
      ctx,
      'error',
      'meta-nested',
      joinPath(at, '_meta'),
      '_meta is allowed at top level only (3.10.4)',
    );
  }
  const isRoot = at === '';
  if (!isRoot && !opts.sourceExempt && !coveredByParent && hasLeafValue(obj)) {
    const hasSource = Object.keys(obj).some((key) => SOURCE_KEY_PATTERN.test(key));
    if (!hasSource) {
      add(ctx, 'error', 'source-missing', at, 'object with values needs _source (3.10.4)');
    }
  }
  checkNullMeans(ctx, obj, at);
  const declaredNulls = nullMeansOf(obj);
  for (const [key, value] of Object.entries(obj)) {
    if (isMetaKey(key)) continue;
    const path = joinPath(at, key);
    if (isPointerKey(key)) {
      if (typeof value !== 'string') {
        add(
          ctx,
          'error',
          'pointer-name',
          path,
          'keys named see<Name> are pointers and must hold "<file>#<path>" (3.10.6)',
        );
      }
      continue;
    }
    if (!opts.keyCaseExempt && !KEY_PATTERN.test(key) && !INDEX_KEY_PATTERN.test(key)) {
      add(
        ctx,
        'error',
        'key-case',
        path,
        'key must be camelCase with an optional _<unit> suffix (3.10.3)',
      );
    }
    if (value === null) {
      const declaredHere = key in declaredNulls;
      const declaredInArray =
        arrayNullMeans !== undefined &&
        `${arrayNullMeans.arrayKey}${ARRAY_FIELD_MARK}${key}` in arrayNullMeans.declared;
      if (!declaredHere && !declaredInArray) {
        add(
          ctx,
          'warn',
          'null-undeclared',
          path,
          'null = not set yet; reading it throws ConfigUnsetError (3.10.5). Declare _nullMeans if intentional',
        );
      }
    }
    const unitProblems = [
      ...checkSuffixKnown(key, value),
      ...checkNumericKeyName(key, value, opts.unitInherited),
    ];
    for (const finding of unitProblems.slice(0, 1)) add(ctx, 'error', 'unit-suffix', path, finding);
    for (const finding of checkRatioRange(key, value))
      add(ctx, 'error', 'ratio-range', path, finding);
    if (key.endsWith(LOCAL_TIME_SUFFIX)) checkLocalTime(ctx, obj, key, value, path);
    if (isObject(value)) {
      const childOpts = {
        sourceExempt: opts.sourceExempt,
        keyCaseExempt: opts.keyCaseExempt,
        unitInherited: namesUnitOrKind(key),
      };
      walkObject(ctx, value, path, childOpts, undefined, coversChild(obj, key));
    } else if (Array.isArray(value)) {
      value.forEach((element, index) => {
        if (isObject(element)) {
          const elementOpts = { ...opts, sourceExempt: true, unitInherited: false };
          walkObject(ctx, element, `${path}[${index}]`, elementOpts, {
            declared: declaredNulls,
            arrayKey: key,
          });
        }
      });
    }
  }
}

function checkLocalTime(ctx: Ctx, obj: JsonObject, key: string, value: Json, path: string): void {
  if (typeof value !== 'string' || !LOCAL_TIME_PATTERN.test(value)) {
    add(ctx, 'error', 'local-time', path, `${key} must be "HH:mm" (3.10.3)`);
  }
  // `timezone`, or the paired `<prefix>Timezone` for `<prefix>LocalTime` (economy marketTax
  // resetLocalTime + resetTimezone): same object, IANA name.
  const prefix = key.slice(0, -LOCAL_TIME_SUFFIX.length);
  const zone = obj[TIMEZONE_KEY] ?? obj[`${prefix}${TIMEZONE_SUFFIX}`];
  if (typeof zone !== 'string' || !IANA_ZONE_PATTERN.test(zone)) {
    add(
      ctx,
      'error',
      'local-time',
      path,
      `${key} needs an IANA "timezone" (or "${prefix}${TIMEZONE_SUFFIX}") in the same object (3.10.3)`,
    );
  }
}

function checkNullMeans(ctx: Ctx, obj: JsonObject, at: string): void {
  const raw = obj['_nullMeans'];
  if (raw === undefined) return;
  const path = joinPath(at, '_nullMeans');
  if (!isObject(raw)) {
    add(
      ctx,
      'error',
      'null-means',
      path,
      '_nullMeans must be an object { "<key>": "unbounded" | "none" }',
    );
    return;
  }
  for (const [declared, meaning] of Object.entries(raw)) {
    if (typeof meaning !== 'string' || !NULL_MEANS_VALUES.has(meaning)) {
      add(
        ctx,
        'error',
        'null-means',
        `${path}.${declared}`,
        '_nullMeans value must be "unbounded" or "none" (3.10.5)',
      );
    }
    if (!declaredTargetIsNull(obj, declared)) {
      add(
        ctx,
        'error',
        'null-means',
        `${path}.${declared}`,
        `_nullMeans declares "${declared}" but no such null value exists in this object`,
      );
    }
  }
}

function declaredTargetIsNull(obj: JsonObject, declared: string): boolean {
  const mark = declared.indexOf(ARRAY_FIELD_MARK);
  if (mark === -1) return declared in obj && obj[declared] === null;
  const array = obj[declared.slice(0, mark)];
  const field = declared.slice(mark + ARRAY_FIELD_MARK.length);
  return (
    Array.isArray(array) && array.some((el) => isObject(el) && field in el && el[field] === null)
  );
}
