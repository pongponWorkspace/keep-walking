/**
 * The S-09 district interest-registration list (spec F06 R52 item 2/R53, D-126, `design/systems/
 * balance-model.md` section 21.2): the 76 study-area districts minus the 3 launch districts,
 * grouped by province, sorted by name — never a separately hand-written list (D-126: "derive จาก
 * ข้อมูลชุดเดียว").
 *
 * Both inputs are the exact same committed data files the rest of the client already reads for
 * this feature: `data/map/study-districts.json` (79 districts, `tools/coverage/boundaries/
 * districts.py`, P2-H26) minus every `id` present in `data/map/launch-area.geojson`'s own features
 * (`excludedIds`, the caller's `home-geometry.ts#loadLaunchAreaDistrictIds()` — the same file
 * `home-tracker.ts` merges into the launch-area mask) — so a district can never appear in this
 * list *and* count as "inside the launch area" for `homeState()` at the same time; one dataset,
 * one source of truth. `excludedIds` is a parameter (not a second import of the `.geojson` file
 * here) because Vite has no JSON loader for a bare `.geojson` extension (only `.json`) — fetching
 * it is `home-geometry.ts`'s job; this module stays a plain, synchronous, dependency-free list
 * builder.
 *
 * Display names resolve through `copy/names.ts#getItemName('district.<id>')` (`names.th.json`,
 * P2-X32) — never a literal Thai string in this module (CLAUDE.md).
 *
 * Province grouping: `study-districts.json`'s own `provinceIso` (ISO 3166-2 TH-xx) is the group
 * key, sorted ascending (a stable, data-driven order — TH-10 Bangkok, then the five ปริมณฑล
 * provinces). Display names resolve through `copy/names.ts#getProvinceName` (`names.th.json`'s
 * `province.<iso>` entries, added P2-H32) — [ASSUMPTION A-P2-F06-T09-1 CLOSED by P2-H32: the
 * `province.*` content keys now exist, so `groupedSelectableDistricts`'s caller (`f04-app.ts`) can
 * show a real Thai heading per group instead of the bare ISO code this module used as a stand-in].
 */
import studyDistrictsJson from '../../../../data/map/study-districts.json';
import { getItemName, getProvinceName } from './names';

export interface DistrictOption {
  readonly id: string;
  readonly provinceIso: string;
  readonly name: string;
}

interface StudyDistrictRecord {
  readonly id: string;
  readonly provinceIso: string;
}

/** The 76 selectable districts (D-126), grouped by `provinceIso` (ascending) then sorted by
 * display name within each group — never pre-selected (R53/D-126: the caller must not default the
 * list's own selection state from this ordering). `excludedIds`: see this module's own doc
 * comment (`home-geometry.ts#loadLaunchAreaDistrictIds()`). */
export function selectableDistricts(excludedIds: ReadonlySet<string>): readonly DistrictOption[] {
  const file = studyDistrictsJson as { readonly districts?: readonly StudyDistrictRecord[] };
  const options = (file.districts ?? [])
    .filter((d) => !excludedIds.has(d.id))
    .map((d) => ({ id: d.id, provinceIso: d.provinceIso, name: getItemName(`district.${d.id}`) }));
  return [...options].sort((a, b) => {
    if (a.provinceIso !== b.provinceIso) return a.provinceIso < b.provinceIso ? -1 : 1;
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
}

/** `selectableDistricts()` grouped into consecutive runs sharing the same `provinceIso` (already
 * sorted, so this is a plain partition, not a second sort). */
export function groupedSelectableDistricts(excludedIds: ReadonlySet<string>): ReadonlyArray<{
  readonly provinceIso: string;
  readonly districts: readonly DistrictOption[];
}> {
  const groups: Array<{ provinceIso: string; districts: DistrictOption[] }> = [];
  for (const option of selectableDistricts(excludedIds)) {
    const last = groups[groups.length - 1];
    if (last !== undefined && last.provinceIso === option.provinceIso) {
      last.districts.push(option);
    } else {
      groups.push({ provinceIso: option.provinceIso, districts: [option] });
    }
  }
  return groups;
}

/**
 * The province-scope option list for `S-09` when *entirely* outside the play area (`out_of_area`/
 * `unknown`, F06-R52 items 3-4) — every distinct `provinceIso` in the study area, sorted, with its
 * real Thai display name (`copy/names.ts#getProvinceName`, P2-H32; closes A-P2-F06-T09-3, which
 * used the raw ISO code as a stand-in before `province.<iso>` content keys existed). [ASSUMPTION
 * A-P2-F06-T09-3 still open in part: this is only the 6 study-area provinces, not a full
 * 77-province list — genuinely outside all 6 (e.g. another region of Thailand) has no matching
 * option today. owner: product-manager, a full province list replaces this with no other change to
 * `home-panel.ts`/`interest-register.ts`.]
 */
export function studyAreaProvinceOptions(): readonly DistrictOption[] {
  const seen = new Set<string>();
  const options: DistrictOption[] = [];
  for (const record of (
    studyDistrictsJson as { readonly districts?: readonly StudyDistrictRecord[] }
  ).districts ?? []) {
    if (seen.has(record.provinceIso)) continue;
    seen.add(record.provinceIso);
    options.push({
      id: record.provinceIso,
      provinceIso: record.provinceIso,
      name: getProvinceName(record.provinceIso),
    });
  }
  return [...options].sort((a, b) => (a.provinceIso < b.provinceIso ? -1 : 1));
}
