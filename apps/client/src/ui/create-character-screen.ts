/**
 * `S-00-create-character` (design/ux/flows/F10-account-shell.md Flow C, design/features/
 * F10-account-shell.md R15-R24, components.md 16.4, wireframes/F10-03-create-character.html).
 * Replaces the pre-F10 `ui/class-select.ts` popup sheet for the onboarding `character` step
 * (onboarding-flow.ts's own doc comment on that interim placeholder) — a full `.screen`, not a
 * sheet layered over the map (F10-R15: this step comes before the player has ever seen the map).
 *
 * Three stacked sections, exactly the flow's own order: class cards (1) · name field + shuffle +
 * real-name warning + inline filter error (2) · "สร้างตัวละคร" button (3). Class selection still
 * goes through `chooseClass`/the engine (the caller dispatches it, this module only reports which
 * card was tapped) — never computed here (CLAUDE.md: no reward/gate logic on the client beyond
 * calling the shared pure functions). The name filter *is* one of those shared pure functions
 * (`@keep-walking/shared/character#validateCharacterName`/`randomCharacterName`, tech note F10
 * section 1/7): this screen calls it directly, the same way the Phase 3 server will.
 *
 * Migration (F10-R45-R47, flow C5): a returning player who already has a class sees it locked (a
 * permanent selection ring, the other three cards disabled) and only fills in the name — `view.
 * classLocked`/`lockedClassId` below, never a second code path for "pick a class".
 *
 * Render rule (tech note F10 section 6, P2-X59): `mount` builds every DOM node once; `show(view)`
 * only resets the name field/reject counter/selection on a *fresh* entry (the transition from
 * hidden to shown), never on a repeat call with the screen already open — `render()` in `f04-app.ts`
 * calls `show()` on every GPS sample/tick, and the player's half-typed name must survive every one
 * of those (R11: "ออกจากจอแล้วทิ้ง", not "re-rendered แล้วทิ้ง").
 */
import type { PlayerClass } from '@keep-walking/shared/session';
import { randomCharacterName, validateCharacterName } from '@keep-walking/shared/character';
import type {
  CharacterNameParams,
  Lexicon,
  RejectReason,
  ValidateCharacterNameResult,
} from '@keep-walking/shared/character';
import { getCopyText } from '../copy/load';
import { formatCopyText } from '../copy/format';
import { setIconImg } from '../assets/icon-dom';
import type { AssetRuntimeController } from '../assets/runtime';
import { setIconGlyphWhenReady } from '../assets/icon-glyph';
import type { IconGlyphRenderer } from '../assets/icon-glyph';

// icon-tone.ts's own literal-token convention (design/ux/tokens.json): a literal hex value with a
// comment naming the token, never a second runtime JSON parse for two call sites.
const TOKEN_INK_900 = '#1A1A22';
const TOKEN_STATE_INFO = '#006699';

const CLASSES: readonly {
  readonly id: PlayerClass;
  readonly nameKey: string;
  readonly descKey: string;
}[] = [
  { id: 'tanker', nameKey: 'class.tanker', descKey: 'onboarding.pickRoleTanker' },
  { id: 'ranged', nameKey: 'class.ranged', descKey: 'onboarding.pickRoleRanged' },
  { id: 'support', nameKey: 'class.support', descKey: 'onboarding.pickRoleSupport' },
  { id: 'magic', nameKey: 'class.magic', descKey: 'onboarding.pickRoleMagic' },
];

/** `true` only when `Intl.Segmenter` is actually callable — re-checked on every mount (not cached
 * at module load) so a test stubbing it away still sees a fresh read (tech note F10 section 1/7,
 * A-T04-4's own fail-closed rule; "A-P2-F10-T12-3": the fallback random-name path can also throw in
 * this case, caught separately below, never left to crash the screen). */
function hasWorkingSegmenter(): boolean {
  return typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';
}

/** A fresh uniform draw in `[0, 1)` for `randomCharacterName`'s injected `NameRng` — `crypto.
 * getRandomValues`, never `Math.random` (the same "never Math.random, use crypto" convention
 * `f04-app.ts#resolveRunSeed` already follows; `character.json#random._note`: "the rng is injected
 * by the caller; the name is cosmetic, so it needs no server stream in Phase 2" — cosmetic does not
 * mean `Math.random`, only that it needs no seeded replay). */
