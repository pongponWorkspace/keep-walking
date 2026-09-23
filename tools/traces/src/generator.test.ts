// P1-F02-T04: every synthetic trace is valid, reproducible from its seed, and the committed files
// are exactly what the generator produces from the current config.
import { readFileSync, readdirSync } from 'node:fs';
import { countDecimals, validateTrace } from '@keep-walking/shared';
import schema from '@keep-walking/shared/schemas/gps-trace.schema.json';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { COORDINATE_DECIMALS, serializeTrace } from './builder';
import { SCENARIOS, generate } from './catalog';
import { SYNTHETIC_DIR, loadTraceConfig } from './config';
import { buildOutputs } from './generate';
import { createRng } from './rng';

const cfg = loadTraceConfig();
const schemaValidate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
const committed = readdirSync(SYNTHETIC_DIR)
  .filter((f) => f.endsWith('.trace.json'))
  .sort();

describe('committed synthetic traces', () => {
  it('include the six board traces and the three QA traces (test plan section 6)', () => {
    const ids = committed.map((f) => f.replace('.trace.json', ''));
    for (const id of [
      'synthetic-park-loop-01',
      'synthetic-bench-jitter-01',
      'synthetic-table-still-01',
      'synthetic-edge-walk-01',
      'synthetic-drift-spike-01',
      'synthetic-soi-occluded-01',
      'synthetic-boundary-50m-01',
    ]) {
      expect(ids).toContain(id);
    }
    expect(ids.length).toBeGreaterThanOrEqual(SCENARIOS.length);
  });

  it.each(committed)('%s passes validateTrace and the JSON Schema', (file) => {
    const json: unknown = JSON.parse(readFileSync(`${SYNTHETIC_DIR}${file}`, 'utf8'));
    const result = validateTrace(json);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(schemaValidate(json), JSON.stringify(schemaValidate.errors)).toBe(true);
    if (!result.ok) return;
    const { meta, samples } = result.trace;
    expect(`${meta.id}.trace.json`).toBe(file);
    expect(meta.kind).toBe('synthetic');
    expect(meta.platform).toBe('synthetic');
    expect(Number.isSafeInteger(meta.generator?.seed)).toBe(true);
    for (const s of samples) {
      expect(countDecimals(s.lat)).toBeLessThanOrEqual(COORDINATE_DECIMALS);
      expect(countDecimals(s.lng)).toBeLessThanOrEqual(COORDINATE_DECIMALS);
    }
  });

  it('are byte-identical to the generator output (regenerate after a config change)', () => {
    const outputs = buildOutputs();
    const traceOutputs = outputs.filter((o) => o.path.endsWith('.trace.json'));
    expect(traceOutputs.map((o) => o.path.slice(SYNTHETIC_DIR.length)).sort()).toEqual(committed);
    for (const o of outputs) {
      expect(readFileSync(o.path, 'utf8'), o.path).toBe(o.content);
    }
  });
});

describe('generator determinism', () => {
  it('mulberry32 gives the same stream for the same seed', () => {
    const a = createRng(7);
    const b = createRng(7);
    const xs = Array.from({ length: 5 }, () => a.next());
    expect(Array.from({ length: 5 }, () => b.next())).toEqual(xs);
    expect(createRng(8).next()).not.toBe(xs[0]);
  });

  it.each(SCENARIOS.map((d) => [d.id, d] as const))('%s: same seed, same bytes', (_id, def) => {
    const first = serializeTrace(generate(def, cfg).trace);
    const second = serializeTrace(generate(def, cfg).trace);
    expect(second).toBe(first);
  });

  it.each(SCENARIOS.map((d) => [d.id, d] as const))(
    '%s: another seed is still valid',
    (_id, def) => {
      const other = generate(def, cfg, def.seed + 1000).trace;
      const result = validateTrace(other);
      expect(result.ok ? [] : result.errors).toEqual([]);
      expect(other.meta.generator?.seed).toBe(def.seed + 1000);
    },
  );

  it('a different seed changes the noise (for scenarios that use randomness)', () => {
    const def = SCENARIOS.find((d) => d.id === 'synthetic-bench-jitter-01');
    if (def === undefined) throw new Error('bench scenario missing');
    const a = generate(def, cfg).trace.samples;
    const b = generate(def, cfg, def.seed + 1).trace.samples;
    expect(b).not.toEqual(a);
  });
});
