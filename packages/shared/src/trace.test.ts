import { Ajv2020 } from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import schema from '../schemas/gps-trace.schema.json';
import {
  TRACE_FORMAT,
  countDecimals,
  toLocationSample,
  traceDurationMs,
  validateTrace,
} from './index';

const ajv = new Ajv2020({ allErrors: true, strict: true });
const schemaValidate = ajv.compile(schema);

function baseTrace(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: 'keep-walking.gps-trace',
    formatVersion: 1,
    meta: {
      id: 'synthetic-park-loop-01',
      kind: 'synthetic',
      timeBase: 'relative-ms',
      environment: 'park',
      platform: 'synthetic',
      generator: { tool: 'tools/traces', version: '0.1.0', seed: 42, scenario: 'park-loop' },
    },
    samples: [
      { t: 0, lat: 13.730512, lng: 100.541234, accuracy: 6.5, speed: 1.3, heading: 90 },
      { t: 1000, lat: 13.730521, lng: 100.541249, accuracy: 7 },
      { t: 2000, lat: 13.73053, lng: 100.541262, accuracy: 7.2 },
    ],
    events: [
      { t: 1000, type: 'visibility-hidden' },
      { t: 2000, type: 'visibility-visible' },
    ],
    ...overrides,
  };
}

function realWalk(decimals: number, trim: number): Record<string, unknown> {
  return baseTrace({
    meta: {
      id: 'recorded-park-01',
      kind: 'recorded',
      timeBase: 'relative-ms',
      sanitized: { trimStart_m: trim, trimEnd_m: trim, coordinateDecimals: decimals },
    },
    samples: [
      { t: 0, lat: 13.73051, lng: 100.54123, accuracy: 8 },
      { t: 1000, lat: 13.73052, lng: 100.54125, accuracy: 8 },
    ],
    events: [],
  });
}

function codes(input: unknown, minTrim?: number): string[] {
  const result = validateTrace(input, minTrim === undefined ? {} : { minTrim_m: minTrim });
  return result.ok ? [] : result.errors.map((e) => `${e.path}:${e.code}`);
}

describe('validateTrace', () => {
  it('accepts a valid synthetic trace and returns it typed', () => {
    const result = validateTrace(baseTrace());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(traceDurationMs(result.trace)).toBe(2000);
    }
  });

  it('rejects wrong format, version and time base', () => {
    const bad = baseTrace({ format: 'gpx', formatVersion: 2 });
    (bad['meta'] as Record<string, unknown>)['timeBase'] = 'epoch-ms';
    expect(codes(bad)).toEqual(['/format:enum', '/formatVersion:enum', '/meta/timeBase:enum']);
  });

  it('rejects unknown keys so metadata cannot carry identifying data', () => {
    const bad = baseTrace({ deviceModel: 'x' });
    (bad['meta'] as Record<string, unknown>)['userName'] = 'someone';
    expect(codes(bad)).toEqual(['/deviceModel:unknown-key', '/meta/userName:unknown-key']);
  });

  it('requires the first sample at t = 0 and strictly increasing t', () => {
    const bad = baseTrace({
      samples: [
        { t: 5, lat: 13.7, lng: 100.5, accuracy: 5 },
        { t: 5, lat: 13.7, lng: 100.5, accuracy: 5 },
      ],
      events: [],
    });
    expect(codes(bad)).toEqual(['/samples/0/t:first-sample-not-zero', '/samples/1/t:order']);
  });

  it('rejects out-of-range coordinates, accuracy, speed and heading', () => {
    const bad = baseTrace({
      samples: [
        { t: 0, lat: 91, lng: 100.5, accuracy: 0 },
        { t: 1000, lat: 13.7, lng: -181, accuracy: 5, speed: -1, heading: 360 },
      ],
      events: [],
    });
    expect(codes(bad)).toEqual([
      '/samples/0/lat:range',
      '/samples/0/accuracy:range',
      '/samples/1/lng:range',
      '/samples/1/speed:range',
      '/samples/1/heading:range',
    ]);
  });

  it('rejects unsorted events and events after the last sample', () => {
    const bad = baseTrace({
      events: [
        { t: 2000, type: 'timeout' },
        { t: 1000, type: 'permission-denied' },
        { t: 9000, type: 'visibility-hidden' },
      ],
    });
    expect(codes(bad)).toEqual(['/events/1/t:order', '/events/2/t:range']);
  });

  it('requires sanitization, trim and at most 5 decimals for real walks', () => {
    expect(codes(realWalk(5, 200), 200)).toEqual([]);
    expect(codes(realWalk(5, 150), 200)).toEqual([
      '/meta/sanitized/trimStart_m:trim',
      '/meta/sanitized/trimEnd_m:trim',
    ]);
    expect(codes(realWalk(6, 200))).toEqual(['/meta/sanitized/coordinateDecimals:range']);
    const precise = realWalk(5, 200);
    (precise['samples'] as Record<string, unknown>[])[0] = {
      t: 0,
      lat: 13.730512,
      lng: 100.54123,
      accuracy: 8,
    };
    expect(codes(precise)).toEqual(['/samples/0/lat:precision']);
    const unsanitized = realWalk(5, 200);
    delete (unsanitized['meta'] as Record<string, unknown>)['sanitized'];
    expect(codes(unsanitized)).toEqual(['/meta/sanitized:required']);
  });

  it('caps the number of reported errors', () => {
    const samples = Array.from({ length: 200 }, (_, i) => ({ t: i, lat: 99, lng: 0, accuracy: 1 }));
    const result = validateTrace(baseTrace({ samples, events: [] }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(TRACE_FORMAT.maxReportedErrors);
    }
  });
});

