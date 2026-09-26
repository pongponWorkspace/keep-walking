/**
 * TC-HUD-12 (qa/plans/F02-test-plan.md section 4.3, closed out by P2-F06-T11's board acceptance
 * "TC-HUD-03..12 automated and green"): a build with no `?hud=1` on the URL must never expose
 * `window.__kwSpike` and must never load the debug HUD panel, so nothing that could carry a
 * coordinate (gps-trace-format.md section 4.1, CLAUDE.md "no PII in logs") is even reachable at
 * the production level. `TC-PRIVACY-01` (privacy-copy.test.ts) already greps production log call
 * sites for a coordinate-shaped number pair; this file proves the *gate* that decides whether the
 * coordinate-bearing debug surface (`__kwSpike`, `debug/hud-panel.ts`) exists in the page at all.
 *
 * Two levels, the same convention already used elsewhere in this directory (TL-S04): a pure
 * function gets a direct unit test (12a); a decision that only exists as wiring inside
 * `apps/client/src/main.ts` (no pure export to call, same reasoning as the TC-HUD-04/06 PENDING
 * notes in hud-panel-blackbox.test.ts) gets a source-level static check instead of a browser
 * (12b) — the same technique this repo already uses for "no symbol layer on kw-dungeons"
 * (map-style.test.ts) and the copy-rules `area: client` checks, so it runs under plain Vitest with
 * no DOM and no Playwright, per this task's `writes` (qa/tests/F02/ only).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { clientConfig } from '../../../apps/client/src/config/runtime';
import { selectProvider } from '../../../apps/client/src/location/select';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const MAIN_TS = readFileSync(`${HERE}/../../../apps/client/src/main.ts`, 'utf8');

describe('TC-HUD-12a — hud defaults to off without ?hud=1, in every mode this workspace ships', () => {
  it('production mode, no query at all: hud is false', () => {
    expect(selectProvider('', clientConfig, 'production').hud).toBe(false);
  });

  it('development mode, no query at all: hud is false (client.json default, not just production)', () => {
    expect(selectProvider('', clientConfig, 'development').hud).toBe(false);
  });

  it('an unrecognised MODE string falls back to the production default: hud stays false', () => {
    expect(selectProvider('', clientConfig, 'staging').hud).toBe(false);
  });

  it('?hud=1 turns it on, regardless of mode', () => {
    expect(selectProvider('?hud=1', clientConfig, 'production').hud).toBe(true);
    expect(selectProvider('?hud=1', clientConfig, 'development').hud).toBe(true);
  });

  it('an unrecognised hud value ("yes") warns and falls back to the mode default (off) — never a silent "on"', () => {
    expect(selectProvider('?hud=yes', clientConfig, 'production').hud).toBe(false);
  });

  it('?hud=0 stays off explicitly, including in development where the default is already off', () => {
    expect(selectProvider('?hud=0', clientConfig, 'development').hud).toBe(false);
  });
});

describe('TC-HUD-12b — main.ts only reaches the coordinate-bearing debug surface behind selection.hud', () => {
  it('installSpikeHook has exactly one call site, and it is gated on selection.hud', () => {
    const calls = [...MAIN_TS.matchAll(/installSpikeHook\(/g)];
    expect(calls).toHaveLength(1);
    const [firstCall] = calls;
    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error('unreachable: calls.length was just asserted to be 1');
    }
    const idx = firstCall.index ?? -1;
    expect(idx).toBeGreaterThanOrEqual(0);
    const before = MAIN_TS.slice(Math.max(0, idx - 80), idx);
    expect(before).toMatch(/selection\.hud/);
  });

  it('removeSpikeHook runs on the !selection.hud branch, so no stray hook survives a mode switch', () => {
    expect(MAIN_TS).toMatch(/if \(!selection\.hud\) \{\s*removeSpikeHook\(\);/);
  });

  it('debug/hud-panel is never a static (value) import — only a type-only import and one dynamic import', () => {
    // A type-only import (`import type { HudPanel } from './debug/hud-panel'`) is erased at
    // compile time and never pulls the module (with its DOM/coordinate-bearing code) into the
    // production bundle; a value `import ... from './debug/hud-panel'` would.
    const staticValueImport = /^import (?!type\b)[^;]*from ['"]\.\/debug\/hud-panel['"]/m;
    expect(MAIN_TS).not.toMatch(staticValueImport);

    const dynamicImports = [...MAIN_TS.matchAll(/import\(['"]\.\/debug\/hud-panel['"]\)/g)];
    expect(dynamicImports).toHaveLength(1);
  });

  it('the one dynamic import of debug/hud-panel is inside an `if (selection.hud)` block', () => {
    expect(MAIN_TS).toMatch(/if \(selection\.hud\) \{[\s\S]{0,200}import\(['"]\.\/debug\/hud-panel['"]\)/);
  });
});
