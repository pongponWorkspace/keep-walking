// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { randomCharacterName } from '@keep-walking/shared/character';
import { mountCreateCharacterScreen } from './create-character-screen';
import type { CreateCharacterResult } from './create-character-screen';
import characterNamesThJson from '../../../../config/content/character-names.th.json';
// `config/balance.ts`'s own whitelisted accessor (`config/generated.test.ts`'s own guard: every
// `apps/client/src` file other than itself must go through this, never `config/balance/*.json`
// directly) — the exact same config the real screen uses in production.
import { balanceCharacterNameParamsConfig } from '../config/balance';
import type { AssetRuntimeController } from '../assets/runtime';
import type { RuntimeManifest } from '../assets/manifest';

const NAME_PARAMS = balanceCharacterNameParamsConfig;

function fakeAssets(): AssetRuntimeController {
  const assets: AssetRuntimeController = {
    getManifest: (): RuntimeManifest | undefined => undefined,
    basePath: '/assets/',
    scale: 1,
    isProduction: false,
    load: () => Promise.resolve(),
    getAvatarPart: () => undefined,
    loadAvatarPart: () => Promise.resolve(),
    onManifestReady: () => {},
  };
  return assets;
}

function makeScreen(onCreate: (result: CreateCharacterResult) => void = () => {}) {
  const container = document.createElement('div');
  const screen = mountCreateCharacterScreen(container, {
    nameParams: NAME_PARAMS,
    lexicon: characterNamesThJson,
    assets: fakeAssets(),
    onCreate,
  });
  return { container, screen };
}

function nameInputOf(container: HTMLElement): HTMLInputElement {
  return container.querySelector('.name-field-input') as HTMLInputElement;
}

function errorOf(container: HTMLElement): HTMLElement {
  return container.querySelector('.name-field-error') as HTMLElement;
}

function createButtonOf(container: HTMLElement): HTMLButtonElement {
  return container.querySelector('.create-character-button') as HTMLButtonElement;
}

function cardOf(container: HTMLElement, classId: string): HTMLButtonElement {
  return container.querySelector(
    `.class-select-card[data-class-id="${classId}"]`,
  ) as HTMLButtonElement;
}

