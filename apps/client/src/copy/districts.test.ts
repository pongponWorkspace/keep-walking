import { describe, expect, it } from 'vitest';
import {
  groupedSelectableDistricts,
  selectableDistricts,
  studyAreaProvinceOptions,
} from './districts';

const LAUNCH_IDS = new Set(['phraNakhon', 'pathumWan', 'bangRak']);

describe('selectableDistricts (D-126, spec F06 R52/R53)', () => {
  it('is exactly 76: the 79 study-area districts minus the 3 launch districts', () => {
    expect(selectableDistricts(LAUNCH_IDS).length).toBe(76);
  });

  it('never includes a launch-area district id', () => {
    const ids = selectableDistricts(LAUNCH_IDS).map((d) => d.id);
    for (const launchId of LAUNCH_IDS) expect(ids).not.toContain(launchId);
  });

  it('resolves every name through names.th.json (never falls back to the raw id)', () => {
    for (const district of selectableDistricts(LAUNCH_IDS)) {
      expect(district.name).not.toBe(`district.${district.id}`);
      expect(district.name.length).toBeGreaterThan(0);
    }
  });

  it('is sorted by provinceIso then by name', () => {
    const options = selectableDistricts(LAUNCH_IDS);
    for (let i = 1; i < options.length; i += 1) {
      const prev = options[i - 1];
      const cur = options[i];
      if (prev === undefined || cur === undefined) continue;
      if (prev.provinceIso === cur.provinceIso) {
        expect(prev.name.localeCompare(cur.name, 'th') <= 0 || prev.name <= cur.name).toBe(true);
      } else {
        expect(prev.provinceIso <= cur.provinceIso).toBe(true);
      }
    }
  });

  it('an empty excluded set returns all 79 (never hides a district by accident)', () => {
    expect(selectableDistricts(new Set()).length).toBe(79);
  });
});

describe('studyAreaProvinceOptions', () => {
  it('returns exactly the 6 distinct study-area provinces, sorted, no duplicates', () => {
    const options = studyAreaProvinceOptions();
    expect(options.length).toBe(6);
    expect(new Set(options.map((o) => o.provinceIso)).size).toBe(6);
    for (let i = 1; i < options.length; i += 1) {
      const prev = options[i - 1];
      const cur = options[i];
      if (prev !== undefined && cur !== undefined)
        expect(prev.provinceIso < cur.provinceIso).toBe(true);
    }
  });
});

describe('groupedSelectableDistricts', () => {
  it('every district appears in exactly one group, same total as the flat list', () => {
    const groups = groupedSelectableDistricts(LAUNCH_IDS);
    const total = groups.reduce((sum, g) => sum + g.districts.length, 0);
    expect(total).toBe(selectableDistricts(LAUNCH_IDS).length);
  });

  it('every group is internally consistent (same provinceIso as its own key)', () => {
    for (const group of groupedSelectableDistricts(LAUNCH_IDS)) {
      for (const district of group.districts) {
        expect(district.provinceIso).toBe(group.provinceIso);
      }
    }
  });
});
