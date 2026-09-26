// Minimal JSON Schema (draft 2020-12) validator for the keywords manifest.schema.json uses.
// tools/art has no package.json (ADR 0003 8.1), so ajv is not resolvable here. An unknown
// keyword throws instead of being ignored, so a schema edit can never be skipped silently.
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Schema = { [key: string]: Json };

const ANNOTATIONS = new Set(['$schema', '$id', '$comment', '$defs', 'title', 'description']);
const KNOWN = new Set([
  'type',
  'required',
  'additionalProperties',
  'properties',
  '$ref',
  'const',
  'enum',
  'pattern',
  'minimum',
  'maximum',
  'minItems',
  'uniqueItems',
  'items',
  'oneOf',
  'allOf',
  'if',
  'then',
  'else',
  'not',
]);

export interface SchemaError {
  path: string;
  message: string;
}

function typeOf(value: Json | undefined): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function typeMatches(value: Json, expected: string): boolean {
  const actual = typeOf(value);
  return actual === expected || (expected === 'number' && actual === 'integer');
}

function isObject(value: Json | undefined): value is { [key: string]: Json } {
  return typeOf(value) === 'object';
}

export class SchemaValidator {
  constructor(private readonly root: Schema) {}

  validate(value: unknown, schema: Schema = this.root, path = ''): SchemaError[] {
    const errors: SchemaError[] = [];
    this.check(value as Json, schema, path, errors);
    return errors;
  }

  /** Validate against a local definition such as `#/$defs/buildManifest`. */
  validateRef(value: unknown, ref: string): SchemaError[] {
    return this.validate(value, this.resolve(ref));
  }

  private resolve(ref: string): Schema {
    if (!ref.startsWith('#/')) throw new Error(`json-schema: only local $ref is supported (${ref})`);
    let node: Json = this.root;
    for (const part of ref.slice(2).split('/')) {
      if (!isObject(node)) throw new Error(`json-schema: bad $ref ${ref}`);
      node = node[part] ?? null;
    }
    if (!isObject(node)) throw new Error(`json-schema: bad $ref ${ref}`);
    return node;
  }

  private ok(value: Json, schema: Schema, path: string): boolean {
    const scratch: SchemaError[] = [];
    this.check(value, schema, path, scratch);
    return scratch.length === 0;
  }

  private check(value: Json, schema: Schema, path: string, errors: SchemaError[]): void {
    const at = path === '' ? '/' : path;
    for (const key of Object.keys(schema)) {
      if (!KNOWN.has(key) && !ANNOTATIONS.has(key)) {
        throw new Error(`json-schema: unsupported keyword "${key}" at ${at}`);
      }
    }
    const fail = (message: string): void => {
      errors.push({ path: at, message });
    };
    const ref = schema['$ref'];
    if (typeof ref === 'string') this.check(value, this.resolve(ref), path, errors);
    const type = schema['type'];
    if (type !== undefined) {
      const types = Array.isArray(type) ? type : [type];
      if (!types.some((t) => typeof t === 'string' && typeMatches(value, t))) {
        fail(`must be ${types.join(' or ')}, got ${typeOf(value)}`);
        return;
      }
    }
    if ('const' in schema && JSON.stringify(schema['const']) !== JSON.stringify(value)) {
      fail(`must equal ${JSON.stringify(schema['const'])}`);
    }
    const enumValues = schema['enum'];
    if (Array.isArray(enumValues) && !enumValues.some((e) => JSON.stringify(e) === JSON.stringify(value))) {
      fail(`must be one of ${JSON.stringify(enumValues)}`);
    }
    const pattern = schema['pattern'];
    if (typeof pattern === 'string' && typeof value === 'string' && !new RegExp(pattern, 'u').test(value)) {
      fail(`must match ${pattern}`);
    }
    const minimum = schema['minimum'];
    if (typeof minimum === 'number' && typeof value === 'number' && value < minimum) fail(`must be >= ${minimum}`);
    const maximum = schema['maximum'];
    if (typeof maximum === 'number' && typeof value === 'number' && value > maximum) fail(`must be <= ${maximum}`);
    if (Array.isArray(value)) this.checkArray(value, schema, path, fail, errors);
    if (isObject(value)) this.checkObject(value, schema, path, fail, errors);
    this.checkCombinators(value, schema, path, fail, errors);
  }

  private checkArray(
    value: Json[],
    schema: Schema,
    path: string,
    fail: (m: string) => void,
    errors: SchemaError[],
  ): void {
    const minItems = schema['minItems'];
    if (typeof minItems === 'number' && value.length < minItems) fail(`must have >= ${minItems} items`);
    if (schema['uniqueItems'] === true && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) {
      fail('items must be unique');
    }
    const items = schema['items'];
    if (isObject(items)) value.forEach((item, i) => this.check(item, items, `${path}/${i}`, errors));
  }

  private checkObject(
    value: { [key: string]: Json },
    schema: Schema,
    path: string,
    fail: (m: string) => void,
    errors: SchemaError[],
  ): void {
    const required = schema['required'];
    if (Array.isArray(required)) {
      for (const key of required) if (typeof key === 'string' && !(key in value)) fail(`missing "${key}"`);
    }
    const properties = schema['properties'];
    const props = isObject(properties) ? properties : {};
    for (const [key, child] of Object.entries(value)) {
      const sub = props[key];
      if (isObject(sub)) this.check(child, sub, `${path}/${key}`, errors);
      else if (schema['additionalProperties'] === false) fail(`unknown property "${key}"`);
    }
  }

  private checkCombinators(
    value: Json,
    schema: Schema,
    path: string,
    fail: (m: string) => void,
    errors: SchemaError[],
  ): void {
    const allOf = schema['allOf'];
    if (Array.isArray(allOf)) for (const sub of allOf) if (isObject(sub)) this.check(value, sub, path, errors);
    const oneOf = schema['oneOf'];
    if (Array.isArray(oneOf)) {
      const passing = oneOf.filter((sub) => isObject(sub) && this.ok(value, sub, path)).length;
      if (passing !== 1) fail(`must match exactly one schema in oneOf (matched ${passing})`);
    }
    const not = schema['not'];
    if (isObject(not) && this.ok(value, not, path)) fail('must not match "not" schema');
    const cond = schema['if'];
    if (isObject(cond)) {
      const branch = this.ok(value, cond, path) ? schema['then'] : schema['else'];
      if (isObject(branch)) this.check(value, branch, path, errors);
    }
  }
}
