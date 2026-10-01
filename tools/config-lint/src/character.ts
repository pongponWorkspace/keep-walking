// Cross-field and cross-file rules of config/balance/character.json (P2-F10-T07, tech note F10
// section 7). The schema checks structure; this module checks what JSON Schema cannot: code-point
// range order, min <= max pairs, that every lexicon dot path resolves inside the referenced
// content file, and that the random-name fallback list fits the length and charset rules.
// The full `validateCharacterName` check of the fallbacks lives in the T12 unit tests
// (packages/shared/src/character), because config-lint must not depend on engine code that does
// not exist yet; the partial check here catches a broken list before any code runs.
import { isObject, isMetaKey, joinPath, type ConfigFile, type Finding, type Json } from './types';

const CHARACTER_FILE = 'config/balance/character.json';
const CODE_POINT = /^U\+([0-9A-F]{4,6})$/;
const HEX = 16;

interface Range {
  readonly from: number;
  readonly to: number;
}

function codePoint(value: Json | undefined): number | null {
  if (typeof value !== 'string') return null;
  const match = CODE_POINT.exec(value);
  return match?.[1] === undefined ? null : Number.parseInt(match[1], HEX);
}

function get(node: Json | undefined, path: string): Json | undefined {
  let current: Json | undefined = node;
  for (const segment of path.split('.')) {
    if (!isObject(current) || !(segment in current)) return undefined;
    current = current[segment];
  }
  return current;
}

function isStringList(value: Json | undefined): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** A lexicon path must name a string, a string list, or an object whose non-`_` values are
 * string lists (e.g. terms by category). */
function resolvesToTerms(value: Json | undefined): boolean {
  if (typeof value === 'string' || isStringList(value)) return true;
  if (!isObject(value)) return false;
  const lists = Object.entries(value).filter(([key]) => !isMetaKey(key));
  return lists.length > 0 && lists.every(([, list]) => isStringList(list));
}

function ranges(value: Json | undefined): Range[] {
  if (!Array.isArray(value)) return [];
  const out: Range[] = [];
  for (const item of value) {
    if (!isObject(item)) continue;
    const from = codePoint(item['from']);
    const to = codePoint(item['to']);
    if (from !== null && to !== null) out.push({ from, to });
  }
  return out;
}

function graphemeCount(text: string, locale: string): number {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'grapheme' });
  return [...segmenter.segment(text)].length;
}

export function checkCharacter(files: readonly ConfigFile[]): Finding[] {
  const character = files.find((f) => f.path === CHARACTER_FILE);
  if (character === undefined) return [];
  const findings: Finding[] = [];
  const add = (at: string, message: string, file = CHARACTER_FILE): void => {
    findings.push({ level: 'error', rule: 'character', file, at, message });
  };
  const data = character.data;

  walkRanges(data, '', add);

  const min = get(data, 'name.minGraphemes');
  const max = get(data, 'name.maxGraphemes');
  if (typeof min === 'number' && typeof max === 'number' && max < min) {
    add('name.maxGraphemes', `maxGraphemes (${max}) must be >= minGraphemes (${min})`);
  }
  const run = get(data, 'contact.phone.maxDigitRun');
  const total = get(data, 'contact.phone.maxTotalDigits');
  if (typeof run === 'number' && typeof total === 'number' && run > total) {
    add('contact.phone.maxDigitRun', `maxDigitRun (${run}) must be <= maxTotalDigits (${total})`);
  }

  for (const section of ['banned', 'random'] as const) {
    const ref = get(data, `${section}.lexiconRef`);
    if (typeof ref !== 'string') continue;
    const lexicon = files.find((f) => f.path === ref);
    if (lexicon === undefined) {
      add(`${section}.lexiconRef`, `lexicon file ${ref} is not a loaded config file`);
      continue;
    }
    const paths = lexiconPaths(get(data, section), section);
    for (const { at, path } of paths) {
      if (typeof path !== 'string') {
        add(at, 'lexicon path must be a string');
        continue;
      }
      if (!resolvesToTerms(get(lexicon.data, path))) {
        add(
          at,
          `"${path}" does not resolve to a string, a string list or lists by category in ${ref}`,
        );
      }
    }
    if (section === 'random') {
      checkFallbacks(data, lexicon, add);
      checkPattern(data, lexicon, add);
    } else {
      checkBanned(data, lexicon, add);
    }
  }
  return findings;
}

