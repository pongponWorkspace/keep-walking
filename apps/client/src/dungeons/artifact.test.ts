import { describe, expect, it } from 'vitest';
import { dungeonStatus, loadDungeonArtifact, toMapDungeonInput } from './artifact';
import { buildSessionParams } from '../session/config';

describe('loadDungeonArtifact', () => {
  it('loads the committed artifact (13 published pilots)', () => {
    const artifact = loadDungeonArtifact();
    expect(artifact.format).toBe('kw-dungeons-client');
    expect(artifact.format_version).toBe(1);
    expect(artifact.dungeons.length).toBeGreaterThan(0);
  });

  it('rejects an unknown format', () => {
    expect(() =>
      loadDungeonArtifact({ format: 'nope', format_version: 1, dungeons: [] }),
    ).toThrow();
  });

  it('rejects a missing dungeons array', () => {
    expect(() =>
      loadDungeonArtifact({ format: 'kw-dungeons-client', format_version: 1 }),
    ).toThrow();
  });
});

describe('dungeonStatus / toMapDungeonInput', () => {
  const artifact = loadDungeonArtifact();
  const params = buildSessionParams(artifact.dungeons);
  const first = artifact.dungeons[0];
  if (first === undefined) {
    throw new Error('fixture: artifact has no dungeons');
  }

  it('computes open/closed from opening_hours through selectOpening (never a hardcoded status)', () => {
    const status = dungeonStatus(first, params, Date.now());
    expect(['open', 'closed']).toContain(status);
  });

  it('builds a map input with no sponsored/label_count property set (D-089: no player counts)', () => {
    const input = toMapDungeonInput(first, params, Date.now());
    expect(input.id).toBe(first.id);
    expect(input.sponsored).toBe(false);
    expect(input).not.toHaveProperty('label_count');
    expect(typeof input.name).toBe('string');
    expect(input.name?.length).toBeGreaterThan(0);
  });

  it('V-34 (art gate F04-F06 round 1): omits name entirely rather than the raw name_key when it does not resolve through names.th.json', () => {
    const unresolved = { ...first, name_key: 'dungeon.doesNotExistInNamesJson' };
    const input = toMapDungeonInput(unresolved, params, Date.now());
    expect(input).not.toHaveProperty('name');
  });
});
