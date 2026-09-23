/**
 * TC-PRIVACY-01/02, TC-COPY-01/02 (qa/plans/F02-test-plan.md section 4.6) — qa-tester's standing
 * privacy and copy duties (CLAUDE.md: "no individual location ... shown", "no PII in logs",
 * "no hardcoded Thai strings in code").
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validateTrace } from '@keep-walking/shared';
import { REPO_ROOT, readAllRepoTraces } from './support';

// ASSUMPTION (no canonical bbox found in data/coverage/ or config/ at authoring time): a
// generous box covering Bangkok + the 5 ปริมณฑล provinces (นนทบุรี ปทุมธานี สมุทรปราการ
// สมุทรสาคร นครปฐม). If location-engineer publishes an authoritative bbox, this constant must be
// updated to match (handoff noted in the QA report, not silently narrowed).
const BMR_BBOX = { minLat: 13.3, maxLat: 14.25, minLng: 99.9, maxLng: 100.95 };

describe('TC-PRIVACY-02 — every committed trace stays inside the Bangkok+5-province area, no identity in meta', () => {
  const traces = readAllRepoTraces();

  it('has at least the synthetic + qa traces committed', () => {
    expect(traces.length).toBeGreaterThan(0);
  });

  it.each(readAllRepoTraces().map((t) => t.id))('%s: every sample is inside the BMR bbox', (id) => {
    const found = traces.find((t) => t.id === id);
    const result = validateTrace(found?.json);
    if (!result.ok) throw new Error(`${id} failed validateTrace: ${JSON.stringify(result.errors)}`);
    for (const sample of result.trace.samples) {
      expect(sample.lat).toBeGreaterThanOrEqual(BMR_BBOX.minLat);
      expect(sample.lat).toBeLessThanOrEqual(BMR_BBOX.maxLat);
      expect(sample.lng).toBeGreaterThanOrEqual(BMR_BBOX.minLng);
      expect(sample.lng).toBeLessThanOrEqual(BMR_BBOX.maxLng);
    }
  });

  it.each(readAllRepoTraces().map((t) => t.id))(
    '%s: description does not name a person or a house number',
    (id) => {
      const found = traces.find((t) => t.id === id);
      const description = String(
        (found?.json as { meta?: { description?: string } } | undefined)?.meta?.description ?? '',
      );
      // Thai house-number pattern (e.g. "123/45") and common name-introduction words.
      expect(description).not.toMatch(/\d{1,4}\/\d{1,3}/);
      expect(description).not.toMatch(/(บ้านของ|คุณ[ก-๙]+ |นาย[ก-๙]+ |นางสาว[ก-๙]+ )/);
    },
  );
});

const THAI_RANGE = /[฀-๿]/;
// Files that legitimately own Thai copy text (config keys, generated dist, tests of the copy
// pipeline itself) are excluded — TC-COPY-01 is about *code*, not about config or its own tests.
const ALLOWED_THAI_FILES = new Set(['src/copy/gps-state.test.ts', 'src/copy/load.test.ts']);

function listClientSourceFiles(): string[] {
  const root = join(REPO_ROOT, 'apps', 'client');
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.certs')
        continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ts')) out.push(full);
    }
  };
  walk(join(root, 'src'));
  return out;
}

describe('TC-COPY-01 — no hardcoded Thai string literal in apps/client/src', () => {
  const files = listClientSourceFiles();

  it('found at least one client source file to check', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s has no Thai-script string literal outside allowed test files', (file) => {
    const relative = file.slice(join(REPO_ROOT, 'apps', 'client').length + 1);
    if (ALLOWED_THAI_FILES.has(relative)) return;
    const content = readFileSync(file, 'utf8');
    // Strip line/block comments crudely so a Thai example in a comment does not false-positive.
    const withoutComments = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const offendingLines = withoutComments.split('\n').filter((line) => THAI_RANGE.test(line));
    expect(offendingLines).toEqual([]);
  });
});

describe('TC-COPY-02 — spot-check 10 gps.*/map.*/run.state* keys against the 6 copy rules', () => {
  const copyPath = join(REPO_ROOT, 'config', 'content', 'copy.th.json');
  const copy = JSON.parse(readFileSync(copyPath, 'utf8')) as Record<string, unknown>;

  function flatten(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(out, flatten(v as Record<string, unknown>, key));
      } else if (typeof v === 'string') {
        out[key] = v;
      }
    }
    return out;
  }

  const flat = flatten(copy);
  const sampleKeys = [
    'gps.pillLabel.text',
    'gps.searching.text',
    'gps.denied.text',
    'gps.deniedBody.text',
    'gps.unsupported.text',
    'gps.lowAccuracy.text',
    'gps.offline.text',
    'gps.suspended.text',
    'gps.restored.text',
    'run.stateGrace.text',
  ];

  it('every sampled key exists in config/content/copy.th.json', () => {
    for (const key of sampleKeys) {
      expect(flat[key], `missing key ${key}`).toBeDefined();
    }
  });

  it.each(sampleKeys)('%s: no polite ending, no emoji, no "ท่าน", <= 2 lines', (key) => {
    const text = flat[key] ?? '';
    expect(text).not.toMatch(/(ครับ|ค่ะ|คะ|จ้ะ|จ้า|นะคะ)\s*$/);
    expect(text).not.toMatch(/ท่าน/);
    expect(text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
    expect(text.split('\n').length).toBeLessThanOrEqual(2);
  });
});