describe('JSON Schema and validateTrace agree', () => {
  const structuralCases: [string, unknown, boolean][] = [
    ['valid synthetic', baseTrace(), true],
    ['valid recorded', realWalk(5, 200), true],
    ['not an object', [], false],
    ['missing samples', { ...baseTrace(), samples: undefined }, false],
    ['one sample only', baseTrace({ samples: [{ t: 0, lat: 1, lng: 1, accuracy: 1 }] }), false],
    ['unknown top-level key', baseTrace({ extra: true }), false],
    ['bad id', baseTrace({ meta: { id: 'A', kind: 'qa', timeBase: 'relative-ms' } }), false],
    ['bad kind', baseTrace({ meta: { id: 'abc', kind: 'raw', timeBase: 'relative-ms' } }), false],
    [
      'field without sanitized',
      baseTrace({ meta: { id: 'abc', kind: 'field', timeBase: 'relative-ms' } }),
      false,
    ],
    ['bad event type', baseTrace({ events: [{ t: 0, type: 'crash' }] }), false],
    [
      'fractional t',
      baseTrace({
        samples: [
          { t: 0, lat: 1, lng: 1, accuracy: 1 },
          { t: 1.5, lat: 1, lng: 1, accuracy: 1 },
        ],
      }),
      false,
    ],
    [
      'string lat',
      baseTrace({
        samples: [
          { t: 0, lat: '1', lng: 1, accuracy: 1 },
          { t: 1, lat: 1, lng: 1, accuracy: 1 },
        ],
      }),
      false,
    ],
  ];

  it.each(structuralCases)('%s', (_name, input, expected) => {
    const clean = JSON.parse(JSON.stringify(input)) as unknown;
    expect(schemaValidate(clean)).toBe(expected);
    expect(validateTrace(clean).ok).toBe(expected);
  });

  it('keeps format limits identical in both', () => {
    const props = schema.properties;
    expect(props.format.const).toBe(TRACE_FORMAT.name);
    expect(props.formatVersion.const).toBe(TRACE_FORMAT.version);
    expect(props.samples.minItems).toBe(TRACE_FORMAT.minSamples);
    expect(props.samples.maxItems).toBe(TRACE_FORMAT.maxSamples);
    expect(props.events.maxItems).toBe(TRACE_FORMAT.maxEvents);
    expect(schema.$defs.meta.properties.id.pattern).toBe(TRACE_FORMAT.idPattern.source);
    expect(schema.$defs.meta.properties.timeBase.const).toBe(TRACE_FORMAT.timeBase);
    expect(schema.$defs.meta.properties.description.maxLength).toBe(
      TRACE_FORMAT.maxDescriptionLength,
    );
    expect(schema.$defs.meta.properties.sanitized.properties.coordinateDecimals.maximum).toBe(
      TRACE_FORMAT.maxCoordinateDecimals,
    );
  });
});

describe('helpers', () => {
  it('counts decimals including exponent notation', () => {
    expect(countDecimals(13.73051)).toBe(5);
    expect(countDecimals(100)).toBe(0);
    expect(countDecimals(1e-7)).toBe(7);
    expect(countDecimals(1.5e-7)).toBe(8);
  });

  it('anchors relative samples at the replay start and copies optional fields only when set', () => {
    expect(toLocationSample({ t: 1500, lat: 1, lng: 2, accuracy: 3 }, 1_000_000)).toEqual({
      timestamp: 1_001_500,
      lat: 1,
      lng: 2,
      accuracy: 3,
    });
    expect(
      toLocationSample({ t: 0, lat: 1, lng: 2, accuracy: 3, speed: 0, heading: 0 }, 5),
    ).toEqual({ timestamp: 5, lat: 1, lng: 2, accuracy: 3, speed: 0, heading: 0 });
  });
});