type Add = (at: string, message: string, file?: string) => void;

/** Field names that hold one lexicon dot path (`key`, `termsKey`, `fallbackKey`, ...). */
const ONE_PATH = /^(key|[a-z][A-Za-z0-9]*Key)$/;
/** Field names that hold a list of lexicon dot paths (`lexiconKeys`, `template`, ...). */
const PATH_LIST = /^(template|[a-z][A-Za-z0-9]*Keys)$/;

/** Every lexicon path field inside a section that carries `lexiconRef` (tech note F10 7.2). */
function lexiconPaths(node: Json | undefined, at: string): Array<{ at: string; path: Json }> {
  const out: Array<{ at: string; path: Json }> = [];
  if (Array.isArray(node)) {
    node.forEach((item, i) => out.push(...lexiconPaths(item, `${at}[${i}]`)));
    return out;
  }
  if (!isObject(node)) return out;
  for (const [key, value] of Object.entries(node)) {
    if (isMetaKey(key)) continue;
    const path = joinPath(at, key);
    if (ONE_PATH.test(key)) out.push({ at: path, path: value });
    else if (PATH_LIST.test(key) && Array.isArray(value)) {
      value.forEach((item, i) => out.push({ at: `${path}[${i}]`, path: item }));
    } else out.push(...lexiconPaths(value, path));
  }
  return out;
}

/** Every `{ from, to }` object anywhere in character.json must have from <= to. */
function walkRanges(node: Json | undefined, at: string, add: Add): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => walkRanges(item, `${at}[${i}]`, add));
    return;
  }
  if (!isObject(node)) return;
  const from = codePoint(node['from']);
  const to = codePoint(node['to']);
  if (from !== null && to !== null && from > to) {
    add(at, `range from ${String(node['from'])} is after to ${String(node['to'])}`);
  }
  for (const [key, value] of Object.entries(node)) {
    if (!isMetaKey(key)) walkRanges(value, joinPath(at, key), add);
  }
}

/** Partial validate of the fallback names: non-empty, NFC, length and charset (tech note F10 7.3). */
function checkFallbacks(data: Json, lexicon: ConfigFile, add: Add): void {
  const key = get(data, 'random.fallbackKey');
  if (typeof key !== 'string') return;
  const names = get(lexicon.data, key);
  if (!isStringList(names)) {
    if (names !== undefined) add('random.fallbackKey', `"${key}" must be a list of names`);
    return;
  }
  if (names.length === 0) {
    add('random.fallbackKey', `fallback list "${key}" in ${lexicon.path} is empty`);
    return;
  }
  const min = get(data, 'name.minGraphemes');
  const max = get(data, 'name.maxGraphemes');
  const locale = get(data, 'name.segmenter.locale');
  const allowed = ranges(get(data, 'name.allowed'));
  names.forEach((name, i) => {
    const at = `${key}[${i}]`;
    if (name !== name.normalize('NFC') || name !== name.trim()) {
      add(at, 'fallback name must be NFC with no leading or trailing space', lexicon.path);
    }
    if (typeof min === 'number' && typeof max === 'number' && typeof locale === 'string') {
      const count = graphemeCount(name, locale);
      if (count < min || count > max) {
        add(at, `fallback name has ${count} graphemes, outside [${min}, ${max}]`, lexicon.path);
      }
    }
    for (const char of name) {
      const cp = char.codePointAt(0) ?? -1;
      if (!allowed.some((r) => cp >= r.from && cp <= r.to)) {
        add(at, `fallback name has a code point outside name.allowed`, lexicon.path);
        break;
      }
    }
  });
}

/** random.pattern must equal the lexicon value at random.patternKey (P2-H64). */
function checkPattern(data: Json, lexicon: ConfigFile, add: Add): void {
  const key = get(data, 'random.patternKey');
  const expected = get(data, 'random.pattern');
  if (typeof key !== 'string' || typeof expected !== 'string') return;
  const actual = get(lexicon.data, key);
  if (actual !== expected) {
    add(
      'random.pattern',
      `"${expected}" does not match ${lexicon.path} ${key} (${JSON.stringify(actual)})`,
    );
  }
}

