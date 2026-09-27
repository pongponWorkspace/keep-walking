/**
 * P2-F06-T17 acceptance: "onboarding shows ... empty-screen and interest events per PM-M2 · no
 * player counts". Two kinds of check, both explicitly structural/contract-level (not a live
 * `f04-app.ts` instantiation, which needs a full DOM/map/asset harness out of this task's scope):
 *
 * 1. The three PM-M2 event names + their exact enum/property shapes are (a) documented in
 *    `product/telemetry-events.md`, (b) registered in the real `known-events.ts` allowlist (so the
 *    telemetry sink never silently drops them), and (c) match the exact `EmptyScreenReason` union
 *    the real `f04-app.ts` source emits from (never `unknown`/`temporarilyClosed`, per tech note
 *    F06 9.2 and the doc's own "แก้จาก Phase 1" note).
 * 2. A source grep across every shipped client module (never `*.test.ts`) for the handful of
 *    per-dungeon-count property names this feature's own spec/board named directly (D-100: "ไม่
 *    แสดงจำนวนคน/role/จำนวนลงทะเบียนทุกจอ") — confirms the two real matches that exist
 *    (`run.summaryTickCount`'s `passedCount`/`evaluatedCount`, and telemetry-only `roles_present`)
 *    are the player's own tick counts and an analytics-only event property, never a UI count of
 *    other players.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { KNOWN_EVENT_NAMES } from '../../../apps/client/src/telemetry/known-events';

const F04_APP_SRC = readFileSync('apps/client/src/f04-app.ts', 'utf8');
const DOC = readFileSync('product/telemetry-events.md', 'utf8');

describe('PM-M2 onboarding empty-screen + interest events (product/telemetry-events.md)', () => {
  const PM_M2_EVENTS = [
    'onboarding_empty_screen_shown',
    'onboarding_empty_screen_abandoned',
    'interest_registered_outside_area',
  ] as const;

  it('all three names are registered in the real known-events allowlist (never silently dropped)', () => {
    for (const name of PM_M2_EVENTS) expect(KNOWN_EVENT_NAMES.has(name)).toBe(true);
  });

  it('all three names have a doc section in product/telemetry-events.md', () => {
    for (const name of PM_M2_EVENTS) expect(DOC).toMatch(new RegExp(`### \`${name}\``));
  });

  it('the real client-side reason enum is exactly far/out_of_area/outside_launch_district (never unknown/temporarilyClosed, tech note F06 9.2)', () => {
    const m = F04_APP_SRC.match(/type EmptyScreenReason = ([^;]+);/);
    expect(m).not.toBeNull();
    const literals = new Set(
      (m?.[1] ?? '').split('|').map((s) => s.trim().replace(/^'|'$/g, '')),
    );
    expect(literals).toEqual(new Set(['far', 'out_of_area', 'outside_launch_district']));
  });

  it('the doc\'s own reason enum for onboarding_empty_screen_shown matches the same three values', () => {
    const section = DOC.slice(DOC.indexOf('### `onboarding_empty_screen_shown`'));
    const reasonLine = section.slice(0, section.indexOf('###', 1));
    expect(reasonLine).toContain('far');
    expect(reasonLine).toContain('out_of_area');
    expect(reasonLine).toContain('outside_launch_district');
    expect(reasonLine).not.toMatch(/`temporarilyClosed`|`unknown`/);
  });

  it('the real interest_registered_outside_area call site sends only scope/area_name — no coordinate fields', () => {
    const idx = F04_APP_SRC.indexOf("telemetry.record('interest_registered_outside_area'");
    expect(idx).toBeGreaterThan(-1);
    const call = F04_APP_SRC.slice(idx, F04_APP_SRC.indexOf('});', idx) + 3);
    expect(call).toMatch(/scope:\s*record\.scope/);
    expect(call).toMatch(/area_name:\s*record\.areaId/);
    expect(call).not.toMatch(/\blat\b|\blng\b/);
  });

  it('abandon-timeout bucket edges match the doc enum (0-10, 10-30, 30-60, 60+)', () => {
    for (const bucket of ['0-10', '10-30', '30-60', '60+']) {
      expect(F04_APP_SRC).toContain(`'${bucket}'`);
    }
  });
});

describe('D-100 — no per-dungeon player/role counts on any Phase 2 screen', () => {
  /** Every `.ts` client source file, skipping dev/QA test files and `node_modules`. */
  function walk(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules') continue;
      const full = `${dir}/${entry}`;
      const st = statSync(full);
      if (st.isDirectory()) out.push(...walk(full));
      else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) out.push(full);
    }
    return out;
  }

  it('every match of a count-like identifier is either the player\'s own tick summary or a telemetry-only property, never a UI count of other players', () => {
    const suspicious = /\b(playerCount|registeredCount|roles_present|outOfAreaCount|memberCount|partySize)\b/;
    const allowedFiles = new Set([
      'apps/client/src/ui/run-summary.ts', // the player's OWN passedCount/evaluatedCount, F05
      'apps/client/src/telemetry/f04-events.ts', // roles_present: an analytics-only SessionEvent mapper property
    ]);
    const hits: string[] = [];
    for (const file of walk('apps/client/src')) {
      const text = readFileSync(file, 'utf8');
      if (suspicious.test(text)) hits.push(file);
    }
    for (const hit of hits) expect(allowedFiles.has(hit)).toBe(true);
    expect(hits.length).toBeGreaterThan(0); // the pattern itself still matches something real (not a stale regex)
  });

  it('label_count (per-dungeon crowd label) is never set on the map source (D-089, dungeons/artifact.ts\'s own doc comment)', () => {
    const src = readFileSync('apps/client/src/dungeons/artifact.ts', 'utf8');
    expect(src).toMatch(/label_count.*never set/i);
    expect(src).not.toMatch(/label_count\s*:\s*[^n]/); // never assigned a non-null-ish literal value
  });
});
