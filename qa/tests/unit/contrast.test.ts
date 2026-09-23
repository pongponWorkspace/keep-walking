// QA build task P1-H04 (studio/phases/phase-1/board.md #### P1-H04):
// check WCAG 2.x contrast for every color pair documented in
// art/direction/style-guide.md §4.1-4.5 and the map contrast table in
// art/direction/map-style.md §9, and check that design/ux/tokens.json
// copies style-guide §3 hex values byte-for-byte.
//
// No new dependency (board requirement): WCAG 2.x relative luminance and
// contrast ratio are re-implemented below from the spec formula instead of
// importing a color library.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..', '..');
const STYLE_GUIDE_PATH = join(REPO_ROOT, 'art/direction/style-guide.md');
const MAP_STYLE_PATH = join(REPO_ROOT, 'art/direction/map-style.md');
const TOKENS_PATH = join(REPO_ROOT, 'design/ux/tokens.json');

const styleGuideText = readFileSync(STYLE_GUIDE_PATH, 'utf8');
readFileSync(MAP_STYLE_PATH, 'utf8'); // read to prove the file exists; ratios below are transcribed with §ref
const tokens = JSON.parse(readFileSync(TOKENS_PATH, 'utf8')) as {
  color: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// WCAG 2.x relative luminance and contrast ratio
// (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance, SC 1.4.3 / 1.4.11)
// ---------------------------------------------------------------------------
function srgbChannelToLinear(channel8bit: number): number {
  const c = channel8bit / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    throw new Error(`Not a 6-digit hex color: ${hex}`);
  }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

const RATIO_TOLERANCE = 0.05; // board P1-H04: "flag differences > 0.05"
const AA_TEXT_FLOOR = 4.5; // style-guide §4 header: "ห้าม < 4.5 สำหรับข้อความ"
const UI_NONTEXT_FLOOR = 3.0; // style-guide §4.5 header: "≥ 3.0"

describe('WCAG helper self-check (known W3C example)', () => {
  it('luminance of #1A1A22 matches style-guide §3.1 documented L (0.0107)', () => {
    expect(relativeLuminance('#1A1A22')).toBeCloseTo(0.0107, 3);
  });
  it('luminance of #FFF8EE matches style-guide §3.1 documented L (0.9457)', () => {
    expect(relativeLuminance('#FFF8EE')).toBeCloseTo(0.9457, 3);
  });
  it('black vs white is the textbook 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });
});

// ---------------------------------------------------------------------------
// Colors, transcribed from art/direction/style-guide.md §3.1-3.5 (plus one
// color from map-style.md §9 that is not a §3 token). The tokens-vs-style-
// guide test further down re-parses style-guide.md §3 directly with a regex,
// so a stale transcription here would still surface as a mismatch there.
// ---------------------------------------------------------------------------
const COLORS: Record<string, string> = {
  'ink.900': '#1A1A22', // §3.1
  'ink.700': '#333344', // §3.1
  'ink.500': '#555566', // §3.1
  'ink.300': '#9999AA', // §3.1
  'ink.100': '#DDDDEE', // §3.1
  'bg.paper': '#FFF8EE', // §3.1
  'bg.surface': '#FFFFFF', // §3.1
  'bg.night': '#1A1A22', // §3.1
  'accent.signal': '#FFCC00', // §3.2
  'rift.500': '#CC1177', // §3.2
  'rift.300': '#FF99CC', // §3.2
  'rift.700': '#881155', // §3.2
  'state.danger': '#CC2222', // §3.2
  'state.success': '#117733', // §3.2
  'state.info': '#006699', // §3.2
  'state.danger-on-night': '#FF7777', // §3.2
  'state.success-on-night': '#66DD88', // §3.2
  'state.info-on-night': '#66CCFF', // §3.2
  'rarity.common': '#888899', // §3.3
  'rarity.uncommon': '#119933', // §3.3
  'rarity.rare': '#2266EE', // §3.3
  'rarity.epic': '#9933DD', // §3.3
  'rarity.legendary': '#DD6600', // §3.3
  'class.tanker': '#0072B2', // §3.3
  'class.ranged': '#D55E00', // §3.3
  'class.support': '#009E73', // §3.3
  'class.magic': '#CC79A7', // §3.3
  'class.tanker-text': '#005588', // §3.3
  'class.ranged-text': '#AA4400', // §3.3
  'class.support-text': '#006644', // §3.3
  'class.magic-text': '#994477', // §3.3
  'map.land': '#EEE8DD', // §3.5
  'map.road': '#FFFFFF', // §3.5
  'map.road-casing': '#555566', // §3.5
  'map.water': '#AADDFF', // §3.5
  'map.park': '#CCEEBB', // §3.5
  'map.label': '#1A1A22', // §3.5
  'map.label-water': '#005588', // §3.5
  'map.zone-black': '#111111', // §3.5
  'map.province-border': '#9999AA', // §3.5
  'map.rift-fill': '#CC1177', // §3.5
  // map-style.md §9: "#3377AA คลอง/ขอบน้ำ ... ค่า L ของ #3377AA = 0.1680
  // (คำนวณใหม่ในงานนี้)" — this is ramp.water's "right" tone (style-guide
  // §3.4), used directly as a map paint color, not a §3 named token.
  'canal.edge': '#3377AA',
};

function hex(name: keyof typeof COLORS | string): string {
  const value = COLORS[name];
  if (value === undefined) {
    throw new Error(`Unknown color name in test data: ${name}`);
  }
  return value;
}

type CaseKind = 'text' | 'nonText' | 'illustrativeFail';

interface ContrastCase {
  id: string;
  section: string;
  fgHex: string;
  bgHex: string;
  expected: number;
  kind: CaseKind;
}

/** One foreground color checked against several backgrounds from the same table row. */
function fanOut(
  section: string,
  idPrefix: string,
  fgHex: string,
  kind: CaseKind,
  entries: ReadonlyArray<readonly [bgLabel: string, bgHex: string, expected: number]>,
): ContrastCase[] {
  return entries.map(([bgLabel, bgHex, expected]) => ({
    id: `${idPrefix} on ${bgLabel} (${section})`,
    section,
    fgHex,
    bgHex,
    expected,
    kind,
  }));
}

const PAPER: readonly [string, string] = ['bg.paper', hex('bg.paper')];
const SURFACE: readonly [string, string] = ['bg.surface', hex('bg.surface')];
const NIGHT: readonly [string, string] = ['bg.night', hex('bg.night')];

// ---------------------------------------------------------------------------
// §4.1 ข้อความบนพื้นสว่าง (text on light backgrounds)
// ---------------------------------------------------------------------------
const CASES_4_1: ContrastCase[] = [
  ['ink.900', 16.39, 17.29],
  ['ink.700', 11.73, 12.37],
  ['ink.500', 6.92, 7.3],
  ['rift.500', 5.09, 5.37],
  ['state.danger', 5.21, 5.5],
  ['state.success', 5.37, 5.66],
  ['state.info', 5.93, 6.25],
  ['class.tanker-text', 7.5, 7.91],
  ['class.ranged-text', 5.63, 5.94],
  ['class.support-text', 6.67, 7.04],
  ['class.magic-text', 5.78, 6.09],
].flatMap(([name, onPaper, onSurface]) =>
  fanOut('style-guide §4.1', name as string, hex(name as string), 'text', [
    [PAPER[0], PAPER[1], onPaper as number],
    [SURFACE[0], SURFACE[1], onSurface as number],
  ]),
);

// ---------------------------------------------------------------------------
// §4.2 ข้อความบนพื้นสี (text on colored backgrounds: buttons, chips, labels)
// ---------------------------------------------------------------------------
const CASES_4_2: ContrastCase[] = [
  ['ink.900', 'accent.signal', 11.43],
  ['ink.900', 'rift.300', 8.79],
  ['bg.paper', 'rift.500', 5.09],
  ['bg.surface', 'rift.500', 5.37],
  ['bg.surface', 'state.danger', 5.5],
  ['bg.surface', 'state.success', 5.66],
  ['bg.surface', 'state.info', 6.25],
  ['bg.surface', 'ink.700', 12.37],
  ['bg.paper', 'ink.900', 16.39],
  ['ink.900', 'ink.100', 12.88],
  ['ink.500', 'ink.100', 5.44],
  ['ink.900', 'rarity.common', 4.96],
  ['ink.900', 'rarity.uncommon', 4.63],
  ['bg.surface', 'rarity.rare', 5.0],
  ['bg.surface', 'rarity.epic', 5.42],
  ['ink.900', 'rarity.legendary', 4.92],
].map(([fg, bg, expected]) => ({
  id: `${fg as string} on ${bg as string} (style-guide §4.2)`,
  section: 'style-guide §4.2',
  fgHex: hex(fg as string),
  bgHex: hex(bg as string),
  expected: expected as number,
  kind: 'text' as const,
}));

// ---------------------------------------------------------------------------
// §4.3 ข้อความบนพื้นกลางคืน bg.night
// ---------------------------------------------------------------------------
const CASES_4_3: ContrastCase[] = [
  ['bg.surface', 17.29],
  ['bg.paper', 16.39],
  ['ink.100', 12.88],
  ['ink.300', 6.17],
  ['accent.signal', 11.43],
  ['rift.300', 8.79],
  ['state.danger-on-night', 6.72],
  ['state.success-on-night', 10.1],
  ['state.info-on-night', 9.59],
].map(([fg, expected]) => ({
  id: `${fg as string} on bg.night (style-guide §4.3)`,
  section: 'style-guide §4.3',
  fgHex: hex(fg as string),
  bgHex: NIGHT[1],
  expected: expected as number,
  kind: 'text' as const,
}));

// ---------------------------------------------------------------------------
// §4.4 ข้อความบนแผนที่ (map labels)
// ---------------------------------------------------------------------------
const CASES_4_4: ContrastCase[] = [
  ['map.label', 'map.road', 17.29],
  ['map.label', 'map.land', 14.18],
  ['map.label', 'map.park', 13.6],
  ['map.label-water', 'map.water', 5.46],
  ['ink.100', 'map.zone-black', 14.07],
  ['bg.paper', 'map.rift-fill', 5.09],
].map(([fg, bg, expected]) => ({
  id: `${fg as string} on ${bg as string} (style-guide §4.4)`,
  section: 'style-guide §4.4',
  fgHex: hex(fg as string),
  bgHex: hex(bg as string),
  expected: expected as number,
  kind: 'text' as const,
}));

// ---------------------------------------------------------------------------
// §4.5 องค์ประกอบที่ไม่ใช่ข้อความ (non-text, floor 3.0)
// ---------------------------------------------------------------------------
const RARITY_NAMES = [
  'rarity.common',
  'rarity.uncommon',
  'rarity.rare',
  'rarity.epic',
  'rarity.legendary',
];
const CLASS_NAMES = ['class.tanker', 'class.ranged', 'class.support', 'class.magic'];

function zip3(
  section: string,
  idSuffix: string,
  names: string[],
  bgHex: string,
  expecteds: number[],
): ContrastCase[] {
  return names.map((name, i) => ({
    id: `${name} ${idSuffix} (${section})`,
    section,
    fgHex: hex(name),
    bgHex,
    expected: expecteds[i] as number,
    kind: 'nonText' as const,
  }));
}

const CASES_4_5: ContrastCase[] = [
  ...fanOut('style-guide §4.5', 'border ink.900', hex('ink.900'), 'nonText', [
    [PAPER[0], PAPER[1], 16.39],
    [SURFACE[0], SURFACE[1], 17.29],
  ]),
  ...zip3(
    'style-guide §4.5',
    'frame on bg.paper',
    RARITY_NAMES,
    PAPER[1],
    [3.3, 3.54, 4.74, 5.14, 3.33],
  ),
  ...zip3(
    'style-guide §4.5',
    'frame on bg.surface',
    RARITY_NAMES,
    SURFACE[1],
    [3.48, 3.73, 5.0, 5.42, 3.51],
  ),
  ...zip3(
    'style-guide §4.5',
    'frame on bg.night',
    RARITY_NAMES,
    NIGHT[1],
    [4.96, 4.63, 3.46, 3.19, 4.92],
  ),
  ...zip3(
    'style-guide §4.5',
    'badge bg vs ink.900 border',
    CLASS_NAMES,
    hex('ink.900'),
    [3.33, 4.47, 5.05, 5.65],
  ),
  ...zip3(
    'style-guide §4.5',
    'badge bg vs white glyph',
    CLASS_NAMES,
    hex('bg.surface'),
    [5.19, 3.87, 3.42, 3.06],
  ),
  {
    id: 'state.danger HP bar on ink.100 rail (style-guide §4.5)',
    section: 'style-guide §4.5',
    fgHex: hex('state.danger'),
    bgHex: hex('ink.100'),
    expected: 4.1,
    kind: 'nonText',
  },
  {
    id: 'state.success HP bar on ink.100 rail (style-guide §4.5)',
    section: 'style-guide §4.5',
    fgHex: hex('state.success'),
    bgHex: hex('ink.100'),
    expected: 4.22,
    kind: 'nonText',
  },
  ...fanOut('style-guide §4.5', 'rift.500 edge', hex('rift.500'), 'nonText', [
    ['map.park', hex('map.park'), 4.22],
    ['map.land', hex('map.land'), 4.4],
  ]),
  {
    id: 'map.province-border on map.zone-black (style-guide §4.5)',
    section: 'style-guide §4.5',
    fgHex: hex('map.province-border'),
    bgHex: hex('map.zone-black'),
    expected: 6.74,
    kind: 'nonText',
  },
  {
    id: 'map.road-casing on map.land (style-guide §4.5)',
    section: 'style-guide §4.5',
    fgHex: hex('map.road-casing'),
    bgHex: hex('map.land'),
    expected: 5.99,
    kind: 'nonText',
  },
];

// ---------------------------------------------------------------------------
// map-style.md §9 "ตาราง contrast บนแผนที่" — every row, including rows that
// repeat a style-guide §4 pair with a map-specific label (kept as its own
// case so the map-style table itself is fully covered per board P1-H04).
// ---------------------------------------------------------------------------
const MS9 = 'map-style §9';
const CASES_MAP_STYLE_9: ContrastCase[] = [
  {
    id: `map.label on halo map.road/white (${MS9})`,
    section: MS9,
    fgHex: hex('map.label'),
    bgHex: hex('map.road'),
    expected: 17.29,
    kind: 'text',
  },
  ...fanOut(MS9, 'map.label', hex('map.label'), 'text', [
    ['map.land', hex('map.land'), 14.18],
    ['map.park', hex('map.park'), 13.6],
  ]),
  {
    id: `ink.700 (POI) on halo white (${MS9})`,
    section: MS9,
    fgHex: hex('ink.700'),
    bgHex: hex('bg.surface'),
    expected: 12.37,
    kind: 'text',
  },
  ...fanOut(MS9, 'map.label-water', hex('map.label-water'), 'text', [
    ['halo white', hex('bg.surface'), 7.91],
    ['map.water', hex('map.water'), 5.46],
  ]),
  {
    id: `bg.paper on halo rift.500 (${MS9})`,
    section: MS9,
    fgHex: hex('bg.paper'),
    bgHex: hex('rift.500'),
    expected: 5.09,
    kind: 'text',
  },
  {
    id: `bg.paper on halo ink.500 (${MS9})`,
    section: MS9,
    fgHex: hex('bg.paper'),
    bgHex: hex('ink.500'),
    expected: 6.92,
    kind: 'text',
  },
  {
    id: `ink.900 on halo rift.300 (${MS9})`,
    section: MS9,
    fgHex: hex('ink.900'),
    bgHex: hex('rift.300'),
    expected: 8.79,
    kind: 'text',
  },
  {
    id: `bg.paper on halo ink.900 (${MS9})`,
    section: MS9,
    fgHex: hex('bg.paper'),
    bgHex: hex('ink.900'),
    expected: 16.39,
    kind: 'text',
  },
  ...fanOut(MS9, 'ink.100 (province name)', hex('ink.100'), 'text', [
    ['map.zone-black', hex('map.zone-black'), 14.07],
    ['halo ink.900', hex('ink.900'), 12.88],
  ]),
  ...fanOut(MS9, 'rift.500 border', hex('rift.500'), 'nonText', [
    ['map.park', hex('map.park'), 4.22],
    ['map.land', hex('map.land'), 4.4],
    ['map.water', hex('map.water'), 3.7],
  ]),
  {
    id: `ink.500 border (dungeon closed) on map.park (${MS9})`,
    section: MS9,
    fgHex: hex('ink.500'),
    bgHex: hex('map.park'),
    expected: 5.74,
    kind: 'nonText',
  },
  ...fanOut(MS9, 'map.road-casing', hex('map.road-casing'), 'nonText', [
    ['map.land', hex('map.land'), 5.99],
    ['map.park', hex('map.park'), 5.74],
  ]),
  {
    id: `map.road on map.road-casing (${MS9})`,
    section: MS9,
    fgHex: hex('map.road'),
    bgHex: hex('map.road-casing'),
    expected: 7.3,
    kind: 'nonText',
  },
  ...fanOut(MS9, 'ink.500 pathway/rail', hex('ink.500'), 'nonText', [
    ['map.land', hex('map.land'), 5.99],
    ['map.park', hex('map.park'), 5.74],
    ['bg.paper', hex('bg.paper'), 6.92],
  ]),
  ...fanOut(MS9, 'canal.edge #3377AA', hex('canal.edge'), 'nonText', [
    ['map.land', hex('map.land'), 3.95],
    ['map.park', hex('map.park'), 3.79],
    ['map.water', hex('map.water'), 3.32],
  ]),
  {
    id: `map.province-border on map.zone-black (${MS9})`,
    section: MS9,
    fgHex: hex('map.province-border'),
    bgHex: hex('map.zone-black'),
    expected: 6.74,
    kind: 'nonText',
  },
  {
    id: `ink.900 province-line base on map.land (${MS9})`,
    section: MS9,
    fgHex: hex('ink.900'),
    bgHex: hex('map.land'),
    expected: 14.18,
    kind: 'nonText',
  },
  ...fanOut(MS9, 'ink.900 own-location-dot border', hex('ink.900'), 'nonText', [
    ['map.land', hex('map.land'), 14.18],
    ['map.park', hex('map.park'), 13.6],
    ['map.road', hex('map.road'), 17.29],
  ]),
  {
    id: `accent.signal own-point dot vs ink.900 border (${MS9})`,
    section: MS9,
    fgHex: hex('accent.signal'),
    bgHex: hex('ink.900'),
    expected: 11.43,
    kind: 'nonText',
  },
  ...fanOut(MS9, 'state.info accuracy-circle border', hex('state.info'), 'nonText', [
    ['map.land', hex('map.land'), 5.13],
    ['map.park', hex('map.park'), 4.91],
    ['map.road', hex('map.road'), 6.25],
  ]),
  {
    // Documented as "ห้าม" (forbidden) — the reason every road level has a casing.
    // No floor is asserted here; the case exists to prove the tool correctly
    // computes a failing ratio, matching style-guide §4.6's method.
    // map-style.md §9 fixed by art-director in P1-X06: 1.16 -> 1.22
    // (= (1.0000 + 0.05) / (0.8111 + 0.05), L values from style-guide §3.5).
    id: `map.road on map.land, no border (${MS9}, documented as forbidden)`,
    section: MS9,
    fgHex: hex('map.road'),
    bgHex: hex('map.land'),
    expected: 1.22,
    kind: 'illustrativeFail',
  },
];

const ALL_CASES: ContrastCase[] = [
  ...CASES_4_1,
  ...CASES_4_2,
  ...CASES_4_3,
  ...CASES_4_4,
  ...CASES_4_5,
  ...CASES_MAP_STYLE_9,
];

// Sanity: no duplicate ids (would hide a missing case behind a passing twin).
describe('contrast test data', () => {
  it('has no duplicate case ids and covers every documented section', () => {
    const ids = ALL_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(CASES_4_1.length).toBe(22); // 11 colors x 2 backgrounds
    expect(CASES_4_2.length).toBe(16);
    expect(CASES_4_3.length).toBe(9);
    expect(CASES_4_4.length).toBe(6);
    expect(CASES_4_5.length).toBe(31);
    expect(CASES_MAP_STYLE_9.length).toBe(35);
    expect(ALL_CASES.length).toBe(119);
  });
});

describe('WCAG 2.x contrast — every pair in style-guide §4.1-4.5 and map-style §9', () => {
  for (const c of ALL_CASES) {
    it(`${c.id}: matches documented ratio ${c.expected.toFixed(2)} (±${RATIO_TOLERANCE})`, () => {
      const computed = contrastRatio(c.fgHex, c.bgHex);
      expect(Math.abs(computed - c.expected)).toBeLessThanOrEqual(RATIO_TOLERANCE);
    });

    if (c.kind === 'text') {
      it(`${c.id}: passes the 4.5:1 AA floor for text`, () => {
        expect(contrastRatio(c.fgHex, c.bgHex)).toBeGreaterThanOrEqual(AA_TEXT_FLOOR);
      });
    } else if (c.kind === 'nonText') {
      it(`${c.id}: passes the 3.0:1 UI floor for non-text elements (§4.5)`, () => {
        expect(contrastRatio(c.fgHex, c.bgHex)).toBeGreaterThanOrEqual(UI_NONTEXT_FLOOR);
      });
    } else {
      it(`${c.id}: documented as failing — correctly below the 4.5:1 text floor`, () => {
        expect(contrastRatio(c.fgHex, c.bgHex)).toBeLessThan(AA_TEXT_FLOOR);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// tokens.json colours equal style-guide hex, checked by parsing style-guide.md
// §3 directly with a regex (robust to future additions/reordering; ADR 0001
// §3.10 convention is camelCase keys, style-guide uses kebab-case suffixes).
// ---------------------------------------------------------------------------
describe('design/ux/tokens.json copies style-guide §3 hex byte-for-byte', () => {
  const section3 = styleGuideText.slice(
    styleGuideText.indexOf('## 3. Palette'),
    styleGuideText.indexOf('## 4. ตาราง contrast'),
  );

  function toCamel(segment: string): string {
    return segment.replace(/-([a-z])/g, (_match, c: string) => c.toUpperCase());
  }

  function getStringToken(path: string[]): string | undefined {
    let node: unknown = tokens.color;
    for (const key of path) {
      if (typeof node !== 'object' || node === null) return undefined;
      node = (node as Record<string, unknown>)[key];
    }
    return typeof node === 'string' ? node : undefined;
  }

  const colorRowPattern = /\|\s*`color\.([a-zA-Z0-9_.-]+)`\s*\|\s*(#[0-9A-Fa-f]{6})\s*\|/g;
  const colorRows: Array<{ tokenPath: string; hex: string }> = [];
  for (const m of section3.matchAll(colorRowPattern)) {
    colorRows.push({ tokenPath: m[1] as string, hex: m[2] as string });
  }

  it('parsed exactly 41 `color.*` rows from style-guide §3.1/3.2/3.3/3.5', () => {
    expect(colorRows.length).toBe(41);
  });

  for (const { tokenPath, hex: expectedHex } of colorRows) {
    it(`tokens.json color.${tokenPath} === style-guide ${expectedHex}`, () => {
      const segments = tokenPath.split('.').map(toCamel);
      expect(getStringToken(segments)).toBe(expectedHex);
    });
  }

  const rampRowPattern =
    /\|\s*`ramp\.([a-z]+)`\s*\|\s*(#[0-9A-Fa-f]{6})\s*\|\s*(#[0-9A-Fa-f]{6})\s*\|\s*(#[0-9A-Fa-f]{6})\s*\|/g;
  const rampRows: Array<{ name: string; top: string; left: string; right: string }> = [];
  for (const m of section3.matchAll(rampRowPattern)) {
    rampRows.push({
      name: m[1] as string,
      top: m[2] as string,
      left: m[3] as string,
      right: m[4] as string,
    });
  }

  it('parsed exactly 10 `ramp.*` rows from style-guide §3.4', () => {
    expect(rampRows.length).toBe(10);
  });

  for (const row of rampRows) {
    it(`tokens.json color.ramp.${row.name} === style-guide {top,left,right}`, () => {
      const rampNode = (tokens.color as Record<string, unknown>)['ramp'] as
        Record<string, { top?: string; left?: string; right?: string }> | undefined;
      expect(rampNode?.[row.name]).toEqual({ top: row.top, left: row.left, right: row.right });
    });
  }
});
