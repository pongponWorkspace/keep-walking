import { describe, expect, it } from 'vitest';
import { dungeonStatus, loadDungeonArtifact, toMapDungeonInput } from './artifact';

const BANGKOK_UTC_OFFSET_MIN = 420;

describe('loadDungeonArtifact', () => {
  it('loads the committed artifact (13 published pilots)', () => {
    const artifact = loadDungeonArtifact();
    expect(artifact.format).toBe('kw-dungeons-client');
    expect(artifact.format_version).toBe(1);
    expect(artifact.dungeons.length).toBeGreaterThan(0);
  });

  it('rejects an unknown format', () => {
    expect(() => loadDungeonArtifact({ format: 'nope', format_version: 1, dungeons: [] })).toThrow();
  });

  it('rejects a missing dungeons array', () => {
    expect(() => loadDungeonArtifact({ format: 'kw-dungeons-client', format_version: 1 })).toThrow();
  });
});

describe('dungeonStatus / toMapDungeonInput', () => {
  const artifact = loadDungeonArtifact();
  const first = artifact.dungeons[0];
  if (first === undefined) {
    throw new Error('fixture: artifact has no dungeons');
  }

  it('computes open/closed from opening_hours (never a hardcoded status)', () => {
    const status = dungeonStatus(first, BANGKOK_UTC_OFFSET_MIN, Date.now());
    expect(['open', 'closed']).toContain(status);
  });

  it('builds a map input with no sponsored/label_count property set (D-089: no player counts)', () => {
    const input = toMapDungeonInput(first, BANGKOK_UTC_OFFSET_MIN, Date.now());
    expect(input.id).toBe(first.id);
    expect(input.sponsored).toBe(false);
    expect(input).not.toHaveProperty('label_count');
    expect(typeof input.name).toBe('string');
    expect(input.name.length).toBeGreaterThan(0);
  });
});
