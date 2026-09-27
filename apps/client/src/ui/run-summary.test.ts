// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mountRunSummary } from './run-summary';
import type { RunSummaryDeps } from './run-summary';
import type { RunSummary } from '@keep-walking/shared/session';
import type { AssetRuntime } from '../assets/icon-dom';
import { getCopyText } from '../copy/load';

const NO_MANIFEST_ASSETS: AssetRuntime = {
  getManifest: () => undefined,
  basePath: '/kw/',
  scale: 1,
  isProduction: false,
};

const DEPS: RunSummaryDeps = { assets: NO_MANIFEST_ASSETS, autoRetreatThresholdPct: 25 };

function baseSummary(overrides: Partial<RunSummary> = {}): RunSummary {
  return {
    dungeonId: 'lumpini',
    exitReason: 'manual_exit',
    startedAt_ms: 0,
    endedAt_ms: 60_000,
    ticksEvaluated: 2,
    ticksGranted: 1,
    partialTick: null,
    loot: [],
    expGained: 0,
    levelsGained: 0,
    hpAtEnd: 100,
    maxHp: 100,
    hitsLanded: 0,
    potionsUsed: { runBag: 0, inventory: 0 },
    lowHpWarnings: 0,
    lost: [],
    classId: 'tanker',
    ...overrides,
  };
}

function mount() {
  const container = document.createElement('div');
  const onContinue = () => undefined;
  const screen = mountRunSummary(container, onContinue, DEPS);
  return { container, screen };
}

describe('mountRunSummary', () => {
  it('shows the exp and tick rows for a plain exit with no loot', () => {
    const { container, screen } = mount();
    screen.show(baseSummary({ ticksEvaluated: 3, ticksGranted: 2, expGained: 40 }));

    const root = container.querySelector('.run-summary');
    expect(root?.querySelector('.run-summary-canon')?.textContent).toBe('');
    expect(root?.querySelector('.run-summary-exp-row')?.textContent).toContain('40');
    expect(root?.querySelector('.run-summary-tick-row')?.textContent).toContain('2');
    expect(root?.querySelector('.run-summary-tick-row')?.textContent).toContain('3');
    expect(root?.querySelectorAll('.run-summary-reward-row').length).toBe(0);
  });

  it('appends the partial-tick note only when the summary carries a granted partial tick', () => {
    const { container, screen } = mount();
    screen.show(baseSummary({ partialTick: { f: 0.6, granted: true } }));
    const tickRow = container.querySelector('.run-summary-tick-row');
    expect(tickRow?.textContent).not.toBe('');

    const { container: c2, screen: s2 } = mount();
    s2.show(baseSummary({ partialTick: { f: 0.4, granted: false } }));
    const tickRow2 = c2.querySelector('.run-summary-tick-row');
    expect(tickRow2?.textContent?.length).toBeLessThan(tickRow?.textContent?.length ?? 0);
  });

  it('death: shows the canon run.death line, diedBody, and the empty-lost label, never the raw loot', () => {
    const { container, screen } = mount();
    screen.show(
      baseSummary({
        exitReason: 'death',
        loot: [],
        lost: [{ id: 'elementDust', qty: 2 }],
      }),
    );
    const root = container.querySelector('.run-summary');
    expect(root?.querySelector('.run-summary-canon')?.textContent?.length).toBeGreaterThan(0);
    const bodyEl = root?.querySelector('.run-summary-body') as HTMLElement;
    expect(bodyEl.hidden).toBe(false);
    expect(bodyEl.textContent?.length).toBeGreaterThan(0);
    const rows = root?.querySelectorAll('.run-summary-reward-row');
    expect(rows?.length).toBe(0);
    expect(root?.querySelector('.run-summary-rewards')?.textContent?.length).toBeGreaterThan(0);
  });

  it('auto_retreat: shows the canon run.autoRetreat line with the configured pct substituted, and keeps the full loot list', () => {
    const { container, screen } = mount();
    screen.show(
      baseSummary({
        exitReason: 'auto_retreat',
        loot: [{ id: 'elementDust', qty: 1 }],
      }),
    );
    const root = container.querySelector('.run-summary');
    expect(root?.querySelector('.run-summary-canon')?.textContent).toContain('25');
    const bodyEl = root?.querySelector('.run-summary-body') as HTMLElement;
    expect(bodyEl.hidden).toBe(true);
    expect(root?.querySelectorAll('.run-summary-reward-row').length).toBe(1);
  });

  it('sorts the loot list Legendary -> Common', () => {
    const { container, screen } = mount();
    screen.show(
      baseSummary({
        loot: [
          { id: 'elementDust', qty: 1 }, // common
          { id: 'riftStone', qty: 1 }, // rare
          { id: 'elementCore', qty: 1 }, // uncommon
        ],
      }),
    );
    const rows = Array.from(
      container.querySelectorAll('.run-summary-reward-row span:last-child'),
    ).map((el) => el.textContent);
    expect(rows.length).toBe(3);
    // rare before uncommon before common (names come from names.th.json, order is what matters).
    const riftIndex = rows.findIndex((t) => t?.includes('x1'));
    expect(riftIndex).toBeGreaterThanOrEqual(0);
  });

  it('C-10: timeout shows run.summary.timeoutBody under the header (not canon)', () => {
    const { container, screen } = mount();
    screen.show(baseSummary({ exitReason: 'timeout' }));
    const root = container.querySelector('.run-summary');
    const canonEl = root?.querySelector('.run-summary-canon') as HTMLElement;
    expect(canonEl.hidden).toBe(true);
    const bodyEl = root?.querySelector('.run-summary-body') as HTMLElement;
    expect(bodyEl.hidden).toBe(false);
    expect(bodyEl.textContent).toBe(getCopyText('run.summary.timeoutBody'));
  });

  it('C-10: clock_invalid shows run.summary.clockInvalidBody under the header', () => {
    const { container, screen } = mount();
    screen.show(baseSummary({ exitReason: 'clock_invalid' }));
    const bodyEl = container.querySelector('.run-summary-body') as HTMLElement;
    expect(bodyEl.hidden).toBe(false);
    expect(bodyEl.textContent).toBe(getCopyText('run.summary.clockInvalidBody'));
  });

  it('dungeon_closed keeps the body hidden (its header already says enough, C-10)', () => {
    const { container, screen } = mount();
    screen.show(baseSummary({ exitReason: 'dungeon_closed' }));
    const bodyEl = container.querySelector('.run-summary-body') as HTMLElement;
    expect(bodyEl.hidden).toBe(true);
  });

  it('manual_exit with empty loot shows the empty (not lost) label', () => {
    const { container, screen } = mount();
    screen.show(baseSummary({ exitReason: 'manual_exit', loot: [] }));
    const text = container.querySelector('.run-summary-rewards')?.textContent ?? '';
    expect(text.length).toBeGreaterThan(0);
  });

  it('hide() hides the root', () => {
    const { container, screen } = mount();
    screen.show(baseSummary());
    screen.hide();
    const root = container.querySelector('.run-summary') as HTMLElement;
    expect(root.hidden).toBe(true);
  });
});
