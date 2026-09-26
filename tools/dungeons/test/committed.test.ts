// `--check` inside `pnpm test` (tech note 13.1): data/dungeons/ must validate and the committed
// data/dungeons/artifact/dungeons.client.v1.json must equal the build output byte for byte.
// Fix a failure with: pnpm --filter @keep-walking/tools-dungeons run dungeons:build
import { describe, expect, it } from 'vitest';
import { checkCommitted } from '../src/pipeline';

describe('data/dungeons/ and the committed client artifact', () => {
  const result = checkCommitted();

  it('data/dungeons/ passes the validator', () => {
    const errors = result.build.issues.filter((i) => i.severity === 'error');
    expect(errors).toEqual([]);
    expect(result.build.ok).toBe(true);
  });

  it('the committed artifact is up to date', () => {
    expect(result.upToDate).toBe(true);
  });
});
