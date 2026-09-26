import type { ConfigFile, Json, Namespace } from '../src/types';

export function file(namespace: Namespace, name: string, data: Json): ConfigFile {
  return { namespace, name, path: `config/${namespace}/${name}.json`, data };
}

export function meta(name: string): Json {
  return { file: `${name}.json`, version: 1, owner: 'tech-lead', task: 'P2-F04-T24', doc: 'test' };
}
