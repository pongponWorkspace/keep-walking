// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mountHpBar } from './hp-bar';

describe('mountHpBar', () => {
  it('renders the fill ratio, percent text, and toggles .low at/under the warning line', () => {
    const container = document.createElement('div');
    const bar = mountHpBar(container);

    bar.update({
      hp: 80,
      maxHp: 100,
      hpRatio: 0.8,
      belowWarningLine: false,
      autoRetreatEnabled: true,
    });
    expect(container.querySelector('.hp-fill')?.classList.contains('low')).toBe(false);
    expect(container.querySelector('.hp-percent')?.textContent).toBe('80%');

    bar.update({
      hp: 25,
      maxHp: 100,
      hpRatio: 0.25,
      belowWarningLine: true,
      autoRetreatEnabled: true,
    });
    expect(container.querySelector('.hp-fill')?.classList.contains('low')).toBe(true);
    expect(container.querySelector('.hp-percent')?.textContent).toBe('25%');
  });

  it('shows the sticky auto-retreat-off badge only when auto-retreat is disabled', () => {
    const container = document.createElement('div');
    const bar = mountHpBar(container);

    bar.update({
      hp: 100,
      maxHp: 100,
      hpRatio: 1,
      belowWarningLine: false,
      autoRetreatEnabled: true,
    });
    expect((container.querySelector('.auto-retreat-off-badge') as HTMLElement).hidden).toBe(true);

    bar.update({
      hp: 100,
      maxHp: 100,
      hpRatio: 1,
      belowWarningLine: false,
      autoRetreatEnabled: false,
    });
    expect((container.querySelector('.auto-retreat-off-badge') as HTMLElement).hidden).toBe(false);
  });

  it('exposes the .hp-fill element itself as fillElement, for run.death to hard-cut+grayscale', () => {
    const container = document.createElement('div');
    const bar = mountHpBar(container);
    expect(bar.fillElement).toBe(container.querySelector('.hp-fill'));
  });

  it('rounds the percent to the nearest whole number and clamps to 0..100', () => {
    const container = document.createElement('div');
    const bar = mountHpBar(container);
    bar.update({
      hp: 1,
      maxHp: 3,
      hpRatio: 1 / 3,
      belowWarningLine: true,
      autoRetreatEnabled: true,
    });
    expect(container.querySelector('.hp-percent')?.textContent).toBe('33%');
    bar.update({
      hp: 0,
      maxHp: 100,
      hpRatio: -0.01,
      belowWarningLine: true,
      autoRetreatEnabled: true,
    });
    expect(container.querySelector('.hp-percent')?.textContent).toBe('0%');
  });
});