function cryptoRng(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  // 2**32, the width of one Uint32 draw — the one place this ratio is spelled out, not a magic
  // number repeated elsewhere.
  const UINT32_SPAN = 4294967296;
  return (buffer[0] ?? 0) / UINT32_SPAN;
}

export interface CreateCharacterResult {
  readonly classId: PlayerClass;
  /** `true` when this player's class was already chosen before this screen (migration, F10-R47) —
   * the caller must not dispatch `chooseClass` again in that case (tech note F10 section 2.2: "ผู้
   * เล่นเดิมที่มี class แล้ว: ไม่เรียก chooseClass"). */
  readonly classLocked: boolean;
  /** Already `validateCharacterName`'s own `normalized` output (R22) — never the raw `<input>`
   * value. */
  readonly name: string;
  readonly nameSource: 'typed' | 'random';
  /** Raw count, not yet bucketed — `onboarding-flow.ts#createCharacter` buckets it against
   * `config/app/telemetry.json#f10Events.filterRejectCountBuckets` (tech note F10 section 8). */
  readonly filterRejectCount: number;
}

export interface CreateCharacterView {
  readonly classLocked: boolean;
  /** Only meaningful when `classLocked` is `true`. */
  readonly lockedClassId: PlayerClass | null;
}

export interface CreateCharacterScreenDeps {
  readonly nameParams: CharacterNameParams;
  readonly lexicon: Lexicon;
  readonly assets: AssetRuntimeController;
  readonly iconGlyph?: IconGlyphRenderer;
  readonly onCreate: (result: CreateCharacterResult) => void;
}

export interface CreateCharacterScreen {
  readonly root: HTMLElement;
  show(view: CreateCharacterView): void;
  hide(): void;
}

function reasonCopyText(reason: RejectReason, nameParams: CharacterNameParams): string {
  if (reason === 'tooShort') {
    return formatCopyText('character.nameError.tooShort', { min: nameParams.name.minGraphemes });
  }
  if (reason === 'tooLong') {
    return formatCopyText('character.nameError.tooLong', { max: nameParams.name.maxGraphemes });
  }
  return getCopyText(`character.nameError.${reason}`);
}

