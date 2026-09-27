import { describe, expect, it } from 'vitest';
import { closedChipIconTone, runStatePillIconTone } from './icon-tone';

describe('runStatePillIconTone (components.md 13.2, 13.9.1)', () => {
  it('Active: icon.ui.in-run, ink.900 by day / bg.paper by night', () => {
    expect(runStatePillIconTone('active', false)).toEqual({
      id: 'icon.ui.in-run',
      colorCss: '#1A1A22',
    });
    expect(runStatePillIconTone('active', true)).toEqual({
      id: 'icon.ui.in-run',
      colorCss: '#FFF8EE',
    });
  });

  it('Grace: icon.ui.grace, state.info in both tones', () => {
    expect(runStatePillIconTone('grace', false)).toEqual({
      id: 'icon.ui.grace',
      colorCss: '#006699',
    });
    expect(runStatePillIconTone('grace', true)).toEqual({
      id: 'icon.ui.grace',
      colorCss: '#006699',
    });
  });

  it('Suspended: icon.ui.suspended (fixed-colour badge, setIconGlyph ignores colorCss for it)', () => {
    expect(runStatePillIconTone('suspended', false).id).toBe('icon.ui.suspended');
  });
});

describe('closedChipIconTone (components.md 13.1, 13.9.1)', () => {
  it('ink.700 by day, ink.100 by night', () => {
    expect(closedChipIconTone(false)).toEqual({ id: 'icon.ui.closed', colorCss: '#333344' });
    expect(closedChipIconTone(true)).toEqual({ id: 'icon.ui.closed', colorCss: '#DDDDEE' });
  });
});
