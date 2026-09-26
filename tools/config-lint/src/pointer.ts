// Pointer rule of ADR 0001 3.10.6: `seeFile` / `see<Name>` hold "<file>#<dot.path>" and the
// target must exist. A file without `/` is in the same folder; with `/` it is repo-relative and
// starts with `config/`. A path may point at an object or a single value, never into an array.
import {
  isMetaKey,
  isObject,
  isPointerKey,
  joinPath,
  type ConfigFile,
  type Finding,
  type Json,
} from './types';

const POINTER_PATTERN = /^([^#\s]+\.json)#([A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*)$/;
const REPO_CONFIG_PREFIX = 'config/';

export interface PointerRef {
  readonly file: string;
  readonly at: string;
  readonly value: string;
}

/** Every pointer in a file, including pointers inside objects nested in arrays. */
export function collectPointers(file: ConfigFile): PointerRef[] {
  const out: PointerRef[] = [];
  const visit = (value: Json, at: string): void => {
    if (Array.isArray(value)) {
      value.forEach((element, index) => visit(element, `${at}[${index}]`));
      return;
    }
    if (!isObject(value)) return;
    for (const [key, child] of Object.entries(value)) {
      if (isMetaKey(key)) continue;
      const path = joinPath(at, key);
      if (isPointerKey(key) && typeof child === 'string') {
        out.push({ file: file.path, at: path, value: child });
      } else {
        visit(child, path);
      }
    }
  };
  visit(file.data, '');
  return out;
}

/** Resolves "<file>#<path>" against the loaded files; returns an error message or null. */
export function resolvePointer(
  ref: PointerRef,
  byPath: ReadonlyMap<string, ConfigFile>,
): string | null {
  const match = POINTER_PATTERN.exec(ref.value);
  if (match === null || match[1] === undefined || match[2] === undefined) {
    return `pointer "${ref.value}" must look like "<file>.json#<dot.path>" (3.10.6)`;
  }
  const target = match[1];
  let targetPath: string;
  if (target.includes('/')) {
    if (!target.startsWith(REPO_CONFIG_PREFIX)) {
      return `pointer file "${target}" contains "/" so it must start with "config/" (3.10.6)`;
    }
    targetPath = target;
  } else {
    const folder = ref.file.slice(0, ref.file.lastIndexOf('/') + 1);
    targetPath = `${folder}${target}`;
  }
  const targetFile = byPath.get(targetPath);
  if (targetFile === undefined) return `pointer target file "${targetPath}" does not exist`;
  let node: Json = targetFile.data;
  for (const segment of match[2].split('.')) {
    if (Array.isArray(node))
      return `pointer "${ref.value}" enters an array at "${segment}" (3.10.6)`;
    if (!isObject(node) || !(segment in node)) {
      return `pointer "${ref.value}": "${segment}" not found in ${targetPath}`;
    }
    node = node[segment] as Json;
  }
  return null;
}

export function checkPointers(files: readonly ConfigFile[]): Finding[] {
  const byPath = new Map(files.map((file) => [file.path, file]));
  const findings: Finding[] = [];
  for (const file of files) {
    for (const ref of collectPointers(file)) {
      const problem = resolvePointer(ref, byPath);
      if (problem !== null) {
        findings.push({
          level: 'error',
          rule: 'pointer',
          file: ref.file,
          at: ref.at,
          message: problem,
        });
      }
    }
  }
  return findings;
}
