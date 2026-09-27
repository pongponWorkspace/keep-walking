// @vitest-environment happy-dom
/**
 * P2-F06-T17 (board: "ตรวจ S-09 76 เขตไม่เลือกไว้ก่อน"): black-box check of the real
 * `S-09-interest-register` screen (`apps/client/src/ui/interest-register.ts`, mounted through the
 * real, shipped `groupedSelectableDistricts` data pipeline — `data/map/study-districts.json`
 * (79 districts) minus `data/map/launch-area.geojson`'s 3 launch districts = 76, D-126), not a
 * hand-typed stand-in list the way the developer's own `interest-register.test.ts` uses.
 *
 * Two acceptance points: (1) the real list is exactly 76 options grouped by province, matching
 * the spec's own number; (2) nothing is preselected (R53/D-126's own doc comment: "never
 * pre-selected") — confirm is disabled and no option carries `aria-pressed="true"` until the
 * player taps one.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { mountInterestRegister } from '../../../apps/client/src/ui/interest-register';
import { groupedSelectableDistricts } from '../../../apps/client/src/copy/districts';
import { createMemoryStorage } from '../../../apps/client/src/storage/local-store';
import { loadInterest } from '../../../apps/client/src/storage/interest';
const NOOP_QUOTA = { trimTelemetryHalf: () => undefined, clearTelemetryAll: () => undefined };

/** The real 3 launch-district ids (`data/map/launch-area.geojson`), read synchronously here
 * (the shipped `home-geometry.ts#loadLaunchAreaDistrictIds()` is `fetch`-based, async, and DOM-only
 * — this file only needs the same ids as plain data, read-only, never re-typed by hand as a
 * literal list). */
function realExcludedDistrictIds(): ReadonlySet<string> {
  // vitest's working directory is the repo root (same convention `qa/tests/F02` already relies
  // on for its own DOM-environment suites) — avoids `import.meta.url`, which under
  // `@vitest-environment happy-dom` is a bare `/@fs/...` path, not a real `file://` URL.
  const fc = JSON.parse(readFileSync('data/map/launch-area.geojson', 'utf8')) as {
    readonly features: readonly { readonly properties?: { readonly id?: unknown } }[];
  };
  const ids = new Set<string>();
  for (const f of fc.features) {
    const id = f.properties?.id;
    if (typeof id === 'string') ids.add(id);
  }
  return ids;
}

function mount() {
  const container = document.createElement('div');
  const storage = createMemoryStorage();
  const onConfirmed = vi.fn();
  const screen = mountInterestRegister(container, {
    storage,
    now: () => 1000,
    quotaDeps: NOOP_QUOTA,
    onConfirmed,
    onClose: vi.fn(),
  });
  return { container, storage, screen, onConfirmed };
}

describe('S-09 interest register — the real 76-district list, nothing preselected', () => {
  it('the real district data source is exactly 76 options (79 study districts minus 3 launch districts, D-126)', () => {
    const excluded = realExcludedDistrictIds();
    expect(excluded.size).toBe(3);
    const groups = groupedSelectableDistricts(excluded);
    const total = groups.reduce((sum, g) => sum + g.districts.length, 0);
    expect(total).toBe(76);
    // No launch district leaks into the selectable list (would double-count "in the launch area"
    // and "register interest for this area" for the same place).
    for (const g of groups) {
      for (const d of g.districts) expect(excluded.has(d.id)).toBe(false);
    }
  });

  it('mounting the real 76-option list preselects nothing: confirm disabled, no option aria-pressed', () => {
    const { container, screen } = mount();
    const groups = groupedSelectableDistricts(realExcludedDistrictIds()).map((g) => ({
      groupKey: g.provinceIso,
      options: g.districts.map((d) => ({ id: d.id, label: d.name })),
    }));
    screen.show('district', groups);

    const options = container.querySelectorAll<HTMLButtonElement>('.interest-option');
    expect(options.length).toBe(76);
    for (const opt of options) expect(opt.getAttribute('aria-pressed')).not.toBe('true');

    const confirm = container.querySelector<HTMLButtonElement>('.interest-confirm');
    expect(confirm?.disabled).toBe(true);
  });

  it('re-opening the screen (show() called again) resets any prior selection back to nothing chosen', () => {
    const { container, screen } = mount();
    const groups = groupedSelectableDistricts(realExcludedDistrictIds()).map((g) => ({
      groupKey: g.provinceIso,
      options: g.districts.map((d) => ({ id: d.id, label: d.name })),
    }));
    screen.show('district', groups);
    container.querySelector<HTMLButtonElement>('.interest-option')?.click();
    expect(container.querySelector<HTMLButtonElement>('.interest-confirm')?.disabled).toBe(false);

    screen.show('district', groups); // simulate closing and reopening S-09
    expect(container.querySelector<HTMLButtonElement>('.interest-confirm')?.disabled).toBe(true);
    for (const opt of container.querySelectorAll<HTMLButtonElement>('.interest-option')) {
      expect(opt.getAttribute('aria-pressed')).not.toBe('true');
    }
  });

  it('confirming a real district id persists no free text and no coordinates (R53/D-088)', () => {
    const { container, storage, screen } = mount();
    const groups = groupedSelectableDistricts(realExcludedDistrictIds()).map((g) => ({
      groupKey: g.provinceIso,
      options: g.districts.map((d) => ({ id: d.id, label: d.name })),
    }));
    screen.show('district', groups);
    const first = container.querySelectorAll<HTMLButtonElement>('.interest-option')[0];
    first?.click();
    container.querySelector<HTMLButtonElement>('.interest-confirm')?.click();
    const saved = loadInterest(storage);
    expect(saved?.scope).toBe('district');
    expect(typeof saved?.areaId).toBe('string');
    const raw = storage.getItem('kw.p2.interest') ?? '';
    expect(raw).not.toMatch(/"lat"|"lng"/);
  });
});
