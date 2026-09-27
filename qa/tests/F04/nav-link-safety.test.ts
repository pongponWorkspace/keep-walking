/**
 * F04-C10 (acceptance 10, R37): the external navigation link carries only a public destination
 * point and a walking-mode flag — never the player's own position, never any other query
 * parameter. `apps/client/src/nav/links.ts` names `isSafeNavUrl` as its own test hook for exactly
 * this ("used by this module's own tests and by e2e (handoff to qa-tester, P2-F04-T22)") — this
 * file drives that public module directly (never re-typed, never a dev test file touched) against
 * every real committed dungeon's `nav_destination`, plus the UA-sniff rule that picks Google vs.
 * Apple Maps.
 */
import { describe, expect, it } from 'vitest';
import {
  googleMapsWalkingUrl,
  appleMapsWalkingUrl,
  isIosLike,
  primaryNavTarget,
  navUrlFor,
  isSafeNavUrl,
} from '../../../apps/client/src/nav/links';
import { loadDungeonArtifact } from '../../../apps/client/src/dungeons/artifact';

describe('F04-C10 — nav link carries destination + mode only, never the player position', () => {
  it("every real committed dungeon's nav_destination produces a safe Google Maps URL", () => {
    const artifact = loadDungeonArtifact();
    expect(artifact.dungeons.length).toBeGreaterThan(0);
    for (const d of artifact.dungeons) {
      const [lng, lat] = d.nav_destination.point;
      const url = googleMapsWalkingUrl(lat, lng);
      expect(isSafeNavUrl(url, 'google_maps', lat, lng)).toBe(true);
      // Never any player-position-shaped param name, whatever the exact query string is.
      expect(url).not.toMatch(/origin=|current|player|user_lat|user_lng/);
    }
  });

  it("every real committed dungeon's nav_destination produces a safe Apple Maps URL", () => {
    const artifact = loadDungeonArtifact();
    for (const d of artifact.dungeons) {
      const [lng, lat] = d.nav_destination.point;
      const url = appleMapsWalkingUrl(lat, lng);
      expect(isSafeNavUrl(url, 'apple_maps', lat, lng)).toBe(true);
      expect(url).not.toMatch(/saddr=|origin=|current|player/);
    }
  });

  it('a URL with an extra query key is correctly rejected by isSafeNavUrl (the guard actually guards)', () => {
    const tampered =
      'https://www.google.com/maps/dir/?api=1&destination=13.7,100.5&travelmode=walking&origin=13.6,100.4';
    expect(isSafeNavUrl(tampered, 'google_maps', 13.7, 100.5)).toBe(false);
  });

  it('a coordinate mismatch (wrong destination) is correctly rejected', () => {
    const url = googleMapsWalkingUrl(13.7, 100.5);
    expect(isSafeNavUrl(url, 'google_maps', 13.71, 100.5)).toBe(false);
  });

  it('primaryNavTarget: iPhone/iPad UA -> apple_maps, everything else -> google_maps', () => {
    expect(isIosLike('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(true);
    expect(primaryNavTarget('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5)).toBe(
      'apple_maps',
    );
    expect(primaryNavTarget('Mozilla/5.0 (Linux; Android 14)', 5)).toBe('google_maps');
    // iPadOS 13+ reports as "Macintosh" but with real touch points (tech note F04 14.1).
    expect(primaryNavTarget('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 5)).toBe('apple_maps');
    expect(primaryNavTarget('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', 0)).toBe(
      'google_maps',
    );
  });

  it('navUrlFor dispatches to the right builder for each target', () => {
    expect(navUrlFor('google_maps', 13.7, 100.5)).toBe(googleMapsWalkingUrl(13.7, 100.5));
    expect(navUrlFor('apple_maps', 13.7, 100.5)).toBe(appleMapsWalkingUrl(13.7, 100.5));
  });
});
