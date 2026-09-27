// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { mountDungeonConfirm } from './dungeon-confirm';
import { getDungeonFullName, getDungeonShortName } from '../copy/names';
import { getCopyText } from '../copy/load';
import { formatCopyText } from '../copy/format';

const CANDIDATE = {
  dungeonId: 'baan-phra-athit',
  nameKey: 'dungeon.baanPhraAthit',
  levelMin: 1,
  levelMax: 5,
};

describe('mountDungeonConfirm — C-1 (Cancel available in every check-in state)', () => {
  it('shows a Cancel button before check-in is ready', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    popup.show([CANDIDATE]);
    popup.update({ ok: false, reason: 'not_enough_trace', readyIn_s: null }, false, false);
    expect(popup.root.querySelector('.confirm-cancel')).not.toBeNull();
    expect((popup.root.querySelector('.confirm-cancel') as HTMLElement).hidden).toBe(false);
  });

  it('shows a Cancel button in the B5 out-of-range state', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    popup.show([CANDIDATE]);
    popup.update({ ok: false, reason: 'no_approach_from_outside', readyIn_s: null }, true, false);
    expect(popup.root.querySelector('.confirm-cancel')).not.toBeNull();
  });

  it('shows a Cancel-equivalent dismiss button on the closed screen (B4)', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    popup.showClosed(undefined, false);
    const cancel = popup.root.querySelector('.confirm-cancel') as HTMLElement;
    expect(cancel).not.toBeNull();
    expect(cancel.hidden).toBe(false);
  });

  it('calls onCancel when Cancel is clicked', () => {
    const container = document.createElement('div');
    let cancelled = false;
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => {
        cancelled = true;
      },
    });
    popup.show([CANDIDATE]);
    (popup.root.querySelector('.confirm-cancel') as HTMLElement).click();
    expect(cancelled).toBe(true);
  });
});

describe('mountDungeonConfirm — D-089 (no player counts anywhere, no element, no reserved space)', () => {
  it('never renders a count-shaped element or text', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    popup.show([CANDIDATE]);
    popup.update({ ok: false, reason: 'not_enough_trace', readyIn_s: null }, false, false);
    expect(popup.root.querySelector('[data-count]')).toBeNull();
    expect(popup.root.querySelector('.count')).toBeNull();
    expect(popup.root.querySelector('.role-count')).toBeNull();
  });

  it('the overlap chooser (B2) shows only zone name + level range per card, no count', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    const second = { ...CANDIDATE, dungeonId: 'other', nameKey: 'dungeon.baanPhraAthit.search' };
    popup.show([CANDIDATE, second]);
    const cards = popup.root.querySelectorAll('.confirm-overlap-card');
    expect(cards.length).toBe(2);
    for (const card of Array.from(cards)) {
      expect(card.querySelector('.count')).toBeNull();
    }
  });

  it('no card is preselected in the overlap chooser (N-05)', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    const second = { ...CANDIDATE, dungeonId: 'other' };
    popup.show([CANDIDATE, second]);
    expect(popup.root.querySelectorAll('.confirm-overlap-card.selected').length).toBe(0);
  });
});

describe('mountDungeonConfirm — C-01 (name from names.th.json, never a raw key)', () => {
  it('shows the full zone name (nameReal + nameSuffix) in the title, not the raw name_key', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    popup.show([CANDIDATE]);
    const title = container.querySelector('.confirm-title') as HTMLElement;
    expect(title.textContent).toContain(getDungeonFullName(CANDIDATE.nameKey));
    expect(title.textContent).not.toContain(CANDIDATE.nameKey);
  });

  it('shows the short name (nameReal alone) on each overlap card', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    const second = { ...CANDIDATE, dungeonId: 'other' };
    popup.show([CANDIDATE, second]);
    const card = container.querySelector('.confirm-overlap-card') as HTMLElement;
    expect(card.textContent).toBe(getDungeonShortName(CANDIDATE.nameKey));
  });
});

describe('mountDungeonConfirm — C-06 (not_enough_trace with no countdown yet)', () => {
  it('uses checkinNotEnoughTraceWaiting, never a raw {countdown} placeholder', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    popup.show([CANDIDATE]);
    popup.update({ ok: false, reason: 'not_enough_trace', readyIn_s: null }, false, false);
    const statusRow = container.querySelector('.checkin-status-row') as HTMLElement;
    expect(statusRow.textContent).toBe(getCopyText('dungeon.checkinNotEnoughTraceWaiting'));
    expect(statusRow.textContent).not.toContain('{countdown}');
  });
});

describe('mountDungeonConfirm — C-11 (closing-soon tag)', () => {
  it('shows dungeon.closingSoonTag with {timeLeft} filled when passed a value', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    popup.show([CANDIDATE]);
    const timeLeftText = formatCopyText('unit.minutes', { value: 5 });
    popup.update({ ok: true }, false, false, timeLeftText);
    const tag = container.querySelector('.closing-soon') as HTMLElement;
    expect(tag.hidden).toBe(false);
    expect(tag.textContent).not.toContain('{timeLeft}');
    expect(tag.textContent).toContain(timeLeftText);
  });

  it('stays hidden when no closing-soon time is passed', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    popup.show([CANDIDATE]);
    popup.update({ ok: true }, false, false);
    const tag = container.querySelector('.closing-soon') as HTMLElement;
    expect(tag.hidden).toBe(true);
  });
});

describe('mountDungeonConfirm — B1 basic flow', () => {
  it('disables Enter until check-in preview is ready, then enables it', () => {
    const container = document.createElement('div');
    const popup = mountDungeonConfirm(container, {
      onEnter: () => undefined,
      onCancel: () => undefined,
    });
    popup.show([CANDIDATE]);
    const button = popup.root.querySelector('.btn-primary') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    popup.update({ ok: true }, false, false);
    expect(button.disabled).toBe(false);
  });

  it('calls onEnter with the dungeon id when Enter is clicked while ready', () => {
    const container = document.createElement('div');
    let entered: string | undefined;
    const popup = mountDungeonConfirm(container, {
      onEnter: (id) => {
        entered = id;
      },
      onCancel: () => undefined,
    });
    popup.show([CANDIDATE]);
    popup.update({ ok: true }, false, false);
    (popup.root.querySelector('.btn-primary') as HTMLButtonElement).click();
    expect(entered).toBe(CANDIDATE.dungeonId);
  });
});
