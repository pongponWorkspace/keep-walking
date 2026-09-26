// Client staging: what the client build copies and the runtime manifest it reads.
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../src/config';
import { RUNTIME_MANIFEST, stage, type RuntimeManifest } from '../src/stage';
import { loadInput } from '../src/validate';
import { cfg } from './helpers';

describe('stage', () => {
  const out = mkdtempSync(join(tmpdir(), 'kw-stage-'));
  const input = loadInput(REPO_ROOT, cfg);
  const runtime = stage(REPO_ROOT, cfg, input.manifest, input.build, input.fonts, out);

  it('writes asset-manifest.json and copies every URL it lists', () => {
    const onDisk = JSON.parse(readFileSync(join(out, RUNTIME_MANIFEST), 'utf8')) as RuntimeManifest;
    expect(onDisk).toEqual(runtime);
    const urls = [
      ...Object.values(runtime.assets).flatMap((a) => a.files.map((f) => f.url)),
      ...runtime.fonts.map((f) => f.url),
      ...Object.values(runtime.audio).map((c) => c.url),
    ];
    for (const url of urls) {
      expect(url).toMatch(/\?v=[0-9a-f]{8}$/);
      expect(existsSync(join(out, url.split('?')[0] ?? ''))).toBe(true);
    }
  });

  it('never ships key-colour masters from art/src or non-shipped references', () => {
    const urls = Object.values(runtime.assets).flatMap((a) => a.files.map((f) => f.url));
    expect(urls.some((u) => u.includes('src/'))).toBe(false);
    expect(Object.keys(runtime.assets).some((id) => id.startsWith('ref.'))).toBe(false);
  });

  it('ships the four fonts with their OFL texts and lists them in credits', () => {
    expect(runtime.fonts.map((f) => f.id)).toEqual([
      'font.ui.plex-sans-thai-looped-500',
      'font.ui.plex-sans-thai-looped-700',
      'font.map.noto-sans-thai-400',
      'font.map.noto-sans-thai-500',
    ]);
    expect(existsSync(join(out, 'fonts/ui/OFL.txt'))).toBe(true);
    expect(existsSync(join(out, 'fonts/map/OFL.txt'))).toBe(true);
    expect(runtime.credits.map((c) => c.attribution)).toEqual(
      expect.arrayContaining(['IBM Plex Sans Thai Looped, SIL Open Font License 1.1', 'Noto Sans Thai, SIL Open Font License 1.1']),
    );
  });

  it('stays inside the runtime manifest budget', () => {
    expect(Buffer.byteLength(JSON.stringify(runtime))).toBeLessThanOrEqual(cfg.budgets.runtimeManifestBytes);
  });
});