function typeInto(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('mountCreateCharacterScreen', () => {
  it('starts hidden with the create button disabled and no error shown', () => {
    const { container, screen } = makeScreen();
    expect(screen.root.hidden).toBe(true);
    screen.show({ classLocked: false, lockedClassId: null });
    expect(screen.root.hidden).toBe(false);
    expect(createButtonOf(container).disabled).toBe(true);
    expect(errorOf(container).textContent).toBe('');
  });

  it('P2-X59: a repeat show() call with the screen already open never resets the typed name', () => {
    const { container, screen } = makeScreen();
    const view = { classLocked: false, lockedClassId: null };
    screen.show(view);
    typeInto(nameInputOf(container), 'somchai');
    screen.show(view);
    expect(nameInputOf(container).value).toBe('somchai');
  });

  it('hide() then show() again resets the field (a fresh entry, R11)', () => {
    const { container, screen } = makeScreen();
    const view = { classLocked: false, lockedClassId: null };
    screen.show(view);
    typeInto(nameInputOf(container), 'somchai');
    screen.hide();
    screen.show(view);
    expect(nameInputOf(container).value).toBe('');
  });

  it('shows the first failing reason inline, with {min}/{max} filled from config, and clears it once the name passes', () => {
    const { container, screen } = makeScreen();
    screen.show({ classLocked: false, lockedClassId: null });
    typeInto(nameInputOf(container), 'a');
    expect(errorOf(container).textContent).toContain(String(NAME_PARAMS.name.minGraphemes));
    typeInto(nameInputOf(container), 'ab');
    expect(errorOf(container).textContent).toBe('');
  });

  it('an empty field shows no error at all (empty is the starting state, not a typo)', () => {
    const { container, screen } = makeScreen();
    screen.show({ classLocked: false, lockedClassId: null });
    typeInto(nameInputOf(container), 'a');
    typeInto(nameInputOf(container), '');
    expect(errorOf(container).textContent).toBe('');
    expect(createButtonOf(container).disabled).toBe(true);
  });

  it('the create button stays disabled until both a class is chosen and the name passes', () => {
    const { container, screen } = makeScreen();
    screen.show({ classLocked: false, lockedClassId: null });
    typeInto(nameInputOf(container), 'ab');
    expect(createButtonOf(container).disabled).toBe(true);
    cardOf(container, 'tanker').click();
    expect(createButtonOf(container).disabled).toBe(false);
  });

  it('create reports the normalized name, the tapped class, nameSource typed and the reject count', () => {
    let captured: CreateCharacterResult | undefined;
    const { container, screen } = makeScreen((r) => {
      captured = r;
    });
    screen.show({ classLocked: false, lockedClassId: null });
    typeInto(nameInputOf(container), 'a'); // tooShort: one rejection
    typeInto(nameInputOf(container), '  ab  '); // passes, normalizes (trim)
    cardOf(container, 'magic').click();
    createButtonOf(container).click();
    expect(captured).toEqual({
      classId: 'magic',
      classLocked: false,
      name: 'ab',
      nameSource: 'typed',
      filterRejectCount: 1,
    });
  });

  it('filter_reject_count only counts a pass/empty -> fail transition, never every failing keystroke', () => {
    let captured: CreateCharacterResult | undefined;
    const { container, screen } = makeScreen((r) => {
      captured = r;
    });
    screen.show({ classLocked: false, lockedClassId: null });
    typeInto(nameInputOf(container), 'test@x'); // fail #1 (email)
    typeInto(nameInputOf(container), 'test@xy'); // still failing, same reason -> no new transition
    typeInto(nameInputOf(container), 'ab'); // now passes
    typeInto(nameInputOf(container), 'test@z'); // fail #2 (new pass->fail transition)
    typeInto(nameInputOf(container), 'ab');
    cardOf(container, 'ranged').click();
    createButtonOf(container).click();
    expect(captured?.filterRejectCount).toBe(2);
  });

  it('shuffle fills a name that always passes the filter and reports nameSource random until edited', () => {
    let captured: CreateCharacterResult | undefined;
    const { container, screen } = makeScreen((r) => {
      captured = r;
    });
    screen.show({ classLocked: false, lockedClassId: null });
    const getRandomValuesSpy = vi.spyOn(crypto, 'getRandomValues').mockImplementation(((
      arr: Uint32Array,
    ) => {
      arr.fill(0);
      return arr;
    }) as typeof crypto.getRandomValues);
    container.querySelector<HTMLButtonElement>('.shuffle-button')?.click();
    getRandomValuesSpy.mockRestore();
    const expected = randomCharacterName(() => 0, characterNamesThJson, NAME_PARAMS);
    expect(nameInputOf(container).value).toBe(expected.name);
    expect(errorOf(container).textContent).toBe('');
    cardOf(container, 'support').click();
    createButtonOf(container).click();
    expect(captured?.nameSource).toBe('random');
    expect(captured?.name).toBe(expected.name);
  });

  it('editing after a shuffle counts as typed, not random', () => {
    let captured: CreateCharacterResult | undefined;
    const { container, screen } = makeScreen((r) => {
      captured = r;
    });
    screen.show({ classLocked: false, lockedClassId: null });
    container.querySelector<HTMLButtonElement>('.shuffle-button')?.click();
    typeInto(nameInputOf(container), `${nameInputOf(container).value}x`);
    cardOf(container, 'support').click();
    createButtonOf(container).click();
    expect(captured?.nameSource).toBe('typed');
  });

  it('migration: a locked class shows a permanent ring, the other cards disabled, and tapping another card has no effect', () => {
    const { container, screen } = makeScreen();
    screen.show({ classLocked: true, lockedClassId: 'ranged' });
    expect(cardOf(container, 'ranged').classList.contains('selected')).toBe(true);
    expect(cardOf(container, 'tanker').disabled).toBe(true);
    cardOf(container, 'tanker').click();
    expect(cardOf(container, 'ranged').classList.contains('selected')).toBe(true);
    typeInto(nameInputOf(container), 'ab');
    expect(createButtonOf(container).disabled).toBe(false);
  });

  it('migration: create reports classLocked true and the locked class id, without needing a card tap', () => {
    let captured: CreateCharacterResult | undefined;
    const { container, screen } = makeScreen((r) => {
      captured = r;
    });
    screen.show({ classLocked: true, lockedClassId: 'support' });
    typeInto(nameInputOf(container), 'ab');
    createButtonOf(container).click();
    expect(captured?.classId).toBe('support');
    expect(captured?.classLocked).toBe(true);
  });

  it('no Intl.Segmenter: shows the unsupported-browser note, disables shuffle, and the create button never enables', () => {
    const mutableIntl: Record<string, unknown> = Intl;
    const originalSegmenter = mutableIntl['Segmenter'];
    mutableIntl['Segmenter'] = undefined;
    try {
      const { container, screen } = makeScreen();
      screen.show({ classLocked: false, lockedClassId: null });
      expect(container.querySelector('.unsupported-browser-note')?.hasAttribute('hidden')).toBe(
        false,
      );
      expect(container.querySelector<HTMLButtonElement>('.shuffle-button')?.disabled).toBe(true);
      typeInto(nameInputOf(container), 'ab');
      cardOf(container, 'tanker').click();
      expect(createButtonOf(container).disabled).toBe(true);
    } finally {
      mutableIntl['Segmenter'] = originalSegmenter;
    }
  });

  it('idempotent: calling show() again with the same view makes no further DOM mutation to the name field/cards', () => {
    const { container, screen } = makeScreen();
    const view = { classLocked: false, lockedClassId: null };
    screen.show(view);
    typeInto(nameInputOf(container), 'ab');
    cardOf(container, 'tanker').click();
    const observed: MutationRecord[] = [];
    const observer = new MutationObserver((records) => observed.push(...records));
    observer.observe(container, { subtree: true, attributes: true, childList: true });
    screen.show(view);
    observer.disconnect();
    expect(observed.length).toBe(0);
  });
});
