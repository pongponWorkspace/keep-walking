import type { LintContext } from '../context';
import type { LintIssue } from '../types';
import type { SchemaError } from '../validate';
import { checkS1 } from './s1';
import { checkS2 } from './s2';
import { checkS3 } from './s3';
import { checkS4 } from './s4';
import { checkS5 } from './s5';
import { checkS6 } from './s6';
import { checkS7 } from './s7';
import { checkS8 } from './s8';
import { checkS9 } from './s9';
import { checkS10 } from './s10';
import { checkS11 } from './s11';
import { checkS12 } from './s12';
import { checkS13 } from './s13';
import { checkS14 } from './s14';

/** S1-S14, in order (style-guide section 7 / docs/tech/copy-schema.md section 8.1). */
export function runAllChecks(
  ctx: LintContext,
  copySchemaErrors: readonly SchemaError[],
): LintIssue[] {
  return [
    ...checkS1(ctx, copySchemaErrors),
    ...checkS2(ctx),
    ...checkS3(ctx),
    ...checkS4(ctx),
    ...checkS5(ctx),
    ...checkS6(ctx),
    ...checkS7(ctx),
    ...checkS8(ctx),
    ...checkS9(ctx),
    ...checkS10(ctx),
    ...checkS11(ctx),
    ...checkS12(ctx),
    ...checkS13(ctx),
    ...checkS14(ctx),
  ];
}
