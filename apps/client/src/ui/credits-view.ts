/**
 * Pure view model for `S-26-credits` (flow F06 G6, `docs/tech/asset-delivery.md` this task's item
 * 3): `config/content/credits.json` groups -> Thai heading (`copy.th.json`'s `credits.*Heading`
 * keys) with each group's entries underneath, `credits.licenseLine` filling in `{licenseName}`
 * verbatim from the data file (never through copy lint — licence text is data, not copy, `credits.
 * json`'s own `_meta.creditsNote`). A group with no entries is not shown at all. There is
 * deliberately no `credits.osmAttribution` key: the OSM attribution line itself is `entries[]`
 * data (`title`), not a copy string.
 */
import creditsJson from '../../../../config/content/credits.json';
import { getCopyText } from '../copy/load';
import { formatCopyText } from '../copy/format';

interface CreditsGroup {
  readonly id: string;
  readonly headingKey: string;
}

interface CreditsEntry {
  readonly id: string;
  readonly group: string;
  readonly title: string;
  readonly licenseName: string;
  readonly attributionUrl: string;
}

interface CreditsFile {
  readonly groups: readonly CreditsGroup[];
  readonly entries: readonly CreditsEntry[];
}

const file = creditsJson as unknown as CreditsFile;

export interface CreditsEntryView {
  readonly title: string;
  readonly licenseLine: string;
  readonly attributionUrl: string;
}

export interface CreditsGroupView {
  readonly heading: string;
  readonly entries: readonly CreditsEntryView[];
}

/** Groups with at least one entry, in `groups[]`/`entries[]` order (the data file's own declared
 * display order, A-P2-F06-T03-3). */
export function creditsGroupViews(): readonly CreditsGroupView[] {
  const views: CreditsGroupView[] = [];
  for (const group of file.groups) {
    const entries = file.entries
      .filter((e) => e.group === group.id)
      .map((e): CreditsEntryView => ({
        title: e.title,
        licenseLine: formatCopyText('credits.licenseLine', { licenseName: e.licenseName }),
        attributionUrl: e.attributionUrl,
      }));
    if (entries.length === 0) continue;
    views.push({ heading: getCopyText(group.headingKey), entries });
  }
  return views;
}
