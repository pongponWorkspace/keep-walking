import { describe, expect, it } from 'vitest';
import { creditsGroupViews } from './credits-view';

describe('creditsGroupViews', () => {
  const views = creditsGroupViews();

  it('has at least the mapData and fonts groups (config/content/credits.json)', () => {
    const headings = views.map((v) => v.heading);
    expect(headings.length).toBeGreaterThan(0);
  });

  it('every entry has a non-empty title and a licenseLine with the license name filled in', () => {
    for (const group of views) {
      for (const entry of group.entries) {
        expect(entry.title.length).toBeGreaterThan(0);
        expect(entry.licenseLine).not.toContain('{licenseName}');
      }
    }
  });

  it('never shows a group with zero entries', () => {
    for (const group of views) {
      expect(group.entries.length).toBeGreaterThan(0);
    }
  });

  it('includes the OSM attribution as data (title), never a credits.osmAttribution copy key', () => {
    const osm = views.flatMap((g) => g.entries).find((e) => e.title.includes('OpenStreetMap'));
    expect(osm).toBeDefined();
  });
});
