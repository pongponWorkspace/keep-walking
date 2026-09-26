import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KNOWN_EVENT_NAMES } from './known-events';

const DOC_PATH = resolve(
  import.meta.dirname,
  '..',
  '..',
  '..',
  '..',
  'product',
  'telemetry-events.md',
);

function eventNamesFromDoc(): string[] {
  const text = readFileSync(DOC_PATH, 'utf8');
  const names: string[] = [];
  for (const match of text.matchAll(/^### `([a-z0-9_]+)`/gmu)) {
    names.push(match[1] as string);
  }
  return names;
}

describe('KNOWN_EVENT_NAMES', () => {
  it('matches product/telemetry-events.md exactly (drift guard: add/rename there -> update here)', () => {
    const fromDoc = eventNamesFromDoc();
    expect(fromDoc.length).toBeGreaterThan(0);
    expect([...KNOWN_EVENT_NAMES].sort()).toEqual([...fromDoc].sort());
  });
});
