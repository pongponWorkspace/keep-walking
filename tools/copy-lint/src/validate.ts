/**
 * JSON Schema validation (Ajv is allowed in tools/, per docs/tech/copy-schema.md section 7:
 * Workers forbid `new Function`, but this is an offline CLI, not a Worker).
 */
import copyRulesSchema from '@keep-walking/shared/schemas/copy-rules.schema.json';
import copySchema from '@keep-walking/shared/schemas/copy.schema.json';
import { Ajv2020 } from 'ajv/dist/2020.js';

export interface SchemaError {
  readonly instancePath: string;
  readonly message: string;
}

// allowMatchingProperties: "_meta"/"_variables" are declared in both `properties` (their
// specific shape) and the `^_` patternProperties catch-all (free-form `_note` keys).
const ajv = new Ajv2020({ allErrors: true, strict: true, allowMatchingProperties: true });
const validateCopyFile = ajv.compile(copySchema);
const validateCopyRulesFile = ajv.compile(copyRulesSchema);

export function validateCopy(json: unknown): readonly SchemaError[] {
  if (validateCopyFile(json)) {
    return [];
  }
  return (validateCopyFile.errors ?? []).map((error) => ({
    instancePath: error.instancePath,
    message: error.message ?? 'schema error',
  }));
}

export function validateCopyRules(json: unknown): readonly SchemaError[] {
  if (validateCopyRulesFile(json)) {
    return [];
  }
  return (validateCopyRulesFile.errors ?? []).map((error) => ({
    instancePath: error.instancePath,
    message: error.message ?? 'schema error',
  }));
}