export function mountCreateCharacterScreen(
  container: HTMLElement,
  deps: CreateCharacterScreenDeps,
): CreateCharacterScreen {
  const root = document.createElement('div');
  root.className = 'screen create-character-screen';
  root.hidden = true;

  const header = document.createElement('div');
  header.className = 'consent-header-label';
  header.textContent = getCopyText('character.headerLabel');

  const classLabel = document.createElement('h2');
  classLabel.className = 'scr-sub';
  classLabel.textContent = getCopyText('character.classLabel');

  const cardsRow = document.createElement('div');
  cardsRow.className = 'class-select-cards';
  const badges: { readonly img: HTMLImageElement; readonly id: string; readonly alt: string }[] =
    [];
  const cardButtons: { readonly id: PlayerClass; readonly button: HTMLButtonElement }[] = [];
  for (const cls of CLASSES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'card class-select-card';
    card.dataset['classId'] = cls.id;
    const badge = document.createElement('img');
    badge.className = 'class-select-badge';
    const badgeId = `badge.class.${cls.id}-48`;
    const badgeAlt = getCopyText(cls.nameKey);
    setIconImg(badge, deps.assets, badgeId, badgeAlt);
    badges.push({ img: badge, id: badgeId, alt: badgeAlt });
    const name = document.createElement('div');
    name.className = 'class-select-name';
    name.textContent = getCopyText(cls.nameKey);
    const desc = document.createElement('div');
    desc.className = 'class-select-desc';
    desc.textContent = getCopyText(cls.descKey);
    card.append(badge, name, desc);
    card.addEventListener('click', () => onCardTap(cls.id));
    cardsRow.append(card);
    cardButtons.push({ id: cls.id, button: card });
  }
  deps.assets.onManifestReady(() => {
    for (const b of badges) setIconImg(b.img, deps.assets, b.id, b.alt);
  });

  const classLockedNote = document.createElement('p');
  classLockedNote.className = 'caption class-locked-note';
  classLockedNote.textContent = getCopyText('character.classLockedNote');
  classLockedNote.hidden = true;

  const nameLabel = document.createElement('div');
  nameLabel.className = 'settings-row-label';
  nameLabel.textContent = getCopyText('character.nameLabel');

  const nameFieldRow = document.createElement('div');
  nameFieldRow.className = 'name-field';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'name-field-input';
  nameInput.autocomplete = 'off';
  const shuffleButton = document.createElement('button');
  shuffleButton.type = 'button';
  shuffleButton.className = 'btn btn-secondary shuffle-button';
  shuffleButton.setAttribute('aria-label', getCopyText('character.shuffleAria'));
  const shuffleIcon = document.createElement('span');
  shuffleIcon.className = 'shuffle-button-icon';
  shuffleButton.append(shuffleIcon);
  // V-F10-01: this mounts before `assets.load()` necessarily settles.
  if (deps.iconGlyph !== undefined) {
    setIconGlyphWhenReady(deps.assets, deps.iconGlyph, shuffleIcon, 'icon.ui.shuffle', {
      altText: '',
      colorCss: TOKEN_INK_900,
      onNightBackground: false,
      nightPlateColorCss: '',
    });
  }
  nameFieldRow.append(nameInput, shuffleButton);

  const nameError = document.createElement('p');
  nameError.className = 'caption name-field-error';

  const warningBanner = document.createElement('div');
  warningBanner.className = 'banner info name-warning-banner';
  const warningIcon = document.createElement('span');
  warningIcon.className = 'name-warning-icon';
  warningBanner.append(warningIcon);
  if (deps.iconGlyph !== undefined) {
    setIconGlyphWhenReady(deps.assets, deps.iconGlyph, warningIcon, 'icon.ui.consent', {
      altText: '',
      colorCss: TOKEN_STATE_INFO,
      onNightBackground: false,
      nightPlateColorCss: '',
    });
  }
  const warningText = document.createElement('span');
  warningText.textContent = getCopyText('character.nameRealNameWarning');
  warningBanner.append(warningText);

  const unsupportedBanner = document.createElement('p');
  unsupportedBanner.className = 'caption unsupported-browser-note';
  unsupportedBanner.textContent = getCopyText('character.unsupportedBrowser');
  unsupportedBanner.hidden = true;

  const createButton = document.createElement('button');
  createButton.type = 'button';
  createButton.className = 'btn btn-primary btn-disabled create-character-button';
  createButton.disabled = true;
  createButton.textContent = getCopyText('character.createButton');

  root.append(
    header,
    classLabel,
    cardsRow,
    classLockedNote,
    nameLabel,
    nameFieldRow,
    warningBanner,
    nameError,
    unsupportedBanner,
    createButton,
  );
  container.append(root);

  // --- state (R11/tech note section 6: owned by this screen, never by the `view` the caller
  // re-sends on every render; reset only on a fresh `show()` entry, see below) ---
  const segmenterSupported = hasWorkingSegmenter();
  let currentView: CreateCharacterView = { classLocked: false, lockedClassId: null };
  let selectedClassId: PlayerClass | null = null;
  let lastRandomName: string | undefined;
  let lastValidation: ValidateCharacterNameResult | undefined;
  let filterRejectCount = 0;
  let previousWasFail = false;
  let shown = false;

  function effectiveClassId(): PlayerClass | null {
    return currentView.classLocked ? currentView.lockedClassId : selectedClassId;
  }

  function updateCreateButtonState(): void {
    const ok =
      segmenterSupported &&
      effectiveClassId() !== null &&
      lastValidation !== undefined &&
      lastValidation.ok;
    createButton.disabled = !ok;
    createButton.classList.toggle('btn-disabled', !ok);
  }

  function applyClassCardsView(): void {
    for (const { id, button } of cardButtons) {
      if (currentView.classLocked) {
        const isLockedCard = id === currentView.lockedClassId;
        button.classList.toggle('selected', isLockedCard);
        button.disabled = !isLockedCard;
        button.classList.toggle('btn-disabled', !isLockedCard);
      } else {
        button.classList.toggle('selected', id === selectedClassId);
        button.disabled = false;
        button.classList.remove('btn-disabled');
      }
    }
    classLockedNote.hidden = !currentView.classLocked;
  }

  function onCardTap(classId: PlayerClass): void {
    if (currentView.classLocked) return;
    selectedClassId = classId;
    applyClassCardsView();
    updateCreateButtonState();
  }

  /** Re-runs the filter against whatever the field holds right now (typed or just-shuffled-in) —
   * the one place `validateCharacterName` is called (C2/C3 of the flow share this, R19/R20). */
  function revalidate(): void {
    if (!segmenterSupported) {
      lastValidation = undefined;
      nameError.textContent = '';
      nameInput.classList.remove('name-field-input-error');
      updateCreateButtonState();
      return;
    }
    const result = validateCharacterName(nameInput.value, deps.nameParams, deps.lexicon);
    lastValidation = result;
    if (result.ok || result.reason === 'empty') {
      nameError.textContent = '';
      // V-F10-07 (components.md 16.4): the border-colour change is tied to the same "really
      // failing" condition as the error text itself, never shown for an empty/untouched field.
      nameInput.classList.remove('name-field-input-error');
      previousWasFail = false;
    } else {
      nameError.textContent = reasonCopyText(result.reason, deps.nameParams);
      nameInput.classList.add('name-field-input-error');
      // F10-R19/tech note section 8 "filter_reject_count": only a transition *into* failing from
      // passing-or-empty counts, never every keystroke that stays failing.
      if (!previousWasFail) filterRejectCount += 1;
      previousWasFail = true;
    }
    updateCreateButtonState();
  }

  /** `A-P2-F10-T12-3`: `randomCharacterName` itself throws when there is no working
   * `Intl.Segmenter` (every fallback name also fails to validate on that browser) — caught here so
   * a tap on the shuffle button never crashes the screen, same fail-closed message as the
   * no-Segmenter state `revalidate`/`show` already show. */
  function showUnsupportedBrowser(): void {
    unsupportedBanner.hidden = false;
    nameError.textContent = '';
    nameInput.classList.remove('name-field-input-error');
    shuffleButton.disabled = true;
    shuffleButton.classList.add('btn-disabled');
    lastValidation = undefined;
    updateCreateButtonState();
  }

  nameInput.addEventListener('input', () => {
    revalidate();
  });

  shuffleButton.addEventListener('click', () => {
    if (!segmenterSupported) return;
    try {
      const result = randomCharacterName(cryptoRng, deps.lexicon, deps.nameParams);
      nameInput.value = result.name;
      lastRandomName = result.name;
      revalidate();
    } catch {
      showUnsupportedBrowser();
    }
  });

  createButton.addEventListener('click', () => {
    const classId = effectiveClassId();
    if (classId === null || lastValidation === undefined || !lastValidation.ok) return;
    const nameSource: 'typed' | 'random' = nameInput.value === lastRandomName ? 'random' : 'typed';
    deps.onCreate({
      classId,
      classLocked: currentView.classLocked,
      name: lastValidation.normalized,
      nameSource,
      filterRejectCount,
    });
  });

  return {
    root,
    show(view: CreateCharacterView) {
      // Idempotent (tech note F10 section 6 rule 5, components.md's own convention for every F10
      // input screen): `render()` in `f04-app.ts` calls this on every GPS sample/tick while the
      // player sits on this screen, with the *same* `view` almost every time (the locked-class
      // migration state never changes mid-visit). A repeat call must touch nothing at all — not
      // even re-assign an attribute to the value it already has, since `setAttribute`/`disabled =`
      // queue a mutation record regardless of whether the value actually changed — so every branch
      // below is reached only on an actual state transition (fresh entry, or `view` itself
      // changing), never unconditionally.
      const isFreshEntry = !shown;
      const viewChanged =
        isFreshEntry ||
        view.classLocked !== currentView.classLocked ||
        view.lockedClassId !== currentView.lockedClassId;
      currentView = view;
      if (isFreshEntry) {
        // Fresh entry only (P2-X59): never on a repeat `show()` call with the screen already open
        // (tech note F10 section 6 rule 2 — the field's own value belongs to the DOM, not to
        // whatever `view` this render pass re-sent).
        shown = true;
        selectedClassId = null;
        lastRandomName = undefined;
        filterRejectCount = 0;
        previousWasFail = false;
        nameInput.value = '';
        nameError.textContent = '';
        nameInput.classList.remove('name-field-input-error');
        if (shuffleButton.disabled) {
          shuffleButton.disabled = false;
          shuffleButton.classList.remove('btn-disabled');
        }
        if (unsupportedBanner.hidden !== segmenterSupported) {
          unsupportedBanner.hidden = segmenterSupported;
        }
        if (!segmenterSupported) {
          showUnsupportedBrowser();
        } else {
          revalidate();
        }
      }
      if (viewChanged) {
        applyClassCardsView();
        updateCreateButtonState();
      }
      if (root.hidden) root.hidden = false;
    },
    hide() {
      shown = false;
      root.hidden = true;
    },
  };
}
