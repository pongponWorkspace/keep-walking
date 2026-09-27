// Client staging: what the client build copies and the runtime manifest it reads.
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../src/config';
import { RUNTIME_MANIFEST, runtimeJson, stage, type RuntimeManifest, type RuntimeManifestPart } from '../src/stage';
import { loadInput } from '../src/validate';
import { cfg } from './helpers';

describe('stage', () => {
  const out = mkdtempSync(join(tmpdir(), 'kw-stage-'));
  const input = loadInput(REPO_ROOT, cfg);
  const { manifest: runtime, parts } = stage(REPO_ROOT, cfg, input.manifest, input.build, input.fonts, out);
  const allAssets = [...Object.values(runtime.assets), ...parts.flatMap((p) => Object.values(p.doc.assets))];

  it('writes asset-manifest.json and copies every URL it lists', () => {
    const onDisk = JSON.parse(readFileSync(join(out, RUNTIME_MANIFEST), 'utf8')) as RuntimeManifest;
    expect(onDisk).toEqual(runtime);
    const urls = [
      ...allAssets.flatMap((a) => a.files.map((f) => f.url)),
      ...Object.values(runtime.parts).map((p) => p.url),
      ...runtime.fonts.map((f) => f.url),
      ...Object.values(runtime.audio).map((c) => c.url),
    ];
    for (const url of urls) {
      expect(url).toMatch(/\?v=[0-9a-f]{8}$/);
      expect(existsSync(join(out, url.split('?')[0] ?? ''))).toBe(true);
    }
  });

  it('never ships key-colour masters from art/src or non-shipped references', () => {
    const urls = allAssets.flatMap((a) => a.files.map((f) => f.url));
    expect(urls.some((u) => u.includes('src/'))).toBe(false);
    const ids = [...Object.keys(runtime.assets), ...parts.flatMap((p) => Object.keys(p.doc.assets))];
    expect(ids.some((id) => id.startsWith('ref.'))).toBe(false);
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

  it('moves the configured kinds to lazy parts that asset-manifest.json points to', () => {
    for (const [name, def] of Object.entries(cfg.runtimeParts.parts)) {
      const part = parts.find((p) => p.name === name);
      expect(part).toBeDefined();
      const onDisk = readFileSync(join(out, def.path), 'utf8');
      expect(JSON.parse(onDisk) as RuntimeManifestPart).toEqual(part?.doc);
      expect(runtime.parts[name]?.bytes).toBe(Buffer.byteLength(onDisk));
      expect(runtime.parts[name]?.url.startsWith(`${def.path}?v=`)).toBe(true);
      expect(Object.values(runtime.assets).some((a) => def.kinds.includes(a.kind))).toBe(false);
      expect(Object.values(part?.doc.assets ?? {}).every((a) => def.kinds.includes(a.kind))).toBe(true);
    }
    // Every shipped avatar layer with a build is reachable through the avatar part.
    const avatarPart = parts.find((p) => p.name === 'avatar');
    for (const b of input.build.assets) expect(avatarPart?.doc.assets[b.id]?.files.length ?? 0).toBeGreaterThan(0);
  });

  it('keeps every runtime manifest file inside the per-file budget', () => {
    expect(Buffer.byteLength(runtimeJson(runtime))).toBeLessThanOrEqual(cfg.budgets.runtimeManifestBytes);
    for (const p of parts) expect(Buffer.byteLength(p.json)).toBeLessThanOrEqual(cfg.budgets.runtimeManifestBytes);
  });
});