/** Code points a pass (and its base) can delete. Mapping steps never delete, so a term whose
 * every code point is in this set is empty after the pass (tech note F10 7.3). */
function removedBy(data: Json, pass: string, seen: ReadonlySet<string> = new Set()): Range[] {
  const node = get(data, `banned.passes.${pass}`);
  if (!isObject(node) || seen.has(pass)) return [];
  const out: Range[] = [];
  const base = node['base'];
  if (typeof base === 'string') out.push(...removedBy(data, base, new Set([...seen, pass])));
  const steps = node['steps'];
  for (const step of Array.isArray(steps) ? steps : []) {
    if (!isObject(step)) continue;
    if (step['op'] === 'removeCodePoints') out.push(...ranges(step['ranges']));
    if (step['op'] === 'nameNormalize')
      out.push(...ranges(get(data, 'name.normalize.stripCodePoints')));
    const chars = step['chars'];
    if (step['op'] === 'removeChars' && isStringList(chars)) {
      for (const c of chars) {
        const cp = c.codePointAt(0);
        if (cp !== undefined) out.push({ from: cp, to: cp });
      }
    }
  }
  return out;
}

function terms(value: Json | undefined): string[] {
  if (isStringList(value)) return value;
  if (!isObject(value)) return [];
  return Object.entries(value).flatMap(([key, list]) => (isMetaKey(key) ? [] : terms(list)));
}

const inRanges = (cp: number, list: readonly Range[]): boolean =>
  list.some((r) => cp >= r.from && cp <= r.to);

/** Pass names resolve; every term and allow entry is NFC, fits termCharset and is not empty
 * after its pass (P2-H64 requests). */
function checkBanned(data: Json, lexicon: ConfigFile, add: Add): void {
  const passes = get(data, 'banned.passes');
  const passNames = isObject(passes) ? Object.keys(passes).filter((k) => !isMetaKey(k)) : [];
  for (const name of passNames) {
    const base = get(data, `banned.passes.${name}.base`);
    if (typeof base === 'string' && (!passNames.includes(base) || base === name)) {
      add(`banned.passes.${name}.base`, `base "${base}" is not another pass`);
    }
  }
  const charsetPath = get(data, 'banned.termCharset');
  const charset = typeof charsetPath === 'string' ? ranges(get(data, charsetPath)) : [];
  if (charset.length === 0)
    add('banned.termCharset', 'must point at a non-empty range list in character.json');
  const lists: Array<{ at: string; pass: Json | undefined; key: Json | undefined }> = [];
  for (const group of ['modes', 'allow'] as const) {
    const node = get(data, `banned.${group}`);
    if (!isObject(node)) continue;
    for (const [name, entry] of Object.entries(node)) {
      if (isMetaKey(name) || !isObject(entry)) continue;
      const pass = group === 'modes' ? entry['pass'] : name;
      const key = group === 'modes' ? entry['termsKey'] : entry['key'];
      lists.push({ at: `banned.${group}.${name}`, pass, key });
    }
  }
  for (const { at, pass, key } of lists) {
    if (typeof pass !== 'string' || !passNames.includes(pass)) {
      add(at, `pass ${JSON.stringify(pass)} is not one of banned.passes`);
      continue;
    }
    if (typeof key !== 'string') continue;
    const removed = removedBy(data, pass);
    terms(get(lexicon.data, key)).forEach((term, i) => {
      const where = `${key}[${i}]`;
      const cps = [...term].map((c) => c.codePointAt(0) ?? -1);
      if (term !== term.normalize('NFC')) add(where, 'term must be NFC', lexicon.path);
      if (charset.length > 0 && !cps.every((cp) => inRanges(cp, charset))) {
        add(where, 'term has a code point outside banned.termCharset', lexicon.path);
      }
      if (cps.every((cp) => inRanges(cp, removed))) {
        add(where, `term is empty after pass "${pass}"`, lexicon.path);
      }
    });
  }
}
